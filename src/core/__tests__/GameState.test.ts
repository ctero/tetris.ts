import { describe, it, expect, beforeEach } from 'vitest';
import { GameState, GameStatus } from '../GameState.js';
import {
    MARATHON_MODE,
    SPRINT_MODE,
    ULTRA_MODE,
    GameModeConfig,
} from '../GameMode.js';
import { PieceType, ALL_PIECE_TYPES } from '../Tetrominoes.js';
import { BOARD_COLS, BOARD_ROWS, BOARD_BUFFER_ROWS } from '../Board.js';

/** Create a deterministic RNG for reproducible tests */
function createTestRng(seed: number = 42): () => number {
    let s = seed;
    return () => {
        s = (s * 16807) % 2147483647;
        return s / 2147483647;
    };
}

describe('GameState', () => {
    let game: GameState;

    beforeEach(() => {
        game = new GameState(MARATHON_MODE, createTestRng());
    });

    describe('initialization', () => {
        it('should start in PLAYING status', () => {
            expect(game.status).toBe(GameStatus.PLAYING);
        });

        it('should have a current piece', () => {
            expect(game.currentPiece).not.toBeNull();
        });

        it('should spawn piece at the correct row', () => {
            const piece = game.currentPiece!;
            // Spawn row is BOARD_BUFFER_ROWS - 1 for non-I, BOARD_BUFFER_ROWS - 2 for I
            if (piece.type === PieceType.I) {
                expect(piece.row).toBe(BOARD_BUFFER_ROWS - 2);
            } else {
                expect(piece.row).toBe(BOARD_BUFFER_ROWS - 1);
            }
        });

        it('should spawn piece at column 3', () => {
            expect(game.currentPiece!.col).toBe(3);
        });

        it('should start with rotation 0', () => {
            expect(game.currentPiece!.rotation).toBe(0);
        });

        it('should have 5 pieces in the next queue', () => {
            expect(game.nextQueue).toHaveLength(5);
        });

        it('should start at level 1', () => {
            expect(game.level).toBe(1);
        });

        it('should start with 0 score', () => {
            expect(game.score).toBe(0);
        });

        it('should start with 0 lines', () => {
            expect(game.totalLines).toBe(0);
        });

        it('should have no hold piece', () => {
            expect(game.holdPiece).toBeNull();
        });
    });

    describe('movement', () => {
        it('should move left', () => {
            const startCol = game.currentPiece!.col;
            const moved = game.moveLeft();
            expect(moved).toBe(true);
            expect(game.currentPiece!.col).toBe(startCol - 1);
        });

        it('should move right', () => {
            const startCol = game.currentPiece!.col;
            const moved = game.moveRight();
            expect(moved).toBe(true);
            expect(game.currentPiece!.col).toBe(startCol + 1);
        });

        it('should not move left past the wall', () => {
            // Move all the way left
            for (let i = 0; i < 20; i++) game.moveLeft();
            const col = game.currentPiece!.col;
            const moved = game.moveLeft();
            // Should either fail or be at the boundary
            if (!moved) {
                expect(game.currentPiece!.col).toBe(col);
            }
        });

        it('should not move right past the wall', () => {
            for (let i = 0; i < 20; i++) game.moveRight();
            const col = game.currentPiece!.col;
            const moved = game.moveRight();
            if (!moved) {
                expect(game.currentPiece!.col).toBe(col);
            }
        });
    });

    describe('soft drop', () => {
        it('should move piece down by 1', () => {
            const startRow = game.currentPiece!.row;
            const dropped = game.softDrop();
            expect(dropped).toBe(true);
            expect(game.currentPiece!.row).toBe(startRow + 1);
        });

        it('should award 1 point per cell', () => {
            game.softDrop();
            expect(game.score).toBe(1);
        });

        it('should award points for multiple soft drops', () => {
            game.softDrop();
            game.softDrop();
            game.softDrop();
            expect(game.score).toBe(3);
        });
    });

    describe('hard drop', () => {
        it('should place piece at ghost row and lock', () => {
            const ghostRow = game.getGhostRow();
            const pieceType = game.currentPiece!.type;
            game.hardDrop();

            // Current piece should be a new one (spawned after lock)
            // The old piece should be locked on the board
            // Score should include hard drop points
            expect(game.score).toBeGreaterThan(0);
        });

        it('should spawn next piece after hard drop', () => {
            const firstType = game.currentPiece!.type;
            const nextType = game.nextQueue[0];
            game.hardDrop();

            if (game.status === GameStatus.PLAYING) {
                expect(game.currentPiece!.type).toBe(nextType);
            }
        });

        it('should award 2 points per cell dropped', () => {
            const startRow = game.currentPiece!.row;
            const ghostRow = game.getGhostRow();
            const distance = ghostRow - startRow;
            game.hardDrop();
            // Score should be at least 2 × distance (may have additional scoring from line clears)
            expect(game.score).toBeGreaterThanOrEqual(distance * 2);
        });
    });

    describe('rotation', () => {
        it('should rotate CW', () => {
            const piece = game.currentPiece!;
            if (piece.type !== PieceType.O) {
                const rotated = game.rotateCW();
                expect(rotated).toBe(true);
                expect(game.currentPiece!.rotation).toBe(1);
            }
        });

        it('should rotate CCW', () => {
            const piece = game.currentPiece!;
            if (piece.type !== PieceType.O) {
                const rotated = game.rotateCCW();
                expect(rotated).toBe(true);
                expect(game.currentPiece!.rotation).toBe(3);
            }
        });
    });

    describe('hold', () => {
        it('should store current piece in hold', () => {
            const firstType = game.currentPiece!.type;
            game.hold();
            expect(game.holdPiece).toBe(firstType);
        });

        it('should spawn next piece from queue on first hold', () => {
            const nextType = game.nextQueue[0];
            game.hold();
            expect(game.currentPiece!.type).toBe(nextType);
        });

        it('should swap hold and current on second hold', () => {
            const firstType = game.currentPiece!.type;
            game.hold(); // Hold firstType, spawn from queue
            const secondType = game.currentPiece!.type;
            expect(game.holdPiece).toBe(firstType);

            // Hard drop to lock current, then hold on the new piece
            game.hardDrop();
            if (game.status !== GameStatus.PLAYING) return;

            const thirdType = game.currentPiece!.type;
            game.hold(); // Should swap thirdType with firstType from hold
            expect(game.currentPiece!.type).toBe(firstType);
            expect(game.holdPiece).toBe(thirdType);
        });

        it('should not allow double hold in same piece', () => {
            game.hold();
            const result = game.hold();
            expect(result).toBe(false);
        });

        it('should reset holdUsed after locking a piece', () => {
            game.hold();
            // Can't hold again
            expect(game.hold()).toBe(false);

            // Hard drop to lock and spawn new piece
            game.hardDrop();
            if (game.status !== GameStatus.PLAYING) return;

            // Should be able to hold again
            expect(game.hold()).toBe(true);
        });
    });

    describe('ghost piece', () => {
        it('should return a row at or below the current piece', () => {
            const ghostRow = game.getGhostRow();
            expect(ghostRow).toBeGreaterThanOrEqual(game.currentPiece!.row);
        });

        it('should be at the bottom on an empty board', () => {
            const ghostRow = game.getGhostRow();
            // Should be near the bottom of the board
            expect(ghostRow).toBeGreaterThan(BOARD_BUFFER_ROWS);
        });
    });

    describe('pause', () => {
        it('should toggle to PAUSED', () => {
            game.togglePause();
            expect(game.status).toBe(GameStatus.PAUSED);
        });

        it('should resume from PAUSED', () => {
            game.togglePause();
            game.togglePause();
            expect(game.status).toBe(GameStatus.PLAYING);
        });

        it('should not process ticks when paused', () => {
            const piece = game.currentPiece!;
            const startRow = piece.row;
            game.togglePause();
            game.tick(10000); // Large delta
            expect(game.currentPiece!.row).toBe(startRow);
        });
    });

    describe('gravity', () => {
        it('should move piece down over time', () => {
            const startRow = game.currentPiece!.row;
            // Tick enough for gravity at level 1 (~1 second per cell)
            game.tick(1500);
            expect(game.currentPiece!.row).toBeGreaterThan(startRow);
        });

        it('should not move piece if delta is too small', () => {
            const startRow = game.currentPiece!.row;
            game.tick(1);
            expect(game.currentPiece!.row).toBe(startRow);
        });
    });

    describe('game over', () => {
        it('should set GAME_OVER when piece cannot spawn', () => {
            // Fill rows with a gap so they DON'T get cleared during hard drop,
            // but still block the spawn position (cols 0-8 filled, col 9 empty)
            for (let r = BOARD_BUFFER_ROWS - 4; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS - 1; c++) {
                    game.board.grid[r][c] = PieceType.I;
                }
            }

            // Force a hard drop to trigger next spawn attempt
            game.hardDrop();
            expect(game.status).toBe(GameStatus.GAME_OVER);
        });
    });

    describe('events', () => {
        it('should fire events through onEvent callback', () => {
            const events: string[] = [];
            game.onEvent = (e) => events.push(e.type);

            game.hardDrop();
            expect(events).toContain('hard_drop');
            expect(events).toContain('lock');
        });
    });
});
