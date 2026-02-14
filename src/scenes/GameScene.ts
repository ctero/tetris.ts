/**
 * GameScene — Main gameplay scene with board rendering, HUD, input, and effects.
 */

import Phaser from 'phaser';
import { GameState, GameStatus, ActivePiece, GameEvent } from '../core/GameState.js';
import {
    GameModeType,
    GameModeConfig,
    MARATHON_MODE,
    SPRINT_MODE,
    ULTRA_MODE,
    getGravityInterval,
} from '../core/GameMode.js';
import {
    PieceType,
    TETROMINOES,
    ALL_PIECE_TYPES,
    getAbsoluteCells,
    getCells,
} from '../core/Tetrominoes.js';
import { BOARD_COLS, BOARD_VISIBLE_ROWS, BOARD_BUFFER_ROWS } from '../core/Board.js';
import { ClearType } from '../core/Scoring.js';
import { CELL_SIZE } from './BootScene.js';

// Layout constants
const BOARD_X = 160;
const BOARD_Y = 30;
const BOARD_WIDTH = BOARD_COLS * CELL_SIZE;
const BOARD_HEIGHT = BOARD_VISIBLE_ROWS * CELL_SIZE;

const HOLD_X = 20;
const HOLD_Y = BOARD_Y + 40;

const NEXT_X = BOARD_X + BOARD_WIDTH + 20;
const NEXT_Y = BOARD_Y + 40;

// DAS/ARR settings
const DAS_DELAY = 167;  // ms before auto-repeat starts
const ARR_RATE = 33;    // ms between auto-repeat moves

const COLORS = {
    panelBg: 0x0c0c30,
    panelBorder: 0x2a2a6a,
    boardBg: 0x08082a,
    boardBorder: 0x3333aa,
    text: '#ccccee',
    textBright: '#ffffff',
    textDim: '#6666aa',
    labelColor: '#5555aa',
    scoreColor: '#00f0f0',
    comboColor: '#f0a000',
};

function getModeConfig(modeType: GameModeType): GameModeConfig {
    switch (modeType) {
        case GameModeType.MARATHON: return MARATHON_MODE;
        case GameModeType.SPRINT: return SPRINT_MODE;
        case GameModeType.ULTRA: return ULTRA_MODE;
    }
}

export class GameScene extends Phaser.Scene {
    private gameState!: GameState;
    private modeType!: GameModeType;

    // Rendering layers
    private boardContainer!: Phaser.GameObjects.Container;
    private gridCells: Phaser.GameObjects.Image[][] = [];
    private lockedBlocks: (Phaser.GameObjects.Image | null)[][] = [];
    private currentPieceSprites: Phaser.GameObjects.Image[] = [];
    private ghostPieceSprites: Phaser.GameObjects.Image[] = [];
    private holdPieceSprites: Phaser.GameObjects.Image[] = [];
    private nextPieceSprites: Phaser.GameObjects.Image[][] = [];

    // HUD elements
    private scoreText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private linesText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private clearTypeText!: Phaser.GameObjects.Text;
    private modeLabel!: Phaser.GameObjects.Text;

    // Overlays
    private pauseOverlay!: Phaser.GameObjects.Container;
    private gameOverOverlay!: Phaser.GameObjects.Container;

    // Input
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyZ!: Phaser.Input.Keyboard.Key;
    private keyC!: Phaser.Input.Keyboard.Key;
    private keySpace!: Phaser.Input.Keyboard.Key;
    private keyEsc!: Phaser.Input.Keyboard.Key;

    // DAS/ARR state
    private dasDirection: 'left' | 'right' | null = null;
    private dasTimer: number = 0;
    private arrTimer: number = 0;
    private dasActive: boolean = false;

    // Effect timers
    private clearFlashTimer: number = 0;
    private clearFlashRows: number[] = [];
    private shakeTimer: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    init(data: { modeType: GameModeType }): void {
        this.modeType = data.modeType ?? GameModeType.MARATHON;
    }

    create(): void {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(0x05051e);

        // Initialize game state
        const mode = getModeConfig(this.modeType);
        this.gameState = new GameState(mode);
        this.gameState.onEvent = (e) => this.handleGameEvent(e);

        // Create board visuals
        this.createBoard();
        this.createHUD();
        this.createHoldPanel();
        this.createNextPanel();
        this.createPauseOverlay();
        this.createGameOverOverlay();

        // Input
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keyZ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
        this.keyC = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.C);
        this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Initial render
        this.renderAll();
    }

    update(time: number, delta: number): void {
        if (this.gameState.status === GameStatus.PLAYING) {
            this.handleInput(delta);
            this.gameState.tick(delta);
            this.updateEffects(delta);
            this.renderAll();
        }

        this.updateHUD();
    }

    // ─── Board Creation ─────────────────────────────────────────

    private createBoard(): void {
        // Board background
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.boardBg, 1);
        bg.fillRoundedRect(BOARD_X - 4, BOARD_Y - 4, BOARD_WIDTH + 8, BOARD_HEIGHT + 8, 6);
        bg.lineStyle(2, COLORS.boardBorder, 0.7);
        bg.strokeRoundedRect(BOARD_X - 4, BOARD_Y - 4, BOARD_WIDTH + 8, BOARD_HEIGHT + 8, 6);

        // Grid cells
        this.gridCells = [];
        for (let r = 0; r < BOARD_VISIBLE_ROWS; r++) {
            this.gridCells[r] = [];
            for (let c = 0; c < BOARD_COLS; c++) {
                const img = this.add.image(
                    BOARD_X + c * CELL_SIZE + CELL_SIZE / 2,
                    BOARD_Y + r * CELL_SIZE + CELL_SIZE / 2,
                    'grid_cell'
                );
                this.gridCells[r][c] = img;
            }
        }

        // Locked blocks layer (initially empty)
        this.lockedBlocks = [];
        for (let r = 0; r < BOARD_VISIBLE_ROWS; r++) {
            this.lockedBlocks[r] = [];
            for (let c = 0; c < BOARD_COLS; c++) {
                this.lockedBlocks[r][c] = null;
            }
        }
    }

    // ─── HUD ────────────────────────────────────────────────────

    private createHUD(): void {
        const rightX = NEXT_X;
        const statY = NEXT_Y + 340;

        // Mode label
        this.modeLabel = this.add.text(BOARD_X + BOARD_WIDTH / 2, BOARD_Y - 16, this.modeType, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '12px',
            color: COLORS.textDim,
            letterSpacing: 4,
        }).setOrigin(0.5);

        // Score
        this.addLabel(rightX, statY, 'SCORE');
        this.scoreText = this.add.text(rightX, statY + 16, '0', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: COLORS.scoreColor,
        });

        // Level
        this.addLabel(rightX, statY + 50, 'LEVEL');
        this.levelText = this.add.text(rightX, statY + 66, '1', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: COLORS.textBright,
        });

        // Lines
        this.addLabel(rightX, statY + 100, 'LINES');
        this.linesText = this.add.text(rightX, statY + 116, '0', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '18px',
            color: COLORS.textBright,
        });

        // Time
        this.addLabel(HOLD_X, HOLD_Y + 130, 'TIME');
        this.timeText = this.add.text(HOLD_X, HOLD_Y + 146, '0:00', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '16px',
            color: COLORS.textBright,
        });

        // Combo text (hidden initially)
        this.comboText = this.add.text(BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT / 2, '', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '20px',
            color: COLORS.comboColor,
            stroke: '#000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        // Clear type text
        this.clearTypeText = this.add.text(BOARD_X + BOARD_WIDTH / 2, BOARD_Y + BOARD_HEIGHT / 2 - 30, '', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '16px',
            color: '#ffffff',
            stroke: '#000',
            strokeThickness: 3,
        }).setOrigin(0.5).setAlpha(0).setDepth(10);
    }

    private addLabel(x: number, y: number, text: string): void {
        this.add.text(x, y, text, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '10px',
            color: COLORS.labelColor,
            letterSpacing: 2,
        });
    }

    // ─── Hold Panel ─────────────────────────────────────────────

    private createHoldPanel(): void {
        const panelWidth = 110;
        const panelHeight = 90;

        const g = this.add.graphics();
        g.fillStyle(COLORS.panelBg, 0.9);
        g.fillRoundedRect(HOLD_X - 5, HOLD_Y - 25, panelWidth, panelHeight, 8);
        g.lineStyle(1, COLORS.panelBorder, 0.5);
        g.strokeRoundedRect(HOLD_X - 5, HOLD_Y - 25, panelWidth, panelHeight, 8);

        this.addLabel(HOLD_X, HOLD_Y - 18, 'HOLD');
        this.holdPieceSprites = [];
    }

    // ─── Next Panel ─────────────────────────────────────────────

    private createNextPanel(): void {
        const panelWidth = 110;
        const panelHeight = 330;

        const g = this.add.graphics();
        g.fillStyle(COLORS.panelBg, 0.9);
        g.fillRoundedRect(NEXT_X - 5, NEXT_Y - 25, panelWidth, panelHeight, 8);
        g.lineStyle(1, COLORS.panelBorder, 0.5);
        g.strokeRoundedRect(NEXT_X - 5, NEXT_Y - 25, panelWidth, panelHeight, 8);

        this.addLabel(NEXT_X, NEXT_Y - 18, 'NEXT');
        this.nextPieceSprites = [];
    }

    // ─── Overlays ───────────────────────────────────────────────

    private createPauseOverlay(): void {
        const { width, height } = this.scale;

        this.pauseOverlay = this.add.container(0, 0).setDepth(100).setVisible(false);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
        this.pauseOverlay.add(bg);

        const text = this.add.text(width / 2, height / 2, 'PAUSED', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '36px',
            color: '#00f0f0',
            stroke: '#003344',
            strokeThickness: 3,
        }).setOrigin(0.5);
        this.pauseOverlay.add(text);

        const subText = this.add.text(width / 2, height / 2 + 50, 'Press ESC to resume', {
            fontFamily: 'Roboto, sans-serif',
            fontSize: '14px',
            color: '#6666aa',
        }).setOrigin(0.5);
        this.pauseOverlay.add(subText);
    }

    private createGameOverOverlay(): void {
        const { width, height } = this.scale;

        this.gameOverOverlay = this.add.container(0, 0).setDepth(100).setVisible(false);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
        this.gameOverOverlay.add(bg);

        // Will be populated when game ends
    }

    private showGameOver(): void {
        const { width, height } = this.scale;
        const gs = this.gameState;
        const isCompleted = gs.status === GameStatus.COMPLETED;

        // Clear existing
        this.gameOverOverlay.removeAll(true);

        const bg = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
        this.gameOverOverlay.add(bg);

        const title = isCompleted ? 'COMPLETE!' : 'GAME OVER';
        const titleColor = isCompleted ? '#00f000' : '#f00000';

        const titleText = this.add.text(width / 2, height / 2 - 110, title, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '32px',
            fontStyle: 'bold',
            color: titleColor,
        }).setOrigin(0.5);
        this.gameOverOverlay.add(titleText);

        // Stats
        const stats = [
            `Score: ${gs.score.toLocaleString()}`,
            `Lines: ${gs.totalLines}`,
            `Level: ${gs.level}`,
            `Time: ${this.formatTime(gs.elapsedMs)}`,
        ];

        stats.forEach((stat, i) => {
            const t = this.add.text(width / 2, height / 2 - 40 + i * 30, stat, {
                fontFamily: 'Roboto, sans-serif',
                fontSize: '16px',
                color: '#ccccee',
            }).setOrigin(0.5);
            this.gameOverOverlay.add(t);
        });

        // Buttons
        this.createOverlayButton(width / 2, height / 2 + 100, 'PLAY AGAIN', () => {
            this.scene.restart({ modeType: this.modeType });
        });

        this.createOverlayButton(width / 2, height / 2 + 150, 'MENU', () => {
            this.scene.start('MenuScene');
        });

        this.gameOverOverlay.setVisible(true);
        this.gameOverOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.gameOverOverlay,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
        });
    }

    private createOverlayButton(x: number, y: number, label: string, callback: () => void): void {
        const btnWidth = 180;
        const btnHeight = 36;

        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a4a, 0.9);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
        bg.lineStyle(1, 0x3333aa, 0.7);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
        this.gameOverOverlay.add(bg);

        const text = this.add.text(x, y, label, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '13px',
            color: '#00f0f0',
        }).setOrigin(0.5);
        this.gameOverOverlay.add(text);

        const hitZone = this.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.gameOverOverlay.add(hitZone);

        hitZone.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x2a2a6a, 0.95);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
            bg.lineStyle(1, 0x5555cc, 0.9);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
        });

        hitZone.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x1a1a4a, 0.9);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
            bg.lineStyle(1, 0x3333aa, 0.7);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
        });

        hitZone.on('pointerdown', callback);
    }

    // ─── Input Handling ─────────────────────────────────────────

    private handleInput(delta: number): void {
        const gs = this.gameState;
        if (gs.status !== GameStatus.PLAYING) return;

        // Pause
        if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
            gs.togglePause();
            this.pauseOverlay.setVisible(gs.status === GameStatus.PAUSED);
            return;
        }

        // Rotate CW (Up arrow)
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            gs.rotateCW();
        }

        // Rotate CCW (Z)
        if (Phaser.Input.Keyboard.JustDown(this.keyZ)) {
            gs.rotateCCW();
        }

        // Hard drop (Space)
        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            gs.hardDrop();
        }

        // Hold (C)
        if (Phaser.Input.Keyboard.JustDown(this.keyC)) {
            gs.hold();
        }

        // Soft drop (Down — continuous)
        if (this.cursors.down.isDown) {
            gs.softDrop();
        }

        // DAS/ARR for left/right
        this.handleDAS(delta);
    }

    private handleDAS(delta: number): void {
        const gs = this.gameState;
        const leftDown = this.cursors.left.isDown;
        const rightDown = this.cursors.right.isDown;

        if (leftDown && !rightDown) {
            if (this.dasDirection !== 'left') {
                this.dasDirection = 'left';
                this.dasTimer = 0;
                this.arrTimer = 0;
                this.dasActive = false;
                gs.moveLeft();
            } else {
                this.dasTimer += delta;
                if (this.dasTimer >= DAS_DELAY) {
                    this.dasActive = true;
                    this.arrTimer += delta;
                    while (this.arrTimer >= ARR_RATE) {
                        this.arrTimer -= ARR_RATE;
                        gs.moveLeft();
                    }
                }
            }
        } else if (rightDown && !leftDown) {
            if (this.dasDirection !== 'right') {
                this.dasDirection = 'right';
                this.dasTimer = 0;
                this.arrTimer = 0;
                this.dasActive = false;
                gs.moveRight();
            } else {
                this.dasTimer += delta;
                if (this.dasTimer >= DAS_DELAY) {
                    this.dasActive = true;
                    this.arrTimer += delta;
                    while (this.arrTimer >= ARR_RATE) {
                        this.arrTimer -= ARR_RATE;
                        gs.moveRight();
                    }
                }
            }
        } else {
            this.dasDirection = null;
            this.dasTimer = 0;
            this.dasActive = false;
        }
    }

    // Handle pause toggle when paused
    private handlePauseInput(): void {
        if (this.gameState.status === GameStatus.PAUSED) {
            if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
                this.gameState.togglePause();
                this.pauseOverlay.setVisible(false);
            }
        }
    }

    // ─── Rendering ──────────────────────────────────────────────

    private renderAll(): void {
        this.renderLockedBlocks();
        this.renderGhostPiece();
        this.renderCurrentPiece();
        this.renderHoldPiece();
        this.renderNextPieces();
    }

    private renderLockedBlocks(): void {
        // Clear existing locked block sprites
        for (let r = 0; r < BOARD_VISIBLE_ROWS; r++) {
            for (let c = 0; c < BOARD_COLS; c++) {
                if (this.lockedBlocks[r]?.[c]) {
                    this.lockedBlocks[r][c]!.destroy();
                    this.lockedBlocks[r][c] = null;
                }
            }
        }

        // Draw locked cells
        const board = this.gameState.board;
        for (let r = 0; r < BOARD_VISIBLE_ROWS; r++) {
            const gridRow = r + BOARD_BUFFER_ROWS;
            for (let c = 0; c < BOARD_COLS; c++) {
                const cell = board.grid[gridRow][c];
                if (cell !== null) {
                    const img = this.add.image(
                        BOARD_X + c * CELL_SIZE + CELL_SIZE / 2,
                        BOARD_Y + r * CELL_SIZE + CELL_SIZE / 2,
                        `block_${cell}`
                    ).setDepth(2);
                    this.lockedBlocks[r][c] = img;
                }
            }
        }
    }

    private renderCurrentPiece(): void {
        // Clear previous
        this.currentPieceSprites.forEach(s => s.destroy());
        this.currentPieceSprites = [];

        const piece = this.gameState.currentPiece;
        if (!piece) return;

        const cells = getAbsoluteCells(piece.type, piece.rotation, piece.row, piece.col);
        for (const cell of cells) {
            const visRow = cell.row - BOARD_BUFFER_ROWS;
            if (visRow < 0) continue; // Above visible area

            const img = this.add.image(
                BOARD_X + cell.col * CELL_SIZE + CELL_SIZE / 2,
                BOARD_Y + visRow * CELL_SIZE + CELL_SIZE / 2,
                `block_${piece.type}`
            ).setDepth(5);
            this.currentPieceSprites.push(img);
        }
    }

    private renderGhostPiece(): void {
        // Clear previous
        this.ghostPieceSprites.forEach(s => s.destroy());
        this.ghostPieceSprites = [];

        const piece = this.gameState.currentPiece;
        if (!piece) return;

        const ghostRow = this.gameState.getGhostRow();
        if (ghostRow === piece.row) return; // Already at bottom

        const cells = getAbsoluteCells(piece.type, piece.rotation, ghostRow, piece.col);
        for (const cell of cells) {
            const visRow = cell.row - BOARD_BUFFER_ROWS;
            if (visRow < 0) continue;

            const img = this.add.image(
                BOARD_X + cell.col * CELL_SIZE + CELL_SIZE / 2,
                BOARD_Y + visRow * CELL_SIZE + CELL_SIZE / 2,
                'block_ghost'
            ).setDepth(3);
            this.ghostPieceSprites.push(img);
        }
    }

    private renderHoldPiece(): void {
        this.holdPieceSprites.forEach(s => s.destroy());
        this.holdPieceSprites = [];

        const holdType = this.gameState.holdPiece;
        if (!holdType) return;

        const cells = getCells(holdType, 0);
        const miniSize = CELL_SIZE * 0.7;
        const offsetX = HOLD_X + 15;
        const offsetY = HOLD_Y + 10;

        for (const cell of cells) {
            const img = this.add.image(
                offsetX + cell.col * miniSize + miniSize / 2,
                offsetY + cell.row * miniSize + miniSize / 2,
                `block_${holdType}`
            ).setScale(0.7).setDepth(2);

            if (this.gameState.holdUsed) {
                img.setAlpha(0.4);
            }

            this.holdPieceSprites.push(img);
        }
    }

    private renderNextPieces(): void {
        this.nextPieceSprites.forEach(group => group.forEach(s => s.destroy()));
        this.nextPieceSprites = [];

        const queue = this.gameState.nextQueue;
        const miniSize = CELL_SIZE * 0.65;
        const spacing = 60;

        for (let i = 0; i < Math.min(queue.length, 5); i++) {
            const type = queue[i];
            const cells = getCells(type, 0);
            const group: Phaser.GameObjects.Image[] = [];

            const offsetX = NEXT_X + 15;
            const offsetY = NEXT_Y + 10 + i * spacing;

            for (const cell of cells) {
                const img = this.add.image(
                    offsetX + cell.col * miniSize + miniSize / 2,
                    offsetY + cell.row * miniSize + miniSize / 2,
                    `block_${type}`
                ).setScale(0.65).setDepth(2);
                group.push(img);
            }
            this.nextPieceSprites.push(group);
        }
    }

    private updateHUD(): void {
        const gs = this.gameState;
        this.scoreText.setText(gs.score.toLocaleString());
        this.levelText.setText(String(gs.level));
        this.linesText.setText(String(gs.totalLines));

        if (this.modeType === GameModeType.ULTRA) {
            // Count down for Ultra
            const remaining = Math.max(0, gs.mode.timeLimit - gs.elapsedMs);
            this.timeText.setText(this.formatTime(remaining));
            if (remaining < 10000) {
                this.timeText.setColor('#f00000');
            }
        } else {
            this.timeText.setText(this.formatTime(gs.elapsedMs));
        }

        // Handle pause overlay when paused
        if (gs.status === GameStatus.PAUSED) {
            this.pauseOverlay.setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
                gs.togglePause();
                this.pauseOverlay.setVisible(false);
            }
        }

        // Handle game over
        if ((gs.status === GameStatus.GAME_OVER || gs.status === GameStatus.COMPLETED) &&
            !this.gameOverOverlay.visible) {
            this.showGameOver();
        }
    }

    private formatTime(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const hundredths = Math.floor((ms % 1000) / 10);
        return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
    }

    // ─── Effects ────────────────────────────────────────────────

    private handleGameEvent(event: GameEvent): void {
        switch (event.type) {
            case 'line_clear':
                this.onLineClear(event.data);
                break;
            case 'hard_drop':
                this.onHardDrop(event.data);
                break;
            case 'level_up':
                this.onLevelUp(event.data);
                break;
        }
    }

    private onLineClear(data: any): void {
        const { clearType, combo, linesCleared, isBackToBack } = data;

        // Flash effect on cleared rows
        if (data.rows) {
            for (const row of data.rows) {
                const visRow = row - BOARD_BUFFER_ROWS;
                if (visRow >= 0 && visRow < BOARD_VISIBLE_ROWS) {
                    const flash = this.add.rectangle(
                        BOARD_X + BOARD_WIDTH / 2,
                        BOARD_Y + visRow * CELL_SIZE + CELL_SIZE / 2,
                        BOARD_WIDTH, CELL_SIZE,
                        0xffffff, 0.8
                    ).setDepth(20);

                    this.tweens.add({
                        targets: flash,
                        alpha: 0,
                        duration: 300,
                        ease: 'Power2',
                        onComplete: () => flash.destroy(),
                    });
                }
            }
        }

        // Show clear type text
        let clearLabel = '';
        switch (clearType) {
            case ClearType.SINGLE: clearLabel = 'SINGLE'; break;
            case ClearType.DOUBLE: clearLabel = 'DOUBLE'; break;
            case ClearType.TRIPLE: clearLabel = 'TRIPLE'; break;
            case ClearType.TETRIS: clearLabel = 'TETRIS!'; break;
            case ClearType.TSPIN_MINI: clearLabel = 'T-SPIN MINI'; break;
            case ClearType.TSPIN_SINGLE: clearLabel = 'T-SPIN SINGLE'; break;
            case ClearType.TSPIN_DOUBLE: clearLabel = 'T-SPIN DOUBLE!'; break;
            case ClearType.TSPIN_TRIPLE: clearLabel = 'T-SPIN TRIPLE!'; break;
        }

        if (isBackToBack && clearLabel) {
            clearLabel = 'B2B ' + clearLabel;
        }

        if (clearLabel) {
            this.showClearText(clearLabel);
        }

        // Combo text
        if (combo > 0) {
            this.showComboText(combo);
        }

        // Particle burst for big clears
        if (linesCleared >= 4 || clearType.startsWith('TSPIN')) {
            this.createParticleBurst();
        }
    }

    private onHardDrop(data: any): void {
        if (data.distance > 2) {
            // Screen shake
            this.cameras.main.shake(100, 0.005);
        }
    }

    private onLevelUp(data: any): void {
        const text = this.add.text(
            BOARD_X + BOARD_WIDTH / 2,
            BOARD_Y + BOARD_HEIGHT / 2,
            `LEVEL ${data.level}`,
            {
                fontFamily: 'Orbitron, monospace',
                fontSize: '24px',
                color: '#00f0f0',
                stroke: '#003344',
                strokeThickness: 3,
            }
        ).setOrigin(0.5).setDepth(15).setAlpha(0);

        this.tweens.add({
            targets: text,
            alpha: 1,
            y: text.y - 40,
            duration: 300,
            ease: 'Power2',
            yoyo: true,
            hold: 500,
            onComplete: () => text.destroy(),
        });
    }

    private showClearText(label: string): void {
        this.clearTypeText.setText(label);
        this.clearTypeText.setAlpha(1);
        this.clearTypeText.setY(BOARD_Y + BOARD_HEIGHT / 2 - 30);

        this.tweens.killTweensOf(this.clearTypeText);
        this.tweens.add({
            targets: this.clearTypeText,
            alpha: 0,
            y: this.clearTypeText.y - 30,
            duration: 1200,
            ease: 'Power2',
        });
    }

    private showComboText(combo: number): void {
        this.comboText.setText(`${combo} COMBO`);
        this.comboText.setAlpha(1);
        this.comboText.setY(BOARD_Y + BOARD_HEIGHT / 2 + 10);

        this.tweens.killTweensOf(this.comboText);
        this.tweens.add({
            targets: this.comboText,
            alpha: 0,
            y: this.comboText.y - 20,
            duration: 1000,
            ease: 'Power2',
        });
    }

    private createParticleBurst(): void {
        // Create a simple particle burst effect
        const cx = BOARD_X + BOARD_WIDTH / 2;
        const cy = BOARD_Y + BOARD_HEIGHT / 2;
        const colors = [0x00f0f0, 0xa000f0, 0xf0a000, 0x00f000, 0xf00000];

        for (let i = 0; i < 20; i++) {
            const color = Phaser.Utils.Array.GetRandom(colors);
            const particle = this.add.circle(
                cx, cy, Phaser.Math.Between(2, 5), color, 0.9
            ).setDepth(15);

            const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
            const dist = Phaser.Math.Between(80, 200);

            this.tweens.add({
                targets: particle,
                x: cx + Math.cos(angle) * dist,
                y: cy + Math.sin(angle) * dist,
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(400, 800),
                ease: 'Power3',
                onComplete: () => particle.destroy(),
            });
        }
    }

    private updateEffects(delta: number): void {
        // Effects are handled by tweens, no manual update needed
    }
}
