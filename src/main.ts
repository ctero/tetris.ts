/**
 * Application entry point.
 * Creates the Phaser game instance and registers all scenes.
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 580,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#05051e',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, GameScene],
    // Disable default right-click menu
    disableContextMenu: true,
};

const game = new Phaser.Game(config);

export default game;
