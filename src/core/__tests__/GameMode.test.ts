import { describe, it, expect } from 'vitest';
import {
    GameModeType,
    GameModeConfig,
    MARATHON_MODE,
    SPRINT_MODE,
    ULTRA_MODE,
    isModeCompleted,
    isTimeExpired,
    calculateLevel,
    getGravityInterval,
} from '../GameMode.js';

describe('GameMode', () => {
    describe('Marathon mode', () => {
        it('should have correct configuration', () => {
            expect(MARATHON_MODE.type).toBe(GameModeType.MARATHON);
            expect(MARATHON_MODE.startLevel).toBe(1);
            expect(MARATHON_MODE.maxLevel).toBe(15);
            expect(MARATHON_MODE.lineTarget).toBe(150);
            expect(MARATHON_MODE.timeLimit).toBe(0);
            expect(MARATHON_MODE.isCompletable).toBe(true);
        });

        it('should not be completed at low levels', () => {
            expect(isModeCompleted(MARATHON_MODE, 5, 40, 60000)).toBe(false);
        });

        it('should be completed when level exceeds maxLevel', () => {
            expect(isModeCompleted(MARATHON_MODE, 16, 150, 300000)).toBe(true);
        });

        it('should not be time-expired (no time limit)', () => {
            expect(isTimeExpired(MARATHON_MODE, 9999999)).toBe(false);
        });

        it('should calculate level from lines cleared', () => {
            // 10 lines per level
            expect(calculateLevel(MARATHON_MODE, 1, 0)).toBe(1);
            expect(calculateLevel(MARATHON_MODE, 1, 10)).toBe(2);
            expect(calculateLevel(MARATHON_MODE, 1, 25)).toBe(3); // 10+10=20 for levels 1-2, 5 remaining
            expect(calculateLevel(MARATHON_MODE, 1, 100)).toBe(11);
        });

        it('should cap level at maxLevel + 1', () => {
            expect(calculateLevel(MARATHON_MODE, 1, 200)).toBe(16); // 15 + 1
        });
    });

    describe('Sprint mode', () => {
        it('should have correct configuration', () => {
            expect(SPRINT_MODE.type).toBe(GameModeType.SPRINT);
            expect(SPRINT_MODE.lineTarget).toBe(40);
            expect(SPRINT_MODE.timeLimit).toBe(0);
            expect(SPRINT_MODE.isCompletable).toBe(true);
        });

        it('should be completed when 40 lines cleared', () => {
            expect(isModeCompleted(SPRINT_MODE, 1, 40, 60000)).toBe(true);
        });

        it('should not be completed under 40 lines', () => {
            expect(isModeCompleted(SPRINT_MODE, 1, 39, 60000)).toBe(false);
        });

        it('should not have level progression', () => {
            expect(calculateLevel(SPRINT_MODE, 1, 100)).toBe(1); // Always level 1
        });
    });

    describe('Ultra mode', () => {
        it('should have correct configuration', () => {
            expect(ULTRA_MODE.type).toBe(GameModeType.ULTRA);
            expect(ULTRA_MODE.timeLimit).toBe(120000); // 2 minutes
            expect(ULTRA_MODE.isCompletable).toBe(false);
        });

        it('should expire after 2 minutes', () => {
            expect(isTimeExpired(ULTRA_MODE, 120000)).toBe(true);
            expect(isTimeExpired(ULTRA_MODE, 120001)).toBe(true);
        });

        it('should not expire before 2 minutes', () => {
            expect(isTimeExpired(ULTRA_MODE, 119999)).toBe(false);
        });

        it('should not be "completed" (uses time expiry instead)', () => {
            expect(isModeCompleted(ULTRA_MODE, 15, 200, 120000)).toBe(false);
        });

        it('should have level progression every 10 lines', () => {
            expect(calculateLevel(ULTRA_MODE, 1, 10)).toBe(2);
            expect(calculateLevel(ULTRA_MODE, 1, 30)).toBe(4);
        });
    });

    describe('gravity interval', () => {
        it('should be ~1 second at level 1', () => {
            const interval = getGravityInterval(1);
            expect(interval).toBeCloseTo(1000, -2); // ~1000ms
        });

        it('should decrease with higher levels', () => {
            const level1 = getGravityInterval(1);
            const level5 = getGravityInterval(5);
            const level10 = getGravityInterval(10);
            expect(level5).toBeLessThan(level1);
            expect(level10).toBeLessThan(level5);
        });

        it('should have a minimum of 16ms', () => {
            const level20 = getGravityInterval(20);
            expect(level20).toBeGreaterThanOrEqual(16);
        });

        it('should be very fast at high levels', () => {
            const level15 = getGravityInterval(15);
            expect(level15).toBeLessThan(100); // Under 100ms
        });
    });
});
