const express = require('express');
const router = express.Router();
const middleware = require('../middleware/middleware');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 加载用户数据
function loadUserData() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '../../user/user.json'), 'utf8'));
  } catch (error) {
    console.error('加载用户数据失败:', error);
    return []; // 返回空数组作为默认值
  }
}

// 动态加载用户数据，确保每次都获取最新数据
function getUserData() {
  return loadUserData();
}

// RSA 密钥对存储映射 - 会话ID -> {privateKey, publicKey, createdAt}
const sessionKeyMap = new Map();

// RSA 密钥对生成函数
function generateRSAKeyPair() {
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  } catch (error) {
    console.error('RSA密钥对生成失败:', error);
    return null;
  }
}

// 存储会话密钥映射
function storeSessionKeys(sessionId, keyPair) {
  sessionKeyMap.set(sessionId, {
    ...keyPair,
    createdAt: Date.now()
  });
}

// 获取会话密钥
function getSessionKeys(sessionId) {
  const keyData = sessionKeyMap.get(sessionId);
  if (!keyData) return null;

  // 检查是否过期（1小时 = 3600000毫秒）
  const oneHour = 1 * 60 * 1000;
  if (Date.now() - keyData.createdAt > oneHour) {
    sessionKeyMap.delete(sessionId);
    return null;
  }

  return keyData;
}

// 清理过期的会话密钥
function cleanExpiredSessions() {
  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  for (const [sessionId, keyData] of sessionKeyMap.entries()) {
    if (now - keyData.createdAt > oneHour) {
      sessionKeyMap.delete(sessionId);
    }
  }
}

// 定期清理过期会话（每30分钟执行一次）
setInterval(cleanExpiredSessions, 30 * 60 * 1000);

// 使用会话私钥解密数据
function decryptWithSessionKey(sessionId, encryptedData) {
  try {
    const keyData = getSessionKeys(sessionId);
    if (!keyData) {
      return null;
    }

    // Base64 解码
    const buffer = Buffer.from(encryptedData, 'base64');

    // 使用会话私钥解密
    const decrypted = crypto.privateDecrypt(
      {
        key: keyData.privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      buffer
    );

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('解密失败:', error);
    return null;
  }
}
  // 登录接口
  router.post('/login/pas', async (req, res) => {
    try {
      // 获取加密的用户名和密码以及会话ID
      const { y, k, conversation } = req.body;

      if (!y || !k || !conversation) {
        return res.json({
          success: false,
          message: '缺少必要的登录参数'
        });
      }

      // 使用会话私钥解密邮箱和密码
      const email = decryptWithSessionKey(conversation, y);
      const password = decryptWithSessionKey(conversation, k);

      if (!email || !password) {
        return res.json({
          success: false,
          message: '会话过期，请刷新网页'
        });
      }

      // 实时加载最新的用户数据
      const usersData = getUserData();

      // 从用户数据中查找用户（只支持邮箱登录）
      const user = usersData.find(u =>
        u.email === email &&
        u.password === password
      );

      if (user) {
        // 创建JWT令牌
        const token = require('../middleware/middleware').createToken(user);

        // 设置认证cookie
        const authConfig = require('../../config/auth');
        res.cookie('authToken', token, authConfig.COOKIE_OPTIONS);
        
        res.json({
          success: true,
          data: {
            redirectUrl: '/email'
          }
        });
      } else {
        res.json({
          success: false,
          message: '邮箱或密码错误'
        });
      }
    } catch (error) {
      console.error('登录处理错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误，请稍后重试'
      });
    }
  });

  // 退出登录接口
  router.post('/logout', (req, res) => {
    // 清除认证cookie
    res.clearCookie('authToken');

    // 如果有session，销毁它
    if (req.session && typeof req.session.destroy === 'function') {
      req.session.destroy();
    }

    res.json({
      success: true,
      message: '已成功退出登录'
    });
  });



  // 获取会话ID和公钥的路由
  router.get('/conversation', (req, res) => {
    try {
      // 生成会话ID
      const sessionId = generateSessionId();

      // 生成RSA密钥对
      const keyPair = generateRSAKeyPair();
      if (!keyPair) {
        throw new Error('RSA密钥对生成失败');
      }

      // 存储会话密钥映射（1小时有效期）
      storeSessionKeys(sessionId, keyPair);

      res.json({
        success: true,
        conversation: sessionId,
        m: keyPair.publicKey
      });
    } catch (error) {
      console.error('生成会话信息失败:', error);
      res.status(500).json({
        success: false,
        message: '生成会话信息出错'
      });
    }
  });

//生成会话id
function generateSessionId() {
  const sessionId = crypto.randomBytes(16).toString('hex');
  return sessionId;
}

module.exports = router;
