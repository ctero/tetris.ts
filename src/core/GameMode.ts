/**
 * Game mode definitions: Marathon, Sprint, Ultra.
 * Each mode defines its own rules for level progression, win/loss conditions, and timing.
 */

export enum GameModeType {
    MARATHON = 'MARATHON',
    SPRINT = 'SPRINT',
    ULTRA = 'ULTRA',
}

export interface GameModeConfig {
    type: GameModeType;
    name: string;
    description: string;
    startLevel: number;
    /** Lines needed to advance one level. Returns 0 if level doesn't advance. */
    linesPerLevel: (level: number) => number;
    /** Max level (game completes at this level in Marathon) */
    maxLevel: number;
    /** Time limit in milliseconds (0 = no limit) */
    timeLimit: number;
    /** Target lines to clear (0 = no target) */
    lineTarget: number;
    /** Whether this mode has a win condition */
    isCompletable: boolean;
}

/** Check if the game mode is completed */
export function isModeCompleted(
    mode: GameModeConfig,
    level: number,
    totalLines: number,
    elapsedMs: number
): boolean {
    if (!mode.isCompletable) return false;

    switch (mode.type) {
        case GameModeType.MARATHON:
            // Complete when reaching level 15 (having cleared enough lines)
            return level > mode.maxLevel;
        case GameModeType.SPRINT:
            // Complete when target lines cleared
            return totalLines >= mode.lineTarget;
        case GameModeType.ULTRA:
            // Ultra ends on time, not completion
            return false;
        default:
            return false;
    }
}

/** Check if time has expired for timed modes */
export function isTimeExpired(mode: GameModeConfig, elapsedMs: number): boolean {
    return mode.timeLimit > 0 && elapsedMs >= mode.timeLimit;
}

/** Calculate the level based on lines cleared */
export function calculateLevel(
    mode: GameModeConfig,
    startLevel: number,
    totalLines: number
): number {
    let level = startLevel;
    let linesRemaining = totalLines;

    while (linesRemaining > 0) {
        const needed = mode.linesPerLevel(level);
        if (needed <= 0) break; // no further progression
        if (linesRemaining >= needed) {
            linesRemaining -= needed;
            level++;
        } else {
            break;
        }
    }

    return Math.min(level, mode.maxLevel + 1);
}

/**
 * Gravity speed in milliseconds per cell drop, per level.
 * Based on the Tetris Guideline formula.
 */
export function getGravityInterval(level: number): number {
    // Guideline: (0.8 - ((level-1) * 0.007))^(level-1) seconds per row
    const seconds = Math.pow(0.8 - (Math.max(1, level) - 1) * 0.007, Math.max(1, level) - 1);
    return Math.max(seconds * 1000, 16); // minimum ~1 frame at 60fps
}

// ─── Mode Configurations ───────────────────────────────────────────

export const MARATHON_MODE: GameModeConfig = {
    type: GameModeType.MARATHON,
    name: 'MARATHON',
    description: 'Clear 150 lines across 15 levels of increasing speed',
    startLevel: 1,
    linesPerLevel: () => 10,
    maxLevel: 15,
    timeLimit: 0,
    lineTarget: 150,
    isCompletable: true,
};

export const SPRINT_MODE: GameModeConfig = {
    type: GameModeType.SPRINT,
    name: 'SPRINT',
    description: 'Clear 40 lines as fast as you can',
    startLevel: 1,
    linesPerLevel: () => 0, // No level progression
    maxLevel: 1,
    timeLimit: 0,
    lineTarget: 40,
    isCompletable: true,
};

export const ULTRA_MODE: GameModeConfig = {
    type: GameModeType.ULTRA,
    name: 'ULTRA',
    description: 'Score as many points as possible in 2 minutes',
    startLevel: 1,
    linesPerLevel: () => 10,
    maxLevel: 15,
    timeLimit: 2 * 60 * 1000, // 2 minutes
    lineTarget: 0,
    isCompletable: false,
};

export const ALL_MODES: GameModeConfig[] = [MARATHON_MODE, SPRINT_MODE, ULTRA_MODE];
