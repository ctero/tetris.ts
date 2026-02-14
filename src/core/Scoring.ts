/**
 * Tetris Guideline scoring system.
 * Handles line clear scoring, T-spin bonuses, combos, back-to-back, and drop scoring.
 */

export enum ClearType {
    NONE = 'NONE',
    SINGLE = 'SINGLE',
    DOUBLE = 'DOUBLE',
    TRIPLE = 'TRIPLE',
    TETRIS = 'TETRIS',
    TSPIN_MINI = 'TSPIN_MINI',
    TSPIN_SINGLE = 'TSPIN_SINGLE',
    TSPIN_DOUBLE = 'TSPIN_DOUBLE',
    TSPIN_TRIPLE = 'TSPIN_TRIPLE',
    TSPIN_ZERO = 'TSPIN_ZERO',
}

/** Base scores per clear type (multiplied by level) */
const BASE_SCORES: Record<ClearType, number> = {
    [ClearType.NONE]: 0,
    [ClearType.SINGLE]: 100,
    [ClearType.DOUBLE]: 300,
    [ClearType.TRIPLE]: 500,
    [ClearType.TETRIS]: 800,
    [ClearType.TSPIN_MINI]: 100,
    [ClearType.TSPIN_ZERO]: 400,
    [ClearType.TSPIN_SINGLE]: 800,
    [ClearType.TSPIN_DOUBLE]: 1200,
    [ClearType.TSPIN_TRIPLE]: 1600,
};

/** Whether a clear type qualifies as "difficult" for back-to-back */
function isDifficultClear(clearType: ClearType): boolean {
    return clearType === ClearType.TETRIS ||
        clearType === ClearType.TSPIN_SINGLE ||
        clearType === ClearType.TSPIN_DOUBLE ||
        clearType === ClearType.TSPIN_TRIPLE ||
        clearType === ClearType.TSPIN_MINI;
}

export interface ScoringState {
    score: number;
    combo: number;        // consecutive line clears; -1 means no active combo
    backToBack: number;   // -1 means no active B2B; 0+ is the chain count
    lastClearType: ClearType;
}

export function createScoringState(): ScoringState {
    return {
        score: 0,
        combo: -1,
        backToBack: -1,
        lastClearType: ClearType.NONE,
    };
}

export interface ClearResult {
    clearType: ClearType;
    scoreAwarded: number;
    isBackToBack: boolean;
    combo: number;
}

/**
 * Determine the clear type based on lines cleared and T-spin status.
 */
export function determineClearType(
    linesCleared: number,
    isTSpin: boolean,
    isTSpinMini: boolean
): ClearType {
    if (isTSpin || isTSpinMini) {
        if (isTSpinMini && linesCleared <= 1) {
            return linesCleared === 0 ? ClearType.TSPIN_ZERO : ClearType.TSPIN_MINI;
        }
        switch (linesCleared) {
            case 0: return ClearType.TSPIN_ZERO;
            case 1: return ClearType.TSPIN_SINGLE;
            case 2: return ClearType.TSPIN_DOUBLE;
            case 3: return ClearType.TSPIN_TRIPLE;
            default: return ClearType.TSPIN_TRIPLE;
        }
    }

    switch (linesCleared) {
        case 0: return ClearType.NONE;
        case 1: return ClearType.SINGLE;
        case 2: return ClearType.DOUBLE;
        case 3: return ClearType.TRIPLE;
        default: return ClearType.TETRIS;
    }
}

/**
 * Process a piece lock and calculate the score.
 * Mutates the scoring state.
 */
export function processLineClear(
    state: ScoringState,
    linesCleared: number,
    level: number,
    isTSpin: boolean,
    isTSpinMini: boolean
): ClearResult {
    const clearType = determineClearType(linesCleared, isTSpin, isTSpinMini);

    if (clearType === ClearType.NONE && !isTSpin && !isTSpinMini) {
        // No lines cleared and not a T-spin zero — reset combo
        state.combo = -1;
        state.lastClearType = ClearType.NONE;
        return { clearType, scoreAwarded: 0, isBackToBack: false, combo: -1 };
    }

    // Update combo
    state.combo++;

    // Calculate base score
    let score = BASE_SCORES[clearType] * level;

    // Back-to-back logic
    let isBackToBack = false;
    if (isDifficultClear(clearType)) {
        if (state.backToBack >= 0) {
            // Active B2B — apply 1.5x multiplier
            score = Math.floor(score * 1.5);
            isBackToBack = true;
        }
        state.backToBack = Math.max(0, state.backToBack) + 1;
    } else if (linesCleared > 0) {
        // Non-difficult clear with lines — break B2B chain
        state.backToBack = -1;
    }

    // Combo bonus: 50 × combo × level
    if (state.combo > 0) {
        score += 50 * state.combo * level;
    }

    state.score += score;
    state.lastClearType = clearType;

    return {
        clearType,
        scoreAwarded: score,
        isBackToBack,
        combo: state.combo,
    };
}

/** Score for soft dropping (1 point per cell) */
export function scoreSoftDrop(state: ScoringState, cells: number): void {
    state.score += cells;
}

/** Score for hard dropping (2 points per cell) */
export function scoreHardDrop(state: ScoringState, cells: number): void {
    state.score += cells * 2;
}
