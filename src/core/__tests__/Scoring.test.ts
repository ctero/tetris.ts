import { describe, it, expect, beforeEach } from 'vitest';
import {
    ScoringState,
    createScoringState,
    processLineClear,
    scoreSoftDrop,
    scoreHardDrop,
    determineClearType,
    ClearType,
} from '../Scoring.js';

describe('Scoring', () => {
    let state: ScoringState;

    beforeEach(() => {
        state = createScoringState();
    });

    describe('determineClearType', () => {
        it('should return NONE for 0 lines, no T-spin', () => {
            expect(determineClearType(0, false, false)).toBe(ClearType.NONE);
        });

        it('should return SINGLE for 1 line', () => {
            expect(determineClearType(1, false, false)).toBe(ClearType.SINGLE);
        });

        it('should return DOUBLE for 2 lines', () => {
            expect(determineClearType(2, false, false)).toBe(ClearType.DOUBLE);
        });

        it('should return TRIPLE for 3 lines', () => {
            expect(determineClearType(3, false, false)).toBe(ClearType.TRIPLE);
        });

        it('should return TETRIS for 4 lines', () => {
            expect(determineClearType(4, false, false)).toBe(ClearType.TETRIS);
        });

        it('should return TSPIN_ZERO for T-spin with 0 lines', () => {
            expect(determineClearType(0, true, false)).toBe(ClearType.TSPIN_ZERO);
        });

        it('should return TSPIN_SINGLE for T-spin with 1 line', () => {
            expect(determineClearType(1, true, false)).toBe(ClearType.TSPIN_SINGLE);
        });

        it('should return TSPIN_DOUBLE for T-spin with 2 lines', () => {
            expect(determineClearType(2, true, false)).toBe(ClearType.TSPIN_DOUBLE);
        });

        it('should return TSPIN_TRIPLE for T-spin with 3 lines', () => {
            expect(determineClearType(3, true, false)).toBe(ClearType.TSPIN_TRIPLE);
        });

        it('should return TSPIN_MINI for T-spin mini with 1 line', () => {
            expect(determineClearType(1, false, true)).toBe(ClearType.TSPIN_MINI);
        });
    });

    describe('basic scoring at level 1', () => {
        it('should score 100 for a single', () => {
            const result = processLineClear(state, 1, 1, false, false);
            expect(result.scoreAwarded).toBe(100);
            expect(state.score).toBe(100);
        });

        it('should score 300 for a double', () => {
            const result = processLineClear(state, 2, 1, false, false);
            expect(result.scoreAwarded).toBe(300);
        });

        it('should score 500 for a triple', () => {
            const result = processLineClear(state, 3, 1, false, false);
            expect(result.scoreAwarded).toBe(500);
        });

        it('should score 800 for a tetris', () => {
            const result = processLineClear(state, 4, 1, false, false);
            expect(result.scoreAwarded).toBe(800);
        });
    });

    describe('level multiplier', () => {
        it('should multiply score by level', () => {
            const result = processLineClear(state, 1, 5, false, false);
            expect(result.scoreAwarded).toBe(500); // 100 × 5
        });

        it('should multiply tetris score by level', () => {
            const result = processLineClear(state, 4, 3, false, false);
            expect(result.scoreAwarded).toBe(2400); // 800 × 3
        });
    });

    describe('T-spin scoring', () => {
        it('should score 800 × level for T-spin single', () => {
            const result = processLineClear(state, 1, 1, true, false);
            expect(result.scoreAwarded).toBe(800);
        });

        it('should score 1200 × level for T-spin double', () => {
            const result = processLineClear(state, 2, 1, true, false);
            expect(result.scoreAwarded).toBe(1200);
        });

        it('should score 1600 × level for T-spin triple', () => {
            const result = processLineClear(state, 3, 1, true, false);
            expect(result.scoreAwarded).toBe(1600);
        });

        it('should score 100 × level for T-spin mini', () => {
            const result = processLineClear(state, 1, 1, false, true);
            expect(result.scoreAwarded).toBe(100);
        });
    });

    describe('combo scoring', () => {
        it('should start combo at 0 on first line clear', () => {
            const result = processLineClear(state, 1, 1, false, false);
            expect(result.combo).toBe(0);
        });

        it('should increment combo on consecutive clears', () => {
            processLineClear(state, 1, 1, false, false);
            const result2 = processLineClear(state, 1, 1, false, false);
            expect(result2.combo).toBe(1);
        });

        it('should add 50 × combo × level bonus', () => {
            processLineClear(state, 1, 1, false, false); // combo = 0, score = 100
            const result2 = processLineClear(state, 1, 1, false, false); // combo = 1
            // Base: 100, Combo: 50 × 1 × 1 = 50, Total: 150
            expect(result2.scoreAwarded).toBe(150);
        });

        it('should reset combo on non-clearing lock', () => {
            processLineClear(state, 1, 1, false, false); // combo = 0
            processLineClear(state, 1, 1, false, false); // combo = 1
            processLineClear(state, 0, 1, false, false); // no clear — combo reset
            expect(state.combo).toBe(-1);

            const result4 = processLineClear(state, 1, 1, false, false);
            expect(result4.combo).toBe(0); // Combo restarts
        });

        it('should accumulate combo bonus over many clears', () => {
            const totalScore = state.score;
            processLineClear(state, 1, 1, false, false); // combo 0: 100
            processLineClear(state, 1, 1, false, false); // combo 1: 100 + 50 = 150
            processLineClear(state, 1, 1, false, false); // combo 2: 100 + 100 = 200
            expect(state.score).toBe(100 + 150 + 200);
        });
    });

    describe('back-to-back', () => {
        it('should not have B2B on first difficult clear', () => {
            const result = processLineClear(state, 4, 1, false, false);
            expect(result.isBackToBack).toBe(false);
        });

        it('should activate B2B on second consecutive difficult clear', () => {
            processLineClear(state, 4, 1, false, false); // First tetris
            processLineClear(state, 4, 1, false, false); // Second tetris — B2B
            // B2B gives 1.5× multiplier
            const expected = Math.floor(800 * 1.5) + 50; // + combo bonus (50×1×1)
            expect(state.score).toBe(800 + expected);
        });

        it('should break B2B chain on non-difficult clear', () => {
            processLineClear(state, 4, 1, false, false); // Tetris
            processLineClear(state, 1, 1, false, false); // Single — breaks B2B
            const result3 = processLineClear(state, 4, 1, false, false); // Tetris — no B2B
            expect(result3.isBackToBack).toBe(false);
        });

        it('should treat T-spins as difficult clears for B2B', () => {
            processLineClear(state, 4, 1, false, false); // Tetris
            const result2 = processLineClear(state, 1, 1, true, false); // T-Spin Single — B2B
            expect(result2.isBackToBack).toBe(true);
        });
    });

    describe('soft drop scoring', () => {
        it('should add 1 point per cell dropped', () => {
            scoreSoftDrop(state, 5);
            expect(state.score).toBe(5);
        });

        it('should add 1 per cell for single cell', () => {
            scoreSoftDrop(state, 1);
            expect(state.score).toBe(1);
        });
    });

    describe('hard drop scoring', () => {
        it('should add 2 points per cell dropped', () => {
            scoreHardDrop(state, 10);
            expect(state.score).toBe(20);
        });

        it('should add 0 for 0 distance', () => {
            scoreHardDrop(state, 0);
            expect(state.score).toBe(0);
        });
    });

    describe('createScoringState', () => {
        it('should initialize with zero score', () => {
            const s = createScoringState();
            expect(s.score).toBe(0);
        });

        it('should initialize combo to -1', () => {
            const s = createScoringState();
            expect(s.combo).toBe(-1);
        });

        it('should initialize backToBack to -1', () => {
            const s = createScoringState();
            expect(s.backToBack).toBe(-1);
        });
    });
});
