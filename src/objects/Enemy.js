/**
 * Enemy.js —— 妖兽（敌人）类
 * ------------------------------------------------------------
 * M2 战斗系统核心：
 *   1. 继承 BaseComponent（自动获得：血量、受伤、死亡、朝向等能力）
 *   2. AI 三状态机：巡逻 → 追击 → 攻击
 *      巡逻：随机溜达，累了就歇会儿
 *      追击：玩家进入"视野"范围，立刻追过去
 *      攻击：够得着玩家了，停下来咬玩家（带攻击冷却）
 *   3. 属性从 enemies.json 读取（史莱姆/野狼/幼龙）
 * ------------------------------------------------------------
 * AI 状态迁移规则（每帧检查距离自动切换）：
 *   玩家距离 > 视野范围   → 巡逻
 *   玩家距离 ≤ 视野范围   → 追击
 *   玩家距离 ≤ 攻击距离   → 攻击
 * ------------------------------------------------------------
 */

import { BaseComponent } from '../core/BaseComponent.js';
import { EventBus } from '../core/EventBus.js';
import { MathUtils } from '../utils/MathUtils.js';
import { Projectile } from './Projectile.js';
import {
    EVENTS, DEPTH,
    ENEMY_DETECT_RANGE, ENEMY_ATTACK_RANGE, ENEMY_ATTACK_COOLDOWN,
    ENEMY_RANGED_KEEP_DIST, ENEMY_RANGED_ATTACK_RANGE, ENEMY_RANGED_COOLDOWN,
    ENEMY_PROJECTILE_SPEED, ENEMY_PROJECTILE_LIFE,
    ENEMY_CHARGE_TRIGGER, ENEMY_CHARGE_WINDUP, ENEMY_CHARGE_SPEED,
    ENEMY_CHARGE_DURATION, ENEMY_CHARGE_COOLDOWN
} from '../core/Constants.js';

// AI 状态枚举（用对象代替魔法字符串，避免写错）
const AI_STATE = {
    PATROL: 'patrol',   // 巡逻：随机溜达
    CHASE: 'chase',     // 追击：发现玩家，追！
    ATTACK: 'attack'    // 攻击：够得着就咬
};

export class Enemy extends BaseComponent {
    /**
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 出生X坐标
     * @param {number} y - 出生Y坐标
     * @param {object} config - 妖兽配置（来自 enemies.json，包含血量/攻击/速度等）
     * @param {Player} player - 玩家对象引用（妖兽要"盯着"玩家）
     */
    constructor(scene, x, y, config, player) {
        // 用配置里的贴图名创建精灵（比如 'enemy_slime'）
        super(scene, x, y, config.texture);

        // ===== 保存引用 =====
        this.config = config;        // 整份配置存下来（死亡掉宝时还要读奖励数值）
        this.player = player;        // 玩家的引用

        // ===== 从配置读属性（数值都在 enemies.json 里改） =====
        this.maxHp = config.maxHp;
        this.hp = config.maxHp;
        this.attack = config.attack;
        this.defense = config.defense;
        this.speed = config.speed || 80;          // 默认速度（防止配置漏写）
        this.aiType = config.aiType || 'patrol';  // AI类型（当前都用同一套状态机）
        this.expReward = config.expReward || 10;   // 死亡给多少经验
        this.spiritReward = config.spiritReward || 5; // 死亡掉多少灵石

        // ===== AI 状态变量 =====
        this.aiState = AI_STATE.PATROL;   // 一开始在巡逻
        this.patrolTimer = 0;             // 巡逻"换方向/歇脚"的倒计时
        this.patrolDir = { x: 0, y: 0 };  // 当前巡逻方向（单位向量）
        this.attackCdTimer = 0;           // 攻击剩余冷却（毫秒）

        // ===== 特殊行为的状态变量（M4.5 扩充妖兽） =====
        this.shootCdTimer = 0;            // 远程型：射击剩余冷却
        this.chargeCdTimer = 0;           // 冲撞型：冲撞剩余冷却
        this.chargeState = 'idle';        // 冲撞型状态：idle 常态 / windup 蓄力 / dash 冲刺中
        this.chargeTimer = 0;             // 冲撞型当前阶段剩余时间
        this.chargeDir = { x: 0, y: 0 };  // 冲撞方向（蓄力结束时锁定，冲刺时沿此方向冲）

        // 视野/攻击距离（常量统一管理，方便全游戏一起调）
        this.detectRange = ENEMY_DETECT_RANGE;
        this.attackRange = ENEMY_ATTACK_RANGE;

        // ===== 碰撞盒比贴图小一圈（贴图有"空气"） =====
        this.body.setSize(18, 14);
        this.body.setOffset(7, 14);

        this.setDepth(DEPTH.ENTITY);

        // ===== 头顶血条（跟随妖兽的两条小矩形：黑底 + 红填充） =====
        // 宽度可以按妖兽体型单独调（enemies.json 里配 barWidth，默认30像素）
        this._hpBarWidth = config.barWidth || 30;
        // 黑底加了 1px 灰描边（白色勾边在深色地图上更醒目）
        this.hpBarBg = this.scene.add.rectangle(this.x, this.y - 24, this._hpBarWidth, 4, 0x000000)
            .setStrokeStyle(1, 0x777777).setDepth(DEPTH.EFFECT);   // 黑色底（永远不变）
        this.hpBar = this.scene.add.rectangle(
            this.x - this._hpBarWidth / 2, this.y - 24,
            this._hpBarWidth, 4, 0xff3333
        ).setOrigin(0, 0.5).setDepth(DEPTH.EFFECT);   // 红色填充（随血量变短）

        // ===== 创建并播放自己的动画（史莱姆呼吸 / 野狼迈步） =====
        this._createAnimations(scene);
    }

    /**
     * 创建妖兽动画：每种妖兽一张2帧的帧表（程序生成），
     * 动画名 = 贴图名 + '_idle'，例如 enemy_slime_idle
     */
    _createAnimations(scene) {
        const key = `${this.config.texture}_idle`;
        // 防止重复创建（场景重启时动画全局已存在）
        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(this.config.texture, {
                    start: 0,
                    end: 1
                }),
                frameRate: 4,    // 每秒4帧：慢悠悠地"呼吸/走"
                repeat: -1       // 无限循环
            });
        }
        // 立刻开始播放（出生后妖兽就一直"动"）
        this.play(key, true);
    }

    /**
     * 每帧更新（GameScene 每帧调用）
     * @param {number} time - 当前时间
     * @param {number} delta - 距上一帧的毫秒数
     */
    update(time, delta) {
        // 死亡/失活的妖兽不做任何事
        if (this.isDead || !this.active) return;

        // 各种冷却倒计时（delta 是毫秒）
        this.attackCdTimer = Math.max(0, this.attackCdTimer - delta);
        this.shootCdTimer = Math.max(0, this.shootCdTimer - delta);
        this.chargeCdTimer = Math.max(0, this.chargeCdTimer - delta);

        // ===== 计算与玩家的距离（判断当前该干什么） =====
        const distToPlayer = Phaser.Math.Distance.Between(
            this.x, this.y, this.player.x, this.player.y
        );

        // ===== 按妖兽类型分派不同的 AI 逻辑 =====
        //   ranged（火鸦）：拉开距离喷火弹
        //   charge（铁甲野猪）：蓄力后冲刺撞击
        //   其余（史莱姆/野狼等）：普通"巡逻/追击/攻击"三态机
        if (this.aiType === 'ranged') {
            this._updateRanged(distToPlayer, delta);
        } else if (this.aiType === 'charge') {
            this._updateCharge(distToPlayer, delta);
        } else {
            this._updateDefault(distToPlayer, delta);
        }

        // ===== 头顶血条每帧跟随妖兽：位置同步 + 宽度按当前血量缩短 =====
        this.hpBarBg.setPosition(this.x, this.y - 24);
        this.hpBar.setPosition(this.x - this._hpBarWidth / 2, this.y - 24);

        // 血条缩短用"平滑过渡"：每次只向目标值靠近 20%，看起来是慢慢变短
        // 而不是瞬间跳变（被咬一口时血量缓缓下降，更直观更好看）
        const hpTarget = Math.max(0, this._hpBarWidth * (this.hp / this.maxHp));
        this.hpBar.width += (hpTarget - this.hpBar.width) * 0.2;
    }

    // ---------- 普通AI（巡逻/追击/攻击三态机，多数妖兽都用这套） ----------
    _updateDefault(distToPlayer, delta) {
        // 按距离自动决定当前状态
        if (distToPlayer <= this.attackRange) {
            this.aiState = AI_STATE.ATTACK;          // 太近了 → 攻击
        } else if (distToPlayer <= this.detectRange) {
            this.aiState = AI_STATE.CHASE;           // 在视野内 → 追击
        } else {
            this.aiState = AI_STATE.PATROL;          // 离得远 → 巡逻
        }

        // 执行当前状态的行为
        switch (this.aiState) {
            case AI_STATE.ATTACK:
                this._doAttack();
                break;
            case AI_STATE.CHASE:
                this._doChase();
                break;
            default:
                this._doPatrol(delta);
        }
    }

    // ---------- 远程型AI（火鸦）：保持距离 + 喷火弹 ----------
    _updateRanged(dist, delta) {
        // ① 玩家太远（超出射程）→ 先按普通AI追过去
        if (dist > ENEMY_RANGED_ATTACK_RANGE) {
            this._updateDefault(dist, delta);
            return;
        }

        // ② 玩家离得太近 → 往后撤，拉开距离（"风筝"打法）
        if (dist < ENEMY_RANGED_KEEP_DIST) {
            // 方向 = 从玩家指向自己（也就是"远离玩家"）
            const ang = Math.atan2(this.y - this.player.y, this.x - this.player.x);
            this.setVelocity(Math.cos(ang) * this.speed, Math.sin(ang) * this.speed);
            return;
        }

        // ③ 距离刚好（在理想距离与射程之间）→ 停下开火
        this.stopMoving();
        if (this.shootCdTimer <= 0) {
            this.shootCdTimer = ENEMY_RANGED_COOLDOWN;
            this._shootAtPlayer();
        }
    }

    /** 远程型：朝玩家方向喷出一颗火弹（加入场景的"妖兽弹道组"） */
    _shootAtPlayer() {
        // 算出玩家相对自己的方向角
        const ang = Math.atan2(this.player.y - this.y, this.player.x - this.x);
        // 复用玩家的火球类，换贴图/速度/存活时间 → 变成妖兽火弹
        const proj = new Projectile(this.sceneRef, this.x, this.y, ang, {
            texture: 'enemy_fire',
            speed: ENEMY_PROJECTILE_SPEED,
            life: ENEMY_PROJECTILE_LIFE
        });
        // 做两个标记：说明"这是敌人的弹"，并带上攻击力（命中玩家时按它算伤害）
        proj.ownerType = 'enemy';
        proj.attackPower = this.attack;

        // 加入场景的妖兽弹道组（碰撞检测在 GameScene 里配置）
        if (this.sceneRef.enemyProjectiles) {
            this.sceneRef.enemyProjectiles.add(proj);
            proj.launch(ang);   // 组add()可能重置速度，加组后再设一次速度
        }
    }

    // ---------- 冲撞型AI（铁甲野猪）：蓄力 → 冲刺 → 冷却 ----------
    _updateCharge(dist, delta) {
        // ① 冲刺中：沿"锁定的方向"高速撞过去
        if (this.chargeState === 'dash') {
            this.chargeTimer -= delta;
            this.setVelocity(
                this.chargeDir.x * ENEMY_CHARGE_SPEED,
                this.chargeDir.y * ENEMY_CHARGE_SPEED
            );
            // 冲刺途中蹭到玩家 → 也造成伤害（受同一个攻击冷却约束）
            if (dist <= this.attackRange && this.attackCdTimer <= 0) {
                this.attackCdTimer = ENEMY_ATTACK_COOLDOWN;
                const dmg = MathUtils.calcDamage(this.attack, this.player.defense);
                this.player.takeDamage(dmg);
            }
            // 冲刺时间结束 → 停下歇一会儿，进入冷却
            if (this.chargeTimer <= 0) {
                this.chargeState = 'idle';
                this.chargeCdTimer = ENEMY_CHARGE_COOLDOWN;
                this.stopMoving();
                this.clearTint();
            }
            return;
        }

        // ② 蓄力中：原地不动（给玩家反应时间），蓄满就冲
        if (this.chargeState === 'windup') {
            this.chargeTimer -= delta;
            this.stopMoving();
            if (this.chargeTimer <= 0) {
                // 锁定此刻"朝向玩家"的方向，之后冲刺就一直沿这个方向（可被走位躲开）
                const ang = Math.atan2(this.player.y - this.y, this.player.x - this.x);
                this.chargeDir = { x: Math.cos(ang), y: Math.sin(ang) };
                this.chargeState = 'dash';
                this.chargeTimer = ENEMY_CHARGE_DURATION;
                this.setTint(0xff8844);   // 冲刺时染橙红（视觉警告）
            }
            return;
        }

        // ③ 常态：先按普通AI行动（巡逻/追击/攻击）
        this._updateDefault(dist, delta);

        // 玩家进入"冲撞触发范围"且冷却已好 → 开始蓄力
        if (dist <= ENEMY_CHARGE_TRIGGER && this.chargeCdTimer <= 0) {
            this.chargeState = 'windup';
            this.chargeTimer = ENEMY_CHARGE_WINDUP;
            this.stopMoving();
            this.setTint(0xffcc00);   // 蓄力时染金黄（提醒玩家"要冲了，快躲"）
        }
    }

    // ---------- 状态①：巡逻（随机溜达，偶尔停下来发呆） ----------
    _doPatrol(delta) {
        this.patrolTimer -= delta;

        // 倒计时结束 → 随机决定下一步：发呆 或 换个方向走
        if (this.patrolTimer <= 0) {
            if (Math.random() < 0.5) {
                // 一半概率：停下来发呆一小会儿
                this.stopMoving();
                this.patrolDir = { x: 0, y: 0 };
                this.patrolTimer = Phaser.Math.Between(500, 1500);
            } else {
                // 一半概率：随机挑一个方向继续溜达
                const ang = Math.random() * Math.PI * 2;
                this.patrolDir = { x: Math.cos(ang), y: Math.sin(ang) };
                this.patrolTimer = Phaser.Math.Between(800, 2000);
            }
        }

        // 如果正在走，就朝巡逻方向移动
        if (this.patrolDir.x !== 0 || this.patrolDir.y !== 0) {
            this.setVelocity(
                this.patrolDir.x * this.speed,
                this.patrolDir.y * this.speed
            );
        }
    }

    // ---------- 状态②：追击（直直冲向玩家） ----------
    _doChase() {
        // 算出玩家相对自己的方向角
        const ang = Math.atan2(
            this.player.y - this.y,
            this.player.x - this.x
        );
        // 朝玩家方向全速跑
        this.setVelocity(
            Math.cos(ang) * this.speed,
            Math.sin(ang) * this.speed
        );
    }

    // ---------- 状态③：攻击（停下来咬玩家） ----------
    _doAttack() {
        this.stopMoving();   // 攻击时站住

        // 冷却好了才咬人（不然就是每秒乱咬）
        if (this.attackCdTimer <= 0) {
            this.attackCdTimer = ENEMY_ATTACK_COOLDOWN;

            // 伤害走通用公式：攻击力 vs 玩家防御力，保底1点
            const dmg = MathUtils.calcDamage(this.attack, this.player.defense);
            this.player.takeDamage(dmg);

            // 咬人时轻轻往前"扑"一下（视觉反馈）
            const toPlayer = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);
            const targetX = this.x + Math.cos(toPlayer) * 8;
            const targetY = this.y + Math.sin(toPlayer) * 8;
            this.scene.tweens.add({
                targets: this,
                x: targetX,
                y: targetY,
                duration: 120,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        }
    }

    /**
     * 死亡（覆盖基类：先"爆开"再消失，更有打击感）
     * 基类的 die() 会立刻隐藏，这里改成：
     *   1. 停用物理体（不再被碰撞）
     *   2. 放大 + 淡出 动画（260毫秒）
     *   3. 广播 ENEMY_DEATH 事件 → GameScene 收到后生成掉落物
     */
    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.setActive(false);
        this.body.enable = false;
        this.setVelocity(0, 0);

        // 头顶血条一起消失
        this.hpBarBg.destroy();
        this.hpBar.destroy();

        // 死亡"爆开"动画：放大 + 变透明
        this.scene.tweens.add({
            targets: this,
            scale: 1.6,
            alpha: 0,
            duration: 260,
            onComplete: () => this.destroy()  // 动画结束彻底销毁
        });

        // 通知全场：这只妖兽死了（掉落逻辑在 GameScene 里）
        EventBus.emit(EVENTS.ENEMY_DEATH, { target: this });
    }
}
