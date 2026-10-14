/**
 * EventBus.js —— 事件总线（模块间通信的核心）
 * ------------------------------------------------------------
 * 作用：像一个"广播电台"。任何模块都可以"发送"事件，
 *       其他模块可以"监听"自己关心的事件，收到通知后做相应处理。
 * 
 * 为什么需要它？
 *   假设玩家受伤了，需要同时做3件事：
 *     1. 血条扣血（UI模块）
 *     2. 播放受伤特效（特效模块）
 *     3. 播放受伤音效（音频模块）
 *   如果不用事件总线，玩家代码就要直接调用这3个模块，耦合严重。
 *   用了事件总线，玩家只需要"广播"一个 PLAYER_DAMAGED 事件，
 *   谁关心谁就自己监听，玩家代码不用知道谁在监听。
 * 
 * 使用示例：
 *   import { EventBus } from './EventBus.js';
 *   import { EVENTS } from './Constants.js';
 *   
 *   // 监听事件
 *   EventBus.on(EVENTS.PLAYER_DAMAGED, (data) => {
 *       console.log('玩家受伤了，伤害值：', data.damage);
 *   });
 *   
 *   // 发送事件
 *   EventBus.emit(EVENTS.PLAYER_DAMAGED, { damage: 50 });
 * ------------------------------------------------------------
 */

class EventBusClass {
    constructor() {
        // 用一个对象存储所有事件的监听者
        // 结构：{ 事件名: [回调函数1, 回调函数2, ...] }
        this.listeners = {};
    }

    /**
     * 监听事件
     * @param {string} event - 事件名（用 EVENTS 常量）
     * @param {Function} callback - 事件触发时执行的函数
     */
    on(event, callback) {
        // 如果这个事件还没有监听者数组，就创建一个空数组
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        // 把回调函数加入监听列表
        this.listeners[event].push(callback);
    }

    /**
     * 只监听一次事件（触发后自动移除）
     */
    once(event, callback) {
        // 包装一层：执行完原回调后自动取消监听
        const wrapper = (data) => {
            callback(data);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * 取消监听
     * @param {string} event - 事件名
     * @param {Function} callback - 要取消的那个回调函数
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        // 过滤掉要取消的回调
        this.listeners[event] = this.listeners[event].filter(
            cb => cb !== callback
        );
    }

    /**
     * 发送（广播）事件
     * @param {string} event - 事件名
     * @param {*} data - 传给监听者的数据
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        // 逐个调用所有监听这个事件的回调函数
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                // 某个监听者报错不影响其他监听者
                console.error(`事件 [${event}] 的监听者执行出错：`, err);
            }
        });
    }

    /**
     * 清除某个事件的所有监听者
     */
    clear(event) {
        if (event) {
            delete this.listeners[event];
        } else {
            // 不传参数就清除全部
            this.listeners = {};
        }
    }
}

// 导出一个单例（整个游戏只有一个事件总线）
export const EventBus = new EventBusClass();
