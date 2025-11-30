// server.js - Node.js Express Proxy Server

const express = require('express'); // 引入 Express 框架
const cors = require('cors'); // 引入 cors 中间件，解决代理服务器本身的跨域问题
const axios = require('axios'); // 引入 axios，用于向目标 API 发送 HTTP 请求

const app = express();
const PORT = 3000; // 代理服务器监听的端口

// 1. 设置中间件

// 启用 CORS：允许前端 (例如运行在 5500 端口) 访问此代理服务器
app.use(cors());

// 解析 application/json body：用于接收前端发送过来的请求参数 (proxyPayload)
app.use(express.json());

// 2. 核心代理路由

// 所有发往 /proxy 路径的 POST 请求都会被代理处理
app.post('/proxy', async (req, res) => {
    // 从前端请求体中解构出目标请求的参数
    const { url, method, headers, body } = req.body;

    // 基础校验
    if (!url) {
        return res.status(400).json({ error: 'URL is required in the request payload.' });
    }

    try {
        // 使用 axios 向目标 URL 发送请求
        const response = await axios({
            method: method.toLowerCase(), // HTTP 方法必须小写
            url: url, // 目标 URL
            headers: headers || {}, // 转发前端设置的请求头
            data: body, // 转发请求体 (用于 POST, PUT, PATCH)
            
            // 确保 axios 不会在 4xx 或 5xx 状态码时抛出异常，而是返回响应对象
            validateStatus: () => true 
        });

        // 3. 转发响应

        // 转发目标 API 的状态码给前端
        res.status(response.status);

        // 转发响应头 (防止某些头部如 Content-Encoding 导致浏览器解析错误)
        Object.keys(response.headers).forEach(key => {
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                res.set(key, response.headers[key]);
            }
        });

        // 转发响应体给前端
        res.send(response.data);

    } catch (error) {
        // 捕获网络连接或 DNS 解析等底层错误
        console.error('Proxy network error:', error.message);
        res.status(500).json({ 
            error: '代理请求失败 (Proxy Request Failed)',
            details: error.message 
        });
    }
});

// 4. 启动服务器

app.listen(PORT, () => {
    console.log(`🚀 Proxy Server running at http://localhost:${PORT}`);
    console.log(`Frontend should target http://localhost:${PORT}/proxy`);
});