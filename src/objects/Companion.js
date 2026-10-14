/**
 * Companion.js —— 伙伴（收服的妖兽）类
 * ------------------------------------------------------------
 * M4 妖兽系统核心：
 *   1. 玩家用"御兽符"收服残血妖兽后，它就变成你的伙伴
 *   2. AI 两状态：跟随（离玩家远了就跟上来）/ 战斗（发现野怪就追过去打）
 *   3. 外观：复用妖兽贴图，缩小一点，更好辨认
 * ------------------------------------------------------------
 * AI 规则（每帧判断）：
 *   视野内有活着的野怪 → 冲过去打（够得着就打，带冷却）
 *   视野内没有野怪       → 跟着玩家，保持 COMPANION_FOLLOW_DIST 距离
 * ------------------------------------------------------------
 */

import { BaseComponent } from '../core/BaseComponent.js';
import { MathUtils } from '../utils/MathUtils.js';
import { StateManager } from '../core/StateManager.js';
import { EventBus } from '../core/EventBus.js';
import {
    EVENTS, DEPTH,
    COMPANION_SCALE, COMPANION_SPEED, COMPANION_FOLLOW_DIST,
    COMPANION_DETECT_RANGE, COMPANION_ATTACK_RANGE, COMPANION_ATTACK_COOLDOWN
} from '../core/Constants.js';

export class Companion extends BaseComponent {
    /**
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 出生X坐标（通常在玩家身边）
     * @param {number} y - 出生Y坐标
     * @param {object} data - 伙伴数据（收服时从妖兽配置里抄下来）：
     *   { key, name, texture, maxHp, hp, attack, defense, speed }
     * @param {Player} player - 玩家的引用（伙伴要跟着玩家）
     */
    constructor(scene, x, y, data, player) {
        // 复用妖兽贴图（史莱姆/野狼…），所以伙伴长得和原野怪一样
        super(scene, x, y, data.texture);

        // 注意：绝对不能把自定义属性起名叫 this.data！
        // Phaser 的精灵自带一个 this.data（DataManager 数据管理器），
        // 销毁精灵时引擎内部会调用 this.data.destroy()；
        // 若把它覆盖成普通对象，销毁时就会报 "this.data.destroy is not a function"。
        // 所以这里用 this.config 存伙伴数据（UI 要显示名字等）。
        this.config = data;
        this.player = player;    // 玩家的引用

        // ===== 属性（数值从妖兽配置抄，后续可整体调整） =====
        this.maxHp = data.maxHp;
        this.hp = data.maxHp;
        this.attack = data.attack;
        this.defense = data.defense;
        this.speed = data.speed || COMPANION_SPEED;  // 配置漏了就补默认值
        this.attackCdTimer = 0;   // 攻击剩余冷却（毫秒）

        // ===== 外观：比原野怪小一点，更好辨认 =====
        this.setScale(COMPANION_SCALE);
        this.setDepth(DEPTH.ENTITY);
        // 碰撞盒比贴图小一圈（贴图有"空气"）
        this.body.setSize(18, 14);
        this.body.setOffset(7, 14);

        // ===== 播放妖兽的待机动画（呼吸/迈步，动画在妖兽生成时已注册） =====
        const animKey = `${data.texture}_idle`;
        if (scene.anims.exists(animKey)) this.play(animKey, true);

        // ===== 头顶小血条（绿色 = 己方伙伴，跟随伙伴移动） =====
        this.hpBarBg = scene.add.rectangle(this.x, this.y - 22, 26, 4, 0x000000)
            .setStrokeStyle(1, 0x777777).setDepth(DEPTH.EFFECT);   // 黑底描边
        this.hpBar = scene.add.rectangle(this.x - 13, this.y - 22, 26, 4, 0x66ff66)
            .setOrigin(0, 0.5).setDepth(DEPTH.EFFECT);             // 绿色填充
    }

    /**
     * 每帧更新（GameScene 每帧调用）
     * @param {number} time - 当前时间
     * @param {number} delta - 距上一帧的毫秒数
     */
    update(time, delta) {
        // 死亡/失活的伙伴不做任何事
        if (this.isDead || !this.active) return;

        // 攻击冷却倒计时
        this.attackCdTimer = Math.max(0, this.attackCdTimer - delta);

        // ===== ① 先找最近的活野怪（在"视野"范围内） =====
        const target = this._findNearestEnemy();

        if (target) {
            // —— 战斗模式：冲过去打 ——
            const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

            if (dist <= COMPANION_ATTACK_RANGE) {
                // 够得着了：站住攻击（带冷却，不是乱咬）
                this.stopMoving();
                if (this.attackCdTimer <= 0) {
                    this.attackCdTimer = COMPANION_ATTACK_COOLDOWN;
                    // 伤害走通用公式：伙伴攻击力 vs 野怪防御力
                    const dmg = MathUtils.calcDamage(this.attack, target.defense);
                    target.takeDamage(dmg);   // 伤害数字由 GameScene 的事件统一飘字
                }
            } else {
                // 还不够近 → 朝野怪方向追
                const ang = Math.atan2(target.y - this.y, target.x - this.x);
                this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
            }
        } else {
            // —— 跟随模式：跟着玩家，保持一段距离 ——
            const distToPlayer = Phaser.Math.Distance.Between(
                this.x, this.y, this.player.x, this.player.y
            );
            if (distToPlayer > COMPANION_FOLLOW_DIST) {
                // 离玩家太远了 → 朝玩家方向跑
                const ang = Math.atan2(this.player.y - this.y, this.player.x - this.x);
                this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
            } else {
                // 距离合适 → 原地待着
                this.stopMoving();
            }
        }

        // ===== 头顶血条跟随伙伴位置 + 平滑变短（和妖兽血条同款写法） =====
        this.hpBarBg.setPosition(this.x, this.y - 22);
        this.hpBar.setPosition(this.x - 13, this.y - 22);
        const hpTarget = Math.max(0, 26 * (this.hp / this.maxHp));
        this.hpBar.width += (hpTarget - this.hpBar.width) * 0.2;
    }

    /**
     * 在场景的"活妖兽列表"里找最近的野怪（超出视野范围就返回 null）
     * @returns {Enemy|null} 最近的野怪，没有就返回 null
     */
    _findNearestEnemy() {
        const list = this.sceneRef.enemyList || [];
        let best = null;
        let bestDist = COMPANION_DETECT_RANGE;
        for (const e of list) {
            if (!e.active || e.isDead) continue;
            const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
            if (d < bestDist) { best = e; bestDist = d; }
        }
        return best;
    }

    /**
     * 伙伴受伤：扣血后同步全局状态（UI 顶栏的伙伴血量跟着变）
     * 注意：伙伴不飘红色伤害数字（它不是敌人，被打也不需要提示）
     */
    takeDamage(damage) {
        if (this.isDead) return 0;
        this.hp = Math.max(0, this.hp - damage);
        // 同步给全局状态：UI 每帧刷新时能读到最新血量
        if (StateManager.getState('player.companion')) {
            StateManager.setState('player.companion.hp', Math.ceil(this.hp));
        }
        if (this.hp <= 0) this.die();
        return damage;
    }

    /**
     * 伙伴离队/被替换：清理头顶血条 + 销毁
     * （收服新妖兽替换旧伙伴时，GameScene 会调用这个方法）
     */
    leave() {
        if (this.hpBarBg) this.hpBarBg.destroy();
        if (this.hpBar) this.hpBar.destroy();
        this.destroy();
    }

    /**
     * 伙伴死亡：清空全局状态里的伙伴数据 + 通知 UI
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;
        StateManager.setState('player.companion', null);
        if (this.sceneRef.companion === this) this.sceneRef.companion = null;
        EventBus.emit(EVENTS.COMPANION_UPDATED, { companion: null });
        this.leave();
    }
}
