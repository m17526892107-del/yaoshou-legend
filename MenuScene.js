/**
 * MenuScene.js —— 主菜单场景
 * ------------------------------------------------------------
 * 作用：游戏的主界面，玩家在这里选择"开始游戏"、"设置"等。
 * 点击"开始游戏"后会启动 GameScene（主游戏场景）和 UIScene（UI层）。
 * 背景：使用游戏封面海报 assets/cover.jpg（作者：付冯金）当整屏背景。
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

        // ===== 背景：游戏封面海报（作者：付冯金，见 assets/cover.jpg） =====
        // 【设计思路】封面是一张"竖版"海报（1680×2050），而游戏画面是"横屏"（1280×720）。
        // 想让竖图铺满整个横屏背景，做法和网页 CSS 的 background-size: cover 一样：
        // 按"宽、高哪个需要放大更多"的那个比例整体放大，让图片刚好盖住屏幕，
        // 多出来的部分自然溢出到屏幕外（反正看不见）。
        if (this.textures.exists('cover')) {
            // pixelArt 模式下贴图默认用"最近邻"放大，高清插画会出现锯齿；
            // 这里单独把封面这张贴图改成"线性过滤"，缩放后更顺滑好看。
            this.textures.get('cover').setFilter(Phaser.Textures.FilterMode.LINEAR);

            const cover = this.add.image(centerX, centerY, 'cover');
            const coverScale = Math.max(
                this.scale.width / cover.width,
                this.scale.height / cover.height
            );
            cover.setScale(coverScale);   // 放大到"刚好盖满"整个屏幕
        } else {
            // 兜底：万一封面图没加载成功（比如文件丢了），退回纯色背景，
            // 保证菜单依然能正常显示，不至于白屏。
            this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x1a1a2e);
        }

        // 背景压暗层：封面本身是明亮插画，直接铺上去文字会看不清；
        // 盖一层半透明黑色，让标题和按钮更醒目（顺便营造"暗黑仙侠"的气氛）。
        this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x000000, 0.45);

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

        // 作者署名（左下角）：把制作人的名字挂在菜单上
        this.add.text(20, this.scale.height - 20, '作者：付冯金', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '18px',
            color: '#ddccbb'
        }).setOrigin(0, 1);

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
