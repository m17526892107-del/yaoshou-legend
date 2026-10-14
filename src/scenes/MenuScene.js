/**
 * MenuScene.js —— 主菜单场景
 * ------------------------------------------------------------
 * 作用：游戏的主界面，玩家在这里选择"开始游戏"、"设置"等。
 * 点击"开始游戏"后会启动 GameScene（主游戏场景）和 UIScene（UI层）。
 * ------------------------------------------------------------
 */

import { EventBus } from '../core/EventBus.js';
import { EVENTS } from '../core/Constants.js';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // ===== 背景：一个渐变色矩形 =====
        const bg = this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x1a1a2e);

        // 装饰性背景粒子（简单的星空效果）
        for (let i = 0; i < 60; i++) {
            const x = Phaser.Math.Between(0, this.scale.width);
            const y = Phaser.Math.Between(0, this.scale.height);
            const star = this.add.circle(x, y, Phaser.Math.Between(1, 2.5), 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
            // 让星星慢慢闪烁
            this.tweens.add({
                targets: star,
                alpha: 0.1,
                duration: Phaser.Math.Between(1500, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1500)
            });
        }

        // ===== 游戏标题 =====
        this.add.text(centerX, 180, '妖兽传说', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '80px',
            color: '#ffdd44',
            fontStyle: 'bold',
            stroke: '#8B4513',
            strokeThickness: 8,
            shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true }
        }).setOrigin(0.5);

        // 副标题
        this.add.text(centerX, 260, '—— 踏上收服妖兽的冒险之旅 ——', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '24px',
            color: '#ccbbaa'
        }).setOrigin(0.5);

        // ===== 菜单按钮 =====
        const buttons = [
            { text: '开始游戏', y: 380, action: () => this._startGame() },
            { text: '游戏设置', y: 460, action: () => this._showSettings() },
            { text: '关于游戏', y: 540, action: () => this._showAbout() }
        ];

        buttons.forEach(btn => {
            // 按钮背景
            const btnBg = this.add.rectangle(centerX, btn.y, 280, 60, 0x2a2a5a)
                .setStrokeStyle(2, 0x6666aa)
                .setInteractive({ useHandCursor: true });

            // 按钮文字
            const btnText = this.add.text(centerX, btn.y, btn.text, {
                fontFamily: 'Microsoft YaHei',
                fontSize: '28px',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // 按钮悬停效果
            btnBg.on('pointerover', () => {
                btnBg.setFillStyle(0x3a3a7a);
                btnText.setColor('#ffdd44');
            });
            btnBg.on('pointerout', () => {
                btnBg.setFillStyle(0x2a2a5a);
                btnText.setColor('#ffffff');
            });
            // 按钮点击
            btnBg.on('pointerdown', () => {
                btn.action();
            });
        });

        // 底部版本号
        this.add.text(this.scale.width - 20, this.scale.height - 20, 'v0.1.0  Demo', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#666666'
        }).setOrigin(1, 1);

        console.log('[MenuScene] 主菜单已显示');
    }

    /**
     * 开始游戏：启动主游戏场景和UI场景
     */
    _startGame() {
        // 同时启动两个场景：GameScene（游戏内容）和 UIScene（UI叠加层）
        this.scene.start('GameScene');
        this.scene.launch('UIScene');
        // 通知事件总线游戏开始
        EventBus.emit(EVENTS.SCENE_CHANGE, { from: 'MenuScene', to: 'GameScene' });
    }

    /**
     * 打开设置（暂时用弹窗提示，后续做 SettingsScene）
     */
    _showSettings() {
        alert('设置功能开发中...\n（后续会实现音量、画质、按键设置）');
    }

    /**
     * 关于游戏
     */
    _showAbout() {
        alert('妖兽传说 v0.1.0\n\n基于 Phaser.js 开发的 HTML5 网页游戏\n\n开发中 Demo 版本');
    }
}
