/**
 * Projectile.js —— 技能投射物（火球）
 * ------------------------------------------------------------
 * 作用：火球技能的实际物体。沿发射方向直线飞行，存活一段时间后消失。
 * 后续 M2 加入碰撞后，火球可以撞到敌人并造成伤害。
 * ------------------------------------------------------------
 */

import { DEPTH, FIREBALL_SPEED, FIREBALL_LIFE } from '../core/Constants.js';

export class Projectile extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 出生X坐标
     * @param {number} y - 出生Y坐标
     * @param {number} angle - 发射方向（弧度，0=向右，正值=向下）
     * @param {object} [options] - 可选配置（不传就用玩家火球的默认值）
     *        options.texture 贴图名（默认 'fireball' 玩家火球）
     *        options.speed   飞行速度（默认 FIREBALL_SPEED）
     *        options.life    存活时间毫秒（默认 FIREBALL_LIFE）
     *        说明：妖兽"火鸦"喷的火弹也复用这个类，靠传 options 换贴图/速度即可。
     */
    constructor(scene, x, y, angle, options = {}) {
        super(scene, x, y, options.texture || 'fireball');

        // 把自己加进场景和物理世界
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setDepth(DEPTH.EFFECT); // 特效层
        this.body.setSize(12, 12);   // 碰撞盒调小

        // 把"飞行速度/存活时间"存成自己的属性（妖兽火弹可单独调）
        this.speed = options.speed || FIREBALL_SPEED;
        this.life = options.life || FIREBALL_LIFE;

        // 出生时"从小放大再缩回"的小动画（更有手感）
        this.setScale(0.6);
        scene.tweens.add({
            targets: this,
            scale: 1,
            duration: 120,
            yoyo: true,
            repeat: 1
        });

        // 存活计时：时间到自动销毁，避免火球一直飞
        scene.time.delayedCall(this.life, () => this.destroy());

        // 发射（设置飞行速度）
        // 注意：Phaser 的物理组在 add() 成员时可能重置物体的速度，
        // 所以把"设置速度"单独封装成一个方法，
        // 构造时和"加入火球组之后"各调用一次，保证速度一定是最后生效的。
        this.launch(angle);
    }

    /**
     * 发射火球：沿指定方向设置飞行速度
     * @param {number} angle - 发射方向（弧度，0=向右，正值=向下）
     */
    launch(angle) {
        this.setVelocity(
            Math.cos(angle) * this.speed,
            Math.sin(angle) * this.speed
        );
    }
}
