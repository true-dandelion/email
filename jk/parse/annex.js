const { simpleParser } = require('mailparser');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * 附件解析和组装模块
 * 提供附件提取、处理、下载等功能
 */
class AttachmentParser {
    constructor() {
        this.supportedMimeTypes = {
            // 文档类型
            'application/pdf': '.pdf',
            'application/msword': '.doc',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.ms-excel': '.xls',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
            'application/vnd.ms-powerpoint': '.ppt',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
            
            // 压缩文件
            'application/zip': '.zip',
            'application/x-rar-compressed': '.rar',
            'application/x-7z-compressed': '.7z',
            'application/x-tar': '.tar',
            'application/gzip': '.gz',
            
            // 图片类型
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/gif': '.gif',
            'image/bmp': '.bmp',
            'image/svg+xml': '.svg',
            'image/x-icon': '.ico',
            
            // 音频视频
            'audio/mpeg': '.mp3',
            'audio/wav': '.wav',
            'video/mp4': '.mp4',
            'video/x-msvideo': '.avi',
            'video/quicktime': '.mov',
            
            // 文本类型
            'text/plain': '.txt',
            'text/html': '.html',
            'text/css': '.css',
            'application/javascript': '.js',
            'application/json': '.json'
        };
    }

    /**
     * 从邮件内容中解析所有附件
     * @param {string|Buffer} rawMail - 原始邮件数据
     * @returns {Promise<Object>} 解析结果
     */
    async parseAttachmentsFromMail(rawMail) {
        try {
            const parsed = await simpleParser(rawMail);
            const attachments = [];
            
            if (parsed.attachments && parsed.attachments.length > 0) {
                for (const attachment of parsed.attachments) {
                    const processedAttachment = await this.processAttachment(attachment);
                    if (processedAttachment) {
                        attachments.push(processedAttachment);
                    }
                }
            }
            
            return {
                success: true,
                attachments,
                count: attachments.length
            };
        } catch (error) {
            console.error('解析邮件附件失败:', error);
            return {
                success: false,
                error: error.message,
                attachments: [],
                count: 0
            };
        }
    }

    /**
     * 处理单个附件
     * @param {Object} attachment - 原始附件对象
     * @returns {Object} 处理后的附件对象
     */
    async processAttachment(attachment) {
        try {
            const filename = this.sanitizeFilename(attachment.filename || 'unnamed');
            const contentType = attachment.contentType || 'application/octet-stream';
            const size = attachment.size || (attachment.content ? attachment.content.length : 0);
            
            // 生成附件唯一标识
            const attachmentId = this.generateAttachmentId(filename, contentType, size);
            
            return {
                id: attachmentId,
                filename: filename,
                originalFilename: attachment.filename,
                contentType: contentType,
                size: size,
                content: attachment.content,
                contentId: attachment.contentId,
                disposition: attachment.contentDisposition || 'attachment',
                encoding: attachment.encoding || 'base64',
                checksum: this.calculateChecksum(attachment.content)
            };
        } catch (error) {
            console.error('处理附件失败:', error);
            return null;
        }
    }

    /**
     * 根据附件名称从邮件中查找特定附件
     * @param {string|Buffer} rawMail - 原始邮件数据
     * @param {string} attachmentName - 附件名称
     * @returns {Promise<Object>} 附件数据
     */
    async findAttachmentByName(rawMail, attachmentName) {
        try {
            const parseResult = await this.parseAttachmentsFromMail(rawMail);
            
            if (!parseResult.success) {
                return {
                    success: false,
                    error: parseResult.error
                };
            }
            
            // 解码附件名称（处理URL编码）
            const decodedName = decodeURIComponent(attachmentName);
            
            // 多种匹配方式
            const attachment = parseResult.attachments.find(att => {
                return att.filename === attachmentName ||
                       att.filename === decodedName ||
                       att.originalFilename === attachmentName ||
                       att.originalFilename === decodedName ||
                       this.normalizeFilename(att.filename) === this.normalizeFilename(attachmentName) ||
                       this.normalizeFilename(att.filename) === this.normalizeFilename(decodedName);
            });
            
            if (!attachment) {
                return {
                    success: false,
                    error: `附件 "${attachmentName}" 未找到`,
                    availableAttachments: parseResult.attachments.map(att => att.filename)
                };
            }
            
            return {
                success: true,
                attachment: attachment
            };
        } catch (error) {
            console.error('查找附件失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 准备附件下载数据
     * @param {Object} attachment - 附件对象
     * @returns {Object} 下载数据
     */
    prepareAttachmentForDownload(attachment) {
        try {
            if (!attachment || !attachment.content) {
                throw new Error('附件内容为空');
            }
            
            const safeFilename = this.sanitizeFilename(attachment.filename);
            const contentType = this.getContentTypeByFilename(safeFilename) || attachment.contentType;
            
            return {
                success: true,
                filename: safeFilename,
                originalFilename: attachment.originalFilename || attachment.filename,
                contentType: contentType,
                content: attachment.content,
                size: attachment.size,
                headers: {
                    'Content-Type': contentType,
                    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
                    'Content-Length': attachment.size,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            };
        } catch (error) {
            console.error('准备附件下载失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 安全化文件名
     * @param {string} filename - 原始文件名
     * @returns {string} 安全的文件名
     */
    sanitizeFilename(filename) {
        if (!filename) return 'unnamed';
        
        // 移除或替换危险字符，保留中文字符
        return filename
            .replace(/[<>:"/\\|?*]/g, '_')  // 替换Windows不允许的字符
            .replace(/\.\.+/g, '.')         // 防止路径遍历
            .replace(/^\.|\.$/, '')         // 移除开头和结尾的点
            .substring(0, 255);             // 限制长度
    }

    /**
     * 标准化文件名（用于比较）
     * @param {string} filename - 文件名
     * @returns {string} 标准化后的文件名
     */
    normalizeFilename(filename) {
        return filename.toLowerCase().trim();
    }

    /**
     * 根据文件名获取MIME类型
     * @param {string} filename - 文件名
     * @returns {string} MIME类型
     */
    getContentTypeByFilename(filename) {
        const ext = path.extname(filename).toLowerCase();
        
        // 查找对应的MIME类型
        for (const [mimeType, extension] of Object.entries(this.supportedMimeTypes)) {
            if (extension === ext) {
                return mimeType;
            }
        }
        
        return 'application/octet-stream';
    }

    /**
     * 生成附件唯一标识
     * @param {string} filename - 文件名
     * @param {string} contentType - 内容类型
     * @param {number} size - 文件大小
     * @returns {string} 唯一标识
     */
    generateAttachmentId(filename, contentType, size) {
        const data = `${filename}-${contentType}-${size}-${Date.now()}`;
        return crypto.createHash('md5').update(data).digest('hex');
    }

    /**
     * 计算文件校验和
     * @param {Buffer} content - 文件内容
     * @returns {string} 校验和
     */
    calculateChecksum(content) {
        if (!content) return '';
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 验证附件安全性
     * @param {Object} attachment - 附件对象
     * @returns {Object} 验证结果
     */
    validateAttachmentSecurity(attachment) {
        const warnings = [];
        const errors = [];
        
        // 检查文件扩展名
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar'];
        const ext = path.extname(attachment.filename).toLowerCase();
        
        if (dangerousExtensions.includes(ext)) {
            warnings.push(`潜在危险的文件类型: ${ext}`);
        }
        
        // 检查文件大小
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (attachment.size > maxSize) {
            warnings.push(`文件过大: ${(attachment.size / 1024 / 1024).toFixed(2)}MB`);
        }
        
        // 检查文件名
        if (attachment.filename.length > 255) {
            errors.push('文件名过长');
        }
        
        return {
            isSafe: errors.length === 0,
            warnings,
            errors
        };
    }

    /**
     * 获取附件信息摘要
     * @param {string|Buffer} rawMail - 原始邮件数据
     * @returns {Promise<Object>} 附件摘要信息
     */
    async getAttachmentsSummary(rawMail) {
        try {
            const parseResult = await this.parseAttachmentsFromMail(rawMail);
            
            if (!parseResult.success) {
                return parseResult;
            }
            
            const summary = {
                count: parseResult.count,
                totalSize: 0,
                attachments: []
            };
            
            for (const attachment of parseResult.attachments) {
                summary.totalSize += attachment.size;
                summary.attachments.push({
                    filename: attachment.filename,
                    contentType: attachment.contentType,
                    size: attachment.size,
                    id: attachment.id
                });
            }
            
            return {
                success: true,
                summary
            };
        } catch (error) {
            console.error('获取附件摘要失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

/**
 * 附件工具函数
 */
class AttachmentUtils {
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 检查是否为图片文件
     * @param {string} contentType - MIME类型
     * @returns {boolean} 是否为图片
     */
    static isImageFile(contentType) {
        return contentType && contentType.startsWith('image/');
    }
    
    /**
     * 检查是否为文档文件
     * @param {string} contentType - MIME类型
     * @returns {boolean} 是否为文档
     */
    static isDocumentFile(contentType) {
        const documentTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ];
        
        return documentTypes.includes(contentType);
    }
    
    /**
     * 获取文件图标类型
     * @param {string} contentType - MIME类型
     * @param {string} filename - 文件名
     * @returns {string} 图标类型
     */
    static getFileIconType(contentType, filename) {
        if (this.isImageFile(contentType)) return 'image';
        if (this.isDocumentFile(contentType)) return 'document';
        if (contentType && contentType.startsWith('audio/')) return 'audio';
        if (contentType && contentType.startsWith('video/')) return 'video';
        if (contentType && contentType.includes('zip')) return 'archive';
        
        const ext = path.extname(filename).toLowerCase();
        if (['.txt', '.log'].includes(ext)) return 'text';
        if (['.html', '.css', '.js'].includes(ext)) return 'code';
        
        return 'file';
    }
}

module.exports = {
    AttachmentParser,
    AttachmentUtils,
    createAttachmentParser: () => new AttachmentParser()
};