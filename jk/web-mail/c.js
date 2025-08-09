const express = require('express');
const c = express.Router();
const { authMiddleware } = require('../middleware/middleware');
const fs = require('fs').promises;
const path = require('path');
const { getAllSendStatus } = require('../Inquire/Inquire');


c.get('/sent', authMiddleware, async (req, res) => {
    try {
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            return res.status(401).json({
                success: false,
                message: '用户未登录或用户信息无效'
            });
        }

        // 从用户数据中获取用户信息
        const usersData = JSON.parse(await fs.readFile(path.join(__dirname, '../../user/user.json'), 'utf8'));
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
        
        // 读取用户发送文件夹目录下的邮件文件
        const sendDir = path.join(__dirname, '../../storage', currentUser.id.toString(), 'send');
        
        let processedMails = [];
        
        if (await fs.access(sendDir).then(() => true).catch(() => false)) {
            const files = (await fs.readdir(sendDir))
                .filter(fileName => {
                    // 过滤掉state.json和qustat.json文件
                    return !fileName.includes('qustat.json');
                })
                .sort((a, b) => {
                    // 按时间戳排序，最新的在前
                    const timeA = parseInt(a.split('_')[0]);
                    const timeB = parseInt(b.split('_')[0]);
                    return timeB - timeA;
                });
            
            processedMails = await Promise.all(files.map(async fileName => {
                try {
                    const filePath = path.join(sendDir, fileName);
                    const mailContent = await fs.readFile(filePath, 'utf8');
                    
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
                            to: parsedMail.to ? parsedMail.to.map(addr => `${addr.name ? addr.name + ' ' : ''}<${addr.address}>`).join(', ') : '',
                            subject: parsedMail.subject || '',
                            timestamp: timestamp,
                            id: id
                        };
                    } else {
                        // 如果解析失败，回退到简单的正则表达式解析
                        const toMatch = mailContent.match(/^To:\s*(.+)$/m);
                        const subjectMatch = mailContent.match(/^Subject:\s*(.+)$/m);
                        
                        return {
                            to: toMatch ? toMatch[1] : '',
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
                        to: '',
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
        console.error('获取发送邮件失败:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
})


// 获取单个邮件详细内容
c.get('/examdeta/:id', authMiddleware, async (req, res) => {
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
        const usersData = JSON.parse(await fs.readFile(path.join(__dirname, '../../user/user.json'), 'utf8'));
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

        const userId = currentUser.id.toString();
        
        // 构建邮件文件路径
        const sendDir = path.join(__dirname, '../../storage', userId, 'send');
        
        if (!await fs.access(sendDir).then(() => true).catch(() => false)) {
            return res.status(404).json({
                success: false,
                message: '发送目录不存在'
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
        const files = await fs.readdir(sendDir);
        const targetFile = files.find(fileName => {
            // 文件名格式：时间戳_文件_id.后缀
            return fileName.startsWith(`${timestamp}_${fileId}.`);
        });
        
        if (!targetFile) {
            return res.status(404).json({
                success: false,
                message: '邮件不存在'
            });
        }
        
        // 读取邮件文件内容
        const filePath = path.join(sendDir, targetFile);
        const mailContent = await fs.readFile(filePath, 'utf8');
        
        // 使用邮件解析器解析邮件内容
        const { MailParser } = require('../parse/parse.js');
        const parser = new MailParser();
        const parsedMail = await parser.parseEmail(mailContent);
        
        if (!parsedMail.isValid) {
            return res.status(500).json({
                success: false,
                message: '邮件解析失败',
                errors: parsedMail.errors
            });
        }
        
        // 读取发送状态文件
        const statusFilePath = path.join(sendDir, 'qustat.json');
        let sendStatus = null;
        
        try {
            const statusData = JSON.parse(await fs.readFile(statusFilePath, 'utf8'));
            sendStatus = statusData[targetFile] || statusData[targetFile.replace('.eml', '')];
        } catch (error) {
            // 如果状态文件不存在或读取失败，状态为null
            console.warn('读取发送状态文件失败:', error.message);
        }
        
        // 返回解析后的邮件详细内容，包含发送状态
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
                priority: parsedMail.priority,
                sendStatus: sendStatus || {
                    state: 'pending',
                    recipient: parsedMail.to ? parsedMail.to.map(addr => addr.address).join(', ') : '',
                    timestamp: parseInt(timestamp),
                    reason: null
                }
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


// SSE接口：实时推送邮件发送状态
c.get('/examsent/:id', authMiddleware, async (req, res) => {
    try {
        // 设置SSE响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // 获取当前登录用户信息
        if (!req.user || (!req.user.username && !req.user.id && !req.user.email)) {
            res.write(`data: ${JSON.stringify({ error: '用户未登录或用户信息无效' })}\n\n`);
            res.end();
            return;
        }

        // 从用户数据中获取用户信息
        const usersData = JSON.parse(await fs.readFile(path.join(__dirname, '../../user/user.json'), 'utf8'));
        const currentUser = usersData.find(u =>
            u.username === req.user.username ||
            u.id === req.user.id ||
            u.email === req.user.email
        );
        
        if (!currentUser) {
            res.write(`data: ${JSON.stringify({ error: '无法获取用户信息' })}\n\n`);
            res.end();
            return;
        }

        const userId = currentUser.id.toString();
        const fileId = req.params.id;
        
        // 构建完整的文件名
        const sendDir = path.join(__dirname, '../../storage', userId, 'send');
        
        // 查找对应的邮件文件
        let targetFilename = null;
        try {
            const files = await fs.readdir(sendDir);
            targetFilename = files.find(file => 
                file.startsWith(fileId) || 
                file.replace('.eml', '') === fileId
            );
        } catch (error) {
            res.write(`data: ${JSON.stringify({ error: '无法读取发送目录' })}\n\n`);
            res.end();
            return;
        }

        if (!targetFilename) {
            res.write(`data: ${JSON.stringify({ error: '未找到指定的邮件文件' })}\n\n`);
            res.end();
            return;
        }

        // 发送初始状态
        const sendStatus = await getAllSendStatus(userId);
        const currentStatus = sendStatus.find(item => item.filename === targetFilename);
        
        if (currentStatus) {
            res.write(`data: ${JSON.stringify({ 
                filename: targetFilename,
                status: currentStatus.state,
                recipient: currentStatus.recipient,
                timestamp: currentStatus.timestamp,
                reason: currentStatus.reason || null
            })}\n\n`);
            
            // 如果状态已经是完成状态，立即关闭连接
            if (currentStatus.state === 'success' || currentStatus.state === 'failed') {
                res.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
                res.end();
                return;
            }
        } else {
            res.write(`data: ${JSON.stringify({ 
                filename: targetFilename,
                status: 'pending',
                message: '等待发送状态更新'
            })}\n\n`);
        }

        // 定期轮询状态变化
        const checkInterval = setInterval(async () => {
            try {
                const updatedStatus = await getAllSendStatus(userId);
                const newStatus = updatedStatus.find(item => item.filename === targetFilename);
                
                if (newStatus) {
                    res.write(`data: ${JSON.stringify({ 
                        filename: targetFilename,
                        status: newStatus.state,
                        recipient: newStatus.recipient,
                        timestamp: newStatus.timestamp,
                        reason: newStatus.reason || null
                    })}\n\n`);
                    
                    // 如果状态变为完成状态，发送完成信号并关闭连接
                    if (newStatus.state === 'success' || newStatus.state === 'failed') {
                        res.write(`data: ${JSON.stringify({ complete: true })}\n\n`);
                        clearInterval(checkInterval);
                        res.end();
                    }
                }
            } catch (error) {
                res.write(`data: ${JSON.stringify({ error: '检查状态失败: ' + error.message })}\n\n`);
                clearInterval(checkInterval);
                res.end();
            }
        }, 1000); // 每秒检查一次

        // 客户端断开连接时的清理
        req.on('close', () => {
            clearInterval(checkInterval);
            res.end();
        });

        // 设置超时时间（5分钟）
        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            res.write(`data: ${JSON.stringify({ error: '连接超时' })}\n\n`);
            res.end();
        }, 300000);

        // 清理超时
        req.on('close', () => {
            clearTimeout(timeout);
        });

    } catch (error) {
        console.error('SSE连接错误:', error.message);
        res.write(`data: ${JSON.stringify({ error: '服务器错误: ' + error.message })}\n\n`);
        res.end();
    }
});

module.exports = c;

