const { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs');
const path = require('path');

/**
 * 获取邮件存储目录
 * @param {Object} user 用户信息对象
 * @param {string} type 邮件类型，'reception'表示接收邮件，'send'表示发送邮件
 * @returns {string} 存储目录路径
 */
function getMailStorageDir(user, type = 'reception') {
    return path.join(path.dirname(require.main.filename), 'storage', user.id.toString(), type);
}

/**
 * 确保存储目录存在
 * @param {string} dir 目录路径
 */
function ensureStorageDirExists(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/**
 * 生成邮件文件名（包含时间戳和随机数，确保唯一性）
 * @returns {string} 文件名
 */
function generateMailFilename() {
    // 使用标准时间戳（Unix时间戳）
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 14);
    return `${timestamp}_${randomId}.eml`;
}

/**
 * 获取state.json文件路径
 * @param {string} storageDir 存储目录
 * @returns {string} state.json文件路径
 */
function getStateFilePath(storageDir) {
    return path.join(storageDir, 'state.json');
}

/**
 * 读取state.json文件
 * @param {string} stateFilePath state.json文件路径
 * @returns {Object} 状态数据对象
 */
function readStateFile(stateFilePath) {
    try {
        if (existsSync(stateFilePath)) {
            const data = readFileSync(stateFilePath, 'utf8');
            return JSON.parse(data);
        }
        return {};
    } catch (err) {
        console.error(`[STORAGE] 读取state.json失败:`, err);
        return {};
    }
}

/**
 * 写入state.json文件
 * @param {string} stateFilePath state.json文件路径
 * @param {Object} stateData 状态数据对象
 */
function writeStateFile(stateFilePath, stateData) {
    try {
        writeFileSync(stateFilePath, JSON.stringify(stateData, null, 2), 'utf8');
    } catch (err) {
        console.error(`[STORAGE] 写入state.json失败:`, err);
    }
}

/**
 * 更新邮件状态
 * @param {string} storageDir 存储目录
 * @param {string} filename 邮件文件名
 * @param {Object} mailState 邮件状态对象
 */
function updateMailState(storageDir, filename, mailState = {}) {
    const stateFilePath = getStateFilePath(storageDir);
    const stateData = readStateFile(stateFilePath);
    
    // 设置默认状态
    const defaultState = {
        pinned: false,    // 固定状态（默认false，没有固定）
        marked: false,    // 标记状态（默认false，没有标记）
        read: false       // 已读状态（默认false，没有已读）
    };
    
    // 合并状态
    stateData[filename] = { ...defaultState, ...mailState };
    
    // 写入文件
    writeStateFile(stateFilePath, stateData);
}

/**
 * 存储原始邮件数据到文件
 * @param {Object} user 用户信息对象
 * @param {string} rawMail 原始邮件数据（完整的SMTP格式）
 * @param {string} type 邮件类型，'reception'表示接收邮件，'send'表示发送邮件
 * @returns {Promise<string>} 存储的文件路径
 */
function storeRawMail(user, rawMail, type = 'reception') {
    return new Promise((resolve, reject) => {
        try {
            // 1. 获取存储目录
            const storageDir = getMailStorageDir(user, type);
            
            // 2. 确保目录存在
            ensureStorageDirExists(storageDir);
            
            // 3. 生成文件名
            const filename = generateMailFilename();
            const filePath = `${storageDir}/${filename}`;
            
            // 4. 写入原始邮件数据
            const writeStream = createWriteStream(filePath);
            
            writeStream.write(rawMail);
            writeStream.end();
            
            writeStream.on('finish', () => {
                // 更新邮件状态到state.json
                updateMailState(storageDir, filename);
                resolve(filePath);
            });
            
            writeStream.on('error', (err) => {
                console.error(`[STORAGE] 邮件保存失败:`, err);
                reject(new Error(`存储邮件失败: ${err.message}`));
            });
        } catch (err) {
            reject(new Error(`存储邮件时发生错误: ${err.message}`));
        }
    });
}



module.exports = {
    storeRawMail,
    getMailStorageDir,
    ensureStorageDirExists,
    generateMailFilename,
    updateMailState,
    readStateFile,
    writeStateFile,
    getStateFilePath
};
