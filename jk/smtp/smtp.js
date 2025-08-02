const net = require('net');
const tls = require('tls');
const dns = require('dns').promises;
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { MailParser } = require('../parse/parse');
const config = require('../../config/smtp.json');
const users = require('../../user/user.json');

/**
 * SMTP发送模块
 * 处理邮件发送、存储和管理
 */
class SMTPSender {
    constructor() {
        this.parser = new MailParser();
        this.config = config;
        this.storageDir = path.join(__dirname, '../../storage');
    }

    /**
     * 发送邮件
     * @param {Object} mailData - 邮件数据
     * @returns {Promise<Object>} 发送结果
     */
    async sendMail(mailData) {
        try {
            // 构建原始邮件内容
            const rawMail = this.buildRawMail(mailData);
            
            // 解析和验证邮件
            const parsedMail = await this.parser.parseEmail(rawMail);
            const validation = this.parser.validateEmail(parsedMail);
            
            if (!validation.isValid) {
                throw new Error(`邮件验证失败: ${validation.errors.join(', ')}`);
            }

            // 安全检查
            const securityCheck = this.parser.securityCheck(parsedMail);
            if (!securityCheck.isSafe) {
                console.warn('邮件安全警告:', securityCheck.warnings);
            }

            // 分离本地和外部收件人
            const { localRecipients, externalRecipients } = this.categorizeRecipients(parsedMail.to);
            
            const results = {
                messageId: parsedMail.messageId || this.generateMessageId(),
                localDelivery: [],
                externalDelivery: [],
                errors: []
            };

            // 处理本地收件人
            for (const recipient of localRecipients) {
                try {
                    await this.deliverLocally(rawMail, recipient);
                    results.localDelivery.push({
                        recipient: recipient.address,
                        status: 'delivered',
                        timestamp: new Date()
                    });
                } catch (error) {
                    results.errors.push({
                        recipient: recipient.address,
                        error: error.message,
                        type: 'local'
                    });
                }
            }

            // 处理外部收件人
            for (const recipient of externalRecipients) {
                try {
                    await this.deliverExternally(parsedMail, recipient);
                    results.externalDelivery.push({
                        recipient: recipient.address,
                        status: 'sent',
                        timestamp: new Date()
                    });
                } catch (error) {
                    results.errors.push({
                        recipient: recipient.address,
                        error: error.message,
                        type: 'external'
                    });
                }
            }

            // 存储发送记录
            await this.storeSentMail(rawMail, parsedMail.from.address);

            return results;
        } catch (error) {
            console.error('发送邮件失败:', error);
            throw error;
        }
    }

    /**
     * 构建原始邮件内容
     * @param {Object} mailData - 邮件数据
     * @returns {string} 原始邮件内容
     */
    buildRawMail(mailData) {
        const headers = [];
        
        headers.push(`Message-ID: <${this.generateMessageId()}>`);
        headers.push(`Date: ${new Date().toUTCString()}`);
        headers.push(`From: ${this.formatAddress(mailData.from)}`);
        headers.push(`To: ${mailData.to.map(addr => this.formatAddress(addr)).join(', ')}`);
        
        if (mailData.cc && mailData.cc.length > 0) {
            headers.push(`Cc: ${mailData.cc.map(addr => this.formatAddress(addr)).join(', ')}`);
        }
        
        headers.push(`Subject: ${mailData.subject || ''}`);
        headers.push(`MIME-Version: 1.0`);
        
        if (mailData.attachments && mailData.attachments.length > 0) {
            const boundary = this.generateBoundary();
            headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
            
            let body = `\r\n--${boundary}\r\n`;
            body += `Content-Type: text/plain; charset=utf-8\r\n`;
            body += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
            body += `${mailData.text || ''}\r\n`;
            
            // 添加附件
            for (const attachment of mailData.attachments) {
                body += `--${boundary}\r\n`;
                body += `Content-Type: ${attachment.contentType}\r\n`;
                
                // 对文件名进行RFC 2047编码以支持中文等非ASCII字符
                const encodedFilename = this.encodeRFC2047(attachment.filename);
                body += `Content-Disposition: attachment; filename="${encodedFilename}"\r\n`;
                body += `Content-Transfer-Encoding: base64\r\n\r\n`;
                body += `${attachment.content.toString('base64')}\r\n`;
            }
            
            body += `--${boundary}--\r\n`;
            return headers.join('\r\n') + '\r\n' + body;
        } else {
            headers.push(`Content-Type: text/plain; charset=utf-8`);
            headers.push(`Content-Transfer-Encoding: 8bit`);
            return headers.join('\r\n') + '\r\n\r\n' + (mailData.text || '');
        }
    }

    /**
     * 根据邮箱地址获取用户ID
     * @param {string} email - 邮箱地址
     * @returns {string|null} 用户ID
     */
    getUserIdByEmail(email) {
        const user = users.find(u => u.email === email);
        return user ? user.id.toString() : null;
    }

    /**
     * 分类收件人（本地/外部）
     * 注意：所有邮件都通过外部SMTP服务器投递，包括同域名邮件
     * @param {Array} recipients - 收件人列表
     * @returns {Object} 分类结果
     */
    categorizeRecipients(recipients) {
        const localRecipients = [];
        const externalRecipients = [];
        
        // 将所有收件人都归类为外部收件人，强制通过外部SMTP服务器投递
        recipients.forEach(recipient => {
            externalRecipients.push(recipient);
        });
        
        return { localRecipients, externalRecipients };
    }

    /**
     * 本地投递
     * @param {string} rawMail - 原始邮件内容
     * @param {Object} recipient - 收件人
     */
    async deliverLocally(rawMail, recipient) {
        const userId = this.getUserIdByEmail(recipient.address);
        if (!userId) {
            throw new Error(`找不到用户: ${recipient.address}`);
        }
        
        const userDir = path.join(this.storageDir, userId, 'reception');
        
        // 确保用户目录存在
        await fs.mkdir(userDir, { recursive: true });
        
        const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.eml`;
        const filePath = path.join(userDir, filename);
        
        // 存储原始邮件数据
        await fs.writeFile(filePath, rawMail);
    }

    /**
     * 外部投递
     * @param {Object} parsedMail - 解析后的邮件
     * @param {Object} recipient - 收件人
     */
    async deliverExternally(parsedMail, recipient) {
        const domain = recipient.address.split('@')[1];
        const mxRecord = await this.getMXRecord(domain);
        
        if (!mxRecord) {
            throw new Error(`无法找到域名 ${domain} 的MX记录`);
        }
        
        return new Promise((resolve, reject) => {
            const client = net.createConnection(25, mxRecord, () => {
            });
            
            let step = 0;
            const steps = [
                `EHLO ${this.config.domain}`,
                `MAIL FROM:<${parsedMail.from.address}>`,
                `RCPT TO:<${recipient.address}>`,
                'DATA'
            ];
            
            client.on('data', (data) => {
                const response = data.toString();
                
                if (response.startsWith('220') && step === 0) {
                    client.write(steps[step] + '\r\n');
                    step++;
                } else if (response.startsWith('250') && step < 4) {
                    if (step < steps.length) {
                        client.write(steps[step] + '\r\n');
                        step++;
                    }
                } else if (response.startsWith('354') && step === 4) {
                    // 发送邮件内容
                    const rawMail = this.buildRawMail({
                        from: parsedMail.from,
                        to: [recipient],
                        subject: parsedMail.subject,
                        text: parsedMail.text,
                        attachments: parsedMail.attachments
                    });
                    client.write(rawMail + '\r\n.\r\n');
                } else if (response.startsWith('250') && step === 4) {
                    client.write('QUIT\r\n');
                    resolve();
                } else if (response.startsWith('4') || response.startsWith('5')) {
                    reject(new Error(`SMTP错误: ${response}`));
                }
            });
            
            client.on('error', (error) => {
                reject(error);
            });
            
            client.on('close', () => {
            });
        });
    }

    /**
     * 获取MX记录（使用DNS查询）
     * @param {string} domain - 域名
     * @returns {Promise<string>} MX记录
     */
    async getMXRecord(domain) {
        try {
            const mxRecords = await dns.resolveMx(domain);
            
            if (mxRecords && mxRecords.length > 0) {
                // 按优先级排序，选择优先级最高的（数值最小的）
                mxRecords.sort((a, b) => a.priority - b.priority);
                return mxRecords[0].exchange;
            }
            
            // 如果没有MX记录，尝试使用A记录
            const aRecords = await dns.resolve4(domain);
            if (aRecords && aRecords.length > 0) {
                return domain; // 直接使用域名
            }
            
            throw new Error(`无法解析域名 ${domain} 的MX或A记录`);
        } catch (error) {
            console.error(`DNS查询失败 ${domain}:`, error.message);
            // 作为备用方案，尝试使用mail.domain格式
            return `mail.${domain}`;
        }
    }

    /**
     * 存储已发送邮件
     * @param {string} rawMail - 原始邮件内容
     * @param {string} senderEmail - 发送者邮箱
     */
    async storeSentMail(rawMail, senderEmail) {
        const userId = this.getUserIdByEmail(senderEmail);
        if (!userId) {
            throw new Error(`找不到发送者用户: ${senderEmail}`);
        }
        
        const userDir = path.join(this.storageDir, userId, 'send');
        
        await fs.mkdir(userDir, { recursive: true });
        
        const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}.eml`;
        const filePath = path.join(userDir, filename);
        
        // 存储原始邮件数据
        await fs.writeFile(filePath, rawMail);
    }

    /**
     * 格式化邮件地址
     * @param {Object} address - 地址对象
     * @returns {string} 格式化的地址
     */
    formatAddress(address) {
        if (typeof address === 'string') {
            return address;
        }
        
        if (address.name) {
            return `"${address.name}" <${address.address}>`;
        }
        
        return address.address;
    }

    /**
     * 生成消息ID
     * @returns {string} 消息ID
     */
    generateMessageId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `${timestamp}.${random}@${this.config.domain}`;
    }

    /**
     * 生成边界字符串
     * @returns {string} 边界字符串
     */
    generateBoundary() {
        return `----=_Part_${crypto.randomBytes(16).toString('hex')}`;
    }

    /**
     * RFC 2047编码（用于邮件头中的非ASCII字符）
     * @param {string} str - 要编码的字符串
     * @returns {string} 编码后的字符串
     */
    encodeRFC2047(str) {
        // 检查是否包含非ASCII字符
        if (!/[^\x00-\x7F]/.test(str)) {
            return str; // 如果只包含ASCII字符，直接返回
        }
        
        // 使用UTF-8编码并进行Base64编码
        const encoded = Buffer.from(str, 'utf8').toString('base64');
        return `=?UTF-8?B?${encoded}?=`;
    }

    /**
     * 获取邮件列表
     * @param {string} userId - 用户ID
     * @param {string} folder - 文件夹（reception/send）
     * @returns {Promise<Array>} 邮件列表
     */
    async getMailList(userId, folder = 'reception') {
        const userDir = path.join(this.storageDir, userId, folder);
        
        try {
            const files = await fs.readdir(userDir);
            const mails = [];
            
            for (const file of files) {
                if (file.endsWith('.eml')) {
                    const filePath = path.join(userDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const parsedMail = await this.parser.parseEmail(content);
                    
                    mails.push({
                        filename: file,
                        from: parsedMail.from,
                        to: parsedMail.to,
                        subject: parsedMail.subject,
                        date: parsedMail.date,
                        hasAttachments: parsedMail.attachments && parsedMail.attachments.length > 0
                    });
                }
            }
            
            return mails.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (error) {
            console.error('获取邮件列表失败:', error);
            return [];
        }
    }

    /**
     * 获取邮件详情
     * @param {string} userId - 用户ID
     * @param {string} filename - 文件名
     * @param {string} folder - 文件夹
     * @returns {Promise<Object>} 邮件详情
     */
    async getMailDetail(userId, filename, folder = 'reception') {
        const filePath = path.join(this.storageDir, userId, folder, filename);
        
        try {
            const content = await fs.readFile(filePath, 'utf8');
            return await this.parser.parseEmail(content);
        } catch (error) {
            console.error('获取邮件详情失败:', error);
            throw error;
        }
    }

    /**
     * 存储接收到的邮件
     * @param {string} rawMail - 原始邮件内容
     * @param {string} recipient - 收件人
     */
    async storeReceivedMail(rawMail, recipient) {
        try {
            await this.deliverLocally(rawMail, { address: recipient });
        } catch (error) {
            console.error('存储接收邮件失败:', error);
            throw error;
        }
    }


}

// 创建单例实例
const smtpSender = new SMTPSender();

module.exports = {
    SMTPSender,
    sendMail: (mailData) => smtpSender.sendMail(mailData),
    storeReceivedMail: (rawMail, recipient) => smtpSender.storeReceivedMail(rawMail, recipient),
    getMailList: (userId, folder) => smtpSender.getMailList(userId, folder),
    getMailDetail: (userId, filename, folder) => smtpSender.getMailDetail(userId, filename, folder)
};