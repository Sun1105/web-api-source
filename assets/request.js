/* --- 1. Tab UI 逻辑 --- */
document.querySelectorAll(".tab-btn").forEach(btn => {
    // 设置 Tab 按钮基础样式：内边距、字体、边框等
    btn.classList.add("px-4", "py-2", "text-sm", "font-medium", "border-b-2", "border-transparent", "hover:text-gray-300");

    // 初始化选中样式：如果按钮有 active-tab 类，则应用选中时的颜色
    if (btn.classList.contains("active-tab")) {
        btn.classList.add("border-indigo-500", "text-indigo-400");
    }

    btn.addEventListener("click", () => {
        // 遍历所有 Tab 按钮，移除选中样式
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active-tab", "border-indigo-500", "text-indigo-400"));
        // 为当前点击的按钮添加选中样式
        btn.classList.add("active-tab", "border-indigo-500", "text-indigo-400");

        // 遍历所有 Tab 内容面板，全部隐藏
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.add("hidden"));
        // 根据 data-tab 属性，显示对应的内容面板
        document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
    });
});

/* --- 2. Header Row 动态 Key-Value 逻辑 --- */
const headersContainer = document.getElementById("headers-container");

/**
 * 动态添加一个 Header Key-Value 输入行
 * @param {string} key - 默认 Key 值
 * @param {string} value - 默认 Value 值
 */
function addHeaderRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "flex space-x-2 items-center"; // 设置行布局

    // 使用模板字符串构建 HTML 结构
    row.innerHTML = `
        <input class="flex-1 bg-gray-900 border border-gray-700 text-gray-200 rounded-lg p-2 text-sm header-key" placeholder="Key" value="${key}">
        <input class="flex-1 bg-gray-900 border border-gray-700 text-gray-200 rounded-lg p-2 text-sm header-value" placeholder="Value" value="${value}">
        <button class="text-red-500 hover:text-red-400 px-2">&times;</button>
    `;

    // 绑定删除按钮事件：点击时移除当前行
    row.querySelector("button").onclick = () => row.remove();
    // 将新行添加到容器中
    headersContainer.appendChild(row);
}

// 初始化默认 Headers：Content-Type
addHeaderRow("Content-Type", "application/json");
// 初始化默认 Headers：添加一个空行供用户输入
addHeaderRow();

// 绑定“添加 Header”按钮事件
document.getElementById("add-header-button").onclick = () => addHeaderRow();

/* --- 3. Request 发送逻辑 (通过代理服务器) --- */
// **重要：代理服务器地址，必须与运行的 Node.js 服务器端口一致**
const PROXY_SERVER_URL = "http://localhost:3000/proxy";

document.getElementById("send-button").onclick = async () => {
    // 获取输入框的值
    const url = document.getElementById("url-input").value.trim();
    const method = document.getElementById("method-select").value;
    const bodyText = document.getElementById("request-body").value.trim();

    // 获取响应区域的 DOM 元素
    const statusCode = document.getElementById("status-code");
    const timeTaken = document.getElementById("time-taken");
    const responseCode = document.getElementById("response-body-code");
    const responseHeaders = document.getElementById("response-headers-pre");
    const errorBox = document.getElementById("error-message");

    // 重置状态和显示
    errorBox.classList.add("hidden");
    statusCode.textContent = "..."; // 显示加载状态
    responseCode.textContent = "";

    const start = performance.now(); // 记录请求开始时间

    /* 3.1 收集 Headers */
    const headers = {};
    const keyInputs = document.querySelectorAll(".header-key");
    const valueInputs = document.querySelectorAll(".header-value");
    
    // 遍历所有 Key-Value 输入框，构建 headers 对象
    keyInputs.forEach((keyInput, i) => {
        const key = keyInput.value.trim();
        const value = valueInputs[i].value.trim();
        // 仅收集 Key 不为空的 Header
        if (key) headers[key] = value;
    });

    /* 3.2 解析 Body */
    let parsedBody = undefined;
    // 只有 POST, PUT, PATCH 请求才处理 Body
    if (["POST", "PUT", "PATCH"].includes(method) && bodyText) {
        try {
            // 尝试将 Body 文本解析为 JSON 对象
            parsedBody = JSON.parse(bodyText);
        } catch {
            // 解析失败则按纯文本发送
            parsedBody = bodyText;
        }
    }

    /* 3.3 构造发送给代理服务器的 Payload */
    // 包含所有请求信息的对象
    const payload = { url, method, headers, body: parsedBody };

    try {
        // 3.4 使用 Fetch API 发送请求给代理服务器
        const res = await fetch(PROXY_SERVER_URL, {
            method: "POST", // 代理请求的方法固定为 POST，将真实方法放在 payload 中
            headers: { "Content-Type": "application/json" }, // 告知代理服务器发送的是 JSON Payload
            body: JSON.stringify(payload) // 将请求参数对象转为 JSON 字符串发送
        });

        const end = performance.now();
        timeTaken.textContent = `${(end - start).toFixed(0)}ms`; // 计算并显示总耗时

        // 3.5 处理状态码
        statusCode.textContent = res.status;
        // 根据状态码是否在 200-299 范围内，设置显示颜色
        statusCode.className = res.ok ? "text-green-400 font-bold" : "text-red-400 font-bold";

        /* 3.6 显示响应头 */
        let headerText = "";
        // 遍历响应头，构建 Key: Value 文本
        res.headers.forEach((v, k) => headerText += `${k}: ${v}\n`);
        responseHeaders.textContent = headerText;

        /* 3.7 显示响应体 */
        let text = await res.text(); // 先以文本形式获取响应体
        try {
            // 尝试将响应体文本格式化为美观的 JSON (Prettify)
            text = JSON.stringify(JSON.parse(text), null, 2);
            responseCode.className = "json"; // 设置代码高亮语言为 JSON
        } catch {
            responseCode.className = "plaintext"; // 解析失败则按纯文本显示
        }

        responseCode.textContent = text;
        // 使用 Highlight.js 渲染代码高亮效果
        hljs.highlightElement(responseCode);

    } catch (err) {
        // 3.8 捕获网络连接或代理服务器失败的异常
        errorBox.classList.remove("hidden");
        statusCode.textContent = "ERR";
        responseCode.textContent = `网络错误或代理连接失败: ${err.message}`;
    }
};

/* --- 4. 初始化：对预设的 Body 内容进行高亮预览 --- */
document.addEventListener('DOMContentLoaded', () => {
    try {
        const initialBody = document.getElementById("request-body").value.trim();
        const json = JSON.parse(initialBody);
        // 借用 response-body-code 区域的显示能力，对 Body 输入框的内容进行格式化高亮预览
        document.getElementById('response-body-code').textContent = JSON.stringify(json, null, 2);
        hljs.highlightElement(document.getElementById('response-body-code'));
    } catch (e) {
        // 忽略非 JSON 格式的初始内容
    }
});