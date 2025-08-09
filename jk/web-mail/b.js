const express = require('express');
const b = express.Router();
const { authMiddleware } = require('../middleware/middleware');
const fs = require('fs').promises;
const path = require('path');



b.get('/eaddress', authMiddleware, async (req, res) => {
    try {
        // 从认证中间件获取当前用户信息
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: '无法获取用户邮件地址'
            });
        }

        // 返回当前用户的邮件地址
        res.json({
            success: true,
            data: {
                email: req.user.email
            }
        });

    } catch (error) {
        console.error('获取用户邮件地址失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户邮件地址失败',
            error: error.message
        });
    }
});



//映射规则
b.get('/marules', authMiddleware, async (req, res) => {
    try {
        // 验证用户身份
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        const rulesFilePath = path.join(__dirname, '../../config/marules.json');
        
        let rules;
        try {
            const fileContent = await fs.readFile(rulesFilePath, 'utf8');
            rules = JSON.parse(fileContent);
        } catch (error) {
            // 如果文件不存在或读取失败，返回默认规则
            rules = ["@xxx.xxx"];
        }

        res.json(rules);

    } catch (error) {
        console.error('获取映射规则失败:', error);
        res.status(500).json({
            success: false,
            message: '获取映射规则失败',
            error: error.message
        });
    }
});



//添加映射
b.post('/mapsuf', authMiddleware, async (req, res) => {
    try {
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        const { maddress } = req.body;
        if (!maddress) {
            return res.status(400).json({
                success: false,
                message: '映射邮箱地址不能为空'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(maddress)) {
            return res.status(400).json({
                success: false,
                message: '邮箱格式无效'
            });
        }

        // 检查映射邮箱是否存在于用户数据中
        const userFilePath = path.join(__dirname, '../../user/user.json');
        let users;
        try {
            const userFileContent = await fs.readFile(userFilePath, 'utf8');
            users = JSON.parse(userFileContent);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: '读取用户数据失败',
                error: error.message
            });
        }

        // 检查映射邮箱是否已存在于用户数据中
        const userExists = users.some(user => user.email === maddress);
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: '此邮箱已被注册，不能作为映射邮箱'
            });
        }

        // 读取映射规则
        const rulesFilePath = path.join(__dirname, '../../config/marules.json');
        let rules;
        try {
            const fileContent = await fs.readFile(rulesFilePath, 'utf8');
            rules = JSON.parse(fileContent);
        } catch (error) {
            rules = ["@xxx.xxx"]; // 默认规则
        }

        // 验证映射邮箱是否符合规则
        const isValid = rules.some(rule => {
            if (rule.startsWith('@')) {
                const domain = rule.substring(1);
                return maddress.toLowerCase().endsWith(domain.toLowerCase());
            }
            return false;
        });

        if (!isValid) {
            return res.status(400).json({
                success: false,
                message: '此映射无效'
            });
        }

        const mappingFilePath = path.join(__dirname, '../../provda/mapping.json');
        const generateRandomId = (prefix) => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            for (let i = 0; i < 32; i++) {
                result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return `${prefix}_${result}`;
        };

        let mappingData;
        try {
            const fileContent = await fs.readFile(mappingFilePath, 'utf8');
            mappingData = JSON.parse(fileContent);
        } catch (error) {
            mappingData = {
                mainEmails: [],
                mappingEmails: []
            };
        }

        // 检查该邮箱是否已被任何用户映射（全局唯一）
        const globalExistingMapping = mappingData.mappingEmails.find(
            item => item.address === maddress
        );

        if (globalExistingMapping) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被其他用户映射'
            });
        }

        let mainEmail = mappingData.mainEmails.find(item => item.address === req.user.email);
        
        if (!mainEmail) {
            mainEmail = {
                id: generateRandomId('main'),
                address: req.user.email,
                status: 'active'
            };
            mappingData.mainEmails.push(mainEmail);
        }

        // 创建新的映射邮箱
        const mappingEmail = {
            id: generateRandomId('map'),
            address: maddress,
            mappedTo: mainEmail.id,
            status: 'active'
        };

        mappingData.mappingEmails.push(mappingEmail);

        await fs.writeFile(
            mappingFilePath, 
            JSON.stringify(mappingData, null, 2), 
            'utf8'
        );

        res.json({
            success: true,
            message: '映射成功'
        });

    } catch (error) {
        console.error('添加邮件映射失败:', error);
        res.status(500).json({
            success: false,
            message: '添加邮件映射失败',
            error: error.message
        });
    }
});


//邮件映射查询
b.get('/bmapsuf', authMiddleware, async (req, res) => {
    try {
        // 验证用户身份
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        const mappingFilePath = path.join(__dirname, '../../provda/mapping.json');
        
        let mappingData;
        try {
            const fileContent = await fs.readFile(mappingFilePath, 'utf8');
            mappingData = JSON.parse(fileContent);
        } catch (error) {
            // 如果文件不存在，返回空数组
            return res.json({
                mainEmails: [],
                mappingEmails: []
            });
        }

        // 查找当前用户的主邮箱
        const userMainEmails = mappingData.mainEmails.filter(
            item => item.address === req.user.email
        );

        // 获取这些主邮箱的所有映射邮箱
        const userMainIds = userMainEmails.map(email => email.id);
        const userMappingEmails = mappingData.mappingEmails.filter(
            item => userMainIds.includes(item.mappedTo)
        );

        res.json({
            mainEmails: userMainEmails,
            mappingEmails: userMappingEmails
        });

    } catch (error) {
        console.error('获取映射数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取映射数据失败',
            error: error.message
        });
    }
});


//删除映射
b.delete('/mapsuf', authMiddleware, async (req, res) => {
    try {
        // 验证用户身份
        if (!req.user || !req.user.email) {
            return res.status(401).json({
                success: false,
                message: '用户未认证'
            });
        }

        const { maddress } = req.body;
        if (!maddress) {
            return res.status(400).json({
                success: false,
                message: '映射邮箱地址不能为空'
            });
        }

        const mappingFilePath = path.join(__dirname, '../../provda/mapping.json');
        
        let mappingData;
        try {
            const fileContent = await fs.readFile(mappingFilePath, 'utf8');
            mappingData = JSON.parse(fileContent);
        } catch (error) {
            return res.status(404).json({
                success: false,
                message: '映射数据不存在'
            });
        }

        // 查找当前用户的主邮箱
        const userMainEmails = mappingData.mainEmails.filter(
            item => item.address === req.user.email
        );
        
        if (userMainEmails.length === 0) {
            return res.status(404).json({
                success: false,
                message: '没有找到用户的主邮箱'
            });
        }

        // 获取用户的主邮箱ID列表
        const userMainIds = userMainEmails.map(email => email.id);
        
        // 查找要删除的映射邮箱
        const mappingIndex = mappingData.mappingEmails.findIndex(
            item => item.address === maddress && userMainIds.includes(item.mappedTo)
        );

        if (mappingIndex === -1) {
            return res.status(404).json({
                success: false,
                message: '未找到该映射邮箱'
            });
        }

        // 删除映射邮箱
        const deletedMapping = mappingData.mappingEmails.splice(mappingIndex, 1)[0];

        // 写入更新后的数据
        await fs.writeFile(
            mappingFilePath, 
            JSON.stringify(mappingData, null, 2), 
            'utf8'
        );

        res.json({
            success: true,
            message: '映射删除成功',
            data: deletedMapping
        });

    } catch (error) {
        console.error('删除映射失败:', error);
        res.status(500).json({
            success: false,
            message: '删除映射失败',
            error: error.message
        });
    }
});



module.exports = b;

