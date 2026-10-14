/**
 * Helper.js —— 通用辅助函数
 * ------------------------------------------------------------
 * 作用：放一些不好归类的通用工具函数，比如深拷贝、随机ID、格式化等。
 * ------------------------------------------------------------
 */

export const Helper = {
    /**
     * 生成唯一ID（用于区分不同的游戏对象实例）
     * @param {string} prefix - 前缀，比如 'enemy_'
     * @returns {string} 唯一ID
     */
    generateId(prefix = '') {
        return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    },

    /**
     * 深拷贝对象（避免引用共享导致的数据污染）
     * @param {*} obj - 要拷贝的对象
     * @returns {*} 新对象
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        // 用 JSON 方式简单处理（适合纯数据对象，不包含函数）
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 格式化时间（毫秒 → mm:ss）
     * @param {number} ms - 毫秒数
     * @returns {string} 形如 "03:25"
     */
    formatTime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const min = Math.floor(totalSec / 60);
        const sec = totalSec % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    },

    /**
     * 格式化大数字（比如 1000 → "1.0K"，1000000 → "1.0M"）
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    /**
     * 从数组中随机取出指定数量的元素（不重复）
     */
    sampleArray(arr, count) {
        const copy = [...arr];
        const result = [];
        for (let i = 0; i < count && copy.length > 0; i++) {
            const index = Math.floor(Math.random() * copy.length);
            result.push(copy.splice(index, 1)[0]);
        }
        return result;
    },

    /**
     * 加权随机（根据权重从选项中选一个）
     * @param {Array} items - [{ value, weight }]
     * @returns {*} 选中的 value
     */
    weightedRandom(items) {
        const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        for (const item of items) {
            random -= item.weight;
            if (random <= 0) return item.value;
        }
        return items[items.length - 1].value;
    },

    /**
     * 在控制台输出带样式的日志（调试用）
     */
    log(message, type = 'info') {
        const styles = {
            info: 'color:#44aaff;',
            success: 'color:#44ff44;font-weight:bold;',
            warn: 'color:#ffaa44;font-weight:bold;',
            error: 'color:#ff4444;font-weight:bold;'
        };
        console.log(`%c[${type.toUpperCase()}] ${message}`, styles[type] || styles.info);
    }
};
