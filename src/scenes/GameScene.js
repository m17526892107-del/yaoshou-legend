/**
 * GameScene.js —— 游戏主场景（M3：成长系统）
 * ------------------------------------------------------------
 * 作用：游戏的核心玩法都在这里——大地图、玩家、妖兽、战斗、掉落。
 * M2 阶段新增：
 *   - 从 enemies.json 读取妖兽配置，在野外生成妖兽
 *   - 妖兽 AI（巡逻/追击/攻击）
 *   - 战斗：玩家挥砍(扇形) + 火球命中 妖兽；妖兽咬玩家
 *   - 掉落：妖兽死亡掉金币/经验珠，玩家走近自动拾取
 * M3 阶段改动：
 *   - 去掉"等级"概念：击杀妖兽直接获得经验，攒够经验自动"境界突破"
 *   - 突破后属性自动提升（攻击/气血/法力上限直接涨，不再发属性点）
 * M3 迭代（用户测试反馈修正）：
 *   - 妖兽死后 8 秒在原类别随机位置重新刷一只（地图上永远有怪可打）
 *   - 击杀妖兽直接获得经验（不再掉经验珠，省去拾取步骤）
 *   - 灵石（蓝色晶体）作为游戏通用货币，掉地上可拾取
 *   - 玩家头顶常驻血条；妖兽头顶显示血条
 *   - 火球每发消耗 10 法力，近战挥砍不耗蓝
 * M4 阶段新增（妖兽系统初版）：
 *   - 收服：残血(<30%)妖兽按 U 键消耗1张御兽符尝试收服（带成功率，失败不扣符）
 *   - 御兽符：开局送3张；击杀妖兽低概率掉；可用"妖丹材料+灵石"制符（G键）
 *   - 妖丹材料：击杀妖兽概率掉落，捡起来留着制符用
 *   - 伙伴：收服成功的妖兽变成伙伴，跟随玩家并自动攻击附近野怪
 * ------------------------------------------------------------
 */

import { Player } from '../objects/Player.js';
import { Enemy } from '../objects/Enemy.js';
import { Companion } from '../objects/Companion.js';
import { Drop } from '../objects/Drop.js';
import { showFloatingText } from '../objects/FloatingText.js';
import { MathUtils } from '../utils/MathUtils.js';
import { StateManager } from '../core/StateManager.js';
import { EventBus } from '../core/EventBus.js';
import {
    EVENTS, DEPTH, WORLD_WIDTH, WORLD_HEIGHT,
    REALM_EXP_REQUIRED, REALMS, ENEMY_RESPAWN_DELAY,
    TAME_RANGE, TAME_HP_RATIO, TAME_BASE_SUCCESS,
    CRAFT_COST, MATERIAL_DROP_RATE, TALISMAN_DROP_RATE
} from '../core/Constants.js';

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        console.log('[GameScene] 游戏主场景启动');

        // ===== 1. 物理世界边界（角色最远能走到哪） =====
        this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        // ===== 2. 草地地面：用"草地贴图"无限平铺整张地图 =====
        const ground = this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'grass');
        ground.setOrigin(0, 0);            // 从左上角开始铺
        ground.setDepth(DEPTH.MAP_GROUND); // 地面层

        // ===== 3. 树木：静态障碍物 =====
        this.trees = this.physics.add.staticGroup();
        this._placeTrees();

        // ===== 4. 创建玩家 =====
        this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
        this.player.setDepth(DEPTH.ENTITY);

        // 玩家与树木碰撞（会挡路）
        this.physics.add.collider(this.player, this.trees);

        // ===== 4b. 玩家头顶常驻血条（黑底 + 红色填充 + 血量数字，始终跟着玩家） =====
        this.playerHpBarW = 34;   // 血条总宽度（像素）
        this.playerHpBg = this.add.rectangle(
            this.player.x, this.player.y - 30, this.playerHpBarW, 5, 0x000000
        ).setStrokeStyle(1, 0x777777).setDepth(DEPTH.EFFECT);   // 黑色底 + 细描边
        this.playerHpBar = this.add.rectangle(
            this.player.x - this.playerHpBarW / 2, this.player.y - 30,
            this.playerHpBarW, 5, 0xff3333
        ).setOrigin(0, 0.5).setDepth(DEPTH.EFFECT);   // 红色填充（平滑变短）
        // 头顶血量数字（如 100/100）
        this.playerHpText = this.add.text(this.player.x, this.player.y - 40, '', {
            fontFamily: 'Arial', fontSize: '10px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(DEPTH.EFFECT);

        // ===== 5. 读取妖兽配置（PreloadScene 里加载的 enemies.json） =====
        this.enemyData = this.cache.json.get('enemies') || {};

        // ===== 6. 战斗相关的"组"（Phaser 的组 = 一篮子同类的对象） =====
        this.enemies = this.physics.add.group();      // 所有妖兽
        this.enemyList = [];                          // 活着的妖兽列表（逐帧更新AI用）
        this.drops = this.physics.add.group();        // 所有掉落物
        this.projectiles = this.physics.add.group();  // 玩家火球
        this.enemyProjectiles = this.physics.add.group(); // 妖兽火弹（M4.5：火鸦喷射）

        // 生成妖兽（史莱姆 + 野狼 + M4.5 新增的毒蜂/铁甲野猪/火鸦）
        this._spawnEnemies();

        // ===== 7. 碰撞规则（谁和谁会"撞到/擦过"） =====
        // 妖兽会互相挡路、也会被树挡住
        this.physics.add.collider(this.enemies, this.trees);
        this.physics.add.collider(this.enemies, this.enemies);
        // 玩家会被妖兽挡住（不然直接穿过去）
        this.physics.add.collider(this.player, this.enemies);
        // 火球撞树就消失
        this.physics.add.collider(this.projectiles, this.trees, (proj) => proj.destroy());
        // 火球碰到妖兽 → 造成伤害（重叠检测）
        this.physics.add.overlap(this.projectiles, this.enemies, this._onProjectileHit, null, this);
        // 妖兽火弹（M4.5）：撞树消失 / 命中玩家 → 玩家受伤
        this.physics.add.collider(this.enemyProjectiles, this.trees, (proj) => proj.destroy());
        this.physics.add.overlap(this.enemyProjectiles, this.player, this._onEnemyProjectileHit, null, this);
        // 玩家碰到掉落物 → 自动拾取
        this.physics.add.overlap(this.player, this.drops, this._onPickupDrop, null, this);

        // ===== 7b. 伙伴（M4）：收服的妖兽，碰撞规则——跟随时不穿墙/不穿人/不穿怪 =====
        this.companions = this.physics.add.group();
        this.physics.add.collider(this.companions, this.trees);
        this.physics.add.collider(this.companions, this.player);
        this.physics.add.collider(this.companions, this.enemies);

        // ===== 8. 事件监听（妖兽死亡掉宝 / 受伤飘字 / 玩家受伤反馈） =====
        // 存好引用，场景关闭时能取消监听（防止重复监听）
        this._onEnemyDeathHandler = (data) => this._onEnemyDeath(data);
        this._onEnemyDamagedHandler = (data) => this._onEnemyDamaged(data);
        this._onPlayerDamagedHandler = (data) => this._playerHurtEffect(data);

        EventBus.on(EVENTS.ENEMY_DEATH, this._onEnemyDeathHandler);
        EventBus.on(EVENTS.ENEMY_DAMAGED, this._onEnemyDamagedHandler);
        EventBus.on(EVENTS.PLAYER_DAMAGED, this._onPlayerDamagedHandler);

        // 场景关闭时取消监听（避免回菜单再进来时"旧监听"还在，导致掉宝重复）
        this.events.once('shutdown', () => {
            EventBus.off(EVENTS.ENEMY_DEATH, this._onEnemyDeathHandler);
            EventBus.off(EVENTS.ENEMY_DAMAGED, this._onEnemyDamagedHandler);
            EventBus.off(EVENTS.PLAYER_DAMAGED, this._onPlayerDamagedHandler);
        });

        // ===== 9. 相机跟随玩家（世界比屏幕大，相机跟着角色跑） =====
        this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

        // ===== 10. 操作提示（固定在屏幕上，不随相机滚动） =====
        this.add.text(20, 20, 'WASD/方向键 移动 | J/空格 攻击 | K 火球 | C 属性面板 | U 收服 | G 制符 | ESC 回菜单', {
            fontFamily: 'Microsoft YaHei',
            fontSize: '16px',
            color: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 10, y: 5 }
        }).setDepth(DEPTH.UI).setScrollFactor(0);

        // ESC 返回主菜单（临时调试用）
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.stop('UIScene');
            this.scene.start('MenuScene');
        });

        // M4：U 收服最近残血妖兽 / G 制符（妖丹材料+灵石 → 御兽符）
        this.input.keyboard.on('keydown-U', () => this._tameNearest());
        this.input.keyboard.on('keydown-G', () => this._craftTalisman());
    }

    // ========== 生成妖兽 ==========

    /**
     * 撒妖兽（M4.5 扩充后共 6 种，按强度分三档）
     *   低级：史莱姆（巡逻，好欺负）/ 毒蜂（高速脆皮，成群追人）
     *   中级：野狼（追击）/ 铁甲野猪（会蓄力冲撞）
     *   高级：火鸦（远程喷火弹）
     * 数量想改就改这里的数字
     */
    _spawnEnemies() {
        for (let i = 0; i < 6; i++) this._spawnEnemy('slime');       // 6 只史莱姆
        for (let i = 0; i < 3; i++) this._spawnEnemy('poison_bee');  // 3 只毒蜂
        for (let i = 0; i < 2; i++) this._spawnEnemy('wolf');        // 2 只野狼
        for (let i = 0; i < 2; i++) this._spawnEnemy('iron_boar');   // 2 只铁甲野猪
        for (let i = 0; i < 2; i++) this._spawnEnemy('fire_crow');   // 2 只火鸦
    }

    /**
     * 生成一只妖兽（按 enemies.json 里的 key 找配置）
     * @param {string} key - 妖兽配置键，如 'slime' / 'wolf'
     */
    _spawnEnemy(key) {
        const config = this.enemyData[key];
        if (!config) return;   // 配置找不到就跳过（数据文件里没有这个妖兽）

        const pos = this._randomSpawnPos();
        const enemy = new Enemy(this, pos.x, pos.y, { ...config, key }, this.player);
        this.enemies.add(enemy);   // 进"妖兽组"（用于碰撞/重叠检测）
        this.enemyList.push(enemy); // 进"活体列表"（用于逐帧AI更新）
        return enemy;
    }

    /**
     * 随机挑一个出生点：离玩家出生点远一点（不堵门），且不贴地图边
     */
    _randomSpawnPos() {
        for (let attempt = 0; attempt < 30; attempt++) {
            const x = Phaser.Math.Between(150, WORLD_WIDTH - 150);
            const y = Phaser.Math.Between(150, WORLD_HEIGHT - 150);
            // 离地图中心（玩家出生点）至少 300 像素
            const dist = Phaser.Math.Distance.Between(x, y, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
            if (dist > 300) return { x, y };
        }
        // 试了很多次都失败（地图太小？），随便放个角落
        return { x: WORLD_WIDTH - 400, y: WORLD_HEIGHT - 400 };
    }

    // ========== 战斗回调 ==========

    /**
     * 火球命中妖兽：造成伤害 + 火球消失
     * @param {Phaser.Physics.Arcade.Sprite} proj - 火球
     * @param {Enemy} enemy - 被撞到的妖兽
     */
    _onProjectileHit(proj, enemy) {
        if (enemy.isDead) return;
        // 伤害走通用公式：玩家攻击力 vs 妖兽防御力
        const dmg = MathUtils.calcDamage(this.player.attack, enemy.defense);
        enemy.takeDamage(dmg);
        proj.destroy();   // 火球撞到东西就没了
    }

    /**
     * 妖兽火弹命中玩家（M4.5：火鸦的远程攻击）
     * 说明：Phaser 的重叠回调参数顺序会因"组/单个对象"而变（可能是 [火弹,玩家]，
     *       也可能是 [玩家,火弹]），所以这里不依赖顺序，直接按特征认出各自身份。
     * @param {Projectile|Player} a - 回调第一个参数
     * @param {Projectile|Player} b - 回调第二个参数
     */
    _onEnemyProjectileHit(a, b) {
        // 认出哪个是"妖兽火弹"（有 ownerType='enemy' 标记）
        const proj = (a && a.ownerType === 'enemy') ? a : b;
        const victim = (proj === a) ? b : a;   // 另一个就是被命中的玩家

        // 保险判断：火弹已销毁 / 找不到玩家 / 玩家没有受伤方法 → 直接跳过
        if (!proj || !proj.active || !victim || typeof victim.takeDamage !== 'function') return;

        // 伤害走通用公式：火弹攻击力 vs 玩家防御力，保底1点
        const dmg = MathUtils.calcDamage(proj.attackPower || 10, victim.defense);
        victim.takeDamage(dmg);
        proj.destroy();   // 命中后火弹消失
    }

    /**
     * 玩家碰到掉落物：自动拾取
     * @param {Player} player - 玩家
     * @param {Drop} drop - 掉落的物品
     */
    _onPickupDrop(player, drop) {
        drop.destroy();   // 物品被捡走，消失

        // 灵石/妖丹/御兽符 三种可拾取物（经验直接进账，不落地）
        if (drop.type === 'spirit') {
            // —— 灵石：累加到全局状态，UI 顶栏会自动显示 ——
            const stones = StateManager.getState('player.spiritStones') || 0;
            StateManager.setState('player.spiritStones', stones + drop.value);
            showFloatingText(this, drop.x, drop.y - 12, `+${drop.value} 灵石`, '#66ccff', 15);
        } else if (drop.type === 'material') {
            // —— 妖丹材料（M4）：制符的原料，捡起来累计 ——
            const materials = StateManager.getState('player.materials') || 0;
            StateManager.setState('player.materials', materials + drop.value);
            showFloatingText(this, drop.x, drop.y - 12, `+${drop.value} ${drop.name}`, '#cc88ff', 15);
        } else if (drop.type === 'talisman') {
            // —— 御兽符（M4）：直接加1张 ——
            const talismans = StateManager.getState('player.talismans') || 0;
            StateManager.setState('player.talismans', talismans + drop.value);
            showFloatingText(this, drop.x, drop.y - 12, `+${drop.value} 御兽符！`, '#ffdd66', 15);
        }
    }

    /**
     * 妖兽死亡：击杀直接获得经验 + 掉灵石 + 安排刷新
     * @param {object} data - 事件数据，data.target = 死掉的妖兽
     */
    _onEnemyDeath(data) {
        const enemy = data.target;
        if (!enemy || !enemy.config) return;

        // ① 击杀直接获得经验（不用再跑过去捡经验珠）
        this._gainExp(enemy.expReward);

        // ② 掉灵石（游戏通用货币，掉地上走近自动拾取）
        this._spawnDrop(enemy.x, enemy.y, 'spirit', enemy.spiritReward);

        // ②b（M4）概率掉"妖丹材料"：制御兽符的原料
        // 妖兽自己配了掉落概率就用它的，没配就用全局默认值
        const matRate = enemy.config.materialDropRate !== undefined
            ? enemy.config.materialDropRate
            : MATERIAL_DROP_RATE;
        if (Math.random() < matRate) {
            this._spawnDrop(enemy.x, enemy.y, 'material', 1, enemy.config.materialName || '妖丹');
        }

        // ②c（M4）低概率直接掉"御兽符"（小惊喜）
        if (Math.random() < TALISMAN_DROP_RATE) {
            this._spawnDrop(enemy.x, enemy.y, 'talisman', 1);
        }

        // ③ 从"活体列表"里移除（update 循环不再管它）
        const idx = this.enemyList.indexOf(enemy);
        if (idx >= 0) this.enemyList.splice(idx, 1);

        // ④ 8秒后在同一类妖兽里重新刷一只（保证地图上永远有怪可以打）
        this._respawnEnemy(enemy.config.key, ENEMY_RESPAWN_DELAY);
    }

    /**
     * 妖兽受伤：在它头上飘一个红色伤害数字
     * @param {object} data - 事件数据，data.target=妖兽，data.damage=伤害值
     */
    _onEnemyDamaged(data) {
        if (!data || !data.target || !data.target.active) return;
        showFloatingText(this, data.target.x, data.target.y - 22, `-${data.damage}`, '#ff5555', 16);
    }

    /**
     * 生成一个掉落物（放进掉落组，用于拾取检测）
     * @param {string} type - 掉落物类型（'spirit'灵石 / 'material'妖丹 / 'talisman'御兽符）
     * @param {number} value - 数量
     * @param {string} name - 物品名（拾取提示飘字用，妖丹才需要）
     */
    _spawnDrop(x, y, type, value, name = '') {
        const dx = Phaser.Math.Between(-12, 12);   // 左右随机错开
        const dy = Phaser.Math.Between(-12, 12);   // 上下随机错开
        const drop = new Drop(this, x + dx, y + dy, type, value, name);
        this.drops.add(drop);
    }

    /**
     * 获得经验（击杀妖兽时调用）：经验直接累加，攒够就自动境界突破
     * @param {number} amount - 本次获得多少经验
     */
    _gainExp(amount) {
        // 把之前攒的经验和这次拿到的经验加在一起，得到"累积总经验"
        const totalExp = (StateManager.getState('player.exp') || 0) + amount;

        // 飘字提示"获得经验"
        showFloatingText(this, this.player.x, this.player.y - 34, `+${amount} 经验`, '#88ff88', 16);

        // 把"累积总经验"整包交给 _breakRealm 统一判断和扣减
        // （注意：这里【不能】提前减掉门槛经验，否则刚好凑够门槛时会出错）
        this._breakRealm(totalExp);
    }

    /**
     * 境界突破（取代原来的"升级"）：可以链式连破多境
     * 每破一境：境界+1、属性自动提升（攻击/气血/法力上限直接涨）、满血满蓝
     * @param {number} exp - 当前"累积总经验"（这里统一判断是否够门槛并扣减）
     */
    _breakRealm(exp) {
        let realmIndex = StateManager.getState('player.realmIndex') || 0;

        // 链式判断：只要累积经验够"下一境"的门槛，就一直突破（可连破多境）
        while (realmIndex < REALM_EXP_REQUIRED.length &&
               exp >= REALM_EXP_REQUIRED[realmIndex]) {
            exp -= REALM_EXP_REQUIRED[realmIndex];   // 扣掉突破消耗的经验
            realmIndex += 1;                          // 境界+1

            // 每破一境飘字提示（纯视觉反馈，不涉及状态读写）
            showFloatingText(this, this.player.x, this.player.y - 44,
                `境界突破！${REALMS[realmIndex]}（攻击/气血/法力提升）`, '#aa88ff', 22);
        }

        // —— 先写回全局状态：境界 + 剩余经验 + 下一境所需经验 ——
        // 注意：状态必须先写完，再广播事件，
        // 否则 UI 收到事件后读到的还是旧境界（境界文字会显示错一境）
        StateManager.setState('player.realmIndex', realmIndex);
        StateManager.setState('player.exp', exp);
        // 下一境的门槛经验；已到元婴（最后一境）就封顶不再涨
        const nextNeed = realmIndex < REALM_EXP_REQUIRED.length
            ? REALM_EXP_REQUIRED[realmIndex]
            : 999999;
        StateManager.setState('player.expToNext', nextNeed);

        // 重算总属性（境界带来的提升直接生效），突破后满血满蓝
        this.player.recalcStats();
        this.player.hp = this.player.maxHp;
        this.player.mp = this.player.maxMp;

        // —— 最后广播"境界突破"事件：此刻 UI 读到的都是最新值 ——
        EventBus.emit(EVENTS.REALM_UP, { realmIndex, realmName: REALMS[realmIndex] });
    }

    /**
     * 妖兽刷新：延迟一段时间后，在原类别里随机位置重新生成一只
     * @param {string} key - 妖兽配置键，如 'slime' / 'wolf'
     * @param {number} delay - 延迟多少毫秒后刷
     */
    _respawnEnemy(key, delay) {
        this.time.delayedCall(delay, () => {
            // 场景已经关闭就不刷了（防止回菜单后还在偷偷生成）
            if (!this.scene.isActive()) return;
            this._spawnEnemy(key);
        });
    }

    // ========== M4：妖兽收服 / 制符 / 伙伴 ==========

    /**
     * 按 U 键调用：收服最近的残血妖兽
     * 条件：① 距离玩家 ≤ TAME_RANGE（收服距离）
     *       ② 血量 ≤ 最大血量 × TAME_HP_RATIO（残血线，默认30%）
     *       ③ 身上有御兽符
     * 判定：随机数与 TAME_BASE_SUCCESS 比较
     *       成功 → 消耗1张符，妖兽变成伙伴（替换旧伙伴）
     *       失败 → 不扣符，只飘字提示（设计决策：失败不惩罚）
     */
    _tameNearest() {
        // ① 在"收服距离"内找最近的残血妖兽
        let best = null;
        let bestDist = TAME_RANGE;
        for (const enemy of this.enemyList) {
            if (!enemy.active || enemy.isDead) continue;
            // 残血线：当前血量 / 最大血量 必须 ≤ TAME_HP_RATIO
            if (enemy.hp / enemy.maxHp > TAME_HP_RATIO) continue;
            const d = Phaser.Math.Distance.Between(
                this.player.x, this.player.y, enemy.x, enemy.y
            );
            if (d <= bestDist) { best = enemy; bestDist = d; }
        }

        // 附近没有可收服的妖兽（或者都还没被打残血）
        if (!best) {
            showFloatingText(this, this.player.x, this.player.y - 30,
                '附近没有可收服的残血妖兽', '#999999', 15);
            return;
        }

        // ② 检查御兽符够不够
        const talismans = StateManager.getState('player.talismans') || 0;
        if (talismans <= 0) {
            showFloatingText(this, this.player.x, this.player.y - 30,
                '御兽符不足！按 G 用妖丹+灵石制符', '#ffaa66', 15);
            return;
        }

        // ③ 成功率判定（数值在 Constants.js 里可调）
        if (Math.random() < TAME_BASE_SUCCESS) {
            // —— 成功：消耗1张符，妖兽变成伙伴 ——
            StateManager.setState('player.talismans', talismans - 1);
            this._captureEnemy(best);          // 把这只妖兽从地图上"请走"
            this._setCompanion(best.config);   // 生成伙伴（自动替换旧伙伴）
            showFloatingText(this, best.x, best.y - 30,
                `收服成功！${best.config.name} 成为你的伙伴`, '#88ff88', 18);
            EventBus.emit(EVENTS.TAME_SUCCESS, { name: best.config.name });
        } else {
            // —— 失败：不扣符，鼓励多试几次 ——
            showFloatingText(this, best.x, best.y - 30,
                '收服失败！再试一次', '#ff8888', 18);
            EventBus.emit(EVENTS.TAME_FAIL, {});
        }
    }

    /**
     * 收服成功后：把这只妖兽从地图上"请走"
     * 注意：收服 ≠ 击杀，不能走 die()（那会触发掉落/刷新），
     *       这里直接停用物理 + 销毁，同时从活体列表移除
     * @param {Enemy} enemy - 被收服的妖兽
     */
    _captureEnemy(enemy) {
        enemy.isDead = true;          // 标记死亡（AI 循环会跳过它）
        enemy.setActive(false);
        enemy.body.enable = false;    // 停用物理（不再被碰撞/被火球打）
        enemy.setVelocity(0, 0);
        // 清理头顶血条
        if (enemy.hpBarBg) enemy.hpBarBg.destroy();
        if (enemy.hpBar) enemy.hpBar.destroy();
        // 从"活体列表"移除（update 循环不再管它）
        const idx = this.enemyList.indexOf(enemy);
        if (idx >= 0) this.enemyList.splice(idx, 1);
        enemy.destroy();              // 彻底从地图消失
    }

    /**
     * 设置/替换当前伙伴：生成伙伴对象 + 写入全局状态 + 广播事件
     * （替换规则：已有伙伴时先让旧伙伴离队，只带1只）
     * @param {object} config - 被收服妖兽的配置（enemies.json 里的数据）
     */
    _setCompanion(config) {
        // ① 已有伙伴：先离队销毁（替换掉旧伙伴）
        if (this.companion) {
            this.companion.leave();
            this.companion = null;
        }

        // ② 在玩家身边生成新伙伴（跟随玩家 + 自动攻击野怪）
        this.companion = new Companion(
            this,
            this.player.x + 40, this.player.y + 40,   // 出生在玩家右下方一点
            {
                key: config.key,
                name: config.name,
                texture: config.texture,
                maxHp: config.maxHp,
                hp: config.maxHp,
                attack: config.attack,
                defense: config.defense,
                speed: config.speed
            },
            this.player
        );
        this.companions.add(this.companion);   // 进"伙伴组"（参与碰撞规则）

        // ③ 写入全局状态（UI 顶栏读取伙伴名字/血量）
        StateManager.setState('player.companion', {
            key: config.key,
            name: config.name,
            maxHp: config.maxHp,
            hp: config.maxHp,
            attack: config.attack,
            defense: config.defense
        });
        // ④ 广播事件（注意：先写状态，再发事件，UI 读到的一定是最新值）
        EventBus.emit(EVENTS.COMPANION_UPDATED, { companion: this.companion });
    }

    /**
     * 按 G 键调用：制符（妖丹材料 + 灵石 → 1张御兽符）
     * 消耗与产量都写在 Constants.js 的 CRAFT_COST 里，方便调整
     */
    _craftTalisman() {
        const materials = StateManager.getState('player.materials') || 0;
        const stones = StateManager.getState('player.spiritStones') || 0;

        // 材料不够就提示缺啥（飘字内容自动读常量，改常量提示也跟着变）
        if (materials < CRAFT_COST.material || stones < CRAFT_COST.spiritStones) {
            showFloatingText(
                this, this.player.x, this.player.y - 30,
                `制符需要 ${CRAFT_COST.material} 妖丹 + ${CRAFT_COST.spiritStones} 灵石`,
                '#ffaa66', 15
            );
            return;
        }

        // 扣材料 → 御兽符 +1
        StateManager.setState('player.materials', materials - CRAFT_COST.material);
        StateManager.setState('player.spiritStones', stones - CRAFT_COST.spiritStones);
        StateManager.setState('player.talismans', (StateManager.getState('player.talismans') || 0) + 1);
        showFloatingText(this, this.player.x, this.player.y - 30, '制符成功！御兽符 +1', '#88ff88', 18);
    }

    // ========== 地图装饰（M1 已有） ==========

    /**
     * 随机撒一些树（避开玩家出生点附近，别堵门）
     */
    _placeTrees() {
        const margin = 200; // 地图边缘留白
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(margin, WORLD_WIDTH - margin);
            const y = Phaser.Math.Between(margin, WORLD_HEIGHT - margin);

            // 出生点周围留空
            if (Math.abs(x - WORLD_WIDTH / 2) < 160) continue;
            if (Math.abs(y - WORLD_HEIGHT / 2) < 160) continue;

            const tree = this.trees.create(x, y, 'tree');
            tree.setDepth(DEPTH.MAP_OBJECT);
            // 碰撞盒缩小到树干位置（树冠可以"穿过去"）
            tree.body.setSize(20, 8);
            tree.body.setOffset(22, 52);
        }
    }

    /**
     * 每帧更新（游戏循环）
     */
    update(time, delta) {
        this.player.update(time, delta);

        // 逐只妖兽跑AI（只有活着的才更新）
        for (const enemy of this.enemyList) {
            if (enemy.active && !enemy.isDead) {
                enemy.update(time, delta);
            }
        }

        // 伙伴跑AI（M4：跟随玩家 + 自动攻击野怪）
        if (this.companion && this.companion.active) {
            this.companion.update(time, delta);
        }

        // 玩家头顶血条：位置跟着玩家 + 宽度平滑缩短 + 血量数字
        this.playerHpBg.setPosition(this.player.x, this.player.y - 30);
        this.playerHpBar.setPosition(
            this.player.x - this.playerHpBarW / 2, this.player.y - 30
        );
        const targetW = Math.max(0, this.playerHpBarW * (this.player.hp / this.player.maxHp));
        this.playerHpBar.width += (targetW - this.playerHpBar.width) * 0.2;   // 平滑过渡
        this.playerHpText.setPosition(this.player.x, this.player.y - 40);
        this.playerHpText.setText(`${Math.ceil(this.player.hp)}/${this.player.maxHp}`);
    }

    /**
     * 玩家受伤反馈：闪红 + 飘红色伤害数字
     * @param {object} data - 事件数据，data.damage=受到的伤害
     */
    _playerHurtEffect(data) {
        if (!this.player || !this.player.active) return;
        this.player.setTint(0xff4444);
        this.time.delayedCall(150, () => this.player.clearTint());

        if (data && data.damage) {
            showFloatingText(this, this.player.x, this.player.y - 30, `-${data.damage}`, '#ff5555', 18);
        }
    }
}
