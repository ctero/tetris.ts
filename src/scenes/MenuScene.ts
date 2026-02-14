/**
 * MenuScene — Animated main menu with mode selection.
 */

import Phaser from 'phaser';
import { GameModeType, ALL_MODES } from '../core/GameMode.js';

const COLORS = {
    bg: 0x05051e,
    title: '#00f0f0',
    titleGlow: '#0088aa',
    subtitle: '#8888cc',
    buttonBg: 0x12123a,
    buttonBorder: 0x3333aa,
    buttonHover: 0x2a2a6a,
    text: '#ffffff',
    textDim: '#8888bb',
    marathon: '#00f0f0',
    sprint: '#00f000',
    ultra: '#f0a000',
};

const MODE_COLORS: Record<GameModeType, string> = {
    [GameModeType.MARATHON]: COLORS.marathon,
    [GameModeType.SPRINT]: COLORS.sprint,
    [GameModeType.ULTRA]: COLORS.ultra,
};

const MODE_HEX: Record<GameModeType, number> = {
    [GameModeType.MARATHON]: 0x00f0f0,
    [GameModeType.SPRINT]: 0x00f000,
    [GameModeType.ULTRA]: 0xf0a000,
};

export class MenuScene extends Phaser.Scene {
    private backgroundBlocks: Phaser.GameObjects.Graphics[] = [];

    constructor() {
        super({ key: 'MenuScene' });
    }

    create(): void {
        const { width, height } = this.scale;

        // Background
        this.cameras.main.setBackgroundColor(COLORS.bg);

        // Falling blocks background animation
        this.createFallingBlocks();

        // Dark overlay for readability
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x05051e, 0.7);
        overlay.setDepth(1);

        // Title
        const titleText = this.add.text(width / 2, 90, 'tetris.ts', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '56px',
            fontStyle: 'bold',
            color: COLORS.title,
            stroke: COLORS.titleGlow,
            strokeThickness: 2,
        }).setOrigin(0.5).setDepth(2);

        // Title glow pulse
        this.tweens.add({
            targets: titleText,
            alpha: { from: 0.85, to: 1 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Subtitle
        this.add.text(width / 2, 145, 'by Chris Tero', {
            fontFamily: 'Orbitron, monospace',
            fontSize: '14px',
            color: COLORS.subtitle,
            letterSpacing: 8,
        }).setOrigin(0.5).setDepth(2);

        // Mode buttons
        const buttonStartY = 220;
        const buttonSpacing = 110;

        ALL_MODES.forEach((mode, i) => {
            this.createModeButton(
                width / 2,
                buttonStartY + i * buttonSpacing,
                mode.name,
                mode.description,
                mode.type,
            );
        });

        // Controls
        const controlsY = buttonStartY + ALL_MODES.length * buttonSpacing + 30;
        const controlLines = [
            '← → Move   ↑ Rotate CW   Z Rotate CCW',
            '↓ Soft Drop   SPACE Hard Drop   C Hold   ESC Pause',
        ];
        controlLines.forEach((line, i) => {
            this.add.text(width / 2, controlsY + i * 22, line, {
                fontFamily: 'Roboto, sans-serif',
                fontSize: '14px',
                color: COLORS.textDim,
                align: 'center',
            }).setOrigin(0.5).setDepth(2);
        });
    }

    private createModeButton(
        x: number, y: number,
        name: string, description: string,
        modeType: GameModeType
    ): void {
        const btnWidth = 320;
        const btnHeight = 80;
        const modeColor = MODE_HEX[modeType];

        // Button background
        const bg = this.add.graphics().setDepth(2);
        bg.fillStyle(COLORS.buttonBg, 0.9);
        bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
        bg.lineStyle(2, modeColor, 0.5);
        bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);

        // Mode name
        const nameText = this.add.text(x, y - 14, name, {
            fontFamily: 'Orbitron, monospace',
            fontSize: '22px',
            fontStyle: 'bold',
            color: MODE_COLORS[modeType],
        }).setOrigin(0.5).setDepth(3);

        // Description
        const descText = this.add.text(x, y + 16, description, {
            fontFamily: 'Roboto, sans-serif',
            fontSize: '13px',
            color: COLORS.textDim,
        }).setOrigin(0.5).setDepth(3);

        // Interactive zone
        const hitZone = this.add.rectangle(x, y, btnWidth, btnHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(4);

        hitZone.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(COLORS.buttonHover, 0.95);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
            bg.lineStyle(2, modeColor, 0.9);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
        });

        hitZone.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(COLORS.buttonBg, 0.9);
            bg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
            bg.lineStyle(2, modeColor, 0.5);
            bg.strokeRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 10);
        });

        hitZone.on('pointerdown', () => {
            this.scene.start('GameScene', { modeType });
        });
    }

    private createFallingBlocks(): void {
        const { width, height } = this.scale;
        const blockColors = [0x00f0f0, 0xf0f000, 0xa000f0, 0x00f000, 0xf00000, 0x0000f0, 0xf0a000];

        for (let i = 0; i < 15; i++) {
            const g = this.add.graphics();
            const color = Phaser.Utils.Array.GetRandom(blockColors);
            const size = Phaser.Math.Between(8, 18);
            const startX = Phaser.Math.Between(0, width);
            const startY = Phaser.Math.Between(-height, 0);

            g.fillStyle(color, 0.15);
            g.fillRoundedRect(0, 0, size, size, 2);
            g.setPosition(startX, startY);
            g.setDepth(0);

            this.tweens.add({
                targets: g,
                y: height + size,
                duration: Phaser.Math.Between(6000, 15000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 5000),
                onRepeat: () => {
                    g.setPosition(Phaser.Math.Between(0, width), -size);
                },
            });

            this.backgroundBlocks.push(g);
        }
    }
}
