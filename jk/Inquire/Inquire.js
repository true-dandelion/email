const fs = require('fs').promises;
const path = require('path');

/**
 * 邮件发送状态管理模块
 * 用于跟踪和存储邮件发送的成功/失败状态及原因
 */
class MailStatusManager {
    constructor() {
        this.storageDir = path.join(__dirname, '../../storage');
        this.statusFileName = 'qustat.json';
    }

    /**
     * 获取用户的发送状态文件路径
     * @param {string} userId - 用户ID
     * @returns {string} 状态文件路径
     */
    getStatusFilePath(userId) {
        return path.join(this.storageDir, userId, 'send', this.statusFileName);
    }

    /**
     * 初始化用户的发送状态文件（如果不存在）
     * @param {string} userId - 用户ID
     */
    async initStatusFile(userId) {
        const statusFilePath = this.getStatusFilePath(userId);
        const dir = path.dirname(statusFilePath);
        
        try {
            await fs.mkdir(dir, { recursive: true });
            
            try {
                await fs.access(statusFilePath);
            } catch (error) {
                // 文件不存在，创建初始状态文件
                const initialData = {};
                await fs.writeFile(statusFilePath, JSON.stringify(initialData, null, 2), 'utf8');
            }
        } catch (error) {
            console.error('初始化状态文件失败:', error);
            throw error;
        }
    }

    /**
     * 读取发送状态数据
     * @param {string} userId - 用户ID
     * @returns {Promise<Object>} 状态数据
     */
    async readStatusData(userId) {
        const statusFilePath = this.getStatusFilePath(userId);
        
        try {
            await this.initStatusFile(userId);
            const data = await fs.readFile(statusFilePath, 'utf8');
            return JSON.parse(data || '{}');
        } catch (error) {
            console.error('读取状态数据失败:', error);
            return {};
        }
    }

    /**
     * 写入发送状态数据
     * @param {string} userId - 用户ID
     * @param {Object} statusData - 状态数据
     */
    async writeStatusData(userId, statusData) {
        const statusFilePath = this.getStatusFilePath(userId);
        
        try {
            await this.initStatusFile(userId);
            await fs.writeFile(statusFilePath, JSON.stringify(statusData, null, 2), 'utf8');
        } catch (error) {
            console.error('写入状态数据失败:', error);
            throw error;
        }
    }

    /**
     * 更新邮件发送状态
     * @param {string} userId - 用户ID
     * @param {string} messageId - 邮件消息ID
     * @param {string} filename - 邮件文件名
     * @param {string} recipient - 收件人地址
     * @param {string} state - 状态（pending/sending/success/failed）
     * @param {string} reason - 失败原因（可选）
     */
    async updateSendStatus(userId, messageId, filename, recipient, state, reason = '') {
        const statusData = await this.readStatusData(userId);
        
        const key = filename;
        statusData[key] = {
            state: state,
            recipient: recipient,
            timestamp: new Date().toISOString(),
            ...(reason && { reason: reason })
        };
        
        await this.writeStatusData(userId, statusData);
    }

    /**
     * 开始发送邮件（设置为正在发送状态）
     * @param {string} userId - 用户ID
     * @param {string} messageId - 邮件消息ID
     * @param {string} filename - 邮件文件名
     * @param {string} recipient - 收件人地址
     */
    async startSending(userId, messageId, filename, recipient) {
        await this.updateSendStatus(userId, messageId, filename, recipient, 'sending');
    }

    /**
     * 批量更新邮件发送状态
     * @param {string} userId - 用户ID
     * @param {string} messageId - 邮件消息ID
     * @param {Array} results - 发送结果数组
     */
    async batchUpdateSendStatus(userId, messageId, results) {
        const statusData = await this.readStatusData(userId);
        
        results.forEach(result => {
            const key = result.filename;
            statusData[key] = {
                state: result.success ? 'success' : 'failed',
                recipient: result.recipient,
                timestamp: new Date().toISOString(),
                ...(result.error && { reason: result.error })
            };
        });
        
        await this.writeStatusData(userId, statusData);
    }

    /**
     * 获取邮件发送状态
     * @param {string} userId - 用户ID
     * @param {string} messageId - 邮件消息ID（可选）
     * @param {string} filename - 邮件文件名（可选）
     * @returns {Promise<Object>} 状态信息
     */
    async getSendStatus(userId, messageId = null, filename = null) {
        const statusData = await this.readStatusData(userId);
        
        if (filename) {
            return statusData[filename] || null;
        }
        
        return statusData;
    }

    /**
     * 获取用户的所有发送状态
     * @param {string} userId - 用户ID
     * @returns {Promise<Array>} 状态列表
     */
    async getAllSendStatus(userId) {
        const statusData = await this.readStatusData(userId);
        
        return Object.entries(statusData).map(([filename, value]) => {
            return {
                filename,
                ...value
            };
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    /**
     * 删除发送状态记录
     * @param {string} userId - 用户ID
     * @param {string} messageId - 邮件消息ID
     * @param {string} filename - 邮件文件名
     */
    async deleteSendStatus(userId, messageId, filename) {
        const statusData = await this.readStatusData(userId);
        
        if (statusData[filename]) {
            delete statusData[filename];
            await this.writeStatusData(userId, statusData);
        }
    }

    /**
     * 清理旧的发送状态记录（保留最近30天的记录）
     * @param {string} userId - 用户ID
     */
    async cleanupOldStatus(userId) {
        const statusData = await this.readStatusData(userId);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const cleanedData = {};
        Object.entries(statusData).forEach(([key, value]) => {
            const recordDate = new Date(value.timestamp);
            if (recordDate >= thirtyDaysAgo) {
                cleanedData[key] = value;
            }
        });
        
        await this.writeStatusData(userId, cleanedData);
    }
}

// 创建单例实例
const mailStatusManager = new MailStatusManager();

module.exports = {
    MailStatusManager,
    updateSendStatus: (userId, messageId, filename, recipient, state, reason) => 
        mailStatusManager.updateSendStatus(userId, messageId, filename, recipient, state, reason),
    startSending: (userId, messageId, filename, recipient) => 
        mailStatusManager.startSending(userId, messageId, filename, recipient),
    batchUpdateSendStatus: (userId, messageId, results) => 
        mailStatusManager.batchUpdateSendStatus(userId, messageId, results),
    getSendStatus: (userId, messageId, filename) => 
        mailStatusManager.getSendStatus(userId, messageId, filename),
    getAllSendStatus: (userId) => 
        mailStatusManager.getAllSendStatus(userId),
    deleteSendStatus: (userId, messageId, filename) => 
        mailStatusManager.deleteSendStatus(userId, messageId, filename),
    cleanupOldStatus: (userId) => 
        mailStatusManager.cleanupOldStatus(userId)
};