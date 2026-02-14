/**
 * Board / Matrix — the 10-wide, 40-tall (20 visible + 20 buffer) playing field.
 */

import { PieceType, getAbsoluteCells } from './Tetrominoes.js';

export const BOARD_COLS = 10;
export const BOARD_VISIBLE_ROWS = 20;
export const BOARD_BUFFER_ROWS = 20;
export const BOARD_ROWS = BOARD_VISIBLE_ROWS + BOARD_BUFFER_ROWS; // 40 total

export type CellValue = PieceType | null;

export class Board {
    grid: CellValue[][];

    constructor() {
        this.grid = Board.createEmptyGrid();
    }

    static createEmptyGrid(): CellValue[][] {
        return Array.from({ length: BOARD_ROWS }, () =>
            Array.from({ length: BOARD_COLS }, () => null)
        );
    }

    /** Reset the board to empty */
    reset(): void {
        this.grid = Board.createEmptyGrid();
    }

    /** Get cell value (null if out of bounds counts as occupied for collision) */
    getCell(row: number, col: number): CellValue | 'wall' {
        if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) {
            return 'wall';
        }
        return this.grid[row][col];
    }

    /** Check if a piece at the given position/rotation is valid (no collisions) */
    isValidPosition(
        type: PieceType,
        rotation: number,
        originRow: number,
        originCol: number
    ): boolean {
        const cells = getAbsoluteCells(type, rotation, originRow, originCol);
        return cells.every(c => {
            if (c.row < 0 || c.row >= BOARD_ROWS || c.col < 0 || c.col >= BOARD_COLS) {
                return false;
            }
            return this.grid[c.row][c.col] === null;
        });
    }

    /** Lock a piece onto the board */
    lockPiece(
        type: PieceType,
        rotation: number,
        originRow: number,
        originCol: number
    ): void {
        const cells = getAbsoluteCells(type, rotation, originRow, originCol);
        for (const c of cells) {
            if (c.row >= 0 && c.row < BOARD_ROWS && c.col >= 0 && c.col < BOARD_COLS) {
                this.grid[c.row][c.col] = type;
            }
        }
    }

    /**
     * Clear completed lines.
     * @returns Object with count of lines cleared and the row indices that were cleared.
     */
    clearLines(): { count: number; rows: number[] } {
        const clearedRows: number[] = [];

        for (let row = BOARD_ROWS - 1; row >= 0; row--) {
            if (this.grid[row].every(cell => cell !== null)) {
                clearedRows.push(row);
            }
        }

        if (clearedRows.length === 0) {
            return { count: 0, rows: [] };
        }

        // Remove cleared rows and add empty rows at top
        const newGrid = this.grid.filter((_, idx) => !clearedRows.includes(idx));
        const emptyRows = Array.from({ length: clearedRows.length }, () =>
            Array.from({ length: BOARD_COLS }, () => null as CellValue)
        );
        this.grid = [...emptyRows, ...newGrid];

        return { count: clearedRows.length, rows: clearedRows };
    }

    /** Calculate the ghost piece Y (the row where the piece would land on hard drop) */
    getGhostRow(
        type: PieceType,
        rotation: number,
        originRow: number,
        originCol: number
    ): number {
        let ghostRow = originRow;
        while (this.isValidPosition(type, rotation, ghostRow + 1, originCol)) {
            ghostRow++;
        }
        return ghostRow;
    }

    /** Check if any cell in the visible top row is occupied (for game over detection) */
    isTopRowOccupied(): boolean {
        // Check if any cell above the visible area is occupied
        for (let row = 0; row < BOARD_BUFFER_ROWS; row++) {
            if (this.grid[row].some(cell => cell !== null)) {
                return true;
            }
        }
        return false;
    }
}
