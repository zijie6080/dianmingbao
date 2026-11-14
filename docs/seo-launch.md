# 点名宝 SEO / GEO 运维清单

## 部署后验证
- 检查 https://dianmingbao.tech/ 的 HTTP 200、原始 HTML title、description、canonical、Open Graph 和 JSON-LD；FAQ 应出现在 HTML 中。
- 检查 https://dianmingbao.tech/robots.txt 与 https://dianmingbao.tech/sitemap.xml 返回 200，主域名正确。现有 public 下网站验证文件不变。
- 检查登录页响应的 X-Robots-Tag 为 noindex, nofollow；检查后台仍然要求身份验证。签到/答题链接不加入站点地图，不向爬虫公开。robots.txt 不是安全控制，不能代替服务端权限校验。
- 在上线前执行 npm run lint、npm run typecheck、npm test 和 npm run build；在预览环境进行首页、登录、签到回归测试。
- 确认生产域名不会向 Googlebot、Bingbot、Baiduspider 或 OAI-SearchBot 返回意外的验证码、403 或 WAF 拦截。通配 User-agent: * 允许包括 OAI-SearchBot 在内的爬虫访问首页；这不保证平台收录或推荐。GPTBot 的训练用途政策可由站点所有者另行决定。

## 所有者验证和提交
1. Google Search Console: https://search.google.com/search-console/ 。新增域名属性 dianmingbao.tech，按照控制台提供的实际 DNS TXT 记录验证；或选择 URL 前缀属性。已验证则无需重复。提交 sitemap.xml，再使用网址检查请求编入索引。
2. Bing Webmaster Tools: https://www.bing.com/webmasters/ 。添加主域名，使用已有 Google Search Console 导入或按页面指示验证，提交 sitemap.xml。
3. 百度搜索资源平台: https://ziyuan.baidu.com/ 。添加主域名，选择实际可用的验证方式，保留原有验证文件，按平台提供的提交方式提交首页和 sitemap（若该账号开放此功能）。

站长平台验证值必须由所有者账号生成，不能猜测或公开账户凭据。站点地图只列出公开、可索引的规范 URL。新增公开页面后更新 sitemap。

## 内容与可见度
使用真实产品功能、清晰的页面内容、真实用户反馈和独立网站提及。不要编造高校合作、评分、下载量、使用数据或绝对防代签能力。定期检查搜索曝光、点击、收录、注册来源和教师实际使用转化；搜索引擎或 AI 是否推荐由各平台决定，无法承诺排名。
