const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');

/**
 * 邮件解析模块
 * 提供邮件内容解析、附件提取等功能
 */
class MailParser {
    constructor() {
        this.supportedTypes = ['text/plain', 'text/html', 'multipart/mixed', 'multipart/alternative'];
    }

    /**
     * 解析邮件内容
     * @param {string|Buffer} rawMail - 原始邮件数据
     * @returns {Promise<Object>} 解析后的邮件对象
     */
    async parseEmail(rawMail) {
        try {
            const parsed = await simpleParser(rawMail);
            
            return {
                messageId: parsed.messageId,
                from: this.parseAddress(parsed.from),
                to: this.parseAddressList(parsed.to),
                cc: this.parseAddressList(parsed.cc),
                bcc: this.parseAddressList(parsed.bcc),
                subject: parsed.subject || '',
                date: Math.floor((parsed.date || new Date()).getTime() / 1000),
                text: parsed.text || '',
                html: parsed.html || '',
                attachments: this.parseAttachments(parsed.attachments || []),
                headers: parsed.headers,
                priority: this.parsePriority(parsed.headers),
                isValid: true,
                errors: []
            };
        } catch (error) {
            console.error('邮件解析失败:', error);
            return {
                isValid: false,
                errors: [error.message],
                rawData: rawMail
            };
        }
    }

    /**
     * 解析邮件地址
     * @param {Object} address - 地址对象
     * @returns {Object} 标准化的地址对象
     */
    parseAddress(address) {
        if (!address) return null;
        
        if (address.value && address.value.length > 0) {
            const addr = address.value[0];
            return {
                name: addr.name || '',
                address: addr.address || ''
            };
        }
        
        return {
            name: address.name || '',
            address: address.address || ''
        };
    }

    /**
     * 解析邮件地址列表
     * @param {Object} addressList - 地址列表对象
     * @returns {Array} 标准化的地址数组
     */
    parseAddressList(addressList) {
        if (!addressList) return [];
        
        if (addressList.value && Array.isArray(addressList.value)) {
            return addressList.value.map(addr => ({
                name: addr.name || '',
                address: addr.address || ''
            }));
        }
        
        if (Array.isArray(addressList)) {
            return addressList.map(addr => this.parseAddress(addr)).filter(Boolean);
        }
        
        return [this.parseAddress(addressList)].filter(Boolean);
    }

    /**
     * 解析附件
     * @param {Array} attachments - 附件数组
     * @returns {Array} 标准化的附件数组
     */
    parseAttachments(attachments) {
        return attachments.map(attachment => ({
            filename: attachment.filename || 'unnamed',
            contentType: attachment.contentType || 'application/octet-stream',
            size: attachment.size || 0,
            content: attachment.content,
            contentId: attachment.contentId,
            disposition: attachment.contentDisposition || 'attachment'
        }));
    }

    /**
     * 解析邮件优先级
     * @param {Map} headers - 邮件头
     * @returns {string} 优先级
     */
    parsePriority(headers) {
        const priority = headers.get('x-priority') || headers.get('priority');
        if (!priority) return 'normal';
        
        const priorityValue = priority.toString().toLowerCase();
        if (priorityValue.includes('high') || priorityValue.includes('1')) return 'high';
        if (priorityValue.includes('low') || priorityValue.includes('5')) return 'low';
        return 'normal';
    }

    /**
     * 验证邮件格式
     * @param {Object} parsedMail - 解析后的邮件
     * @returns {Object} 验证结果
     */
    validateEmail(parsedMail) {
        const errors = [];
        
        if (!parsedMail.from || !parsedMail.from.address) {
            errors.push('缺少发件人地址');
        }
        
        if (!parsedMail.to || parsedMail.to.length === 0) {
            errors.push('缺少收件人地址');
        }
        
        // 验证邮件地址格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (parsedMail.from && !emailRegex.test(parsedMail.from.address)) {
            errors.push('发件人邮件地址格式无效');
        }
        
        if (parsedMail.to) {
            parsedMail.to.forEach((addr, index) => {
                if (!emailRegex.test(addr.address)) {
                    errors.push(`收件人${index + 1}邮件地址格式无效`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * 提取邮件中的文本内容
     * @param {Object} parsedMail - 解析后的邮件
     * @returns {string} 文本内容
     */
    extractTextContent(parsedMail) {
        if (parsedMail.text) {
            return parsedMail.text;
        }
        
        if (parsedMail.html) {
            // 简单的HTML标签移除
            return parsedMail.html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');
        }
        
        return '';
    }

    /**
     * 检查邮件是否包含可疑内容
     * @param {Object} parsedMail - 解析后的邮件
     * @returns {Object} 安全检查结果
     */
    securityCheck(parsedMail) {
        const warnings = [];
        const content = this.extractTextContent(parsedMail).toLowerCase();
        
        // 检查可疑关键词
        const suspiciousKeywords = ['password', 'urgent', 'click here', 'verify account', 'suspended'];
        suspiciousKeywords.forEach(keyword => {
            if (content.includes(keyword)) {
                warnings.push(`包含可疑关键词: ${keyword}`);
            }
        });
        
        // 检查附件
        if (parsedMail.attachments && parsedMail.attachments.length > 0) {
            const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif'];
            parsedMail.attachments.forEach(attachment => {
                const ext = path.extname(attachment.filename).toLowerCase();
                if (dangerousExtensions.includes(ext)) {
                    warnings.push(`危险附件类型: ${attachment.filename}`);
                }
            });
        }
        
        return {
            isSafe: warnings.length === 0,
            warnings
        };
    }
}

module.exports = {
    MailParser,
    createParser: () => new MailParser()
};