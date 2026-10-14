/**
 * main.js —— 游戏启动入口
 * ------------------------------------------------------------
 * 作用：
 *   1. 把所有场景注册到 Phaser
 *   2. 创建游戏实例并启动
 * 
 * 这是整个游戏的"总开关"，index.html 加载的就是这个文件。
 * ------------------------------------------------------------
 */

import { GameConfig } from './core/GameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';

// 把所有场景按启动顺序放进配置里
// 注意：第一个场景会自动启动
GameConfig.scene = [
    BootScene,      // 第1个启动：显示LOGO，做基础初始化
    PreloadScene,   // 第2个：加载所有游戏资源
    MenuScene,      // 第3个：主菜单
    GameScene,      // 游戏主场景
    UIScene         // UI叠加层（会和GameScene同时运行）
];

// 创建游戏实例，Phaser会自动开始执行 BootScene
const game = new Phaser.Game(GameConfig);

// 把game挂到window，方便在浏览器控制台调试（比如 window.game.scene.start('GameScene')）
window.game = game;

// 调试用：在控制台提示游戏已启动
console.log('%c🎮 游戏已启动！', 'color:#44ff44;font-size:16px;font-weight:bold;');
console.log('场景列表：', GameConfig.scene.map(s => s.name));
