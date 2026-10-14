/**
 * UIScene.js —— UI叠加层场景
 * ------------------------------------------------------------
 * 作用：常驻的UI界面，显示血条、技能栏、小地图等。
 *       这个场景和 GameScene 同时运行（用 launch 启动），
 *       不会因为游戏逻辑刷新而重绘，性能更好。
 * 
 * 和 GameScene 的关系：
 *   GameScene 在"下面"，负责游戏内容（角色、地图）
 *   UIScene   在"上面"，负责界面（血条、按钮）
 *   两者通过 EventBus 和 StateManager 通信。
 * 
 * M3 阶段新增：
 *   - 属性面板（角色状态）：按 C 键打开/关闭，纯展示当前境界/突破进度/五属性
 *   - 突破境界时属性自动提升（攻击/气血/法力直接涨），不再手动加点
 *   - 顶栏显示当前境界名 + 灵石数量（蓝色晶体货币）
 *   - 境界之间用"经验条"替代等级：经验攒满自动突破
 * M4 阶段新增：
 *   - 顶栏显示御兽符数量（黄色符纸）+ 伙伴状态（妖兽名 + 血量）
 * ------------------------------------------------------------
 */

import { StateManager } from '../core/StateManager.js';
import { EventBus } from '../core/EventBus.js';
import {
    EVENTS, DEPTH, COLORS, WORLD_WIDTH, WORLD_HEIGHT,
    REALMS
} from '../core/Constants.js';

export class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        console.log('[UIScene] UI层已启动');

        // ===== 1. 顶部状态栏：血条 + 蓝条 + 经验条 =====
        this._createStatusBar();

        // ===== 2. 右下角：技能栏占位 =====
        this._createSkillBar();

        // ===== 3. 右上角：小地图占位 =====
        this._createMinimap();

        // ===== 4. 属性面板（M3：按 C 键开关） =====
        this._createAttrPanel();
        this.attrPanelVisible = false;   // 默认关闭
        // 监听键盘 C 键：切换属性面板显示/隐藏
        this.input.keyboard.on('keydown-C', () => this._toggleAttrPanel());

        // ===== 5. 监听事件，实时更新UI =====
        // 先把回调存成"有名有姓"的属性，场景关闭时才能精确取消监听
        this._onPlayerDamaged = () => this._updateHpBar();            // 玩家受伤 → 更新血条
        this._onPlayerHealed = () => this._updateHpBar();             // 玩家回血 → 更新血条
        this._onRealmUp = () => {                                     // 境界突破 → 刷新境界文字/属性面板
            this._updateExpBar();
            this._refreshAttrPanel();
        };

        EventBus.on(EVENTS.PLAYER_DAMAGED, this._onPlayerDamaged);
        EventBus.on(EVENTS.PLAYER_HEALED, this._onPlayerHealed);
        EventBus.on(EVENTS.REALM_UP, this._onRealmUp);

        // 场景关闭时取消监听 + 清理键盘事件（防止再次进入时重复监听）
        this.events.once('shutdown', () => {
            EventBus.off(EVENTS.PLAYER_DAMAGED, this._onPlayerDamaged);
            EventBus.off(EVENTS.PLAYER_HEALED, this._onPlayerHealed);
            EventBus.off(EVENTS.REALM_UP, this._onRealmUp);
        });

        // 每帧更新（血条等需要跟随玩家状态）
        this.events.on('update', this._update, this);
    }

    // ========== M3：属性面板 ==========

    /**
     * 创建属性面板（居中的半透明面板，纯展示用）
     * 内容：标题 + 境界/突破经验进度 + 五项属性当前数值 + 关闭提示
     * 说明：突破境界时属性自动提升，面板只负责"看"，没有可点的按钮。
     *
     * 设计说明：面板元素【不放进 Container 容器】，而是直接挂在场景上。
     * 原因：Phaser 容器里的子元素输入检测不如场景元素可靠，
     *       而场景级元素是经过验证最稳定的方式。所有元素用数组收集，开关时一起 setVisible。
     */
    _createAttrPanel() {
        const cx = this.scale.width / 2;    // 屏幕中心X
        const cy = this.scale.height / 2;   // 屏幕中心Y
        const panelW = 380;                 // 面板宽度
        const panelH = 380;                 // 面板高度

        // 收集所有面板元素：开关面板时统一显示/隐藏
        this.attrPanelElements = [];

        // —— 半透明背景 ——
        const bg = this.add.rectangle(cx, cy, panelW, panelH, 0x111133, 0.92)
            .setStrokeStyle(2, 0x6666aa)
            .setScrollFactor(0)             // 固定在屏幕上，不随相机滚动
            .setDepth(DEPTH.POPUP);         // 最顶层
        this.attrPanelElements.push(bg);

        // —— 标题 ——
        const title = this.add.text(cx, cy - 160, '角色状态', {
            fontFamily: 'Microsoft YaHei', fontSize: '22px', color: '#ffdd44', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
        this.attrPanelElements.push(title);

        // —— 境界/突破经验进度 信息行 ——
        this.attrInfoText = this.add.text(cx, cy - 126, '', {
            fontFamily: 'Microsoft YaHei', fontSize: '16px', color: '#88ccff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
        this.attrPanelElements.push(this.attrInfoText);

        // —— 五项属性行（纯展示：名称 + 当前数值） ——
        this.attrRows = [];   // 保存每行的引用，方便刷新
        const rowDefs = [
            { key: 'attack',   name: '攻击' },
            { key: 'defense',  name: '防御' },
            { key: 'vitality', name: '气血' },
            { key: 'spirit',   name: '灵力' },
            { key: 'agility',  name: '身法' }
        ];
        const rowStartY = cy - 80;          // 第一行的Y位置（面板中心往上80像素）
        const rowGap = 50;                  // 行与行的间距

        rowDefs.forEach((def, i) => {
            const y = rowStartY + i * rowGap;

            // 属性名称（左边）
            const label = this.add.text(cx - 130, y, def.name, {
                fontFamily: 'Microsoft YaHei', fontSize: '18px', color: '#ffffff'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
            this.attrPanelElements.push(label);

            // 当前数值（右边）
            const value = this.add.text(cx + 30, y, '', {
                fontFamily: 'Microsoft YaHei', fontSize: '18px', color: '#88ff88'
            }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
            this.attrPanelElements.push(value);

            this.attrRows.push({ key: def.key, value });
        });

        // —— 关闭提示（底部） ——
        const hint = this.add.text(cx, cy + 164, '按 C 键关闭面板', {
            fontFamily: 'Microsoft YaHei', fontSize: '14px', color: '#999999'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.POPUP);
        this.attrPanelElements.push(hint);

        // 初始隐藏
        this.attrPanelVisible = false;
        this.attrPanelElements.forEach(e => e.setVisible(false));
    }

    /**
     * 切换属性面板的显示/隐藏（按 C 键调用）
     */
    _toggleAttrPanel() {
        this.attrPanelVisible = !this.attrPanelVisible;
        // 逐元素开关（场景级元素比容器更稳定）
        this.attrPanelElements.forEach(e => e.setVisible(this.attrPanelVisible));
        if (this.attrPanelVisible) {
            this._refreshAttrPanel();   // 打开时先刷新一遍数据
        }
    }

    /**
     * 刷新属性面板的所有文字（每帧或境界突破后调用）
     * 读取全局状态，把 境界/突破经验进度/五属性数值 更新到面板上
     */
    _refreshAttrPanel() {
        if (!this.attrPanelVisible) return;

        const realmIndex = StateManager.getState('player.realmIndex') || 0;
        const exp = StateManager.getState('player.exp') || 0;
        const expToNext = StateManager.getState('player.expToNext') || 100;

        // 信息行：境界 · 突破经验进度
        this.attrInfoText.setText(`${REALMS[realmIndex]} · 突破 ${exp}/${expToNext}`);

        // 五项属性：当前总值从 StateManager 读（突破后自动变高）
        const current = {
            attack:   StateManager.getState('player.attack') || 0,
            defense:  StateManager.getState('player.defense') || 0,
            vitality: StateManager.getState('player.maxHp') || 0,
            spirit:   StateManager.getState('player.maxMp') || 0,
            agility:  StateManager.getState('player.speed') || 0
        };

        this.attrRows.forEach(row => {
            row.value.setText(String(current[row.key]));
        });
    }

    /**
     * 创建血条、蓝条、经验条
     */
    _createStatusBar() {
        const startX = 20;
        const startY = 20;
        const barWidth = 220;
        const barHeight = 18;

        // --- 血条 ---
        // 背景
        this.hpBarBg = this.add.rectangle(startX + barWidth/2, startY + barHeight/2, barWidth, barHeight, 0x333333)
            .setStrokeStyle(1, 0x888888)
            .setOrigin(0.5)
            .setScrollFactor(0);  // 不随摄像机滚动

        // 前景（血量）
        this.hpBar = this.add.rectangle(startX, startY, barWidth, barHeight, COLORS.HP_RED)
            .setOrigin(0, 0.5)
            .setScrollFactor(0);

        // 文字：HP: 100/100
        this.hpText = this.add.text(startX + barWidth/2, startY, '', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // --- 蓝条 ---
        const mpY = startY + 26;
        this.mpBarBg = this.add.rectangle(startX + barWidth/2, mpY + barHeight/2, barWidth, barHeight, 0x333333)
            .setStrokeStyle(1, 0x888888).setOrigin(0.5).setScrollFactor(0);
        this.mpBar = this.add.rectangle(startX, mpY, barWidth, barHeight, COLORS.MP_BLUE)
            .setOrigin(0, 0.5).setScrollFactor(0);
        this.mpText = this.add.text(startX + barWidth/2, mpY, '', {
            fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5).setScrollFactor(0);

        // --- 经验条 ---
        const expY = mpY + 26;
        this.expBarBg = this.add.rectangle(startX + barWidth/2, expY + barHeight/2, barWidth, 10, 0x333333)
            .setStrokeStyle(1, 0x888888).setOrigin(0.5).setScrollFactor(0);
        this.expBar = this.add.rectangle(startX, expY, barWidth, 10, COLORS.EXP_YELLOW)
            .setOrigin(0, 0.5).setScrollFactor(0);

        // 境界文字（不显示等级，只显示当前境界名）
        this.realmText = this.add.text(startX + barWidth + 10, startY, '炼气', {
            fontFamily: 'Microsoft YaHei', fontSize: '16px', color: '#ffdd44', fontStyle: 'bold'
        }).setOrigin(0, 0).setScrollFactor(0);

        // 灵石（游戏通用货币，蓝色小晶体）
        this.spiritText = this.add.text(startX + barWidth + 10, mpY, '💎 0', {
            fontFamily: 'Microsoft YaHei', fontSize: '14px', color: '#66ccff'
        }).setOrigin(0, 0.5).setScrollFactor(0);

        // 御兽符数量（M4：黄色符纸小图标，收服妖兽要消耗）
        this.talismanText = this.add.text(startX + barWidth + 10, expY + 6, '', {
            fontFamily: 'Microsoft YaHei', fontSize: '14px', color: '#ffdd66'
        }).setOrigin(0, 0.5).setScrollFactor(0);

        // 伙伴状态（M4：当前带的妖兽名字 + 血量）
        this.companionText = this.add.text(startX + barWidth + 10, expY + 26, '', {
            fontFamily: 'Microsoft YaHei', fontSize: '13px', color: '#88ff88'
        }).setOrigin(0, 0.5).setScrollFactor(0);
    }

    /**
     * 创建技能栏（右下角，占位4个技能格）
     */
    _createSkillBar() {
        const slotSize = 50;
        const gap = 8;
        const startX = this.scale.width - (slotSize * 4 + gap * 3) - 20;
        const startY = this.scale.height - slotSize - 20;

        this.skillSlots = [];
        for (let i = 0; i < 4; i++) {
            const x = startX + i * (slotSize + gap);
            const slot = this.add.rectangle(x + slotSize/2, startY + slotSize/2, slotSize, slotSize, 0x222244)
                .setStrokeStyle(2, 0x6666aa)
                .setScrollFactor(0);

            // 技能序号
            this.add.text(x + slotSize/2, startY + slotSize/2, (i+1).toString(), {
                fontFamily: 'Arial', fontSize: '16px', color: '#888888'
            }).setOrigin(0.5).setScrollFactor(0);

            this.skillSlots.push(slot);
        }

        // 提示文字
        this.add.text(this.scale.width - 20, startY - 8, '技能栏', {
            fontFamily: 'Microsoft YaHei', fontSize: '12px', color: '#888888'
        }).setOrigin(1, 1).setScrollFactor(0);
    }

    /**
     * 创建小地图（右上角占位）
     */
    _createMinimap() {
        const mapSize = 150;
        const x = this.scale.width - mapSize - 20;
        const y = 20;

        this.minimapBg = this.add.rectangle(x + mapSize/2, y + mapSize/2, mapSize, mapSize, 0x111133)
            .setStrokeStyle(2, 0x6666aa)
            .setScrollFactor(0);

        this.add.text(x + mapSize/2, y + mapSize/2, '小地图\n(开发中)', {
            fontFamily: 'Microsoft YaHei', fontSize: '14px', color: '#666688', align: 'center'
        }).setOrigin(0.5).setScrollFactor(0);

        // 玩家位置点（实时跟随）
        this.minimapPlayerDot = this.add.circle(x + mapSize/2, y + mapSize/2, 4, 0x4488ff)
            .setScrollFactor(0);
    }

    /**
     * 每帧更新UI
     */
    _update() {
        this._updateHpBar();
        this._updateExpBar();
        this._updateMinimap();
        // M3：属性面板打开时每帧刷新（升级/加点后数值实时可见）
        if (this.attrPanelVisible) {
            this._refreshAttrPanel();
        }
    }

    /**
     * 更新血条和蓝条
     */
    _updateHpBar() {
        const hp = StateManager.getState('player.hp') || 100;
        const maxHp = StateManager.getState('player.maxHp') || 100;
        const mp = StateManager.getState('player.mp') || 50;
        const maxMp = StateManager.getState('player.maxMp') || 50;
        const stones = StateManager.getState('player.spiritStones') || 0;

        const barWidth = 220;
        this.hpBar.width = Math.max(0, barWidth * (hp / maxHp));
        this.hpText.setText(`HP ${hp} / ${maxHp}`);

        this.mpBar.width = Math.max(0, barWidth * (mp / maxMp));
        this.mpText.setText(`MP ${mp} / ${maxMp}`);

        this.spiritText.setText(`💎 ${stones}`);

        // —— M4：御兽符数量 + 伙伴状态（每帧刷新，拾取/收服后自动更新） ——
        const talismans = StateManager.getState('player.talismans') || 0;
        this.talismanText.setText(`符 ×${talismans}`);

        const comp = StateManager.getState('player.companion');
        this.companionText.setText(comp ? `伙伴：${comp.name} ${comp.hp}/${comp.maxHp}` : '伙伴：无');
    }

    /**
     * 更新经验条和境界文字（境界之间用经验条替代等级）
     * 经验攒满一格 → 自动境界突破（突破逻辑在 GameScene）
     */
    _updateExpBar() {
        const exp = StateManager.getState('player.exp') || 0;
        const expToNext = StateManager.getState('player.expToNext') || 100;
        const realmIndex = StateManager.getState('player.realmIndex') || 0;

        const barWidth = 220;
        this.expBar.width = Math.max(0, barWidth * (exp / expToNext));
        this.realmText.setText(REALMS[realmIndex]);
    }

    /**
     * 更新小地图上的玩家点
     */
    _updateMinimap() {
        if (!this.minimapPlayerDot) return;

        const px = StateManager.getState('player.x') || 0;
        const py = StateManager.getState('player.y') || 0;

        // 把世界坐标映射到小地图范围（世界尺寸用常量，保证大地图下也准确）
        const mapSize = 150;
        const worldW = WORLD_WIDTH;
        const worldH = WORLD_HEIGHT;

        const dotX = (this.scale.width - mapSize - 20) + (px / worldW) * mapSize;
        const dotY = 20 + (py / worldH) * mapSize;

        this.minimapPlayerDot.setPosition(dotX, dotY);
    }
}
