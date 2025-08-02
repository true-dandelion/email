const express = require('express');
const a = express.Router();
const { authMiddleware } = require('../middleware/middleware');
const { sendMail, storeReceivedMail, getMailList, getMailDetail } = require('../smtp/smtp');
const fs = require('fs').promises;
const path = require('path');
const { simpleParser } = require('mailparser');

// SSE连接管理器
class SSEManager {
    constructor() {
        this.connections = new Map();
    }
    
    addConnection(userId, res) {
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId).add(res);
        
        // 当连接关闭时清理
        res.on('close', () => {
            this.removeConnection(userId, res);
        });

    }
    
    removeConnection(userId, res) {
        if (this.connections.has(userId)) {
            this.connections.get(userId).delete(res);
            if (this.connections.get(userId).size === 0) {
                this.connections.delete(userId);
            }
        }
    }
    
    sendToUser(userId, data) {
        if (this.connections.has(userId)) {
            const userConnections = this.connections.get(userId);
            userConnections.forEach(res => {
                try {
                    res.write(`data: ${JSON.stringify(data)}\n\n`);
                } catch (error) {
                    console.error('发送SSE消息失败:', error);
                    this.removeConnection(userId, res);
                }
            });
        }
    }
}

const sseManager = new SSEManager();

// 根据文件扩展名获取MIME类型
function getContentType(extension) {
  const mimeTypes = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv'
  };
  
  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

// 从邮件内容中解析附件信息
function parseAttachmentsFromMail(mailContent) {
  const attachments = [];
  const attachmentRegex = /Content-Disposition:\s*attachment;\s*filename="?([^"\r\n]+)"?[\s\S]*?Content-Type:\s*([^\r\n]+)/gi;
  
  let match;
  while ((match = attachmentRegex.exec(mailContent)) !== null) {
    const filename = match[1].trim();
    const contentType = match[2].trim();
    
    attachments.push({
      filename,
      contentType,
      size: 0 // 这里可以根据需要计算实际大小
    });
  }
  
  return attachments;
}

// 从邮件内容中提取指定附件
function extractAttachmentFromMail(mailContent, filename) {
  // 构建正则表达式来匹配指定附件
  const attachmentRegex = new RegExp(
    `Content-Disposition:\\s*attachment;\\s*filename="?${filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?[\\s\\S]*?Content-Type:\\s*([^\\r\\n]+)[\\s\\S]*?Content-Transfer-Encoding:\\s*base64[\\s\\S]*?\\r\\n\\r\\n([A-Za-z0-9+\/=\\r\\n]+?)(?=\\r\\n--)`,
    'i'
  );
  
  const match = mailContent.match(attachmentRegex);
  
  if (match) {
    const contentType = match[1].trim();
    const base64Content = match[2].replace(/\r\n/g, '');
    const content = Buffer.from(base64Content, 'base64');
    
    return {
      filename,
      contentType,
      content
    };
  }
  
  return null;
}

a.post('/send', authMiddleware, async(req, res) => {
    try {
        const { to, subject, content, annex, annexname } = req.body;
        const cc = req.body.cc || [];
        const bcc = req.body.bcc || [];

        // 验证必要参数
        if (!to || !subject || !content) {
            return res.status(400).json({
                success: false,
                message: '收件人、主题和内容为必填项'
            });
        }

        // 验证用户登录状态
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 获取当前用户信息作为发件人
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }

        // 验证附件名称
        if (annex && !annexname) {
            return res.status(400).json({
                success: false,
                message: '有附件时必须提供附件名称'
            });
        }

        // 处理收件人格式 - 确保是数组格式
        const toArray = Array.isArray(to) ? to : [to];
        const ccArray = Array.isArray(cc) ? cc : (cc ? [cc] : []);
        const bccArray = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

        // 构建邮件选项
        const mailOptions = {
            from: {
                name: currentUser.username || currentUser.name,
                address: currentUser.email
            },
            to: toArray.map(addr => typeof addr === 'string' ? { address: addr } : addr),
            subject: subject,
            text: content,
            cc: ccArray.map(addr => typeof addr === 'string' ? { address: addr } : addr),
            bcc: bccArray.map(addr => typeof addr === 'string' ? { address: addr } : addr)
        };

        // 如果有附件，添加到邮件选项中
        if (annex && annexname) {
            // 处理附件内容 - 如果是base64字符串，转换为Buffer
            let attachmentContent;
            if (typeof annex === 'string') {
                // 假设是base64编码的字符串
                attachmentContent = Buffer.from(annex, 'base64');
            } else {
                attachmentContent = annex;
            }
            
            // 根据文件扩展名确定Content-Type
            const extension = path.extname(annexname).toLowerCase();
            const contentType = getContentType(extension);
            
            mailOptions.attachments = [{
                filename: annexname,
                content: attachmentContent,
                contentType: contentType
            }];
        }

        // 发送邮件
        const result = await sendMail(mailOptions);

        res.json({
            success: true,
            message: '邮件发送成功',
            data: result
        });

    } catch (error) {
        console.error('发送邮件失败:', error);
        res.status(500).json({
            success: false,
            message: '发送邮件失败',
            error: error.message
        });
    }
});


// 获取当前用户收到的邮件列表
a.get('/Receive', authMiddleware, async (req, res) => {
    try {
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 直接读取用户收件箱目录下的邮件文件
        const receptionDir = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception');
        
        let processedMails = [];
        
        if (fs.existsSync(receptionDir)) {
            const files = fs.readdirSync(receptionDir)
                .filter(fileName => {
                    // 过滤掉state.json文件
                    return !fileName.includes('state.json');
                })
                .sort((a, b) => {
                    // 按时间戳排序，最新的在前
                    const timeA = parseInt(a.split('_')[0]);
                    const timeB = parseInt(b.split('_')[0]);
                    return timeB - timeA;
                });
            
            processedMails = await Promise.all(files.map(async fileName => {
                try {
                    const filePath = path.join(receptionDir, fileName);
                    const mailContent = fs.readFileSync(filePath, 'utf8');
                    
                    // 从文件名中提取时间戳和id，不传递后缀
                    const fileNameParts = fileName.split('_');
                    const timestamp = fileNameParts[0];
                    const id = fileNameParts[1] ? fileNameParts[1].split('.')[0] : ''; // 去掉后缀
                    
                    // 使用MailParser解析邮件内容
                    const { MailParser } = require('../parse/parse.js');
                    const parser = new MailParser();
                    const parsedMail = await parser.parseEmail(mailContent);
                    
                    if (parsedMail.isValid) {
                        return {
                            from: parsedMail.from ? `${parsedMail.from.name ? parsedMail.from.name + ' ' : ''}<${parsedMail.from.address}>` : '',
                            subject: parsedMail.subject || '',
                            timestamp: timestamp,
                            id: id
                        };
                    } else {
                        // 如果解析失败，回退到简单的正则表达式解析
                        const fromMatch = mailContent.match(/^From:\s*(.+)$/m);
                        const subjectMatch = mailContent.match(/^Subject:\s*(.+)$/m);
                        
                        return {
                            from: fromMatch ? fromMatch[1] : '',
                            subject: subjectMatch ? subjectMatch[1] : '',
                            timestamp: timestamp,
                            id: id
                        };
                    }
                } catch (error) {
                    console.warn(`读取邮件文件失败: ${fileName}, 错误: ${error.message}`);
                    const fileNameParts = fileName.split('_');
                    const timestamp = fileNameParts[0] || '';
                    const id = fileNameParts[1] ? fileNameParts[1].split('.')[0] : '';
                    
                    return {
                        from: '',
                        subject: '',
                        timestamp: timestamp,
                        id: id,
                        fileName: fileName
                    };
                }
            }));
        }
        
        res.json({
            success: true,
            data: {
                totalCount: processedMails.length,
                mails: processedMails
            }
        });
        
    } catch (error) {
        console.error('获取收件箱邮件失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


// 获取单个邮件详细内容
a.get('/Receive/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const { MailParser } = require('../parse/parse.js');
        
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 构建邮件文件路径
        const receptionDir = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception');
        
        if (!fs.existsSync(receptionDir)) {
            return res.status(404).json({
                success: false,
                message: '收件箱目录不存在'
            });
        }
        
        // 解析传入的参数（格式：时间戳_文件id）
        const idParts = id.split('_');
        if (idParts.length !== 2) {
            return res.status(400).json({
                success: false,
                message: '邮件ID无效'
            });
        }
        
        const timestamp = idParts[0];
        const fileId = idParts[1];
        
        // 查找匹配的邮件文件（需要加上后缀）
        const files = fs.readdirSync(receptionDir);
        const targetFile = files.find(fileName => {
            // 文件名格式：时间戳_文件id.后缀
            return fileName.startsWith(`${timestamp}_${fileId}.`);
        });
        
        if (!targetFile) {
            return res.status(404).json({
                success: false,
                message: '邮件不存在'
            });
        }
        
        // 读取邮件文件内容
        const filePath = path.join(receptionDir, targetFile);
        const mailContent = fs.readFileSync(filePath, 'utf8');
        
        // 使用邮件解析器解析邮件内容
        const parser = new MailParser();
        const parsedMail = await parser.parseEmail(mailContent);
        
        if (!parsedMail.isValid) {
            return res.status(500).json({
                success: false,
                message: '邮件解析失败',
                errors: parsedMail.errors
            });
        }
        
        // 返回解析后的邮件详细内容
        res.json({
            success: true,
            data: {
                id: id,
                messageId: parsedMail.messageId,
                from: parsedMail.from,
                to: parsedMail.to,
                cc: parsedMail.cc,
                bcc: parsedMail.bcc,
                subject: parsedMail.subject,
                date: parsedMail.date,
                text: parsedMail.text,
                html: parsedMail.html,
                attachments: parsedMail.attachments,
                priority: parsedMail.priority
            }
        });
        
    } catch (error) {
        console.error('获取邮件详细内容失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});




// SSE接口 - 用于推送新邮件通知
a.get('/sse/notifications', authMiddleware, (req, res) => {
    try {
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }

        // 设置SSE响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // 发送初始连接确认
        res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE连接已建立' })}\n\n`);
        
        // 添加到连接管理器
        sseManager.addConnection(currentUser.id, res);
        
        // 定期发送心跳
        const heartbeat = setInterval(() => {
            try {
                res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
            } catch (error) {
                clearInterval(heartbeat);
                sseManager.removeConnection(currentUser.id, res);
            }
        }, 30000);

        // 连接关闭时清理
        res.on('close', () => {
            clearInterval(heartbeat);
            sseManager.removeConnection(currentUser.id, res);
        });

    } catch (error) {
        console.error('SSE连接建立失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 获取邮件状态接口
a.get('/state', authMiddleware, async (req, res) => {
    try {
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 构建state.json文件路径
        const stateFilePath = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception', 'state.json');
        
        // 检查state.json文件是否存在
        if (!fs.existsSync(stateFilePath)) {
            return res.json({
                success: true,
                data: {}
            });
        }
        
        // 读取state.json文件内容
        const stateContent = fs.readFileSync(stateFilePath, 'utf8');
        const stateData = JSON.parse(stateContent);
        
        // 处理邮件ID，去除后缀
        const processedStateData = {};
        for (const [mailId, stateInfo] of Object.entries(stateData)) {
            // 去除文件后缀（如.eml）
            const cleanMailId = mailId.replace(/\.[^.]+$/, '');
            processedStateData[cleanMailId] = stateInfo;
        }
        
        res.json({
            success: true,
            data: processedStateData
        });
        
    } catch (error) {
        console.error('获取邮件状态失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 更新邮件状态接口
a.put('/state', authMiddleware, async (req, res) => {
    try {
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 验证请求参数
        const { mailId, pinned, marked, read } = req.body;
        if (!mailId) {
            return res.status(400).json({
                success: false,
                message: '邮件ID为必填项'
            });
        }
        
        // 在mailId后添加后缀
        const mailIdWithSuffix = mailId + '.eml';
        
        // 构建state.json文件路径
        const stateFilePath = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception', 'state.json');
        
        // 读取现有的state数据，如果文件不存在则创建空对象
        let stateData = {};
        if (fs.existsSync(stateFilePath)) {
            const stateContent = fs.readFileSync(stateFilePath, 'utf8');
            stateData = JSON.parse(stateContent);
        }
        
        // 检查邮件ID是否存在（使用带后缀的ID）
        if (!stateData[mailIdWithSuffix]) {
            return res.status(404).json({
                success: false,
                message: '邮件ID不存在'
            });
        }
        
        // 更新状态（只更新提供的字段）
        if (typeof pinned === 'boolean') {
            stateData[mailIdWithSuffix].pinned = pinned;
        }
        if (typeof marked === 'boolean') {
            stateData[mailIdWithSuffix].marked = marked;
        }
        if (typeof read === 'boolean') {
            stateData[mailIdWithSuffix].read = read;
        }
        
        // 确保目录存在
        const receptionDir = path.dirname(stateFilePath);
        if (!fs.existsSync(receptionDir)) {
            fs.mkdirSync(receptionDir, { recursive: true });
        }
        
        // 写入更新后的状态到文件
        fs.writeFileSync(stateFilePath, JSON.stringify(stateData, null, 2), 'utf8');
        
        res.json({
            success: true,
            message: '邮件状态更新成功',
            data: stateData[mailIdWithSuffix]
        });
        
    } catch (error) {
        console.error('更新邮件状态失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// 下载邮件附件接口
a.get('/Receive/:id/attachment/:attachmentName', authMiddleware, async (req, res) => {
    try {
        const { id, attachmentName } = req.params;
        
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const { AttachmentParser } = require('../parse/annex.js');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 解析邮件ID（格式：时间戳_文件id）
        const idParts = id.split('_');
        if (idParts.length !== 2) {
            return res.status(400).json({
                success: false,
                message: '邮件ID格式无效'
            });
        }
        
        const timestamp = idParts[0];
        const fileId = idParts[1];
        
        // 构建邮件文件路径
        const receptionDir = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception');
        
        if (!fs.existsSync(receptionDir)) {
            return res.status(404).json({
                success: false,
                message: '收件箱目录不存在'
            });
        }
        
        // 查找匹配的邮件文件（需要加上后缀）
        const files = fs.readdirSync(receptionDir);
        const targetFile = files.find(fileName => {
            // 文件名格式：时间戳_文件id.后缀
            return fileName.startsWith(`${timestamp}_${fileId}.`);
        });
        
        if (!targetFile) {
            return res.status(404).json({
                success: false,
                message: '邮件文件不存在'
            });
        }
        
        const mailFilePath = path.join(receptionDir, targetFile);
        
        // 安全性检查：确保文件路径在预期目录内
        const resolvedPath = path.resolve(mailFilePath);
        const resolvedDir = path.resolve(receptionDir);
        if (!resolvedPath.startsWith(resolvedDir)) {
            return res.status(403).json({
                success: false,
                message: '访问被拒绝'
            });
        }
        
        // 读取邮件内容
        const mailContent = fs.readFileSync(mailFilePath, 'utf8');
        
        // 使用AttachmentParser查找附件
        const attachmentParser = new AttachmentParser();
        const findResult = await attachmentParser.findAttachmentByName(mailContent, attachmentName);
        
        if (!findResult.success) {
            return res.status(404).json({
                success: false,
                message: findResult.error,
                availableAttachments: findResult.availableAttachments || []
            });
        }
        
        // 准备附件下载数据
        const downloadData = attachmentParser.prepareAttachmentForDownload(findResult.attachment);
        
        if (!downloadData.success) {
            return res.status(500).json({
                success: false,
                message: downloadData.error
            });
        }
        
        // 验证附件安全性
        const securityCheck = attachmentParser.validateAttachmentSecurity(findResult.attachment);
        if (!securityCheck.isSafe) {
            console.warn('附件安全警告:', securityCheck.errors);
        }
        
        // 设置响应头
        Object.entries(downloadData.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });
        
        // 发送附件内容
        res.send(downloadData.content);
        
    } catch (error) {
        console.error('下载附件失败:', error.message);
        console.error('错误堆栈:', error.stack);
        res.status(500).json({
            success: false,
            message: '下载附件失败',
            error: error.message
        });
    }
});

// 删除邮件接口
a.delete('/Receive/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const fs = require('fs');
        const path = require('path');
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u => 
            u.username === req.user.username || 
            u.id === req.user.id || 
            u.email === req.user.email
        );
        
        if (!currentUser) {
            return res.status(400).json({
                success: false,
                message: '无法获取用户信息'
            });
        }
        
        // 解析传入的参数（格式：时间戳_文件id）
        const idParts = id.split('_');
        if (idParts.length !== 2) {
            return res.status(400).json({
                success: false,
                message: '邮件ID格式无效'
            });
        }
        
        const timestamp = idParts[0];
        const fileId = idParts[1];
        
        // 构建邮件文件路径
        const receptionDir = path.join(__dirname, '../../storage', currentUser.id.toString(), 'reception');
        
        if (!fs.existsSync(receptionDir)) {
            return res.status(404).json({
                success: false,
                message: '收件箱目录不存在'
            });
        }
        
        // 查找匹配的邮件文件（需要加上后缀）
        const files = fs.readdirSync(receptionDir);
        const targetFile = files.find(fileName => {
            // 文件名格式：时间戳_文件id.后缀
            return fileName.startsWith(`${timestamp}_${fileId}.`);
        });
        
        if (!targetFile) {
            return res.status(404).json({
                success: false,
                message: '邮件不存在'
            });
        }
        
        // 删除邮件文件
        const mailFilePath = path.join(receptionDir, targetFile);
        fs.unlinkSync(mailFilePath);
        
        // 更新state.json文件，删除对应的状态记录
        const stateFilePath = path.join(receptionDir, 'state.json');
        if (fs.existsSync(stateFilePath)) {
            const stateContent = fs.readFileSync(stateFilePath, 'utf8');
            const stateData = JSON.parse(stateContent);
            
            // 删除对应的状态记录（使用带后缀的文件名作为key）
            if (stateData[targetFile]) {
                delete stateData[targetFile];
                
                // 写回更新后的状态文件
                fs.writeFileSync(stateFilePath, JSON.stringify(stateData, null, 2), 'utf8');
            }
        }
        
        res.json({
            success: true,
            message: '邮件删除成功',
            data: {
                deletedMailId: id,
            }
        });
        
    } catch (error) {
        console.error('删除邮件失败:', error.message);
        res.status(500).json({
            success: false,
            message: '删除邮件失败',
            error: error.message
        });
    }
});

module.exports = a;
module.exports.sseManager = sseManager;
