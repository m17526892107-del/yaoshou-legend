/**
 * GameConfig.js —— Phaser 引擎配置
 * ------------------------------------------------------------
 * 作用：告诉 Phaser 引擎"这个游戏怎么跑"，比如画布多大、用什么渲染模式、
 *       是否开启物理引擎等。
 * ------------------------------------------------------------
 */

import { GAME_WIDTH, GAME_HEIGHT, GAME_BG_COLOR } from './Constants.js';

// Phaser 的完整配置对象
export const GameConfig = {
    // 渲染模式：AUTO 表示自动选择 WebGL（快）或 Canvas（兼容）
    type: Phaser.AUTO,

    // 画布挂载到哪个 DOM 元素上
    parent: 'game-container',

    // 画布宽高（逻辑分辨率，Phaser会自动缩放适配屏幕）
    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    // 背景色
    backgroundColor: GAME_BG_COLOR,

    // 像素艺术风格开关：
    // true  = 像素图清晰不模糊（适合像素风游戏）
    // false = 平滑模糊（适合写实/高清图）
    pixelArt: true,

    // 是否抗锯齿
    antialias: false,

    // 物理引擎配置
    physics: {
        // 用 Arcade 物理引擎（轻量、够用，适合2D俯视/横版）
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },   // 俯视视角不需要重力
            debug: false          // 调试模式：true 会显示碰撞框和速度线
        }
    },

    // 缩放模式：让游戏画面等比缩放适配窗口，保持比例不变形
    scale: {
        mode: Phaser.Scale.FIT,           // FIT = 等比缩放，留黑边
        autoCenter: Phaser.Scale.CENTER_BOTH,  // 水平垂直都居中
        width: GAME_WIDTH,
        height: GAME_HEIGHT
    },

    // 场景列表会在 main.js 里动态注入（这里先空着）
    scene: []
};
