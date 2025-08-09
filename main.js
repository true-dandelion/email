const express = require('express');
const fs = require('fs');
const path = require('path');
const cookieParser = require('cookie-parser');
const https = require('https');
const http = require('http');
const app = express();

let config = require('./config/process.json');
let PORT = config.port || 80;
let HTTPS_PORT = config.https?.port || 443;
let HTTPS_ENABLED = config.https?.enabled || false;

// 保存服务器实例
let httpServer;
let httpsServer;

// 中间件设置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 自定义中间件
const { sessionMiddleware } = require('./jk/middleware/middleware');
app.use(sessionMiddleware);

// 路由
const frontRouter = require('./jk/front/front');
const verify = require('./jk/verify/verify.js');
const a = require('./jk/web-mail/a.js');
const b = require('./jk/web-mail/b.js');
const c = require('./jk/web-mail/c.js');

app.use('/', frontRouter);
app.use('/', verify);
app.use('/amail', a);
app.use('/bmail', b);
app.use('/cmail', c);


// 邮件服务器
const { smtpServer } = require('./jk/smtp/reception.js');
let smtpServerInstance = smtpServer;

// 启动HTTP服务器
httpServer = http.createServer((req, res) => {
  if (HTTPS_ENABLED) {
    // 如果HTTPS启用，将HTTP请求重定向到HTTPS
    const httpsUrl = `https://${req.headers.host?.split(':')[0] || 'localhost'}:${HTTPS_PORT}${req.url}`;
    res.writeHead(301, { Location: httpsUrl });
    res.end();
  } else {
    // 如果HTTPS未启用，直接处理HTTP请求
    app(req, res);
  }
});
httpServer.listen(PORT, () => {
  if (HTTPS_ENABLED) {
    console.log(`HTTP服务器运行在端口 ${PORT}，将重定向到HTTPS端口 ${HTTPS_PORT}`);
  } else {
    console.log(`HTTP服务器运行在端口 ${PORT}`);
  }
});

// 启动HTTPS服务器
if (HTTPS_ENABLED) {
  try {
    if (config.https.cert && config.https.key) {
      const certPath = path.join(__dirname, 'certificate', config.https.cert);
      const keyPath = path.join(__dirname, 'certificate', config.https.key);
      
      const httpsOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath)
      };
      
      httpsServer = https.createServer(httpsOptions, app);
      httpsServer.listen(HTTPS_PORT, () => {
        console.log(`HTTPS服务器运行在端口 ${HTTPS_PORT}`);
      });
    } else {
      console.warn('HTTPS已启用但未提供证书文件名称');
    }
  } catch (error) {
    console.error('启动HTTPS服务器失败:', error.message);
  }
}

// 启动邮件服务器
try {
  smtpServerInstance.start();
} catch (error) {
  console.error('启动邮件服务器失败:', error.message);
}

// 立即关闭处理函数
const immediateShutdown = () => {
  
  // 强制关闭HTTP服务器
  if (httpServer) {
    httpServer.close(() => {}).unref();
  }
  
  // 强制关闭HTTPS服务器
  if (httpsServer) {
    httpsServer.close(() => {}).unref();
  }
  
  // 强制停止邮件服务器（如果有相关方法）
  if (smtpServerInstance && smtpServerInstance.stop) {
    try {
      smtpServerInstance.stop();
    } catch (e) {
      console.error('邮件服务器关闭错误:', e.message);
    }
  }
  
  // 立即退出进程
  process.exit(0);
};

// 监听关闭信号
process.on('SIGINT', immediateShutdown);  // Ctrl+C
process.on('SIGTERM', immediateShutdown); // 终止信号

// 未捕获异常时也立即关闭
process.on('uncaughtException', (err) => {
  console.error('未捕获异常:', err);
  immediateShutdown();
});
