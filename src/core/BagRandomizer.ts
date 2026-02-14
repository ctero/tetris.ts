/**
 * 7-bag randomizer per Tetris Guideline.
 * Generates pieces in bags of 7, each containing one of every piece type.
 */

import { PieceType, ALL_PIECE_TYPES } from './Tetrominoes.js';

export class BagRandomizer {
    private bag: PieceType[] = [];
    private nextBag: PieceType[] = [];

    /** Optional seed-based RNG for testability. Defaults to Math.random. */
    private rng: () => number;

    constructor(rng?: () => number) {
        this.rng = rng ?? Math.random;
        this.fillBag();
        this.fillNextBag();
    }

    /** Shuffle an array in place using Fisher-Yates */
    private shuffle(arr: PieceType[]): void {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(this.rng() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    private fillBag(): void {
        this.bag = [...ALL_PIECE_TYPES];
        this.shuffle(this.bag);
    }

    private fillNextBag(): void {
        this.nextBag = [...ALL_PIECE_TYPES];
        this.shuffle(this.nextBag);
    }

    /** Get the next piece type from the bag */
    next(): PieceType {
        if (this.bag.length === 0) {
            this.bag = this.nextBag;
            this.fillNextBag();
        }
        return this.bag.shift()!;
    }

    /** Preview upcoming pieces without consuming them */
    preview(count: number): PieceType[] {
        const result: PieceType[] = [];
        const combined = [...this.bag, ...this.nextBag];

        for (let i = 0; i < count && i < combined.length; i++) {
            result.push(combined[i]);
        }

        // If we still need more, we'd need a third bag — edge case for very high preview counts
        return result;
    }

    /** Reset the randomizer */
    reset(): void {
        this.fillBag();
        this.fillNextBag();
    }
}
