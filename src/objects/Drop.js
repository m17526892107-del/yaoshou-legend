/**
 * Drop.js —— 掉落物（灵石 / 妖丹 / 御兽符）
 * ------------------------------------------------------------
 * 作用：妖兽死亡后掉出来的可拾取物品。
 *   1. 玩家走过去（物理重叠）自动拾取
 *   2. 掉在地上有一小段"弹跳出现"的动画
 *   3. 一定时间后没人捡就自动消失（避免满地垃圾）
 * 
 * 拾取后怎么处理？
 *   Drop 只负责"长什么样、什么时候消失"，
 *   具体加灵石/加经验的逻辑写在 GameScene 的重叠回调里。
 * ------------------------------------------------------------
 */

import { DEPTH, DROP_LIFE } from '../core/Constants.js';

export class Drop extends Phaser.Physics.Arcade.Sprite {
    /**
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 出生X坐标
     * @param {number} y - 出生Y坐标
     * @param {string} type - 类型：'spirit' 灵石 / 'material' 妖丹 / 'talisman' 御兽符 / 'exp' 经验珠
     * @param {number} value - 拾取后给多少
     * @param {string} name - 物品名字（比如"史莱姆黏液"），拾取提示飘字用
     */
    constructor(scene, x, y, type, value, name = '') {
        // 类型 → 贴图名 的对照表（每种掉落物有自己的小图标）
        const TEXTURE_MAP = {
            spirit: 'drop_spirit',      // 灵石（蓝色晶体，通用货币）
            exp: 'drop_exp',            // 经验珠（旧版掉落，目前没在用）
            material: 'drop_material',  // 妖丹材料（紫色小球，制符原料）
            talisman: 'drop_talisman'   // 御兽符（黄色符纸，收服妖兽用）
        };
        super(scene, x, y, TEXTURE_MAP[type] || 'drop_spirit');

        // 把自己加进场景和物理世界
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.type = type;     // 记住类型（拾取回调要判断）
        this.value = value;   // 记住数值
        this.name = name;     // 记住名字（拾取提示飘字用）

        this.setDepth(DEPTH.ENTITY);

        // 碰撞盒放大一点：好捡（身体比贴图大一圈，走近就能拾取）
        this.body.setSize(22, 22, true);   // true = 让碰撞盒居中

        // ===== 出生动画：从半透明弹出来 =====
        this.setScale(0.4);
        this.setAlpha(0.8);
        scene.tweens.add({
            targets: this,
            scale: 1,
            alpha: 1,
            duration: 180,
            ease: 'Back.easeOut'
        });

        // ===== 生命倒计时 =====
        // 快到期前开始闪烁（提醒玩家"要消失了"）
        scene.time.delayedCall(DROP_LIFE - 1200, () => {
            scene.tweens.add({
                targets: this,
                alpha: 0.25,
                duration: 300,
                yoyo: true,
                repeat: 3      // 闪烁几次
            });
        });
        // 到期后彻底消失
        scene.time.delayedCall(DROP_LIFE, () => this.destroy());
    }
}
