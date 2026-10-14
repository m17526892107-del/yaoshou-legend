/**
 * StateManager.js —— 全局状态管理器
 * ------------------------------------------------------------
 * 作用：存放整个游戏共享的数据，比如玩家血量、金币、当前关卡等。
 *       任何模块都可以读写这些数据，相当于游戏的"全局记忆"。
 * 
 * 和 EventBus 的区别：
 *   - EventBus 管的是"消息通知"（发生了什么事）
 *   - StateManager 管的是"数据存储"（现在是什么状态）
 * 
 * 使用示例：
 *   import { StateManager } from './StateManager.js';
 *   
 *   // 读取玩家血量
 *   const hp = StateManager.getState('player.hp');
 *   
 *   // 修改玩家血量
 *   StateManager.setState('player.hp', hp - 50);
 * ------------------------------------------------------------
 */

import { INITIAL_TALISMANS } from './Constants.js';

class StateManagerClass {
    constructor() {
        // 初始游戏状态（所有全局数据都在这里定义）
        this.state = {
            // ----- 玩家数据 -----
            player: {
                name: '主角',           // 名字
                exp: 0,                 // 当前经验
                expToNext: 100,         // 突破到下一境界所需经验（从炼气突破到筑基要100经验）
                hp: 100,                // 当前生命
                maxHp: 100,             // 最大生命
                mp: 50,                 // 当前法力
                maxMp: 50,              // 最大法力
                attack: 10,             // 攻击力
                defense: 5,             // 防御力
                spiritStones: 0,        // 灵石（游戏通用货币，蓝色小晶体）
                x: 0,                   // 地图X坐标
                y: 0,                   // 地图Y坐标
                direction: 'down',      // 朝向
                realmIndex: 0,          // 当前境界下标（0=炼气，对应 REALMS 数组）
                talismans: INITIAL_TALISMANS, // 御兽符数量（M4：开局送3张，收服妖兽时消耗）
                materials: 0,           // 妖丹材料数量（M4：击杀妖兽掉落，制符的原料）
                companion: null,        // 当前伙伴（M4：收服的妖兽数据，null=没有）
            },

            // ----- 背包数据 -----
            inventory: [],              // 道具数组

            // ----- 游戏进度 -----
            game: {
                currentLevel: 1,        // 当前关卡
                isPaused: false,        // 是否暂停
                isGameOver: false,      // 是否游戏结束
                startTime: 0,           // 开始时间戳
                elapsedTime: 0          // 已玩时长
            },

            // ----- 设置项 -----
            settings: {
                bgmVolume: 0.7,         // 背景音乐音量
                sfxVolume: 0.8,         // 音效音量
                language: 'zh-CN'       // 语言
            }
        };
    }

    /**
     * 读取状态（支持点号路径，例如 'player.hp'）
     * @param {string} path - 数据路径，如 'player.hp'
     * @returns {*} 对应的值，找不到返回 undefined
     */
    getState(path) {
        const keys = path.split('.');
        let current = this.state;
        for (const key of keys) {
            if (current === undefined || current === null) return undefined;
            current = current[key];
        }
        return current;
    }

    /**
     * 修改状态（支持点号路径）
     * @param {string} path - 数据路径
     * @param {*} value - 新值
     */
    setState(path, value) {
        const keys = path.split('.');
        let current = this.state;
        // 走到倒数第二层
        for (let i = 0; i < keys.length - 1; i++) {
            // 如果中间某层不存在，就创建一个空对象
            if (current[keys[i]] === undefined) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        // 设置最后一层的值
        current[keys[keys.length - 1]] = value;
    }

    /**
     * 重置状态（重新开始游戏时用）
     */
    reset() {
        const fresh = new StateManagerClass();
        this.state = fresh.state;
    }

    /**
     * 获取完整状态（用于存档）
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * 从存档数据恢复
     */
    loadFrom(data) {
        if (data) {
            this.state = { ...this.state, ...data };
        }
    }
}

// 导出单例
export const StateManager = new StateManagerClass();
