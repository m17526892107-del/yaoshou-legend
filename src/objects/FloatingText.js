/**
 * FloatingText.js —— 飘字工具（战斗反馈文字）
 * ------------------------------------------------------------
 * 作用：战斗时给玩家看的"弹出来的字"，比如：
 *   - 对妖兽造成的伤害： -8
 *   - 捡到金币：         +5 金币
 *   - 捡到经验：         +10 经验
 *   - 升级提示：         升级！Lv.2
 * 效果：文字从原地向上飘起，同时逐渐变透明，约0.7秒后消失。
 * ------------------------------------------------------------
 * 用法（任何场景里都可以调用）：
 *   import { showFloatingText } from './FloatingText.js';
 *   showFloatingText(scene, x, y, '文字', '#ff5555', 18);
 * ------------------------------------------------------------
 */

import { DEPTH } from '../core/Constants.js';

/**
 * 在指定位置弹出一段飘字
 * @param {Phaser.Scene} scene - 所属场景
 * @param {number} x - 世界坐标X
 * @param {number} y - 世界坐标Y
 * @param {string} content - 要显示的文字（比如 '-8'、'+5 金币'）
 * @param {string} color - 文字颜色（十六进制字符串，如 '#ff5555'）
 * @param {number} size - 字号（像素），默认16
 */
export function showFloatingText(scene, x, y, content, color = '#ffffff', size = 16) {
    // 创建文字对象：加黑色描边，深色背景上也看得清
    const txt = scene.add.text(x, y, content, {
        fontFamily: 'Microsoft YaHei',
        fontSize: `${size}px`,
        color: color,
        fontStyle: 'bold'
    })
        .setOrigin(0.5)          // 以中心为基准
        .setDepth(DEPTH.POPUP)   // 最上层，别被挡住
        .setStroke('#000000', 3);// 黑色描边

    // 飘字动画：向上飘 40 像素 + 慢慢变透明，结束后销毁
    scene.tweens.add({
        targets: txt,
        y: y - 40,
        alpha: 0,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => txt.destroy()
    });
}
