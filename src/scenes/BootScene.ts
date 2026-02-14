/**
 * BootScene — Procedurally generates textures and transitions to MenuScene.
 */

import Phaser from 'phaser';
import { PieceType, TETROMINOES, ALL_PIECE_TYPES } from '../core/Tetrominoes.js';

export const CELL_SIZE = 28;

export class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create(): void {
        this.generateBlockTextures();
        this.generateGhostTexture();
        this.generateParticleTexture();
        this.generateGridCellTexture();
        this.scene.start('MenuScene');
    }

    private generateBlockTextures(): void {
        for (const type of ALL_PIECE_TYPES) {
            const def = TETROMINOES[type];
            const color = def.color;
            const glow = def.glowColor;
            const key = `block_${type}`;

            const g = this.add.graphics();
            const s = CELL_SIZE;

            // Fill with slight gradient effect
            g.fillStyle(color, 1);
            g.fillRoundedRect(1, 1, s - 2, s - 2, 3);

            // Top/left highlight
            g.fillStyle(glow, 0.5);
            g.fillRoundedRect(1, 1, s - 2, 4, { tl: 3, tr: 3, bl: 0, br: 0 });
            g.fillRoundedRect(1, 1, 4, s - 2, { tl: 3, tr: 0, bl: 3, br: 0 });

            // Bottom/right shadow
            g.fillStyle(0x000000, 0.3);
            g.fillRoundedRect(1, s - 5, s - 2, 4, { tl: 0, tr: 0, bl: 3, br: 3 });
            g.fillRoundedRect(s - 5, 1, 4, s - 2, { tl: 0, tr: 3, bl: 0, br: 3 });

            // Inner shine
            g.fillStyle(0xffffff, 0.15);
            g.fillRoundedRect(4, 4, s - 8, s - 8, 2);

            g.generateTexture(key, s, s);
            g.destroy();
        }
    }

    private generateGhostTexture(): void {
        const g = this.add.graphics();
        const s = CELL_SIZE;

        g.lineStyle(2, 0xffffff, 0.4);
        g.strokeRoundedRect(2, 2, s - 4, s - 4, 3);
        g.fillStyle(0xffffff, 0.08);
        g.fillRoundedRect(2, 2, s - 4, s - 4, 3);

        g.generateTexture('block_ghost', s, s);
        g.destroy();
    }

    private generateParticleTexture(): void {
        const g = this.add.graphics();
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('particle', 8, 8);
        g.destroy();
    }

    private generateGridCellTexture(): void {
        const g = this.add.graphics();
        const s = CELL_SIZE;

        g.fillStyle(0x0a0a2e, 0.6);
        g.fillRect(0, 0, s, s);
        g.lineStyle(1, 0x1a1a4e, 0.5);
        g.strokeRect(0, 0, s, s);

        g.generateTexture('grid_cell', s, s);
        g.destroy();
    }
}
