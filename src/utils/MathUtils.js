/**
 * MathUtils.js —— 数学工具函数
 * ------------------------------------------------------------
 * 作用：封装游戏中常用的数学计算，避免在业务代码里重复写公式。
 * 包括：距离、角度、随机、插值、碰撞检测辅助等。
 * ------------------------------------------------------------
 */

export const MathUtils = {
    /**
     * 计算两点之间的距离
     * @param {number} x1 - 点1的X
     * @param {number} y1 - 点1的Y
     * @param {number} x2 - 点2的X
     * @param {number} y2 - 点2的Y
     * @returns {number} 距离
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /**
     * 计算两点之间的距离（平方，不开根号，性能更好，用于比较大小）
     */
    distanceSq(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    /**
     * 计算从点1到点2的角度（弧度）
     */
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },

    /**
     * 在指定范围内生成随机浮点数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机数
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * 在指定范围内生成随机整数（包含两端）
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 从数组中随机取一个元素
     */
    randomFromArray(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * 计算一次攻击造成的最终伤害（战斗通用公式）
     * 公式：基础伤害 = 攻击力 - 防御力（保底1），再乘随机 0.8~1.2 的浮动
     * @param {number} attack - 攻击方的攻击力
     * @param {number} defense - 受击方的防御力
     * @returns {number} 最终伤害（至少为1）
     */
    calcDamage(attack, defense) {
        const base = Math.max(1, attack - defense);   // 基础伤害，防御够高也只少保底1点
        const variance = 0.8 + Math.random() * 0.4;    // 0.8 ~ 1.2 随机倍率（战斗手感波动）
        return Math.max(1, Math.round(base * variance));
    },

    /**
     * 限制数值在 [min, max] 范围内
     * @param {number} value - 原始值
     * @param {number} min - 下限
     * @param {number} max - 上限
     * @returns {number} 限制后的值
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /**
     * 线性插值（在a和b之间按t比例取值）
     * @param {number} a - 起始值
     * @param {number} b - 目标值
     * @param {number} t - 比例 0~1
     * @returns {number} 插值结果
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /**
     * 角度转弧度
     */
    degToRad(deg) {
        return deg * Math.PI / 180;
    },

    /**
     * 弧度转角度
     */
    radToDeg(rad) {
        return rad * 180 / Math.PI;
    },

    /**
     * 判断两个矩形是否相交（AABB碰撞）
     * @param {object} a - {x, y, width, height}
     * @param {object} b - {x, y, width, height}
     * @returns {boolean}
     */
    rectIntersect(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    },

    /**
     * 判断点是否在矩形内
     */
    pointInRect(px, py, rect) {
        return px >= rect.x && px <= rect.x + rect.width &&
               py >= rect.y && py <= rect.y + rect.height;
    }
};
