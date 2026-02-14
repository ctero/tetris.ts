/**
 * GameState — Central game state manager.
 * Manages the active game: piece movement, gravity, lock delay, hold, and game-over detection.
 * Pure logic — no rendering dependencies.
 */

import { Board, BOARD_COLS, BOARD_BUFFER_ROWS } from './Board.js';
import { PieceType, TETROMINOES } from './Tetrominoes.js';
import { BagRandomizer } from './BagRandomizer.js';
import { tryRotate, RotationResult } from './RotationSystem.js';
import {
    ScoringState,
    createScoringState,
    processLineClear,
    scoreSoftDrop,
    scoreHardDrop,
    ClearResult,
    ClearType,
} from './Scoring.js';
import {
    GameModeConfig,
    calculateLevel,
    getGravityInterval,
    isModeCompleted,
    isTimeExpired,
} from './GameMode.js';

export enum GameStatus {
    PLAYING = 'PLAYING',
    PAUSED = 'PAUSED',
    GAME_OVER = 'GAME_OVER',
    COMPLETED = 'COMPLETED',
}

export interface ActivePiece {
    type: PieceType;
    rotation: number;
    row: number;
    col: number;
}

export interface GameEvent {
    type: 'line_clear' | 'hard_drop' | 'lock' | 'hold' | 'game_over' | 'level_up' | 'completed';
    data?: any;
}

const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
const SPAWN_COL = 3;
const NEXT_QUEUE_SIZE = 5;

/** Spawn row: pieces spawn with their top at the buffer zone boundary */
function getSpawnRow(type: PieceType): number {
    // I piece spawns slightly higher
    return type === PieceType.I ? BOARD_BUFFER_ROWS - 2 : BOARD_BUFFER_ROWS - 1;
}

export class GameState {
    board: Board;
    scoring: ScoringState;
    mode: GameModeConfig;
    randomizer: BagRandomizer;

    status: GameStatus = GameStatus.PLAYING;

    // Current piece
    currentPiece: ActivePiece | null = null;

    // Hold
    holdPiece: PieceType | null = null;
    holdUsed: boolean = false;

    // Next queue
    nextQueue: PieceType[] = [];

    // Stats
    level: number = 1;
    totalLines: number = 0;
    elapsedMs: number = 0;

    // Gravity
    private gravityAccumulator: number = 0;

    // Lock delay
    private lockDelayTimer: number = 0;
    private lockDelayActive: boolean = false;
    private lockResetCount: number = 0;

    // T-spin tracking from last rotation
    private lastWasTSpin: boolean = false;
    private lastWasTSpinMini: boolean = false;
    private lastMoveWasRotation: boolean = false;

    // Event callback
    onEvent?: (event: GameEvent) => void;

    constructor(mode: GameModeConfig, rng?: () => number) {
        this.mode = mode;
        this.board = new Board();
        this.scoring = createScoringState();
        this.randomizer = new BagRandomizer(rng);
        this.level = mode.startLevel;

        // Fill the next queue
        for (let i = 0; i < NEXT_QUEUE_SIZE; i++) {
            this.nextQueue.push(this.randomizer.next());
        }

        this.spawnPiece();
    }

    /** Spawn a new piece from the next queue */
    private spawnPiece(): boolean {
        const type = this.nextQueue.shift()!;
        this.nextQueue.push(this.randomizer.next());

        const spawnRow = getSpawnRow(type);
        const spawnCol = SPAWN_COL;

        if (!this.board.isValidPosition(type, 0, spawnRow, spawnCol)) {
            // Game over — can't spawn
            this.status = GameStatus.GAME_OVER;
            this.currentPiece = { type, rotation: 0, row: spawnRow, col: spawnCol };
            this.emitEvent({ type: 'game_over' });
            return false;
        }

        this.currentPiece = {
            type,
            rotation: 0,
            row: spawnRow,
            col: spawnCol,
        };

        this.holdUsed = false;
        this.lockDelayActive = false;
        this.lockDelayTimer = 0;
        this.lockResetCount = 0;
        this.gravityAccumulator = 0;
        this.lastWasTSpin = false;
        this.lastWasTSpinMini = false;
        this.lastMoveWasRotation = false;

        return true;
    }

    /** Main game tick — call with delta time in ms */
    tick(deltaMs: number): void {
        if (this.status !== GameStatus.PLAYING || !this.currentPiece) return;

        this.elapsedMs += deltaMs;

        // Check time expiry for timed modes
        if (isTimeExpired(this.mode, this.elapsedMs)) {
            this.status = this.mode.isCompletable ? GameStatus.GAME_OVER : GameStatus.COMPLETED;
            this.emitEvent({ type: this.status === GameStatus.COMPLETED ? 'completed' : 'game_over' });
            return;
        }

        const gravityMs = getGravityInterval(this.level);

        if (this.lockDelayActive) {
            // Lock delay is counting down
            this.lockDelayTimer += deltaMs;
            if (this.lockDelayTimer >= LOCK_DELAY_MS) {
                this.lockCurrentPiece();
            }
        } else {
            // Normal gravity
            this.gravityAccumulator += deltaMs;
            while (this.gravityAccumulator >= gravityMs) {
                this.gravityAccumulator -= gravityMs;
                this.applyGravity();
            }
        }
    }

    private applyGravity(): void {
        if (!this.currentPiece) return;

        const { type, rotation, row, col } = this.currentPiece;
        if (this.board.isValidPosition(type, rotation, row + 1, col)) {
            this.currentPiece.row++;
            this.lastMoveWasRotation = false;
        } else {
            // Piece has landed — start lock delay
            this.startLockDelay();
        }
    }

    private startLockDelay(): void {
        if (!this.lockDelayActive) {
            this.lockDelayActive = true;
            this.lockDelayTimer = 0;
        }
    }

    private resetLockDelay(): void {
        if (this.lockDelayActive && this.lockResetCount < MAX_LOCK_RESETS) {
            this.lockDelayTimer = 0;
            this.lockResetCount++;
        }
    }

    private lockCurrentPiece(): void {
        if (!this.currentPiece) return;

        const { type, rotation, row, col } = this.currentPiece;

        // Lock the piece onto the board
        this.board.lockPiece(type, rotation, row, col);
        this.emitEvent({ type: 'lock' });

        // Clear lines
        const clearResult = this.board.clearLines();

        // Score it
        const isTSpin = this.lastMoveWasRotation && this.lastWasTSpin;
        const isTSpinMini = this.lastMoveWasRotation && this.lastWasTSpinMini;

        const scoreResult = processLineClear(
            this.scoring,
            clearResult.count,
            this.level,
            isTSpin,
            isTSpinMini
        );

        if (clearResult.count > 0) {
            this.totalLines += clearResult.count;
            this.emitEvent({
                type: 'line_clear',
                data: { ...scoreResult, rows: clearResult.rows, linesCleared: clearResult.count },
            });

            // Update level
            const newLevel = calculateLevel(this.mode, this.mode.startLevel, this.totalLines);
            if (newLevel > this.level) {
                this.level = newLevel;
                this.emitEvent({ type: 'level_up', data: { level: this.level } });
            }

            // Check completion
            if (isModeCompleted(this.mode, this.level, this.totalLines, this.elapsedMs)) {
                this.status = GameStatus.COMPLETED;
                this.emitEvent({ type: 'completed' });
                return;
            }
        }

        // Spawn next piece
        this.spawnPiece();
    }

    // ─── Player Actions ───────────────────────────────────────

    moveLeft(): boolean {
        return this.tryMove(0, -1);
    }

    moveRight(): boolean {
        return this.tryMove(0, 1);
    }

    softDrop(): boolean {
        if (!this.currentPiece || this.status !== GameStatus.PLAYING) return false;

        const { type, rotation, row, col } = this.currentPiece;
        if (this.board.isValidPosition(type, rotation, row + 1, col)) {
            this.currentPiece.row++;
            scoreSoftDrop(this.scoring, 1);
            this.lastMoveWasRotation = false;

            // If we land, start lock delay
            if (!this.board.isValidPosition(type, rotation, row + 2, col)) {
                this.startLockDelay();
            }
            return true;
        }
        return false;
    }

    hardDrop(): void {
        if (!this.currentPiece || this.status !== GameStatus.PLAYING) return;

        const { type, rotation, row, col } = this.currentPiece;
        const ghostRow = this.board.getGhostRow(type, rotation, row, col);
        const dropDistance = ghostRow - row;

        scoreHardDrop(this.scoring, dropDistance);
        this.currentPiece.row = ghostRow;
        this.lastMoveWasRotation = false;

        this.emitEvent({ type: 'hard_drop', data: { distance: dropDistance } });
        this.lockCurrentPiece();
    }

    rotateCW(): boolean {
        return this.tryRotation(1);
    }

    rotateCCW(): boolean {
        return this.tryRotation(-1);
    }

    hold(): boolean {
        if (!this.currentPiece || this.holdUsed || this.status !== GameStatus.PLAYING) return false;

        const currentType = this.currentPiece.type;

        if (this.holdPiece !== null) {
            // Swap with hold piece
            const holdType = this.holdPiece;
            this.holdPiece = currentType;

            const spawnRow = getSpawnRow(holdType);
            if (!this.board.isValidPosition(holdType, 0, spawnRow, SPAWN_COL)) {
                this.status = GameStatus.GAME_OVER;
                this.emitEvent({ type: 'game_over' });
                return false;
            }

            this.currentPiece = {
                type: holdType,
                rotation: 0,
                row: spawnRow,
                col: SPAWN_COL,
            };
        } else {
            // First hold — store current and spawn new
            this.holdPiece = currentType;
            this.spawnPiece();
        }

        this.holdUsed = true;
        this.lockDelayActive = false;
        this.lockDelayTimer = 0;
        this.lockResetCount = 0;
        this.gravityAccumulator = 0;
        this.lastMoveWasRotation = false;
        this.lastWasTSpin = false;
        this.lastWasTSpinMini = false;

        this.emitEvent({ type: 'hold' });
        return true;
    }

    togglePause(): void {
        if (this.status === GameStatus.PLAYING) {
            this.status = GameStatus.PAUSED;
        } else if (this.status === GameStatus.PAUSED) {
            this.status = GameStatus.PLAYING;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────

    private tryMove(rowDelta: number, colDelta: number): boolean {
        if (!this.currentPiece || this.status !== GameStatus.PLAYING) return false;

        const { type, rotation, row, col } = this.currentPiece;
        const newRow = row + rowDelta;
        const newCol = col + colDelta;

        if (this.board.isValidPosition(type, rotation, newRow, newCol)) {
            this.currentPiece.row = newRow;
            this.currentPiece.col = newCol;
            this.lastMoveWasRotation = false;
            this.resetLockDelay();

            // Check if piece is now on the ground
            if (!this.board.isValidPosition(type, rotation, newRow + 1, newCol)) {
                this.startLockDelay();
            } else if (this.lockDelayActive) {
                // Piece moved off the ground — keep lock delay but it's been reset
                // Actually, if piece is no longer on ground, deactivate lock delay
                this.lockDelayActive = false;
            }

            return true;
        }
        return false;
    }

    private tryRotation(direction: 1 | -1): boolean {
        if (!this.currentPiece || this.status !== GameStatus.PLAYING) return false;

        const { type, rotation, row, col } = this.currentPiece;
        const result = tryRotate(this.board, type, rotation, row, col, direction);

        if (result) {
            this.currentPiece.rotation = result.newRotation;
            this.currentPiece.col += result.kickCol;
            this.currentPiece.row += result.kickRow;
            this.lastMoveWasRotation = true;
            this.lastWasTSpin = result.isTSpin;
            this.lastWasTSpinMini = result.isTSpinMini;
            this.resetLockDelay();

            // Check if piece is now on the ground
            const newRow = this.currentPiece.row;
            const newCol = this.currentPiece.col;
            if (!this.board.isValidPosition(type, result.newRotation, newRow + 1, newCol)) {
                this.startLockDelay();
            } else if (this.lockDelayActive) {
                this.lockDelayActive = false;
            }

            return true;
        }
        return false;
    }

    getGhostRow(): number {
        if (!this.currentPiece) return 0;
        const { type, rotation, row, col } = this.currentPiece;
        return this.board.getGhostRow(type, rotation, row, col);
    }

    get score(): number {
        return this.scoring.score;
    }

    get combo(): number {
        return this.scoring.combo;
    }

    get backToBack(): number {
        return this.scoring.backToBack;
    }

    private emitEvent(event: GameEvent): void {
        this.onEvent?.(event);
    }
}
