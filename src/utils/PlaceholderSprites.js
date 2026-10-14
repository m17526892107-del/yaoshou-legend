/**
 * PlaceholderSprites.js —— 占位素材工厂（程序画图）
 * ------------------------------------------------------------
 * 作用：在还没有真实美术素材时，用代码"画"出游戏需要的图片：
 *   1. player_idle  待机帧表：8行×2列（8个方向，每方向2帧轻微浮动）
 *   2. player_walk  行走帧表：3行×4列（上/下/左，左图翻转即右）
 *   3. grass        草地地面贴图（32×32，可无限平铺成大地图）
 *   4. tree         树木贴图（地图障碍物）
 *   5. slash        攻击挥砍特效
 *   6. fireball     火球技能特效
 *   7. enemy_slime  史莱姆妖兽（2帧呼吸动画）
 *   8. enemy_wolf   野狼妖兽（2帧迈步动画）
 *   9. drop_spirit  灵石掉落物（蓝色小晶体）
 *  10. drop_exp     经验珠掉落物
 *  11. drop_talisman 御兽符（黄色符纸，收服妖兽用）
 *  12. drop_material 妖丹材料（紫色小球，制符原料）
 * 说明：这是 MVP 阶段的临时方案，M8 阶段会用真实美术素材替换。
 * ------------------------------------------------------------
 */

import { DIRECTION_NAMES, WALK_DIRECTION_NAMES } from '../core/Constants.js';

// 单帧尺寸（像素）
const CELL = 32;

// 像素小人的配色
const PALETTE = {
    skin: '#f2c9a0',    // 皮肤
    hair: '#3b2a20',    // 头发
    robe: '#7b4ed8',    // 道袍（紫色）
    robeDark: '#5733a8',// 道袍暗部
    belt: '#c9a227',    // 腰带（金色）
    pants: '#4a4a55',   // 裤子
    shoes: '#26262e'    // 鞋子
};

// 每个待机方向的画法配置（顺序和 Constants 的 DIRECTION 数字一致）
//   pose: front=正面 / side=侧面(朝右) / back=背面
//   rotate: 画完后绕中心旋转的角度
//   mirror: 是否水平镜像（侧面图翻转成朝左）
const IDLE_DIR_CONFIG = [
    { pose: 'front', rotate: 0 },                 // DOWN 下
    { pose: 'front', rotate: -Math.PI / 4 },      // DOWN_LEFT 左下
    { pose: 'side', mirror: true },               // LEFT 左
    { pose: 'back', rotate: -Math.PI / 4 },       // UP_LEFT 左上
    { pose: 'back', rotate: 0 },                  // UP 上
    { pose: 'back', rotate: Math.PI / 4 },        // UP_RIGHT 右上
    { pose: 'side', rotate: 0 },                  // RIGHT 右
    { pose: 'front', rotate: Math.PI / 4 }        // DOWN_RIGHT 右下
];

// 行走4帧的迈步节奏（左腿相对偏移：-1 抬前 / 0 平 / +1 抬后）
const WALK_LEG_DELTAS = [-1, 0, 1, 0];

/**
 * 画一个小人的一帧
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {string} pose - 姿态：'front' 正面 / 'side' 侧面 / 'back' 背面
 * @param {number} legDelta - 腿部步伐偏移（行走用）
 * @param {number} bob - 身体上下浮动（待机用，0或1）
 */
function drawCultivator(ctx, pose, legDelta = 0, bob = 0) {
    const dy = bob;         // 待机浮动：整体下移 bob 像素
    const dl = legDelta;    // 行走步伐：左腿偏移，右腿反向

    // 清空当前这一格（防止残留）
    ctx.clearRect(0, 0, CELL, CELL);

    if (pose === 'front') {
        // ===== 正面（脸朝观众） =====
        // 头发（顶髻）
        ctx.fillStyle = PALETTE.hair;
        ctx.fillRect(14, 2, 4, 4);
        ctx.fillRect(12, 6, 8, 4);
        // 脸
        ctx.fillStyle = PALETTE.skin;
        ctx.fillRect(13, 7, 6, 5);
        // 道袍
        ctx.fillStyle = PALETTE.robe;
        ctx.fillRect(11, 13, 10, 10 + dy);
        // 袖子（两侧）
        ctx.fillStyle = PALETTE.robeDark;
        ctx.fillRect(9, 13 + dy, 3, 5);
        ctx.fillRect(20, 13 + dy, 3, 5);
        // 腰带
        ctx.fillStyle = PALETTE.belt;
        ctx.fillRect(11, 17 + dy, 10, 2);
        // 双腿（左右交替迈步，总长不变）
        ctx.fillStyle = PALETTE.pants;
        ctx.fillRect(12, 23 + dy - dl, 4, 5 + dl);
        ctx.fillRect(16, 23 + dy + dl, 4, 5 - dl);
        // 鞋子
        ctx.fillStyle = PALETTE.shoes;
        ctx.fillRect(12, 28 + dy - dl, 4, 2);
        ctx.fillRect(16, 28 + dy + dl, 4, 2);
    } else if (pose === 'side') {
        // ===== 侧面（默认朝右） =====
        ctx.fillStyle = PALETTE.hair;
        ctx.fillRect(14, 2, 4, 4);
        ctx.fillRect(15, 6, 6, 4);   // 后脑勺头发
        ctx.fillStyle = PALETTE.skin;
        ctx.fillRect(12, 7, 5, 5);   // 侧面露出一条脸
        ctx.fillStyle = PALETTE.robe;
        ctx.fillRect(12, 13, 9, 10 + dy);
        ctx.fillStyle = PALETTE.robeDark;
        ctx.fillRect(10, 13 + dy, 3, 5);
        ctx.fillRect(20, 13 + dy, 3, 5);
        ctx.fillStyle = PALETTE.belt;
        ctx.fillRect(12, 17 + dy, 9, 2);
        ctx.fillStyle = PALETTE.pants;
        ctx.fillRect(13, 23 + dy - dl, 3, 5 + dl);
        ctx.fillRect(17, 23 + dy + dl, 3, 5 - dl);
        ctx.fillStyle = PALETTE.shoes;
        ctx.fillRect(13, 28 + dy - dl, 3, 2);
        ctx.fillRect(17, 28 + dy + dl, 3, 2);
    } else {
        // ===== 背面（看到后脑勺和整个道袍） =====
        ctx.fillStyle = PALETTE.hair;
        ctx.fillRect(12, 5, 8, 7);   // 后脑勺占大头
        ctx.fillStyle = PALETTE.robe;
        ctx.fillRect(10, 13, 12, 10 + dy);
        ctx.fillStyle = PALETTE.robeDark;
        ctx.fillRect(8, 13 + dy, 3, 5);
        ctx.fillRect(21, 13 + dy, 3, 5);
        ctx.fillStyle = PALETTE.belt;
        ctx.fillRect(10, 17 + dy, 12, 2);
        ctx.fillStyle = PALETTE.pants;
        ctx.fillRect(12, 23 + dy - dl, 4, 5 + dl);
        ctx.fillRect(16, 23 + dy + dl, 4, 5 - dl);
        ctx.fillStyle = PALETTE.shoes;
        ctx.fillRect(12, 28 + dy - dl, 4, 2);
        ctx.fillRect(16, 28 + dy + dl, 4, 2);
    }
}

/**
 * 画待机的一帧（带方向旋转/镜像 + 浮动）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} dirIndex - 方向序号（0~7）
 * @param {number} frame - 帧号（0或1，0=原位 1=往下浮动1像素）
 */
function drawIdleFrame(ctx, dirIndex, frame) {
    const cfg = IDLE_DIR_CONFIG[dirIndex];

    ctx.save();
    // 先平移到格子中心，旋转/镜像，再画（这样图形绕中心转）
    ctx.translate(CELL / 2, CELL / 2);
    ctx.rotate(cfg.rotate || 0);
    if (cfg.mirror) ctx.scale(-1, 1);
    ctx.translate(-CELL / 2, -CELL / 2);

    drawCultivator(ctx, cfg.pose, 0, frame); // 待机步伐为0，浮动取 frame
    ctx.restore();
}

/**
 * 画行走的一帧
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {string} walkName - 方位名：'up' / 'down' / 'left'
 * @param {number} frame - 帧号（0~3）
 */
function drawWalkFrame(ctx, walkName, frame) {
    // 方位 → 姿态
    const pose = walkName === 'up' ? 'back' : (walkName === 'down' ? 'front' : 'side');

    ctx.save();
    ctx.translate(CELL / 2, CELL / 2);
    // 'left' 行：把朝右的侧面图镜像成朝左
    if (walkName === 'left') ctx.scale(-1, 1);
    ctx.translate(-CELL / 2, -CELL / 2);

    drawCultivator(ctx, pose, WALK_LEG_DELTAS[frame], 0);
    ctx.restore();
}

/**
 * 生成全部占位素材并注册进纹理库
 * @param {Phaser.Textures.TextureManager} textures - 场景的纹理管理器
 */
export function createPlaceholderSprites(textures) {
    // ===== 1. 待机帧表：8行 × 2列（宽64 × 高256） =====
    const idle = textures.createCanvas('player_idle', CELL * 2, CELL * 8);
    const ictx = idle.getContext ? idle.getContext() : idle.context;

    DIRECTION_NAMES.forEach((name, row) => {
        for (let col = 0; col < 2; col++) {
            ictx.save();
            ictx.translate(col * CELL, row * CELL); // 平移到该帧的格子
            drawIdleFrame(ictx, row, col);
            ictx.restore();
        }
    });
    // 把大图切成 16 个单帧（第 i 帧：列 = i%2，行 = i/2）
    for (let i = 0; i < 16; i++) {
        idle.add(i, 0, (i % 2) * CELL, Math.floor(i / 2) * CELL, CELL, CELL);
    }
    idle.refresh();

    // ===== 2. 行走帧表：3行 × 4列（宽128 × 高96） =====
    const walk = textures.createCanvas('player_walk', CELL * 4, CELL * 3);
    const wctx = walk.getContext ? walk.getContext() : walk.context;

    WALK_DIRECTION_NAMES.forEach((name, row) => {
        for (let col = 0; col < 4; col++) {
            wctx.save();
            wctx.translate(col * CELL, row * CELL);
            drawWalkFrame(wctx, name, col);
            wctx.restore();
        }
    });
    // 切成 12 个单帧
    for (let i = 0; i < 12; i++) {
        walk.add(i, 0, (i % 4) * CELL, Math.floor(i / 4) * CELL, CELL, CELL);
    }
    walk.refresh();

    // ===== 3. 草地地面贴图（32×32） =====
    createGrassTile(textures);

    // ===== 4. 树木 =====
    createTreeTexture(textures);

    // ===== 5. 攻击特效 + 火球 =====
    createSlashTexture(textures);
    createFireballTexture(textures);

    // ===== 6. 妖兽占位图（史莱姆/野狼，每种2帧小动画） =====
    createEnemySlimeTexture(textures);
    createEnemyWolfTexture(textures);

    // ===== 6b. 扩充妖兽（M4.5：毒蜂/铁甲野猪/火鸦 + 妖兽火弹） =====
    createEnemyBeeTexture(textures);
    createEnemyBoarTexture(textures);
    createEnemyCrowTexture(textures);
    createEnemyFireTexture(textures);

    // ===== 7. 掉落物（灵石/经验珠） =====
    createDropSpiritTexture(textures);
    createDropExpTexture(textures);

    // ===== 8. 妖兽系统物品（M4：御兽符 + 妖丹材料） =====
    createTalismanTexture(textures);
    createMaterialTexture(textures);
}

// ---------- 下面几个是"画单张贴图"的小函数 ----------

/** 草地贴图：深绿底 + 随机深浅草点 */
function createGrassTile(textures) {
    const tile = textures.createCanvas('grass', CELL, CELL);
    const ctx = tile.getContext ? tile.getContext() : tile.context;

    ctx.fillStyle = '#4a8f4f';
    ctx.fillRect(0, 0, CELL, CELL);

    // 撒一些深浅不同的草点，让地面不单调
    const grassColors = ['#3f7a44', '#57a35c', '#6db871', '#427f46'];
    for (let i = 0; i < 26; i++) {
        ctx.fillStyle = grassColors[i % grassColors.length];
        ctx.fillRect(
            Math.floor(Math.random() * CELL),
            Math.floor(Math.random() * CELL),
            2, 2
        );
    }
    tile.refresh();
}

/** 树木贴图（64×64）：树干 + 两层树冠 */
function createTreeTexture(textures) {
    const tree = textures.createCanvas('tree', 64, 64);
    const ctx = tree.getContext ? tree.getContext() : tree.context;

    ctx.fillStyle = '#5c3a21';               // 树干
    ctx.fillRect(29, 40, 6, 24);
    ctx.fillStyle = '#2e6b38';               // 大树冠
    ctx.beginPath();
    ctx.arc(32, 30, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f7f4a';               // 小树冠（错落感）
    ctx.beginPath();
    ctx.arc(24, 40, 11, 0, Math.PI * 2);
    ctx.fill();
    tree.refresh();
}

/** 挥砍特效：白色+金色两道圆弧 */
function createSlashTexture(textures) {
    const slash = textures.createCanvas('slash', 48, 48);
    const ctx = slash.getContext ? slash.getContext() : slash.context;

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(24, 24, 16, -Math.PI * 0.7, Math.PI * 0.7);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(24, 24, 10, -Math.PI * 0.6, Math.PI * 0.6);
    ctx.stroke();
    slash.refresh();
}

/** 火球贴图：橙色外圈 + 黄色内核 */
function createFireballTexture(textures) {
    const fire = textures.createCanvas('fireball', 16, 16);
    const ctx = fire.getContext ? fire.getContext() : fire.context;

    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    fire.refresh();
}

// ---------- 妖兽占位图（M2 战斗系统用） ----------

/**
 * 画一只史莱姆的一帧（绿色果冻状小怪）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} frame - 帧号：0=圆鼓鼓 / 1=压扁一点（像在呼吸）
 */
function drawSlime(ctx, frame) {
    ctx.clearRect(0, 0, CELL, CELL);

    // 第2帧把身体压扁一点、往下坐一点 → 形成"呼吸/蠕动"的感觉
    const squash = frame === 1;
    const cx = 16;                        // 身体中心X
    const cy = squash ? 20 : 18;          // 身体中心Y（压扁时略下移）
    const r = squash ? 10 : 11;           // 身体半径（压扁时略小）

    // 果冻身体（绿色半圆）
    ctx.fillStyle = '#62b95f';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // 身体高光（左上角小亮点，显得圆润）
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // 两只眼睛（白眼仁 + 黑瞳孔）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#222222';
    ctx.beginPath();
    ctx.arc(cx - 4, cy - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 4, cy - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

/** 史莱姆帧表：2列×32像素 = 宽64 × 高32，切出2帧 */
function createEnemySlimeTexture(textures) {
    const tex = textures.createCanvas('enemy_slime', CELL * 2, CELL);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 第0帧画在左边格，第1帧画在右边格
    for (let col = 0; col < 2; col++) {
        ctx.save();
        ctx.translate(col * CELL, 0);
        drawSlime(ctx, col);
        ctx.restore();
    }

    // 切成2个单帧
    for (let i = 0; i < 2; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
    }
    tex.refresh();
}

/**
 * 画一帧野狼（侧面的四脚兽，朝左）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} frame - 帧号：0=前腿前迈 / 1=后腿前迈
 */
function drawWolf(ctx, frame) {
    ctx.clearRect(0, 0, CELL, CELL);

    const dl = frame === 0 ? -1 : 1;   // 迈步偏移：前两腿和后两腿反着动

    // 躯干（横着的长条）
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(6, 13, 20, 9);

    // 腹部暗色
    ctx.fillStyle = '#755936';
    ctx.fillRect(6, 19, 20, 3);

    // 头（画面左侧）
    ctx.fillStyle = '#8a6a48';
    ctx.fillRect(3, 10, 8, 8);

    // 眼睛（白眼仁 + 瞳孔，朝左看）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(4, 12, 2, 2);
    ctx.fillStyle = '#222222';
    ctx.fillRect(5, 12, 1, 1);

    // 耳朵（头顶两个小三角）
    ctx.fillStyle = '#755936';
    ctx.fillRect(6, 8, 2, 3);
    ctx.fillRect(9, 8, 2, 3);

    // 尾巴（右侧翘起）
    ctx.fillStyle = '#755936';
    ctx.fillRect(25, 10, 4, 2);

    // 四条腿（前后交替迈步 → 走动的感觉）
    ctx.fillStyle = '#6b5133';
    ctx.fillRect(9, 22, 3, 6 + dl);    // 前左腿
    ctx.fillRect(14, 22, 3, 6 - dl);   // 前右腿
    ctx.fillRect(19, 22, 3, 6 + dl);   // 后左腿
    ctx.fillRect(23, 22, 3, 6 - dl);   // 后右腿
}

/** 野狼帧表：2列×32像素 = 宽64 × 高32，切出2帧 */
function createEnemyWolfTexture(textures) {
    const tex = textures.createCanvas('enemy_wolf', CELL * 2, CELL);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    for (let col = 0; col < 2; col++) {
        ctx.save();
        ctx.translate(col * CELL, 0);
        drawWolf(ctx, col);
        ctx.restore();
    }

    for (let i = 0; i < 2; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
    }
    tex.refresh();
}

// ---------- M4.5 扩充妖兽（毒蜂 / 铁甲野猪 / 火鸦） ----------

/**
 * 画一帧毒蜂（黄黑条纹的飞虫）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} frame - 帧号：0=翅膀朝上 / 1=翅膀朝下（扇动感）
 */
function drawBee(ctx, frame) {
    ctx.clearRect(0, 0, CELL, CELL);
    const wingUp = frame === 0;

    // 半透明翅膀（扇动时位置上下变化）
    ctx.fillStyle = 'rgba(220,240,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(19, wingUp ? 10 : 13, 7, 3.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(13, wingUp ? 9 : 12, 6, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 身体（大黄底，斜着朝左）
    ctx.fillStyle = '#f2c22e';
    ctx.beginPath();
    ctx.ellipse(18, 17, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 黑色条纹（三道，蜂的标志）
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(15, 12, 2, 11);
    ctx.fillRect(19, 12, 2, 11);
    ctx.fillRect(23, 13, 2, 9);

    // 头（黑色小圆，画面左侧）
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(9, 17, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛（红色小点，显得凶）
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(8, 16, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 尾针（右侧一个尖）
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.moveTo(26, 16);
    ctx.lineTo(30, 18);
    ctx.lineTo(26, 20);
    ctx.closePath();
    ctx.fill();

    // 触角（头顶两根短线）
    ctx.strokeStyle = '#2b2b2b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, 13);
    ctx.lineTo(4, 9);
    ctx.moveTo(10, 12);
    ctx.lineTo(9, 8);
    ctx.stroke();
}

/** 毒蜂帧表：2列 × 32像素，切出2帧 */
function createEnemyBeeTexture(textures) {
    const tex = textures.createCanvas('enemy_bee', CELL * 2, CELL);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    for (let col = 0; col < 2; col++) {
        ctx.save();
        ctx.translate(col * CELL, 0);
        drawBee(ctx, col);
        ctx.restore();
    }

    for (let i = 0; i < 2; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
    }
    tex.refresh();
}

/**
 * 画一帧铁甲野猪（灰黑厚甲的四脚兽，朝左）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} frame - 帧号：迈步交替
 */
function drawBoar(ctx, frame) {
    ctx.clearRect(0, 0, CELL, CELL);
    const dl = frame === 0 ? -1 : 1;   // 前后腿反着迈

    // 躯干（厚实的长条）
    ctx.fillStyle = '#6b6b73';
    ctx.fillRect(6, 12, 21, 11);

    // 背上的铁甲片（几块深灰铠甲）
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(8, 9, 5, 5);
    ctx.fillRect(14, 8, 5, 5);
    ctx.fillRect(20, 9, 5, 5);

    // 腹部暗色
    ctx.fillStyle = '#55555c';
    ctx.fillRect(6, 20, 21, 3);

    // 头（画面左侧，粗壮）
    ctx.fillStyle = '#6b6b73';
    ctx.fillRect(2, 11, 9, 10);

    // 眼睛（红点，凶）
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(4, 14, 2, 2);

    // 獠牙（白色，向前翘起）
    ctx.fillStyle = '#f0f0e0';
    ctx.beginPath();
    ctx.moveTo(3, 19);
    ctx.lineTo(0, 17);
    ctx.lineTo(3, 16);
    ctx.closePath();
    ctx.fill();

    // 耳朵
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(6, 8, 3, 4);

    // 尾巴（右侧小翘）
    ctx.fillStyle = '#55555c';
    ctx.fillRect(26, 11, 4, 2);

    // 四条腿（粗短，交替迈步）
    ctx.fillStyle = '#3f3f46';
    ctx.fillRect(9, 23, 4, 6 + dl);
    ctx.fillRect(15, 23, 4, 6 - dl);
    ctx.fillRect(20, 23, 4, 6 + dl);
    ctx.fillRect(25, 23, 4, 6 - dl);
}

/** 铁甲野猪帧表：2列 × 32像素，切出2帧 */
function createEnemyBoarTexture(textures) {
    const tex = textures.createCanvas('enemy_boar', CELL * 2, CELL);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    for (let col = 0; col < 2; col++) {
        ctx.save();
        ctx.translate(col * CELL, 0);
        drawBoar(ctx, col);
        ctx.restore();
    }

    for (let i = 0; i < 2; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
    }
    tex.refresh();
}

/**
 * 画一帧火鸦（黑羽妖禽，翅膀带火光，朝左）
 * @param {CanvasRenderingContext2D} ctx - 画笔
 * @param {number} frame - 帧号：0=翅膀上扬 / 1=翅膀下压（扇动感）
 */
function drawCrow(ctx, frame) {
    ctx.clearRect(0, 0, CELL, CELL);
    const wingUp = frame === 0;

    // 身体（黑色椭圆）
    ctx.fillStyle = '#23232b';
    ctx.beginPath();
    ctx.ellipse(16, 18, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 翅膀（大黑翼，扇动时上下变化，翼尖带橙色火光）
    ctx.fillStyle = '#2c2c36';
    ctx.beginPath();
    ctx.moveTo(16, 14);
    ctx.lineTo(28, wingUp ? 6 : 12);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();

    // 翅膀后缘的火光（橙红，让它看起来是"火鸦"）
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.moveTo(22, wingUp ? 9 : 14);
    ctx.lineTo(28, wingUp ? 6 : 12);
    ctx.lineTo(25, wingUp ? 12 : 17);
    ctx.closePath();
    ctx.fill();

    // 头（左前方）
    ctx.fillStyle = '#23232b';
    ctx.beginPath();
    ctx.arc(7, 15, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // 尖喙（橙黄色）
    ctx.fillStyle = '#ffab3c';
    ctx.beginPath();
    ctx.moveTo(3, 14);
    ctx.lineTo(0, 15.5);
    ctx.lineTo(3, 17);
    ctx.closePath();
    ctx.fill();

    // 眼睛（红色发光）
    ctx.fillStyle = '#ff4a3c';
    ctx.beginPath();
    ctx.arc(6, 14, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 尾巴（右侧扇形散开）
    ctx.fillStyle = '#2c2c36';
    ctx.beginPath();
    ctx.moveTo(25, 18);
    ctx.lineTo(31, 15);
    ctx.lineTo(31, 22);
    ctx.closePath();
    ctx.fill();

    // 双爪（细黑线，蜷在身下）
    ctx.strokeStyle = '#2c2c36';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, 23);
    ctx.lineTo(13, 26);
    ctx.moveTo(18, 23);
    ctx.lineTo(19, 26);
    ctx.stroke();
}

/** 火鸦帧表：2列 × 32像素，切出2帧 */
function createEnemyCrowTexture(textures) {
    const tex = textures.createCanvas('enemy_crow', CELL * 2, CELL);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    for (let col = 0; col < 2; col++) {
        ctx.save();
        ctx.translate(col * CELL, 0);
        drawCrow(ctx, col);
        ctx.restore();
    }

    for (let i = 0; i < 2; i++) {
        tex.add(i, 0, i * CELL, 0, CELL, CELL);
    }
    tex.refresh();
}

/** 妖兽火弹贴图：暗红橙色小球（火鸦喷射的远程弹道） */
function createEnemyFireTexture(textures) {
    const tex = textures.createCanvas('enemy_fire', 16, 16);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 外圈暗红
    ctx.fillStyle = '#d8402a';
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    // 内芯亮橙
    ctx.fillStyle = '#ffb03c';
    ctx.beginPath();
    ctx.arc(8, 8, 4, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
}

// ---------- 掉落物占位图（M2 战斗掉落用） ----------

/** 灵石贴图：蓝色菱形小晶体（游戏通用货币） */
function createDropSpiritTexture(textures) {
    const tex = textures.createCanvas('drop_spirit', 12, 12);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 蓝色菱形晶体（上尖下宽，像一块小灵石）
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(11, 7);
    ctx.lineTo(6, 11);
    ctx.lineTo(1, 7);
    ctx.closePath();
    ctx.fill();

    // 深蓝描边（晶体边缘，更有"宝石"质感）
    ctx.strokeStyle = '#1e6f9f';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 白色高光小点（左上角，亮晶晶）
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(4, 4, 1.5, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
}

/** 经验珠贴图：绿色菱形（像一颗宝石） */
function createDropExpTexture(textures) {
    const tex = textures.createCanvas('drop_exp', 12, 14);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 菱形宝石（上尖下宽）
    ctx.fillStyle = '#3ecf6e';
    ctx.beginPath();
    ctx.moveTo(6, 1);
    ctx.lineTo(11, 7);
    ctx.lineTo(6, 13);
    ctx.lineTo(1, 7);
    ctx.closePath();
    ctx.fill();

    // 高光小点
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(5, 5, 2, 0, Math.PI * 2);
    ctx.fill();
    tex.refresh();
}

// ---------- 妖兽系统物品占位图（M4） ----------

/** 御兽符贴图：黄色符纸 + 红色符文笔迹（收服妖兽用） */
function createTalismanTexture(textures) {
    const tex = textures.createCanvas('drop_talisman', 20, 26);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 符纸（黄色竖条，像一张小黄符）
    ctx.fillStyle = '#f5d442';
    ctx.fillRect(2, 1, 16, 24);

    // 符纸边缘（暗黄色描边）
    ctx.strokeStyle = '#b8962e';
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 1.5, 15, 23);

    // 红色符文笔迹（几条歪扭的竖线，像画上去的咒文）
    ctx.strokeStyle = '#d33c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(6, 10);
    ctx.moveTo(10, 3);
    ctx.lineTo(10, 12);
    ctx.moveTo(14, 5);
    ctx.lineTo(14, 9);
    ctx.stroke();

    // 底部小红印（像盖了个章，更有符的质感）
    ctx.fillStyle = '#c62f2f';
    ctx.fillRect(8, 17, 5, 5);
    tex.refresh();
}

/** 妖丹材料贴图：紫色发光小球（妖兽的核心材料，制符用） */
function createMaterialTexture(textures) {
    const tex = textures.createCanvas('drop_material', 12, 12);
    const ctx = tex.getContext ? tex.getContext() : tex.context;

    // 妖丹本体（深紫色圆球）
    ctx.fillStyle = '#8a4fd8';
    ctx.beginPath();
    ctx.arc(6, 6, 5, 0, Math.PI * 2);
    ctx.fill();

    // 高光（左上角小亮点，亮晶晶）
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(4, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 外圈光晕（一圈淡淡的紫光，显得神秘）
    ctx.strokeStyle = 'rgba(200,140,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(6, 6, 7, 0, Math.PI * 2);
    ctx.stroke();
    tex.refresh();
}
