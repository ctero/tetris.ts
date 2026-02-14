import { describe, it, expect, beforeEach } from 'vitest';
import { Board, BOARD_COLS, BOARD_ROWS, BOARD_BUFFER_ROWS, BOARD_VISIBLE_ROWS } from '../Board.js';
import { PieceType } from '../Tetrominoes.js';

describe('Board', () => {
    let board: Board;

    beforeEach(() => {
        board = new Board();
    });

    describe('initialization', () => {
        it('should create a grid of correct dimensions', () => {
            expect(board.grid.length).toBe(BOARD_ROWS);
            expect(board.grid[0].length).toBe(BOARD_COLS);
        });

        it('should initialize all cells to null', () => {
            for (let r = 0; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    expect(board.grid[r][c]).toBeNull();
                }
            }
        });

        it('should have 10 columns', () => {
            expect(BOARD_COLS).toBe(10);
        });

        it('should have 20 visible rows and 20 buffer rows', () => {
            expect(BOARD_VISIBLE_ROWS).toBe(20);
            expect(BOARD_BUFFER_ROWS).toBe(20);
            expect(BOARD_ROWS).toBe(40);
        });
    });

    describe('getCell', () => {
        it('should return null for empty cells', () => {
            expect(board.getCell(20, 5)).toBeNull();
        });

        it('should return "wall" for out-of-bounds positions', () => {
            expect(board.getCell(-1, 0)).toBe('wall');
            expect(board.getCell(BOARD_ROWS, 0)).toBe('wall');
            expect(board.getCell(0, -1)).toBe('wall');
            expect(board.getCell(0, BOARD_COLS)).toBe('wall');
        });

        it('should return the piece type for occupied cells', () => {
            board.grid[20][5] = PieceType.T;
            expect(board.getCell(20, 5)).toBe(PieceType.T);
        });
    });

    describe('isValidPosition', () => {
        it('should return true for valid empty positions', () => {
            // T piece at buffer boundary, centered
            expect(board.isValidPosition(PieceType.T, 0, 19, 3)).toBe(true);
        });

        it('should return false when piece goes below bottom', () => {
            expect(board.isValidPosition(PieceType.T, 0, BOARD_ROWS - 1, 3)).toBe(false);
        });

        it('should return false when piece goes past left wall', () => {
            expect(board.isValidPosition(PieceType.T, 0, 20, -1)).toBe(false);
        });

        it('should return false when piece goes past right wall', () => {
            expect(board.isValidPosition(PieceType.T, 0, 20, BOARD_COLS - 1)).toBe(false);
        });

        it('should return false when piece overlaps occupied cell', () => {
            board.grid[20][4] = PieceType.I;
            // T piece state 0: cells at (0,1), (1,0), (1,1), (1,2) relative
            // At origin (19, 3): cells at (19,4), (20,3), (20,4), (20,5)
            // (19,4) is empty, but (20,4) overlaps with occupied cell
            expect(board.isValidPosition(PieceType.T, 0, 19, 3)).toBe(false);
        });

        it('should return true when I piece fits in valid position', () => {
            // I piece state 0: horizontal at row 1
            expect(board.isValidPosition(PieceType.I, 0, 20, 0)).toBe(true);
        });

        it('should return false when I piece extends past right wall', () => {
            // I piece state 0: cells at (1,0),(1,1),(1,2),(1,3) — needs 4 cols
            expect(board.isValidPosition(PieceType.I, 0, 20, 7)).toBe(false);
        });
    });

    describe('lockPiece', () => {
        it('should write piece cells to the grid', () => {
            // Lock an O piece at row 38, col 4
            board.lockPiece(PieceType.O, 0, 38, 4);
            expect(board.grid[38][4]).toBe(PieceType.O);
            expect(board.grid[38][5]).toBe(PieceType.O);
            expect(board.grid[39][4]).toBe(PieceType.O);
            expect(board.grid[39][5]).toBe(PieceType.O);
        });

        it('should not overwrite other pieces', () => {
            board.grid[39][3] = PieceType.I;
            board.lockPiece(PieceType.O, 0, 38, 4);
            expect(board.grid[39][3]).toBe(PieceType.I);
        });
    });

    describe('clearLines', () => {
        it('should return 0 when no lines are complete', () => {
            const result = board.clearLines();
            expect(result.count).toBe(0);
            expect(result.rows).toHaveLength(0);
        });

        it('should clear a single completed line', () => {
            // Fill entire bottom row
            for (let c = 0; c < BOARD_COLS; c++) {
                board.grid[BOARD_ROWS - 1][c] = PieceType.I;
            }
            const result = board.clearLines();
            expect(result.count).toBe(1);
            expect(result.rows).toContain(BOARD_ROWS - 1);
            // After clearing, bottom row should be empty
            for (let c = 0; c < BOARD_COLS; c++) {
                expect(board.grid[BOARD_ROWS - 1][c]).toBeNull();
            }
        });

        it('should clear multiple lines (double)', () => {
            for (let r = BOARD_ROWS - 2; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    board.grid[r][c] = PieceType.I;
                }
            }
            const result = board.clearLines();
            expect(result.count).toBe(2);
        });

        it('should clear a tetris (4 lines)', () => {
            for (let r = BOARD_ROWS - 4; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    board.grid[r][c] = PieceType.I;
                }
            }
            const result = board.clearLines();
            expect(result.count).toBe(4);
        });

        it('should shift rows above cleared lines down', () => {
            // Place a block at row 37, col 0
            board.grid[BOARD_ROWS - 3][0] = PieceType.T;

            // Fill row 38 and 39 completely
            for (let c = 0; c < BOARD_COLS; c++) {
                board.grid[BOARD_ROWS - 2][c] = PieceType.I;
                board.grid[BOARD_ROWS - 1][c] = PieceType.I;
            }

            board.clearLines();

            // The T block from row 37 should have shifted down by 2 to row 39
            expect(board.grid[BOARD_ROWS - 1][0]).toBe(PieceType.T);
        });

        it('should not clear incomplete lines', () => {
            // Fill all but one cell in bottom row
            for (let c = 0; c < BOARD_COLS - 1; c++) {
                board.grid[BOARD_ROWS - 1][c] = PieceType.I;
            }
            const result = board.clearLines();
            expect(result.count).toBe(0);
        });
    });

    describe('getGhostRow', () => {
        it('should return the bottom row for an empty board', () => {
            // T piece state 0 has cells at row 0 and 1 relative, so bottom is BOARD_ROWS - 2
            const ghostRow = board.getGhostRow(PieceType.T, 0, 19, 3);
            expect(ghostRow).toBe(BOARD_ROWS - 2);
        });

        it('should stop above occupied cells', () => {
            // Place blocks across the bottom
            for (let c = 0; c < BOARD_COLS; c++) {
                board.grid[BOARD_ROWS - 1][c] = PieceType.I;
            }
            // T piece should land one row above the filled row (row -2 for the piece, since T has cells at y+1)
            const ghostRow = board.getGhostRow(PieceType.T, 0, 19, 3);
            expect(ghostRow).toBe(BOARD_ROWS - 3);
        });

        it('should return current row if piece cannot move down', () => {
            // Fill rows directly below the piece's starting position
            for (let c = 0; c < BOARD_COLS; c++) {
                board.grid[21][c] = PieceType.I;
            }
            // Piece at row 19 has cells at row 20 (one above the filled row 21)
            const ghostRow = board.getGhostRow(PieceType.T, 0, 19, 3);
            expect(ghostRow).toBe(19);
        });
    });

    describe('reset', () => {
        it('should clear all cells', () => {
            board.grid[20][5] = PieceType.T;
            board.grid[30][3] = PieceType.I;
            board.reset();

            for (let r = 0; r < BOARD_ROWS; r++) {
                for (let c = 0; c < BOARD_COLS; c++) {
                    expect(board.grid[r][c]).toBeNull();
                }
            }
        });
    });
});
