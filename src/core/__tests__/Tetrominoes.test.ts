import { describe, it, expect } from 'vitest';
import {
    PieceType,
    ALL_PIECE_TYPES,
    TETROMINOES,
    getCells,
    getAbsoluteCells,
} from '../Tetrominoes.js';

describe('Tetrominoes', () => {
    describe('piece definitions', () => {
        it('should define all 7 piece types', () => {
            expect(ALL_PIECE_TYPES).toHaveLength(7);
            expect(ALL_PIECE_TYPES).toContain(PieceType.I);
            expect(ALL_PIECE_TYPES).toContain(PieceType.O);
            expect(ALL_PIECE_TYPES).toContain(PieceType.T);
            expect(ALL_PIECE_TYPES).toContain(PieceType.S);
            expect(ALL_PIECE_TYPES).toContain(PieceType.Z);
            expect(ALL_PIECE_TYPES).toContain(PieceType.J);
            expect(ALL_PIECE_TYPES).toContain(PieceType.L);
        });

        it('each piece should have 4 rotation states', () => {
            for (const type of ALL_PIECE_TYPES) {
                const def = TETROMINOES[type];
                expect(def.states).toHaveLength(4);
            }
        });

        it('each rotation state should have exactly 4 cells', () => {
            for (const type of ALL_PIECE_TYPES) {
                const def = TETROMINOES[type];
                for (let r = 0; r < 4; r++) {
                    expect(def.states[r]).toHaveLength(4);
                }
            }
        });

        it('each piece should have a color and glow color', () => {
            for (const type of ALL_PIECE_TYPES) {
                const def = TETROMINOES[type];
                expect(typeof def.color).toBe('number');
                expect(typeof def.glowColor).toBe('number');
                expect(def.color).toBeGreaterThan(0);
                expect(def.glowColor).toBeGreaterThan(0);
            }
        });

        it('O piece should have identical rotation states', () => {
            const states = TETROMINOES[PieceType.O].states;
            for (let r = 1; r < 4; r++) {
                expect(states[r]).toEqual(states[0]);
            }
        });
    });

    describe('I piece', () => {
        it('state 0 should be horizontal (all same row)', () => {
            const cells = getCells(PieceType.I, 0);
            const rows = new Set(cells.map(c => c.row));
            expect(rows.size).toBe(1); // All on same row
            expect(cells.map(c => c.col).sort()).toEqual([0, 1, 2, 3]);
        });

        it('state 1 should be vertical (all same column)', () => {
            const cells = getCells(PieceType.I, 1);
            const cols = new Set(cells.map(c => c.col));
            expect(cols.size).toBe(1); // All on same column
            expect(cells.map(c => c.row).sort()).toEqual([0, 1, 2, 3]);
        });
    });

    describe('T piece', () => {
        it('state 0 should have T shape pointing up', () => {
            const cells = getCells(PieceType.T, 0);
            // Top center + bottom row of 3
            expect(cells).toContainEqual({ row: 0, col: 1 });
            expect(cells).toContainEqual({ row: 1, col: 0 });
            expect(cells).toContainEqual({ row: 1, col: 1 });
            expect(cells).toContainEqual({ row: 1, col: 2 });
        });
    });

    describe('getCells', () => {
        it('should return cells for valid rotation', () => {
            const cells = getCells(PieceType.T, 0);
            expect(cells).toHaveLength(4);
        });

        it('should handle rotation wrapping with bitwise AND', () => {
            const cells0 = getCells(PieceType.T, 0);
            const cells4 = getCells(PieceType.T, 4); // Should wrap to 0
            expect(cells4).toEqual(cells0);
        });
    });

    describe('getAbsoluteCells', () => {
        it('should offset cells by origin position', () => {
            const cells = getAbsoluteCells(PieceType.O, 0, 10, 5);
            // O piece state 0: (0,0), (0,1), (1,0), (1,1) relative
            expect(cells).toContainEqual({ row: 10, col: 5 });
            expect(cells).toContainEqual({ row: 10, col: 6 });
            expect(cells).toContainEqual({ row: 11, col: 5 });
            expect(cells).toContainEqual({ row: 11, col: 6 });
        });

        it('should work with negative origins (buffer zone)', () => {
            const cells = getAbsoluteCells(PieceType.T, 0, -1, 3);
            expect(cells).toContainEqual({ row: -1, col: 4 }); // top of T
            expect(cells).toContainEqual({ row: 0, col: 3 });
        });
    });
});
