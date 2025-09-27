# gh-proxy

## 简介

github release、archive以及项目文件的加速项目，修改自[hunshcn/gh-proxy，](https://github.com/hunshcn/gh-proxy/tree/master/app)，固化了works中加载页面的位置以及修改了页面显示的效果，增加了非指定上下文无法访问的控制，防止非法访问


## cf worker版本部署

首页：https://workers.cloudflare.com

注册，登陆，`Start building`，取一个子域名，`Create a Worker`。

复制 [index.js](https://cdn.jsdelivr.net/gh/hunshcn/gh-proxy@master/index.js)  到左侧代码框，`Save and deploy`。如果正常，右侧应显示首页。

`ASSET_URL`是静态资源的url（实际上就是现在显示出来的那个输入框单页面）

`PREFIX`是前缀，默认（根路径情况为"/gh"），如果自定义路由为example.com/gh/*，请将PREFIX改为 '/gh/'，注意，少一个杠都会错！建议PREFIX通过UUID生成，防止非法访问，例如：/gh/945b6cb6-0496-4cbd-a47e-b05c5de09e28/

## 实际效果
<img width="2514" height="1093" alt="image" src="https://github.com/user-attachments/assets/6cacf94e-41eb-4a27-98bc-864743891bd4" />


## Changelog

* 2025.09.27 克隆自https://github.com/hunshcn/gh-proxy/tree/master/app，修改了页面显示
