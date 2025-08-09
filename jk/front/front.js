const express = require('express')
const router = express.Router()
const path = require('path')
const { sessionMiddleware } = require('../middleware/middleware')

// 身份验证中间件
const authRedirectMiddleware = (req, res, next) => {
    if (req.user) {
        next()
    } else {
        res.redirect('/login')
    }
}

router.use('/ico', express.static(path.join(__dirname, '../../public/ico')))
router.use('/login/assets', express.static(path.join(__dirname, '../../public/login/assets')))
router.use('/email/assets', express.static(path.join(__dirname, '../../public/email/assets')))
router.use('/storehouse', express.static(path.join(__dirname, '../../public/storehouse')))

// 对敏感路径添加身份验证检查
router.use('/email/*path', sessionMiddleware, authRedirectMiddleware)

//302跳转到/login
router.get('/', (req, res) => {
    res.redirect(302, '/login')
})

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/login/index.html'))
})

router.get('/email' , sessionMiddleware , authRedirectMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/email/index.html'))
})

// 导出路由
module.exports = router
