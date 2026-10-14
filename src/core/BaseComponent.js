/**
 * BaseComponent.js —— 所有游戏实体的公共基类
 * ------------------------------------------------------------
 * 作用：把角色、敌人、道具等"共通的功能"抽出来放在基类里，
 *       子类继承后就能直接用，不用每个都重复写。
 * 
 * 共通功能包括：
 *   - 创建带物理体的精灵
 *   - 播放动画
 *   - 血量管理（受伤、回血、死亡）
 *   - 朝向判断
 *   - 移动
 * 
 * 使用方式（子类继承）：
 *   import { BaseComponent } from './BaseComponent.js';
 *   class Player extends BaseComponent {
 *       constructor(scene, x, y) {
 *           super(scene, x, y, 'player_sprite');
 *       }
 *   }
 * ------------------------------------------------------------
 */

import { EventBus } from './EventBus.js';
import { EVENTS, DIRECTION } from './Constants.js';

export class BaseComponent extends Phaser.Physics.Arcade.Sprite {
    /**
     * 构造函数
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 初始X坐标
     * @param {number} y - 初始Y坐标
     * @param {string} texture - 贴图名（在Preload里加载的）
     */
    constructor(scene, x, y, texture) {
        // 调用父类（Phaser的Sprite）构造函数
        super(scene, x, y, texture);

        // 把自己加到场景里（Phaser要求的）
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // 保存场景引用，方便子类使用
        this.sceneRef = scene;

        // ===== 通用属性 =====
        this.maxHp = 100;          // 最大血量
        this.hp = 100;             // 当前血量
        this.isDead = false;       // 是否已死亡
        this.facing = DIRECTION.DOWN;  // 朝向，默认朝下
        this.speed = 150;          // 移动速度（可被子类覆盖）

        // 设置碰撞框大小（默认用贴图本身大小，子类可调整）
        this.body.setCollideWorldBounds(true);
    }

    /**
     * 受伤
     * @param {number} damage - 伤害值
     * @returns {number} 实际造成的伤害
     */
    takeDamage(damage) {
        if (this.isDead) return 0;
        // 扣血，最少为0
        this.hp = Math.max(0, this.hp - damage);

        // 触发受伤事件（让特效、音效模块响应）
        EventBus.emit(EVENTS.ENEMY_DAMAGED, {
            target: this,
            damage: damage
        });

        // 血量为0时死亡
        if (this.hp <= 0) {
            this.die();
        }
        return damage;
    }

    /**
     * 回血
     * @param {number} amount - 回复量
     */
    heal(amount) {
        if (this.isDead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    /**
     * 死亡处理（子类可重写）
     */
    die() {
        this.isDead = true;
        this.setActive(false);
        this.setVisible(false);
        this.body.enable = false;

        // 触发死亡事件
        EventBus.emit(EVENTS.ENEMY_DEATH, { target: this });
    }

    /**
     * 根据移动向量判断朝向（8方向）
     * @param {number} vx - X方向速度
     * @param {number} vy - Y方向速度
     */
    updateFacing(vx, vy) {
        // 没有移动就不改变朝向
        if (vx === 0 && vy === 0) return;

        // 用角度判断8方向
        const angle = Math.atan2(vy, vx);
        const deg = Phaser.Math.RadToDeg(angle);

        if (deg >= -22.5 && deg < 22.5) {
            this.facing = DIRECTION.RIGHT;
        } else if (deg >= 22.5 && deg < 67.5) {
            this.facing = DIRECTION.DOWN_RIGHT;
        } else if (deg >= 67.5 && deg < 112.5) {
            this.facing = DIRECTION.DOWN;
        } else if (deg >= 112.5 && deg < 157.5) {
            this.facing = DIRECTION.DOWN_LEFT;
        } else if (deg >= 157.5 || deg < -157.5) {
            this.facing = DIRECTION.LEFT;
        } else if (deg >= -157.5 && deg < -112.5) {
            this.facing = DIRECTION.UP_LEFT;
        } else if (deg >= -112.5 && deg < -67.5) {
            this.facing = DIRECTION.UP;
        } else {
            this.facing = DIRECTION.UP_RIGHT;
        }
    }

    /**
     * 通用移动方法
     * @param {number} vx - X方向速度
     * @param {number} vy - Y方向速度
     */
    move(vx, vy) {
        this.setVelocity(vx, vy);
        this.updateFacing(vx, vy);
    }

    /**
     * 停止移动
     */
    stopMoving() {
        this.setVelocity(0, 0);
    }

    /**
     * 每帧更新（子类重写时记得调用 super.update() 或按需调用）
     * @param {number} time - 当前时间
     * @param {number} delta - 距上一帧的毫秒数
     */
    update(time, delta) {
        // 基类默认不做事，子类按需重写
    }
}
