# 项目名称

email

## 安装
运行此程序前，需要先安装项目依赖：
```bash
npm install
```

## 运行
安装完成后，可以使用以下命令启动程序：
```bash
node main.js
```

## 初始登录账户密码
- `账户：admin@shaoxin.top`
- `密码：admin@shaoxin.top`

## 配置指南

需要配置以下三个配置文件：

## 1. SMTP配置 (config/smtp.json)

需要修改的内容：
- `domain`: 设置SMTP服务器域名
- 注意：当前版本暂时不支持TLS与SSL

配置示例：
```json
{
  "port": 25,
  "domain": "your-domain.com",
  "TLS": {
    "enabled": false,
    "port": 587,
    "cert": "",
    "key": ""
  }
}
```

## 2. 进程配置 (config/process.json)

需要修改的内容：
- `cert`: SSL证书文件路径
- `key`: SSL私钥文件路径

配置示例：
```json
{
  "port": 80,
  "https": {
    "enabled": true,
    "port": 443,
    "cert": "your-cert.pem",
    "key": "your-key.key"
  }
}
```

## 3. 邮件规则配置 (config/marules.json)

需要修改的内容：
在引号中添加邮件规则，格式为域名数组

配置示例：
```json
[
  "@shaoxin.top",
  "@yourdomain.com",
  "@anotherdomain.com"
]
```

## 配置步骤

1. 根据上述说明修改对应的配置文件
2. 确保SSL证书和私钥文件存在于指定路径
3. 重启应用使配置生效

## 注意事项

- SMTP目前仅支持非加密连接（端口25）
- HTTPS需要有效的SSL证书文件
- 邮件规则中的域名需要包含@符号


