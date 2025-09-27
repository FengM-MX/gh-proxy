# gh-proxy

## 简介

- github release、archive以及项目文件的加速项目，修改自[hunshcn/gh-proxy，](https://github.com/hunshcn/gh-proxy/tree/master/app)，固化了works中加载页面的位置以及修改了页面显示的效果，增加了非指定上下文无法访问的控制，防止非法访问


## cf worker版本部署

- 首页：https://workers.cloudflare.com
- 注册，登陆，`Start building`，取一个子域名，`Create a Worker`。
- 复制 [index.js](https://cdn.jsdelivr.net/gh/hunshcn/gh-proxy@master/index.js)  到左侧代码框，`Save and deploy`。如果正常，右侧应显示首页。
- `ASSET_URL`是静态资源的url（实际上就是现在显示出来的那个输入框单页面）
- `INPUT_CONTEXT_PATH`是上下文，如果要修改上下文，例如自定义路由为example.com/gh/*，请将INPUT_CONTEXT_PATH改为 '/gh/'，注意，少一个杠都会错！
- 建议INPUT_CONTEXT_PATH通过UUID生成，防止非法访问，例如：**/gh/945b6cb6-0496-4cbd-a47e-b05c5de09e28/**，例如可以使用 https://www.lddgo.net/string/uuid 去生成自己的UUID
- 注意目前works必须要绑定域名才能在境内访问，假设域名为：xample.com
  - example.com必须要先设置为通过cf管理，然后通过cf添加一个A记录，例如：works.example.com，其中IP填CF的优选IP地址(也可以随便填)
  - 点击添加新增路由：
    <img width="1982" height="399" alt="image" src="https://github.com/user-attachments/assets/acfe8fe1-6d3a-4d49-8902-83b80501d9ef" />
  - 区域选择自己在cloudflare中绑定域名，路由输入INPUT_CONTEXT_PATH定义的上下文，例如：works.example.com/gh/945b6cb6-0496-4cbd-a47e-b05c5de09e28/*，/gh/945b6cb6-0496-4cbd-a47e-b05c5de09e28/必须要和代码中的INPUT_CONTEXT_PATH值一致
    <img width="385" height="787" alt="image" src="https://github.com/user-attachments/assets/be7eb14f-800b-4467-9e6b-4470e5d0b4c6" />

## 实际效果
<img width="2514" height="1093" alt="image" src="https://github.com/user-attachments/assets/6cacf94e-41eb-4a27-98bc-864743891bd4" />


## Changelog

* 2025.09.27 克隆自https://github.com/hunshcn/gh-proxy/tree/master/app，修改了页面显示
