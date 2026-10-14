/**
 * PreloadScene.js —— 资源加载场景
 * ------------------------------------------------------------
 * 作用：生成游戏所有素材并显示进度条，完成后跳转主菜单。
 * 说明：MVP阶段没有外部图片文件，素材全部由"程序画图"生成
 *      （PlaceholderSprites.js），所以这里的加载几乎是瞬间完成的。
 * ------------------------------------------------------------
 */

import { createPlaceholderSprites } from '../utils/PlaceholderSprites.js';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    /**
     * 预加载：把 JSON 数据文件读进缓存（妖兽配置等）
     * 说明：M2 起妖兽数值存在 data/enemies.json，这里先读进来，
     *      GameScene 创建时用 this.cache.json.get('enemies') 取用。
     */
    preload() {
        this.load.json('enemies', 'data/enemies.json');
    }

    /**
     * 创建：生成全部占位素材 + 播放"加载完成"过渡
     */
    create() {
        // ===== 1. 生成全部占位素材（程序画图） =====
        createPlaceholderSprites(this.textures);
        console.log('[PreloadScene] 素材生成完成！');

        // ===== 2. 加载进度条（视觉过渡用） =====
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;
        const barWidth = 500;
        const barHeight = 30;
        const barX = centerX - barWidth / 2;
        const barY = centerY - barHeight / 2;

        // 进度条背景
        this.add.rectangle(centerX, centerY, barWidth, barHeight, 0x333355)
            .setStrokeStyle(2, 0x6666aa);

        // 进度条前景（宽度从0动画到满）
        const progressBar = this.add.rectangle(barX, barY, 0, barHeight, 0x4488ff)
            .setOrigin(0, 0.5);

        const percentText = this.add.text(centerX, centerY + 50, '0%', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add.text(centerX, centerY - 60, '正在生成游戏素材...', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '22px',
            color: '#cccccc'
        }).setOrigin(0.5);

        // 播放进度动画，跑完后进入主菜单
        this.tweens.add({
            targets: progressBar,
            width: barWidth,
            duration: 900,
            ease: 'Quad.easeInOut',
            onUpdate: () => {
                percentText.setText(
                    Math.floor((progressBar.width / barWidth) * 100) + '%'
                );
            },
            onComplete: () => {
                percentText.setText('100%');
                this.time.delayedCall(300, () => this.scene.start('MenuScene'));
            }
        });
    }
}
