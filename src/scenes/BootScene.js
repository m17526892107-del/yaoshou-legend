/**
 * BootScene.js —— 启动场景
 * ------------------------------------------------------------
 * 作用：游戏启动后第一个运行的场景。
 *   - 显示游戏LOGO / 公司LOGO
 *   - 做一些基础初始化（比如设置画布缩放、加载必要字体）
 *   - 完成后自动跳转到 PreloadScene（资源加载场景）
 * ------------------------------------------------------------
 */

export class BootScene extends Phaser.Scene {
    constructor() {
        // 场景的唯一标识，其他场景通过这个名字跳转
        super({ key: 'BootScene' });
    }

    /**
     * 场景初始化（最先执行，接收从其他场景传来的参数）
     */
    init() {
        console.log('[BootScene] 启动场景初始化...');
    }

    /**
     * 预加载（可以在这里加载LOGO图）
     */
    preload() {
        // 这里暂时不加载真实LOGO，后面有素材了再加
        // 示例：this.load.image('logo', 'assets/images/logo/logo.png');
    }

    /**
     * 创建场景内容（LOGO显示在这里）
     */
    create() {
        // 画一个居中的文字LOGO作为占位
        const centerX = this.scale.width / 2;
        const centerY = this.scale.height / 2;

        // 添加游戏标题
        this.add.text(centerX, centerY - 40, '妖兽传说', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '64px',
            color: '#ffdd44',
            fontStyle: 'bold',
            stroke: '#8B4513',
            strokeThickness: 6
        }).setOrigin(0.5);

        // 副标题
        this.add.text(centerX, centerY + 30, 'Phaser.js HTML5 Game', {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // 加载提示
        const loadingText = this.add.text(centerX, centerY + 100, '加载中...', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // 简单的"加载中"动画（文字闪烁）
        this.tweens.add({
            targets: loadingText,
            alpha: 0.3,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        // 1.5秒后跳转到资源加载场景
        this.time.delayedCall(1500, () => {
            this.scene.start('PreloadScene');
        });

        console.log('[BootScene] 启动完成，准备加载资源...');
    }
}
