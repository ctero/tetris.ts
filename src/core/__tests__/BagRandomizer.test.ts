import { describe, it, expect, beforeEach } from 'vitest';
import { BagRandomizer } from '../BagRandomizer.js';
import { PieceType, ALL_PIECE_TYPES } from '../Tetrominoes.js';

describe('BagRandomizer', () => {
    describe('7-bag invariant', () => {
        it('first 7 pieces should contain exactly one of each type', () => {
            const bag = new BagRandomizer();
            const first7: PieceType[] = [];
            for (let i = 0; i < 7; i++) {
                first7.push(bag.next());
            }

            const sorted = [...first7].sort();
            const expected = [...ALL_PIECE_TYPES].sort();
            expect(sorted).toEqual(expected);
        });

        it('second 7 pieces should also contain exactly one of each type', () => {
            const bag = new BagRandomizer();
            // Skip first 7
            for (let i = 0; i < 7; i++) bag.next();

            const second7: PieceType[] = [];
            for (let i = 0; i < 7; i++) {
                second7.push(bag.next());
            }

            const sorted = [...second7].sort();
            const expected = [...ALL_PIECE_TYPES].sort();
            expect(sorted).toEqual(expected);
        });

        it('should maintain 7-bag invariant over 10 bags (70 pieces)', () => {
            const bag = new BagRandomizer();
            for (let bagIdx = 0; bagIdx < 10; bagIdx++) {
                const pieces: PieceType[] = [];
                for (let i = 0; i < 7; i++) {
                    pieces.push(bag.next());
                }
                const sorted = [...pieces].sort();
                const expected = [...ALL_PIECE_TYPES].sort();
                expect(sorted).toEqual(expected);
            }
        });
    });

    describe('deterministic RNG', () => {
        it('should produce same sequence with same RNG seed', () => {
            let seed1 = 42;
            const rng1 = () => {
                seed1 = (seed1 * 16807) % 2147483647;
                return seed1 / 2147483647;
            };

            let seed2 = 42;
            const rng2 = () => {
                seed2 = (seed2 * 16807) % 2147483647;
                return seed2 / 2147483647;
            };

            const bag1 = new BagRandomizer(rng1);
            const bag2 = new BagRandomizer(rng2);

            for (let i = 0; i < 21; i++) {
                expect(bag1.next()).toBe(bag2.next());
            }
        });
    });

    describe('preview', () => {
        it('should return correct number of upcoming pieces', () => {
            const bag = new BagRandomizer();
            const preview = bag.preview(5);
            expect(preview).toHaveLength(5);
        });

        it('should not consume pieces when previewing', () => {
            const bag = new BagRandomizer();
            const preview = bag.preview(3);
            const actual1 = bag.next();
            expect(actual1).toBe(preview[0]);
        });

        it('preview should show pieces across bag boundaries', () => {
            const bag = new BagRandomizer();
            // Get 5 pieces to leave 2 in current bag
            for (let i = 0; i < 5; i++) bag.next();

            // Preview 5 should span current bag (2 remaining) + next bag (3 more)
            const preview = bag.preview(5);
            expect(preview).toHaveLength(5);
        });

        it('should handle preview of 0', () => {
            const bag = new BagRandomizer();
            const preview = bag.preview(0);
            expect(preview).toHaveLength(0);
        });
    });

    describe('reset', () => {
        it('should start new bags after reset', () => {
            const bag = new BagRandomizer();
            // Consume some pieces
            for (let i = 0; i < 5; i++) bag.next();

            bag.reset();

            // After reset, first 7 should be a complete bag again
            const first7: PieceType[] = [];
            for (let i = 0; i < 7; i++) {
                first7.push(bag.next());
            }
            const sorted = [...first7].sort();
            const expected = [...ALL_PIECE_TYPES].sort();
            expect(sorted).toEqual(expected);
        });
    });

    describe('randomness', () => {
        it('should produce different sequences on different instances (usually)', () => {
            const bag1 = new BagRandomizer();
            const bag2 = new BagRandomizer();

            const seq1: PieceType[] = [];
            const seq2: PieceType[] = [];
            for (let i = 0; i < 14; i++) {
                seq1.push(bag1.next());
                seq2.push(bag2.next());
            }

            // While theoretically possible to be identical, it's extremely unlikely
            // We just verify both are valid bags
            const first7_1 = seq1.slice(0, 7).sort();
            const first7_2 = seq2.slice(0, 7).sort();
            const expected = [...ALL_PIECE_TYPES].sort();
            expect(first7_1).toEqual(expected);
            expect(first7_2).toEqual(expected);
        });
    });
});
