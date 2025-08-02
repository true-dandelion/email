const net = require('net');
const tls = require('tls');
const fs = require('fs').promises;
const path = require('path');
const { MailParser } = require('../parse/parse');
const { sendMail } = require('./smtp');
const { storeRawMail } = require('../storage/storage');
const config = require('../../config/smtp.json');
const users = require('../../user/user.json');

// 导入SSE管理器
let sseManager = null;
try {
    const webMailModule = require('../web-mail/a');
    sseManager = webMailModule.sseManager;
} catch (error) {
    console.warn('无法导入SSE管理器:', error.message);
}

/**
 * SMTP接收服务器
 * 处理外部邮件接收
 */
class SMTPReceptionServer {
    constructor() {
        this.parser = new MailParser();
        this.config = config;
        this.users = users;
        this.server = null;
        this.tlsServer = null;
        this.connections = new Set();
        this.isRunning = false;
    }

    /**
     * 启动SMTP服务器
     */
    start() {
        if (this.isRunning) {
            return;
        }

        // 启动普通SMTP服务器
        this.server = net.createServer((socket) => {
            this.handleConnection(socket, false);
        });

        this.server.listen(this.config.port, () => {
        });

        // 启动TLS SMTP服务器
        if (this.config.TLS.enabled) {
            try {
                const fs_sync = require('fs');
                const tlsOptions = {
                    cert: fs_sync.readFileSync(path.join(__dirname, '../../certificate', this.config.TLS.cert + '.pem')),
                    key: fs_sync.readFileSync(path.join(__dirname, '../../certificate', this.config.TLS.key + '.key'))
                };

                this.tlsServer = tls.createServer(tlsOptions, (socket) => {
                    this.handleConnection(socket, true);
                });

                this.tlsServer.listen(this.config.TLS.port, () => {
                });
            } catch (error) {
                console.error('启动TLS服务器失败:', error.message);
            }
        }

        this.isRunning = true;

        // 错误处理
        this.server.on('error', (error) => {
            console.error('SMTP服务器错误:', error);
        });

        if (this.tlsServer) {
            this.tlsServer.on('error', (error) => {
                console.error('SMTP TLS服务器错误:', error);
            });
        }
    }

    /**
     * 停止SMTP服务器
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        // 关闭所有连接
        this.connections.forEach(connection => {
            connection.destroy();
        });
        this.connections.clear();

        // 关闭服务器
        if (this.server) {
            this.server.close();
        }
        if (this.tlsServer) {
            this.tlsServer.close();
        }

        this.isRunning = false;
    }

    /**
     * 处理客户端连接
     * @param {net.Socket} socket - 客户端套接字
     * @param {boolean} isTLS - 是否为TLS连接
     */
    handleConnection(socket, isTLS = false) {
        this.connections.add(socket);

        const session = {
            socket,
            isTLS,
            state: 'GREETING',
            from: null,
            to: [],
            data: '',
            authenticated: false,
            clientHost: null
        };

        // 发送欢迎消息
        this.sendResponse(socket, '220', `${this.config.domain} ESMTP Ready`);

        socket.on('data', (data) => {
            this.handleData(session, data.toString());
        });

        socket.on('close', () => {
            this.connections.delete(socket);
        });

        socket.on('error', (error) => {
            console.error('SMTP连接错误:', error);
            this.connections.delete(socket);
        });

        // 设置超时
        socket.setTimeout(300000); // 5分钟超时
        socket.on('timeout', () => {
            this.sendResponse(socket, '421', 'Timeout');
            socket.destroy();
        });
    }

    /**
     * 处理客户端数据
     * @param {Object} session - 会话对象
     * @param {string} data - 接收到的数据
     */
    handleData(session, data) {
        // 处理DATA状态下的邮件内容
        if (session.state === 'DATA') {
            const dataStr = data.toString();

            // 检查是否包含邮件结束标记
            if (dataStr.includes('\r\n.\r\n')) {
                const [content, rest] = dataStr.split('\r\n.\r\n', 2);
                session.data += content;
                this.processMailData(session);

                // 如果还有剩余数据,继续处理
                if (rest) {
                    this.handleData(session, rest);
                }
            } else {
                session.data += dataStr;
            }
        }
        // 处理认证状态下的数据
        else if (session.authState) {
            const lines = data.toString().split('\r\n');

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                this.handleAuthData(session, line);
            }
        }
        // 处理普通命令
        else {
            const lines = data.toString().split('\r\n');

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;
                this.handleCommand(session, line);
            }
        }
    }

    /**
     * 处理SMTP命令
     * @param {Object} session - 会话对象
     * @param {string} line - 命令行
     */
    handleCommand(session, line) {
        const parts = line.split(' ');
        const command = parts[0].toUpperCase();
        const args = parts.slice(1).join(' ');

        switch (command) {
            case 'HELO':
            case 'EHLO':
                this.handleHelo(session, args, command === 'EHLO');
                break;
            case 'AUTH':
                this.handleAuth(session, args);
                break;
            case 'STARTTLS':
                this.handleStartTLS(session);
                break;
            case 'MAIL':
                this.handleMail(session, args);
                break;
            case 'RCPT':
                this.handleRcpt(session, args);
                break;
            case 'DATA':
                this.handleDataCommand(session);
                break;
            case 'RSET':
                this.handleRset(session);
                break;
            case 'QUIT':
                this.handleQuit(session);
                break;
            case 'NOOP':
                this.sendResponse(session.socket, '250', 'OK');
                break;
            default:
                this.sendResponse(session.socket, '502', 'Command not implemented');
        }
    }

    /**
     * 处理HELO/EHLO命令
     * @param {Object} session - 会话对象
     * @param {string} args - 参数
     * @param {boolean} isEhlo - 是否为EHLO
     */
    handleHelo(session, args, isEhlo) {
        session.clientHost = args;
        session.state = 'READY';
        
        if (isEhlo) {
            const responses = [
                `250-${this.config.domain} Hello ${session.clientHost}`,
                '250-SIZE 52428800',
                '250-8BITMIME',
                '250-AUTH PLAIN LOGIN',
                '250-STARTTLS',
                '250 HELP'
            ];
            session.socket.write(responses.join('\r\n') + '\r\n');
        } else {
            this.sendResponse(session.socket, '250', `${this.config.domain} Hello ${session.clientHost}`);
        }
    }

    /**
     * 处理AUTH命令
     * @param {Object} session - 会话对象
     * @param {string} args - 参数
     */
    handleAuth(session, args) {
        const parts = args.split(' ');
        const mechanism = parts[0];
        
        if (!mechanism) {
            this.sendResponse(session.socket, '501', 'Syntax error in parameters');
            return;
        }
        
        switch (mechanism.toUpperCase()) {
            case 'PLAIN':
                if (parts[1]) {
                    // AUTH PLAIN with initial response
                    this.handleAuthPlain(session, parts[1]);
                } else {
                    // AUTH PLAIN without initial response
                    this.sendResponse(session.socket, '334', '');
                    session.authState = 'PLAIN_WAITING';
                }
                break;
            case 'LOGIN':
                this.sendResponse(session.socket, '334', 'VXNlcm5hbWU6'); // Base64 for "Username:"
                session.authState = 'LOGIN_USERNAME';
                break;
            default:
                this.sendResponse(session.socket, '504', 'Authentication mechanism not supported');
        }
    }

    /**
     * 处理认证状态下的数据输入
     * @param {Object} session - 会话对象
     * @param {string} line - 输入行
     */
    handleAuthData(session, line) {
        switch (session.authState) {
            case 'PLAIN_WAITING':
                this.handleAuthPlain(session, line);
                session.authState = null;
                break;
            case 'LOGIN_USERNAME':
                try {
                    session.authUsername = Buffer.from(line, 'base64').toString('utf8');
                    this.sendResponse(session.socket, '334', 'UGFzc3dvcmQ6'); // Base64 for "Password:"
                    session.authState = 'LOGIN_PASSWORD';
                } catch (error) {
                    this.sendResponse(session.socket, '535', 'Authentication failed');
                    session.authState = null;
                }
                break;
            case 'LOGIN_PASSWORD':
                try {
                    const password = Buffer.from(line, 'base64').toString('utf8');
                    // 验证用户名和密码
                    const user = this.users.find(u => u.email === session.authUsername && u.password === password);
                    if (user) {
                        session.authenticated = true;
                        session.username = session.authUsername;
                        session.userId = user.id;
                        this.sendResponse(session.socket, '235', 'Authentication successful');
                    } else {
                        this.sendResponse(session.socket, '535', 'Authentication failed');
                    }
                    session.authState = null;
                } catch (error) {
                    this.sendResponse(session.socket, '535', 'Authentication failed');
                    session.authState = null;
                }
                break;
            default:
                this.sendResponse(session.socket, '502', 'Command not implemented');
                session.authState = null;
        }
    }

    /**
     * 处理AUTH PLAIN认证
     * @param {Object} session - 会话对象
     * @param {string} credentials - Base64编码的凭据
     */
    handleAuthPlain(session, credentials) {
        try {
            const decoded = Buffer.from(credentials, 'base64').toString('utf8');
            const parts = decoded.split('\0');
            
            if (parts.length === 3) {
                const [authzid, authcid, passwd] = parts;
                // 验证用户名和密码
                const user = this.users.find(u => u.email === authcid && u.password === passwd);
                if (user) {
                    session.authenticated = true;
                    session.username = authcid;
                    session.userId = user.id;
                    this.sendResponse(session.socket, '235', 'Authentication successful');
                } else {
                    this.sendResponse(session.socket, '535', 'Authentication failed');
                }
            } else {
                this.sendResponse(session.socket, '535', 'Authentication failed');
            }
        } catch (error) {
            this.sendResponse(session.socket, '535', 'Authentication failed');
        }
    }

    /**
     * 处理STARTTLS命令
     * @param {Object} session - 会话对象
     */
    handleStartTLS(session) {
        if (session.isTLS) {
            this.sendResponse(session.socket, '503', 'TLS already active');
            return;
        }
        
        if (!this.config.TLS.enabled) {
            this.sendResponse(session.socket, '502', 'STARTTLS not supported');
            return;
        }
        
        this.sendResponse(session.socket, '220', 'Ready to start TLS');
        // 注意：实际的TLS升级需要更复杂的实现
        // 这里只是基本的响应
    }

    /**
     * 处理MAIL FROM命令
     * @param {Object} session - 会话对象
     * @param {string} args - 参数
     */
    handleMail(session, args) {
        if (session.state !== 'READY') {
            this.sendResponse(session.socket, '503', 'Bad sequence of commands');
            return;
        }

        const match = args.match(/FROM:\s*<(.+?)>/);
        if (!match) {
            this.sendResponse(session.socket, '501', 'Syntax error in parameters');
            return;
        }

        session.from = match[1];
        session.to = [];
        session.data = '';
        session.state = 'MAIL';
        
        this.sendResponse(session.socket, '250', 'OK');
    }

    /**
     * 处理RCPT TO命令
     * @param {Object} session - 会话对象
     * @param {string} args - 参数
     */
    handleRcpt(session, args) {
        if (session.state !== 'MAIL' && session.state !== 'RCPT') {
            this.sendResponse(session.socket, '503', 'Bad sequence of commands');
            return;
        }

        const match = args.match(/TO:\s*<(.+?)>/);
        if (!match) {
            this.sendResponse(session.socket, '501', 'Syntax error in parameters');
            return;
        }

        const recipient = match[1];
        
        // 检查是否为本域用户或已认证用户可以发送
        const isLocalDomain = recipient.endsWith(`@${this.config.domain}`);
        const canRelay = session.authenticated;
        
        if (!isLocalDomain && !canRelay) {
            this.sendResponse(session.socket, '550', 'Relay not permitted');
            return;
        }

        session.to.push(recipient);
        session.state = 'RCPT';
        
        this.sendResponse(session.socket, '250', 'OK');
    }

    /**
     * 处理DATA命令
     * @param {Object} session - 会话对象
     */
    handleDataCommand(session) {
        if (session.state !== 'RCPT') {
            this.sendResponse(session.socket, '503', 'Bad sequence of commands');
            return;
        }

        if (session.to.length === 0) {
            this.sendResponse(session.socket, '503', 'No recipients');
            return;
        }

        session.state = 'DATA';
        session.data = '';
        
        this.sendResponse(session.socket, '354', 'Start mail input; end with <CRLF>.<CRLF>');
    }

    /**
     * 处理邮件数据
     * @param {Object} session - 会话对象
     */
    async processMailData(session) {
        try {
            
            // 构建完整的邮件内容
            const rawMail = this.buildRawMail(session);
            
            // 解析邮件
            const parsedMail = await this.parser.parseEmail(rawMail);
            
            const validation = this.parser.validateEmail(parsedMail);
            
            if (!validation.isValid) {
                console.error('邮件验证失败:', validation.errors);
                this.sendResponse(session.socket, '550', 'Message rejected: validation failed');
                this.resetSession(session);
                return;
            }

            // 安全检查
            const securityCheck = this.parser.securityCheck(parsedMail);
            if (!securityCheck.isSafe) {
                console.warn('邮件安全警告:', securityCheck.warnings);
            }

            // 处理每个收件人
            let successCount = 0;
            for (const recipient of session.to) {
                try {
                    const isLocalDomain = recipient.endsWith(`@${this.config.domain}`);
                    
                    if (isLocalDomain) {
                        // 本域用户：存储邮件到本地
                        const recipientUser = this.users.find(u => u.email === recipient);
                        if (recipientUser) {
                            // 存储原始邮件数据
                            await storeRawMail(recipientUser, rawMail, 'reception');
                        }
                        
                        // 通过SSE推送新邮件通知给对应用户
                        if (sseManager) {
                            try {
                                // 查找收件人用户ID
                                const recipientUser = this.users.find(u => u.email === recipient);
                                if (recipientUser) {
                                    const notification = {
                                        type: 'new_mail',
                                        message: '您有新邮件',
                                        data: {
                                            from: session.from,
                                            subject: parsedMail.subject || 'No Subject',
                                            timestamp: Date.now(),
                                            hasAttachments: parsedMail.attachments && parsedMail.attachments.length > 0
                                        }
                                    };
                                    
                                    sseManager.sendToUser(recipientUser.id, notification);
                                }
                            } catch (sseError) {
                                console.error('推送SSE通知失败:', sseError.message);
                            }
                        }
                    } else {
                        // 外部域：直接通过SMTP发送
                        const mailData = {
                            from: session.from,
                            to: [recipient],
                            subject: parsedMail.subject || 'No Subject',
                            text: parsedMail.text || '',
                            html: parsedMail.html || '',
                            attachments: parsedMail.attachments || []
                        };
                        
                        // 发送到外部
                        await sendMail(mailData);
                    }
                    
                    successCount++;
                } catch (error) {
                    console.error(`处理邮件给 ${recipient} 失败:`, error);
                }
            }

            if (successCount > 0) {
                this.sendResponse(session.socket, '250', `Message accepted for delivery (${successCount}/${session.to.length} recipients)`);
            } else {
                this.sendResponse(session.socket, '550', 'Message rejected: delivery failed');
            }

            this.resetSession(session);
            
        } catch (error) {
            console.error('处理邮件数据失败:', error);
            this.sendResponse(session.socket, '451', 'Requested action aborted: local error in processing');
            this.resetSession(session);
        }
    }

    /**
     * 构建原始邮件内容
     * @param {Object} session - 会话对象
     * @returns {string} 原始邮件内容
     */
    buildRawMail(session) {
        const headers = [];
        
        headers.push(`Received: from ${session.clientHost} (${session.socket.remoteAddress})`);
        headers.push(`\tby ${this.config.domain} with SMTP`);
        headers.push(`\t${new Date().toUTCString()}`);
        
        // 添加原始邮件数据
        return headers.join('\r\n') + '\r\n' + session.data;
    }

    /**
     * 处理RSET命令
     * @param {Object} session - 会话对象
     */
    handleRset(session) {
        this.resetSession(session);
        this.sendResponse(session.socket, '250', 'OK');
    }

    /**
     * 处理QUIT命令
     * @param {Object} session - 会话对象
     */
    handleQuit(session) {
        this.sendResponse(session.socket, '221', `${this.config.domain} closing connection`);
        session.socket.end();
    }

    /**
     * 重置会话
     * @param {Object} session - 会话对象
     */
    resetSession(session) {
        session.state = 'READY';
        session.from = null;
        session.to = [];
        session.data = '';
    }

    /**
     * 发送响应
     * @param {net.Socket} socket - 套接字
     * @param {string} code - 响应代码
     * @param {string} message - 响应消息
     */
    sendResponse(socket, code, message) {
        const response = `${code} ${message}\r\n`;
        socket.write(response);
    }

    /**
     * 获取服务器状态
     * @returns {Object} 服务器状态
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            connections: this.connections.size,
            port: this.config.port,
            tlsPort: this.config.TLS.enabled ? this.config.TLS.port : null,
            domain: this.config.domain
        };
    }
}

// 创建单例实例
const smtpServer = new SMTPReceptionServer();

module.exports = {
    SMTPReceptionServer,
    smtpServer
};