/**
 * Player.js —— 玩家角色类
 * ------------------------------------------------------------
 * 功能（M1 阶段）：
 *   1. 键盘移动（WASD + 方向键）
 *   2. 动画自动切换：8方向待机 + 3方位行走（左图翻转即右）
 *   3. 攻击（J/空格）：挥砍特效
 *   4. 技能（K）：发射火球
 *   5. 每帧同步属性到全局状态（供 UI 层读取）
 * ------------------------------------------------------------
 * 继承自 BaseComponent（公共基类），受伤/回血/死亡/朝向等通用能力
 * 都写在基类里，这里只写"玩家独有"的逻辑。
 * ------------------------------------------------------------
 */

import { BaseComponent } from '../core/BaseComponent.js';
import { StateManager } from '../core/StateManager.js';
import { EventBus } from '../core/EventBus.js';
import { Projectile } from './Projectile.js';
import { MathUtils } from '../utils/MathUtils.js';
import { showFloatingText } from './FloatingText.js';
import {
    DIRECTION_NAMES, EVENTS, DEPTH,
    PLAYER_SPEED, ATTACK_COOLDOWN, SKILL_COOLDOWN, FIREBALL_MP_COST,
    WORLD_WIDTH, WORLD_HEIGHT,
    MELEE_RANGE, MELEE_HALF_ANGLE,
    REALM_BONUS
} from '../core/Constants.js';

// 8方向朝向 → 发射角度（度数）。注意屏幕坐标里 +Y 方向是朝下的，
// 所以"下"是 90 度、"上"是 -90 度。
// 顺序必须和 Constants.js 里 DIRECTION 的数字顺序一致：
//   DOWN=0, DOWN_LEFT=1, LEFT=2, UP_LEFT=3, UP=4, UP_RIGHT=5, RIGHT=6, DOWN_RIGHT=7
const DIRECTION_ANGLE_DEG = [90, 135, 180, -135, -90, -45, 0, 45];

// 玩家的基础属性（不加点、没境界时的初始值，与 data/player_stats.json 一致）
// M3 总属性公式：基础值 + 加点数×每点效果 + 境界加成×当前境界
const PLAYER_BASE = {
    maxHp: 100,        // 基础生命上限
    maxMp: 50,         // 基础法力上限
    attack: 10,        // 基础攻击力
    defense: 5,        // 基础防御力
    speed: PLAYER_SPEED // 基础移动速度（复用常量）
};

export class Player extends BaseComponent {
    /**
     * @param {Phaser.Scene} scene - 所属场景
     * @param {number} x - 出生X坐标
     * @param {number} y - 出生Y坐标
     */
    constructor(scene, x, y) {
        // 先用待机帧表的第1帧显示，动画注册后会自动切换
        super(scene, x, y, 'player_idle');

        // ===== 基础属性（M3：加点和境界在此基础上叠加） =====
        this.speed = PLAYER_BASE.speed;   // 移动速度（像素/秒）
        this.maxHp = PLAYER_BASE.maxHp;   // 最大生命
        this.hp = this.maxHp;             // 当前生命
        this.maxMp = PLAYER_BASE.maxMp;   // 最大灵力
        this.mp = this.maxMp;             // 当前灵力
        this.attack = PLAYER_BASE.attack; // 攻击力（挥砍/火球的伤害来源）
        this.defense = PLAYER_BASE.defense; // 防御力（被妖兽咬时抵消伤害）

        // 碰撞盒比贴图小一圈（贴图有"空气"，碰撞盒贴着身体）
        this.body.setSize(16, 18);
        this.body.setOffset(8, 6);

        // ===== 冷却计时器（单位：毫秒） =====
        this.attackCdTimer = 0;         // 攻击剩余冷却
        this.skillCdTimer = 0;          // 技能剩余冷却

        // ===== 键盘输入 =====
        // 方向键
        this.cursors = scene.input.keyboard.createCursorKeys();
        // WASD
        this.wasd = scene.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });
        // 攻击/技能键
        this.keys = scene.input.keyboard.addKeys({
            attack: Phaser.Input.Keyboard.KeyCodes.J,       // 攻击
            attack2: Phaser.Input.Keyboard.KeyCodes.SPACE,  // 攻击（备选）
            skill: Phaser.Input.Keyboard.KeyCodes.K         // 技能
        });

        // ===== 创建动画 =====
        this._createAnimations(scene);

        // ===== 按当前加点/境界计算总属性（出生时先算一次） =====
        this.recalcStats();
    }

    /**
     * 创建玩家的全部动画（由 GameScene 的 update 每帧驱动）
     *   - 待机：8个方向，每方向2帧（轻微上下浮动 = 呼吸感）
     *   - 行走：3个方位（上/下/左），每方位4帧（迈步），右=左翻转
     */
    _createAnimations(scene) {
        // ---- 8方向待机 ----
        // 帧表排列：第 row 行 = 第 row 个方向（和 DIRECTION 数字一致）
        DIRECTION_NAMES.forEach((name, row) => {
            const key = `player_idle_${name}`;
            // 防止重复创建（场景重启时动画全局已存在）
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames: scene.anims.generateFrameNumbers('player_idle', {
                        start: row * 2,      // 该方向第1帧
                        end: row * 2 + 1     // 该方向第2帧
                    }),
                    frameRate: 3,            // 慢速：轻轻呼吸
                    repeat: -1               // 无限循环
                });
            }
        });

        // ---- 3方位行走（上/下/左，右用左图翻转） ----
        const walkRows = { up: 0, down: 1, left: 2 }; // 帧表的行号
        Object.keys(walkRows).forEach(name => {
            const key = `player_walk_${name}`;
            if (!scene.anims.exists(key)) {
                scene.anims.create({
                    key,
                    frames: scene.anims.generateFrameNumbers('player_walk', {
                        start: walkRows[name] * 4,       // 该行第1帧
                        end: walkRows[name] * 4 + 3      // 该行第4帧
                    }),
                    frameRate: 8,            // 正常走路速度
                    repeat: -1
                });
            }
        });
    }

    /**
     * 重新计算玩家的全部属性（M3 成长系统核心）
     * 在以下时机调用：出生时 / 突破境界后
     * 公式：总属性 = 基础值 + 境界下标 × 每层境界加成
     * 例如：攻击 = 10(基础) + 境界下标×15
     * 说明：不采用"发属性点手动分配"，突破后属性直接自动提升
     */
    recalcStats() {
        // 从全局状态读取当前境界（0=炼气，1=筑基，2=结丹，3=元婴）
        const realm = StateManager.getState('player.realmIndex') || 0;

        // 三项随境界提升的属性（基础 + 境界 × 每层加成）
        this.maxHp = PLAYER_BASE.maxHp + realm * REALM_BONUS.maxHp;
        this.maxMp = PLAYER_BASE.maxMp + realm * REALM_BONUS.maxMp;
        this.attack = PLAYER_BASE.attack + realm * REALM_BONUS.attack;

        // 防御/身法不随境界提升（保持基础值）
        this.defense = PLAYER_BASE.defense;
        this.speed = PLAYER_BASE.speed;

        // 上限变大时当前血/蓝不能超过上限
        this.hp = Math.min(this.hp, this.maxHp);
        this.mp = Math.min(this.mp, this.maxMp);

        // 同步到全局状态（属性面板 UI 显示用）
        StateManager.setState('player.maxHp', this.maxHp);
        StateManager.setState('player.maxMp', this.maxMp);
        StateManager.setState('player.attack', this.attack);
        StateManager.setState('player.defense', this.defense);
        StateManager.setState('player.speed', this.speed);
    }

    /**
     * 每帧更新（GameScene 每帧调用）
     * @param {number} time - 当前时间
     * @param {number} delta - 距上一帧的毫秒数
     */
    update(time, delta) {
        // 先做冷却倒计时（delta 是毫秒）
        this.attackCdTimer = Math.max(0, this.attackCdTimer - delta);
        this.skillCdTimer = Math.max(0, this.skillCdTimer - delta);

        this._handleMovement();    // ① 读按键 → 移动
        this._handleAnimation();   // ② 根据移动状态切换动画
        this._handleAttack();      // ③ 攻击
        this._handleSkill();       // ④ 技能
        this._syncState();         // ⑤ 把属性同步到全局状态（给UI读）
    }

    // ========== ① 移动 ==========
    _handleMovement() {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -1;
        else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = 1;

        if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -1;
        else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = 1;

        // 斜着走时速度归一化（避免斜走比直走快）
        if (vx !== 0 && vy !== 0) {
            const factor = Math.SQRT1_2; // 1/√2 ≈ 0.707
            vx *= factor;
            vy *= factor;
        }

        // 交给基类的 move()：设置速度 + 自动计算8方向朝向
        this.move(vx * this.speed, vy * this.speed);
    }

    // ========== ② 动画切换 ==========
    _handleAnimation() {
        const vx = this.body.velocity.x;
        const vy = this.body.velocity.y;
        const isMoving = (vx !== 0 || vy !== 0);

        if (isMoving) {
            // —— 行走：3方位（纵向优先分上/下，横向一律用"侧面图"）——
            if (Math.abs(vy) >= Math.abs(vx)) {
                // 主要朝上走 → 上方位；朝下走 → 下方位
                const key = vy < 0 ? 'player_walk_up' : 'player_walk_down';
                this.play(key, true);
                this.setFlipX(false);
            } else {
                // 侧面图：帧表里是"朝左"，向右走时翻转 → 变成朝右
                this.play('player_walk_left', true);
                this.setFlipX(vx > 0);
            }
        } else {
            // —— 停下：播放当前8方向朝向的待机动画 ——
            const name = DIRECTION_NAMES[this.facing];
            this.play(`player_idle_${name}`, true);
            this.setFlipX(false); // 待机图自带左右，不需要翻转
        }
    }

    // ========== ③ 攻击（J 或 空格） ==========
    _handleAttack() {
        const pressAttack = this.keys.attack.isDown || this.keys.attack2.isDown;
        if (pressAttack && this.attackCdTimer <= 0) {
            this.attackCdTimer = ATTACK_COOLDOWN;
            this._doSlash();
        }
    }

    // 挥砍特效（视觉）+ 伤害判定（M2 加入）
    _doSlash() {
        const angle = this._faceAngle();
        const slash = this.scene.add.image(this.x, this.y, 'slash');
        slash.setDepth(DEPTH.EFFECT);
        slash.setRotation(angle); // 让弧形朝向玩家面对的方向

        // 补间动画：从中心放大 + 淡出，180毫秒后销毁
        this.scene.tweens.add({
            targets: slash,
            scale: { from: 0.3, to: 1 },
            alpha: { from: 1, to: 0 },
            duration: 180,
            onComplete: () => slash.destroy()
        });

        // ===== M2：真正的伤害判定（面前的扇形范围） =====
        this._meleeHit();
    }

    /**
     * 近战伤害判定：检查玩家面前一个"扇形"范围内所有妖兽，逐个扣血
     * 判定逻辑：
     *   1. 妖兽离玩家的距离 ≤ MELEE_RANGE（挥砍够得着）
     *   2. 妖兽在玩家面朝方向左右 MELEE_HALF_ANGLE 度以内（砍得到这一侧）
     */
    _meleeHit() {
        const scene = this.sceneRef;
        if (!scene.enemies) return;   // 场景还没建妖兽组就跳过

        // 玩家面朝的角度（度数，屏幕坐标：0=右 90=下 -90=上）
        const faceDeg = DIRECTION_ANGLE_DEG[this.facing];

        // 遍历所有活着的妖兽
        scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active || enemy.isDead) return;

            // 条件①：距离够近吗？
            const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
            if (dist > MELEE_RANGE) return;

            // 条件②：在玩家面前吗？（比较"敌人方向角"和"面朝角"的差）
            const angToEnemy = Phaser.Math.RadToDeg(
                Math.atan2(enemy.y - this.y, enemy.x - this.x)
            );
            let diff = Math.abs(angToEnemy - faceDeg);
            if (diff > 180) diff = 360 - diff;   // 角度差超过180就绕到另一边算

            if (diff <= MELEE_HALF_ANGLE) {
                // 打中！伤害走通用公式：玩家攻击力 vs 妖兽防御力
                const dmg = MathUtils.calcDamage(this.attack, enemy.defense);
                enemy.takeDamage(dmg);
            }
        });
    }

    // ========== ④ 技能（K）：火球 ==========
    _handleSkill() {
        if (this.keys.skill.isDown && this.skillCdTimer <= 0) {
            this.skillCdTimer = SKILL_COOLDOWN;
            this._castFireball();
        }
    }

    // 从玩家面前一点的位置发射一颗火球（每发消耗 10 点法力）
    _castFireball() {
        // 法力不够就放不出来（飘字提示），近战挥砍不受影响
        if (this.mp < FIREBALL_MP_COST) {
            showFloatingText(this.sceneRef, this.x, this.y - 30, '灵力不足！', '#8899ff', 16);
            return;
        }
        this.mp -= FIREBALL_MP_COST;   // 扣法力

        const angle = this._faceAngle();
        const bx = this.x + Math.cos(angle) * 20;
        const by = this.y + Math.sin(angle) * 20;

        const proj = new Projectile(this.scene, bx, by, angle);
        // 把火球登记进场景的"火球组"（GameScene 用它做命中判定）
        if (this.sceneRef.projectiles) {
            this.sceneRef.projectiles.add(proj);
            // 关键修复：加入"火球组"之后，重新调用一次 launch() 设置飞行速度。
            // 因为 Phaser 物理组在 add() 成员时会重置速度，
            // 必须保证"设置速度"发生在"入组"之后，火球才真正飞得出去。
            proj.launch(angle);
        }
        EventBus.emit(EVENTS.SKILL_CAST, { x: bx, y: by, angle });
    }

    // ========== ⑤ 同步属性到全局状态 ==========
    _syncState() {
        StateManager.setState('player.hp', Math.ceil(this.hp));
        StateManager.setState('player.maxHp', this.maxHp);
        StateManager.setState('player.mp', Math.ceil(this.mp));
        StateManager.setState('player.maxMp', this.maxMp);
        StateManager.setState('player.x', Math.round(this.x));
        StateManager.setState('player.y', Math.round(this.y));
        StateManager.setState('player.direction', DIRECTION_NAMES[this.facing]);
    }

    // 当前8方向朝向对应的发射角度（弧度）
    _faceAngle() {
        return Phaser.Math.DegToRad(DIRECTION_ANGLE_DEG[this.facing]);
    }

    // ========== 受伤（覆盖基类：改用"玩家"事件） ==========
    takeDamage(damage) {
        if (this.isDead) return 0;
        this.hp = Math.max(0, this.hp - damage);

        // 广播"玩家受伤"，UI 血条会自己更新
        EventBus.emit(EVENTS.PLAYER_DAMAGED, { damage });

        if (this.hp <= 0) this.die();
        return damage;
    }

    // ========== 死亡 ==========
    // M1 先用"1秒后回出生点满血重生"（完整死亡惩罚流程在后续阶段做）
    die() {
        if (this.isDead) return;
        this.isDead = true;
        EventBus.emit(EVENTS.PLAYER_DEATH, { target: this });

        this.scene.time.delayedCall(1000, () => {
            this.hp = this.maxHp;
            this.mp = this.maxMp;
            this.isDead = false;
            this.setActive(true);
            this.setVisible(true);
            this.body.enable = true;
            this.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2); // 回出生点
            EventBus.emit(EVENTS.PLAYER_HEALED, {});              // 通知血条刷新
        });
    }
}
