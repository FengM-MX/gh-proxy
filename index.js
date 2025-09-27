'use strict'

//上下文路径，如果想要通过指定上下文访问，例如：example.com/gh/*，则CONTEXT_PATH改为 '/gh/'，CONTEXT_PATH中可以不以/开头和结尾，代码中会自动添加
//访问网站时需要通过指定的上下文访问，例如：example.com/gh/
const CONTEXT_PATH = '/gh/945b6cb6-0496-4cbd-a47e-b05c5de09e28/'

//防止出现在前后未添加/，手动添加
if (!CONTEXT_PATH.startsWith('/')) {
    CONTEXT_PATH = '/' + CONTEXT_PATH;
}
if (!CONTEXT_PATH.endsWith('/')) {
    CONTEXT_PATH = CONTEXT_PATH + '/';
}


// 分支文件使用jsDelivr镜像的开关，0为关闭，默认关闭
const Config = {
    jsdelivr: 0
}

const whiteList = [] // 白名单，路径里面有包含字符的才会通过，e.g. ['/username/']

/** @type {ResponseInit} */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
}


const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i
const exp6 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/tags.*$/i

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, { status, headers })
}


/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
    try {
        return new URL(urlStr)
    } catch (err) {
        return null
    }
}


addEventListener('fetch', e => {
    const ret = fetchHandler(e)
        .catch(err => makeRes('cfworker error:\n' + err.stack, 502))
    e.respondWith(ret)
})


function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, exp6]) {
        if (u.search(i) === 0) {
            return true
        }
    }
    return false
}

/**
 * @param {FetchEvent} e
 */
async function fetchHandler(e) {
    const req = e.request
    const urlStr = req.url
    const urlObj = new URL(urlStr)
    let path = urlObj.searchParams.get('q')
    if (path) {
        return Response.redirect('https://' + urlObj.host + CONTEXT_PATH + path, 301)
    }
    const contextUrl = urlObj.origin + CONTEXT_PATH;
    //如果不是指定的上下文，则重定向到错误页面
    if (!urlStr.startsWith(contextUrl)) {
        return new Response(errHtml, {
            headers: {
                'content-type': 'text/html;charset=UTF-8',
            }
        });
    }
    // 找到上下文起始位置，并加上上下文的路径
    const githubIndex = urlStr.indexOf(CONTEXT_PATH) + CONTEXT_PATH.length;
    path = urlStr.substr(githubIndex).replace(/^https?:\/+/, 'https://');
    //如果当前的路径不是指定上下文路径，并且路径不是以Http或Https开头，则重定向到错误页面
    if (path != "" && !path.startsWith("https://")) {
        return new Response(errHtml, {
            headers: {
                'content-type': 'text/html;charset=UTF-8',
            }
        });
    }
    //根据上下文取值，走到不同的分支
    if (path.search(exp1) === 0 || path.search(exp5) === 0 || path.search(exp6) === 0 || path.search(exp3) === 0 || path.search(exp4) === 0) {
        return httpHandler(req, path)
    } else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) {
            const newUrl = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        } else {
            path = path.replace('/blob/', '/raw/')
            return httpHandler(req, path)
        }
    } else if (path.search(exp4) === 0) {
        const newUrl = path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
        return Response.redirect(newUrl, 302)
    } else {
        path = CONTEXT_PATH + path;
        return new Response(htmlContent, {
            headers: {
                'content-type': 'text/html;charset=UTF-8',
            },
        });
    }
}


/**
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers

    // preflight
    if (req.method === 'OPTIONS' &&
        reqHdrRaw.has('access-control-request-headers')
    ) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    let flag = !Boolean(whiteList.length)
    for (let i of whiteList) {
        if (urlStr.includes(i)) {
            flag = true
            break
        }
    }
    if (!flag) {
        return new Response("blocked", { status: 403 })
    }
    if (urlStr.search(/^https?:\/\//) !== 0) {
        urlStr = 'https://' + urlStr
    }
    const urlObj = newUrl(urlStr)

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body
    }
    return proxy(urlObj, reqInit)
}


/**
 *
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 */
async function proxy(urlObj, reqInit) {
    const res = await fetch(urlObj.href, reqInit)
    const resHdrOld = res.headers
    const resHdrNew = new Headers(resHdrOld)

    const status = res.status

    if (resHdrNew.has('location')) {
        let _location = resHdrNew.get('location')
        if (checkUrl(_location))
            resHdrNew.set('location', CONTEXT_PATH + _location)
        else {
            reqInit.redirect = 'follow'
            return proxy(newUrl(_location), reqInit)
        }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    return new Response(res.body, {
        status,
        headers: resHdrNew,
    })
}

var htmlContent = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub 文件加速</title>
    <!-- 引入 Material Icons -->
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
    <!-- 引入 Materialize CSS -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css">
    <style>
        :root {
            --navbar-height: 56px;
        }
        
        body {
            display: flex;
            min-height: 100vh;
            flex-direction: column;
            padding: 0;
            background-color: #121212;
            color: #e0e0e0;
            padding-top: calc(var(--navbar-height) * 2);
        }

        main {
            flex: 1 0 auto;
            padding: 40px 20px 20px;
        }

        .github-corner:hover .octo-arm {
            animation: octocat-wave 560ms ease-in-out
        }

        @keyframes octocat-wave {
            0%, 100% { transform: rotate(0) }
            20%, 60% { transform: rotate(-25deg) }
            40%, 80% { transform: rotate(10deg) }
        }

        @media (max-width: 500px) {
            .github-corner:hover .octo-arm {
                animation: none
            }

            .github-corner .octo-arm {
                animation: octocat-wave 560ms ease-in-out
            }
        }

        .card {
            background: #1e1e1e;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
            border: 1px solid #ffffff33;
            transition: all 0.3s ease;
        }

        .card-content {
            color: #e0e0e0;
            padding: 20px;
        }

        .card-title {
            color: #fff;
            font-size: 1.5rem;
        }

        .result-container {
            margin-top: 30px;
            display: none;
        }

        .action-buttons {
            margin-top: 15px;
        }

        /* 输入框样式 - 方形四角圆形 */
        .url-input {
            border: 1px solid #444;
            border-radius: 8px;
            padding: 0 15px;
            height: 46px;
            box-sizing: border-box;
            width: 100%;
            font-size: 16px;
            background-color: #2d2d2d;
            color: #fff;
        }

        .url-input:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 1px 0 0 #2196F3;
        }

        .url-input::placeholder {
            color: #aaa;
        }

        /* 按钮样式 - 方形四角圆形 */
        .convert-btn {
            border-radius: 8px;
            height: 46px;
            padding: 0 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 500;
            text-transform: none;
            margin: 0;
            width: 100%;
        }

        /* 结果区域按钮样式 - 增大按钮 */
        .result-actions .btn-small {
            border-radius: 8px;
            margin-right: 15px;
            margin-bottom: 15px;
            height: 40px;
            padding: 0 20px;
            font-size: 1rem;
        }

        .result-actions .btn-small i {
            font-size: 1.2rem;
        }

        .result-actions .btn-small:last-child {
            margin-right: 15px;
        }

        /* 顶部导航栏样式 */
        .navbar {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: var(--navbar-height);
            background: #2d3138;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            padding: 0 15px;
        }

        .navbar-title {
            color: #fff;
            font-size: 1.5rem;
            font-weight: 500;
            margin: 0;
            display: flex;
            align-items: center;
        }

        .navbar-title i {
            margin-right: 10px;
            color: #fff;
        }

        /* 输入框和按钮同行布局 */
        .input-row {
            display: flex;
            gap: 15px;
            margin-bottom: 0;
        }

        .input-field {
            flex: 1;
        }

        .button-field {
            flex: 0 0 auto;
        }

        /* 卡片容器 */
        .input-card {
            border: 1px solid #ffffff33;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 25px;
            background: #1e1e1e;
        }

        .result-card {
            border: 1px solid #ffffff33;
            border-radius: 12px;
            background: #1e1e1e;
        }

        @media (max-width: 600px) {
            .input-row {
                flex-direction: column;
            }
            
            .button-field {
                flex: 1;
            }
        }

        /* 响应式设计 */
        @media (min-width: 601px) {
            .convert-btn {
                width: auto;
                display: inline-flex;
            }
            
            .button-field {
                width: auto;
            }
        }

        @media (max-width: 600px) {
            body {
                padding-top: calc(var(--navbar-height) * 2);
            }
            
            .navbar-title {
                font-size: 1.2rem;
            }
            
            main {
                padding: 30px 15px 15px;
            }
            
            .card {
                padding: 15px;
            }
            
            .result-actions .btn-small {
                width: 100%;
                margin-right: 0;
            }
        }
        .link-text {
            padding: 12px 0;
            word-break: break-all;
            font-family: 'SF Mono', 'Menlo', monospace;
            font-size: 0.95rem;
            line-height: 1.7;
            background: rgba(240, 240, 240, 0.37);
            padding: 15px;
            border-radius: 6px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            color: var(--text-color);
        }
    </style>
</head>

<body>
    <!-- 顶部导航栏 -->
    <nav class="navbar">
        <h1 class="navbar-title">
            <i class="material-icons">code</i>
            GitHub 文件加速
        </h1>
    </nav>

    <main>
        <div class="container">
            <!-- 输入框卡片 -->
            <div class="card input-card">
                <div class="row">
                    <form class="col s12" id="urlForm">
                        <div class="row">
                            <div class="col s12">
                                <div class="input-row">
                                    <div class="input-field">
                                        <input 
                                            id="urlInput" 
                                            class="url-input"
                                            type="url" 
                                            placeholder="请输入 GitHub 文件链接"
                                            pattern="^((https|http):\/\/)?(github\.com\/.+?\/.+?\/(?:releases|archive|blob|raw|suites)|((?:raw|gist)\.(?:githubusercontent|github)\.com))\/.+$"
                                            required
                                        >
                                    </div>
                                    <div class="button-field">
                                        <button class="btn waves-effect waves-light blue convert-btn" type="submit" name="action">
                                            <i class="material-icons left">flash_on</i>
                                            转换链接
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            <!-- 结果显示区域 -->
            <div id="resultContainer" class="result-container">
                <div class="card result-card">
                    <div class="card-content white-text">
                        <span class="card-title">转换后的链接</span>
                        <div class="link-text">
                            <p id="convertedUrl" style="word-break: break-all; margin: 20px 0; font-size: 1.1rem;"></p>
                        </div>
                    </div>
                    <div class="card-action action-buttons result-actions">
                        <button id="copyBtn" class="btn-small waves-effect waves-light green">
                            <i class="material-icons left">content_copy</i>
                            复制
                        </button>
                        <button id="openBtn" class="btn-small waves-effect waves-light orange">
                            <i class="material-icons left">open_in_new</i>
                            打开
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- 引入 Materialize JS -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js"></script>
    
    <script>
        // 初始化 Materialize 组件
        document.addEventListener('DOMContentLoaded', function() {
            M.AutoInit();
        });

        // 表单提交处理
        document.getElementById('urlForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const inputUrl = document.getElementById('urlInput').value;
            const baseUrl = window.location.href.substr(0, window.location.href.lastIndexOf('/') + 1);
            const convertedUrl = baseUrl + inputUrl;
            
            // 显示结果
            document.getElementById('convertedUrl').textContent = convertedUrl;
            document.getElementById('resultContainer').style.display = 'block';
            
            // 保存转换后的链接供后续使用
            window.convertedUrl = convertedUrl;
        });

        // 复制按钮处理
        document.getElementById('copyBtn').addEventListener('click', function() {
            if (window.convertedUrl) {
                navigator.clipboard.writeText(window.convertedUrl)
                    .then(() => {
                        M.toast({html: '链接已复制到剪贴板!'});
                    })
                    .catch(err => {
                        M.toast({html: '复制失败: ' + err});
                    });
            }
        });

        // 打开按钮处理
        document.getElementById('openBtn').addEventListener('click', function() {
            if (window.convertedUrl) {
                window.open(window.convertedUrl, '_blank');
            }
        });
    </script>
</body>
</html>`;


var errHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>页面未找到 - 404错误</title>
        <style>
            /* 基础样式重置 */
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Arial', 'Microsoft YaHei', sans-serif;
                background-color: #f8f9fa;
                color: #333;
                line-height: 1.6;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                padding: 20px;
                text-align: center;
            }
            /* 错误容器样式 */
            .error-container {
                max-width: 600px;
                padding: 40px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                margin-bottom: 30px;
            }
            /* 错误代码样式 */
            .error-code {
                font-size: 120px;
                font-weight: bold;
                color: #dc3545;
                line-height: 1;
                margin-bottom: 20px;
                text-shadow: 3px 3px 0 rgba(0, 0, 0, 0.05);
            }
            /* 错误信息样式 */
            .error-title {
                font-size: 28px;
                margin-bottom: 15px;
                color: #212529;
            }
            .error-message {
                font-size: 18px;
                color: #6c757d;
                margin-bottom: 30px;
            }
            /* 动画效果 */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .error-container {
                animation: fadeIn 0.5s ease-out;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-code">404</div>
            <h1 class="error-title">页面未找到</h1>
            <p class="error-message">很抱歉，您访问的页面不存在。这可能是因为页面已被移除、网址输入错误或链接已失效。</p>
        </div>
    </body>
    </html>
`;
