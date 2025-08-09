const fs = require('fs').promises;
const path = require('path');

class EmailMappingManager {
    constructor() {
        this.mappingFilePath = path.join(__dirname, '../../provda/mapping.json');
    }

    /**
     * 实时加载邮件映射配置（每次都重新读取文件）
     */
    async loadMappings() {
        try {
            const data = await fs.readFile(this.mappingFilePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('加载邮件映射配置失败:', error);
            return {
                mainEmails: [],
                mappingEmails: []
            };
        }
    }

    /**
     * 实时保存邮件映射配置并确保数据同步
     */
    async saveMappings(mappings) {
        try {
            await fs.writeFile(this.mappingFilePath, JSON.stringify(mappings, null, 2));
        } catch (error) {
            console.error('保存邮件映射配置失败:', error);
            throw error;
        }
    }

    /**
     * 验证用户是否存在（实时读取最新数据）
     * @param {string} emailAddress - 邮箱地址
     * @returns {boolean} 用户是否存在
     */
    async validateUserExists(emailAddress) {
        const mappings = await this.loadMappings();

        // 检查是否是主邮箱
        const isMainEmail = mappings.mainEmails.some(main => 
            main.address.toLowerCase() === emailAddress.toLowerCase() && 
            main.status === 'active'
        );

        // 检查是否是映射邮箱
        const isMappedEmail = mappings.mappingEmails.some(mapping => 
            mapping.address.toLowerCase() === emailAddress.toLowerCase() && 
            mapping.status === 'active'
        );

        return isMainEmail || isMappedEmail;
    }

    /**
     * 获取主邮箱地址（实时读取最新数据）
     * @param {string} emailAddress - 原始邮箱地址（可能是映射邮箱）
     * @returns {string|null} 主邮箱地址，如果找不到则返回null
     */
    async getMainEmailAddress(emailAddress) {
        const mappings = await this.loadMappings();

        // 如果是主邮箱，直接返回
        const mainEmail = mappings.mainEmails.find(main => 
            main.address.toLowerCase() === emailAddress.toLowerCase() && 
            main.status === 'active'
        );

        if (mainEmail) {
            return mainEmail.address;
        }

        // 如果是映射邮箱，查找对应的主邮箱
        const mapping = mappings.mappingEmails.find(map => 
            map.address.toLowerCase() === emailAddress.toLowerCase() && 
            map.status === 'active'
        );

        if (mapping) {
            const mainEmail = mappings.mainEmails.find(main => 
                main.id === mapping.mappedTo && main.status === 'active'
            );
            return mainEmail ? mainEmail.address : null;
        }

        return null;
    }

    /**
     * 获取用户ID（基于主邮箱地址）
     * @param {string} mainEmailAddress - 主邮箱地址
     * @returns {number|null} 用户ID
     */
    async getUserIdByMainEmail(mainEmailAddress) {
        try {
            const users = require('../../user/user.json');
            const user = users.find(u => 
                u.email.toLowerCase() === mainEmailAddress.toLowerCase()
            );
            return user ? user.id : null;
        } catch (error) {
            console.error('获取用户ID失败:', error);
            return null;
        }
    }

    /**
     * 获取所有映射到指定主邮箱的邮箱地址（实时读取最新数据）
     * @param {string} mainEmailAddress - 主邮箱地址
     * @returns {Array<string>} 映射到该主邮箱的所有邮箱地址
     */
    async getMappedEmails(mainEmailAddress) {
        const mappings = await this.loadMappings();

        const mainEmail = mappings.mainEmails.find(main => 
            main.address.toLowerCase() === mainEmailAddress.toLowerCase()
        );

        if (!mainEmail) {
            return [];
        }

        const mappedEmails = mappings.mappingEmails
            .filter(mapping => 
                mapping.mappedTo === mainEmail.id && 
                mapping.status === 'active'
            )
            .map(mapping => mapping.address);

        return [mainEmail.address, ...mappedEmails];
    }
}

module.exports = { EmailMappingManager };