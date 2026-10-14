/**
 * Constants.js —— 全局常量配置文件
 * ------------------------------------------------------------
 * 作用：把所有"写死不变"的数值集中放在这里，方便统一修改。
 * 比如游戏画布尺寸、颜色、方向、事件名等。
 * 使用方式：在其他文件里 import { GAME_WIDTH } from './Constants.js'
 * ------------------------------------------------------------
 */

// ==================== 游戏基础尺寸 ====================
// 画布宽度（像素），这个尺寸也是游戏世界的"逻辑尺寸"
export const GAME_WIDTH = 1280;
// 画布高度（像素）
export const GAME_HEIGHT = 720;
// 游戏背景色（深紫色，类似夜空）
export const GAME_BG_COLOR = '#1a1a2e';

// ==================== 方向常量 ====================
// 角色的8个方向（用于待机图），用数字表示方便计算
export const DIRECTION = {
    DOWN: 0,        // 下
    DOWN_LEFT: 1,   // 左下
    LEFT: 2,        // 左
    UP_LEFT: 3,     // 左上
    UP: 4,          // 上
    UP_RIGHT: 5,    // 右上
    RIGHT: 6,       // 右
    DOWN_RIGHT: 7   // 右下
};

// 3方向行走图（简化版，只分 上/下/左，右用左翻转）
export const WALK_DIRECTION = {
    UP: 0,
    DOWN: 1,
    LEFT: 2,
    RIGHT: 3   // 渲染时把LEFT水平翻转
};

// ==================== 方向名称（动画用） ====================
// 8方向的名称列表，顺序和 DIRECTION 的数字顺序严格一致：
//   第0个='down' 对应 DIRECTION.DOWN，依此类推
// 用于拼接动画名，例如 player_idle_down / player_walk_up
export const DIRECTION_NAMES = [
    'down', 'down_left', 'left', 'up_left',
    'up', 'up_right', 'right', 'down_right'
];

// 3方位行走的名称列表（对应行走帧表的行号）
export const WALK_DIRECTION_NAMES = ['up', 'down', 'left'];

// ==================== 颜色常量 ====================
// 统一管理颜色，避免到处写十六进制
export const COLORS = {
    WHITE: 0xffffff,
    BLACK: 0x000000,
    RED: 0xff4444,
    GREEN: 0x44ff44,
    BLUE: 0x4488ff,
    YELLOW: 0xffdd44,
    HP_RED: 0xff3333,       // 血条红色
    MP_BLUE: 0x3377ff,      // 蓝条蓝色
    EXP_YELLOW: 0xffcc33,   // 经验条黄色
    UI_BG: 0x222244,        // UI面板背景
    UI_BORDER: 0x6666aa     // UI面板边框
};

// ==================== 事件名常量 ====================
// 事件总线用的事件名，集中管理避免拼写错误
// 命名规则：模块名_动作  例如 PLAYER_DAMAGED 表示"玩家受伤"
export const EVENTS = {
    // 玩家相关
    PLAYER_DAMAGED: 'player_damaged',        // 玩家受伤
    PLAYER_HEALED: 'player_healed',          // 玩家回血
    PLAYER_LEVEL_UP: 'player_level_up',      // 玩家升级
    PLAYER_DEATH: 'player_death',            // 玩家死亡
    PLAYER_MOVE: 'player_move',              // 玩家移动

    // 战斗相关
    ENEMY_DAMAGED: 'enemy_damaged',          // 敌人受伤
    ENEMY_DEATH: 'enemy_death',              // 敌人死亡
    SKILL_CAST: 'skill_cast',                // 释放技能

    // 成长相关（M3）
    REALM_UP: 'realm_up',                   // 境界突破

    // 道具相关
    ITEM_PICKED: 'item_picked',              // 拾取道具
    INVENTORY_CHANGED: 'inventory_changed',  // 背包变化

    // 妖兽系统相关（M4）
    TAME_SUCCESS: 'tame_success',            // 收服成功
    TAME_FAIL: 'tame_fail',                  // 收服失败
    COMPANION_UPDATED: 'companion_updated',   // 伙伴数据变化（UI刷新用）

    // 系统相关
    GAME_PAUSE: 'game_pause',                // 游戏暂停
    GAME_RESUME: 'game_resume',              // 游戏恢复
    GAME_OVER: 'game_over',                  // 游戏结束
    GAME_WIN: 'game_win',                    // 游戏胜利
    SCENE_CHANGE: 'scene_change',            // 场景切换
    SHOW_DIALOG: 'show_dialog'               // 显示对话
};

// ==================== 物理相关 ====================
// 重力（如果需要的话，俯视视角一般设为0）
export const GRAVITY = 0;
// 玩家基础移动速度（像素/秒）
export const PLAYER_SPEED = 200;
// 敌人基础移动速度
export const ENEMY_SPEED = 120;

// ==================== 世界地图尺寸 ====================
// 世界比屏幕大很多，相机跟着角色跑，实现"大地图"探索
export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 1600;

// ==================== 玩家攻击/技能参数 ====================
export const ATTACK_COOLDOWN = 300;    // 攻击冷却（毫秒）
export const SKILL_COOLDOWN = 1000;    // 技能冷却（毫秒）
export const FIREBALL_SPEED = 420;     // 火球飞行速度（像素/秒）
export const FIREBALL_LIFE = 1200;     // 火球存活时间（毫秒）
export const FIREBALL_MP_COST = 10;    // 每发火球消耗的法力值（近战挥砍不耗蓝）

// ==================== M2 战斗系统参数 ====================
export const MELEE_RANGE = 70;          // 挥砍的有效距离：玩家面前多少像素内能打中
export const MELEE_HALF_ANGLE = 70;     // 挥砍的扇形"半角"（度）：玩家面朝方向左右各 70 度内算打中
export const ENEMY_DETECT_RANGE = 300;  // 妖兽"视野"：玩家离妖兽多近时妖兽会发现并开始追击
export const ENEMY_ATTACK_RANGE = 55;   // 妖兽的攻击距离（像素）
export const ENEMY_ATTACK_COOLDOWN = 1000; // 妖兽两次攻击的间隔（毫秒）
export const DROP_LIFE = 20000;         // 掉落物存活时间（毫秒），超时自动消失
export const ENEMY_RESPAWN_DELAY = 8000; // 妖兽死亡后多久在原类别随机位置重新刷一只（毫秒）

// ==================== M3 成长系统参数 ====================
// 说明：不采用"升级发属性点手动分配"的机制，
//       突破境界时属性直接按 REALM_BONUS 自动提升，省心省事。

// 境界序列（从低到高，下标就是境界编号）—— 四个大境界
export const REALMS = ['炼气', '筑基', '结丹', '元婴'];
// 每突破一境需要的经验（下标 i = 从"第i个境界"突破到"第i+1个境界"所需经验）
//   第0个=100：炼气攒够100经验 → 突破进筑基
//   第1个=300：筑基攒够300经验 → 突破进结丹
//   第2个=800：结丹攒够800经验 → 突破进元婴（最后一境，突破完就封顶了）
export const REALM_EXP_REQUIRED = [100, 300, 800];
// 每突破1个境界直接提升的数值（突破后人物自动变强）
export const REALM_BONUS = {
    attack: 15,   // 攻击力 +15
    maxHp: 100,   // 生命上限 +100
    maxMp: 50     // 法力（蓝条）上限 +50
};

// ==================== M4 妖兽系统参数 ====================
// 说明：收服妖兽当伙伴 = 残血(<30%) + 消耗1张御兽符 + 成功率判定。
//       御兽符来源：开局送3张 + 用"妖丹材料+灵石"制符（G键），城镇购买后续阶段接入。

// —— 收服相关 ——
export const TAME_RANGE = 100;           // 收服距离：玩家要离妖兽多近才能按U收服（像素）
export const TAME_HP_RATIO = 0.3;        // 残血线：妖兽血量低于其最大血量的30%才算"残血可收服"
export const TAME_BASE_SUCCESS = 0.5;    // 基础收服成功率（0~1，0.5=50%）
export const INITIAL_TALISMANS = 3;      // 开局赠送的御兽符数量

// —— 制符相关（G键：妖丹材料 + 灵石 → 1张御兽符） ——
export const CRAFT_COST = {
    material: 1,         // 需要1份妖丹材料
    spiritStones: 10     // 需要10灵石
};

// —— 掉落相关 ——
export const MATERIAL_DROP_RATE = 0.5;   // 击杀妖兽掉落"妖丹材料"的概率（0.5=50%，妖兽可单独覆盖）
export const TALISMAN_DROP_RATE = 0.08;  // 击杀妖兽掉落"御兽符"的概率（低概率惊喜，0.08=8%）

// —— 伙伴（收服的妖兽）相关 ——
export const COMPANION_SCALE = 0.6;           // 伙伴比原野怪小一点（更可爱/好辨认）
export const COMPANION_SPEED = 190;           // 伙伴移动速度（像素/秒）
export const COMPANION_FOLLOW_DIST = 80;      // 跟随时与玩家保持的距离（像素），太近就停下
export const COMPANION_DETECT_RANGE = 220;    // 伙伴"视野"：多近的野怪会被它主动攻击
export const COMPANION_ATTACK_RANGE = 60;     // 伙伴攻击距离（像素）
export const COMPANION_ATTACK_COOLDOWN = 900; // 伙伴两次攻击的间隔（毫秒）

// ==================== M4.5 妖兽扩充：特殊行为参数 ====================
// 说明：新增妖兽中，火鸦是"远程型"(ranged)、铁甲野猪是"冲撞型"(charge)。
//       这些数值决定它们的行为手感，想改随时改这里。

// —— 远程型（火鸦）：拉开距离喷火弹 ——
export const ENEMY_RANGED_KEEP_DIST = 170;     // 理想距离：比这更近就往后撤（风筝）
export const ENEMY_RANGED_ATTACK_RANGE = 260;  // 射程：比这更远就追过来，进入射程就停下开火
export const ENEMY_RANGED_COOLDOWN = 1600;     // 两次射击的间隔（毫秒）
export const ENEMY_PROJECTILE_SPEED = 300;     // 妖兽火弹的飞行速度（像素/秒）
export const ENEMY_PROJECTILE_LIFE = 1800;     // 妖兽火弹存活时间（毫秒），超时自动消失

// —— 冲撞型（铁甲野猪）：蓄力后冲刺撞击 ——
export const ENEMY_CHARGE_TRIGGER = 240;       // 玩家进入这个距离内，就开始蓄力准备冲撞
export const ENEMY_CHARGE_WINDUP = 500;        // 蓄力时间（毫秒），蓄力时原地不动（给玩家反应时间）
export const ENEMY_CHARGE_SPEED = 420;         // 冲撞时的冲刺速度（比平时快很多）
export const ENEMY_CHARGE_DURATION = 450;      // 冲撞持续时间（毫秒），冲完就停下缓一缓
export const ENEMY_CHARGE_COOLDOWN = 2200;     // 两次冲撞之间的间隔（毫秒）

// ==================== 深度层级（z-index） ====================
// Phaser用深度值决定谁显示在上面，值越大越靠上
export const DEPTH = {
    BACKGROUND: 0,       // 背景层（最底层）
    MAP_GROUND: 10,      // 地图地面层
    MAP_OBJECT: 20,      // 地图物件层
    ENTITY: 30,          // 角色/敌人层
    EFFECT: 40,          // 特效层
    UI: 50,              // UI层
    POPUP: 60,           // 弹窗层（最上层）
    DEBUG: 100           // 调试信息（最最上层）
};

// ==================== 本地存储Key ====================
// 存档用的localStorage键名
export const STORAGE_KEYS = {
    SAVE_DATA: 'game_save_data',     // 游戏存档
    SETTINGS: 'game_settings'        // 设置项
};
