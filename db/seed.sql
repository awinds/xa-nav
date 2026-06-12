-- 本地开发测试数据
-- 生产环境不需要导入本文件；请先执行 db/schema.sql 建表。
-- 应用连接到 D1 且表结构存在后，会自动写入默认配置和默认分类。
-- 如需演示数据，可在 D1 控制台或 wrangler d1 execute 中手动执行本文件。

-- 分类（顶级）
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('AI 工具', 'fa-solid fa-robot', 100);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('开发工具', 'fa-solid fa-code', 90);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('设计资源', 'fa-solid fa-paint-brush', 80);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('云盘存储', 'fa-solid fa-cloud', 70);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('社区论坛', 'fa-solid fa-comments', 60);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('新闻资讯', 'fa-solid fa-newspaper', 50);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('学习教程', 'fa-solid fa-book', 40);
INSERT OR IGNORE INTO categories (name, icon, sort_order) VALUES ('效率办公', 'fa-solid fa-bolt', 30);

-- 私密分类示例（登录后可见）
INSERT OR IGNORE INTO categories (name, icon, sort_order, is_private) VALUES ('私人收藏', 'fa-solid fa-lock', 20, 1);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order, is_private)
VALUES ('内部工具', 'fa-solid fa-shield-halved', (SELECT id FROM categories WHERE name='私人收藏'), 19, 1);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order, is_private)
VALUES ('个人资料', 'fa-solid fa-user-lock', (SELECT id FROM categories WHERE name='私人收藏'), 18, 1);

-- 子分类（AI 工具 下）
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('对话助手', 'fa-solid fa-comment', (SELECT id FROM categories WHERE name='AI 工具'), 99);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('图像生成', 'fa-solid fa-image', (SELECT id FROM categories WHERE name='AI 工具'), 98);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('AI 搜索', 'fa-solid fa-search', (SELECT id FROM categories WHERE name='AI 工具'), 97);

-- 子分类（开发工具 下）
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('代码托管', 'fa-solid fa-code-branch', (SELECT id FROM categories WHERE name='开发工具'), 89);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('部署平台', 'fa-solid fa-rocket', (SELECT id FROM categories WHERE name='开发工具'), 88);
INSERT OR IGNORE INTO categories (name, icon, parent_id, sort_order)
VALUES ('前端框架', 'fa-solid fa-globe', (SELECT id FROM categories WHERE name='开发工具'), 87);

-- AI 工具 - 对话助手
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('ChatGPT', 'https://chat.openai.com', 'OpenAI 推出的智能对话助手', '', (SELECT id FROM categories WHERE name='对话助手'), 'AI,对话,OpenAI', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Claude', 'https://claude.ai', 'Anthropic 出品的 AI 助手，擅长长文本分析', '', (SELECT id FROM categories WHERE name='对话助手'), 'AI,对话,Anthropic', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Gemini', 'https://gemini.google.com', 'Google 出品的多模态 AI 模型', '', (SELECT id FROM categories WHERE name='对话助手'), 'AI,Google,多模态', 98, 1);

-- AI 工具 - AI 搜索
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Perplexity', 'https://www.perplexity.ai', 'AI 驱动的搜索引擎，实时联网回答', '', (SELECT id FROM categories WHERE name='AI 搜索'), 'AI,搜索,问答', 97, 1);

-- AI 工具 - 图像生成
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Midjourney', 'https://www.midjourney.com', 'AI 图像生成工具，画质精美', '', (SELECT id FROM categories WHERE name='图像生成'), 'AI,图像,生成', 96, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Sora', 'https://sora.com', 'OpenAI 视频生成模型', '', (SELECT id FROM categories WHERE name='图像生成'), 'AI,视频,生成', 95, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Stable Diffusion', 'https://stability.ai', 'Stability AI 开源图像生成模型', '', (SELECT id FROM categories WHERE name='图像生成'), 'AI,图像,开源', 94, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Hugging Face', 'https://huggingface.co', 'AI 模型托管与共享社区', '', (SELECT id FROM categories WHERE name='AI 工具'), 'AI,模型,开源', 93, 1);

-- 开发工具 - 代码托管
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('GitHub', 'https://github.com', '全球最大代码托管与协作平台', '', (SELECT id FROM categories WHERE name='代码托管'), '开发,代码,Git', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('GitLab', 'https://gitlab.com', '开源 DevOps 平台，支持私有部署', '', (SELECT id FROM categories WHERE name='代码托管'), '开发,代码,DevOps', 99, 1);

-- 开发工具 - 部署平台
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Cloudflare', 'https://dash.cloudflare.com', 'CDN、边缘计算与安全防护平台', '', (SELECT id FROM categories WHERE name='部署平台'), '云,CDN,边缘计算', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Vercel', 'https://vercel.com', '前端部署与 Serverless 平台', '', (SELECT id FROM categories WHERE name='部署平台'), '部署,前端,Serverless', 97, 1);

-- 开发工具 - 前端框架
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Vite', 'https://vitejs.dev', '极速前端构建工具', '', (SELECT id FROM categories WHERE name='前端框架'), '前端,构建,工具', 95, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Tailwind CSS', 'https://tailwindcss.com', '实用优先的 CSS 框架', '', (SELECT id FROM categories WHERE name='前端框架'), 'CSS,前端,框架', 91, 1);

-- 开发工具（直属）
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('npm', 'https://www.npmjs.com', 'Node.js 包管理注册表', '', (SELECT id FROM categories WHERE name='开发工具'), 'Node.js,包管理,前端', 96, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('VS Code', 'https://code.visualstudio.com', '微软出品的轻量级代码编辑器', '', (SELECT id FROM categories WHERE name='开发工具'), '编辑器,IDE,微软', 94, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Stack Overflow', 'https://stackoverflow.com', '程序员问答社区', '', (SELECT id FROM categories WHERE name='开发工具'), '问答,社区,编程', 93, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Docker Hub', 'https://hub.docker.com', '容器镜像仓库', '', (SELECT id FROM categories WHERE name='开发工具'), 'Docker,容器,DevOps', 92, 1);

-- 设计资源
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Figma', 'https://www.figma.com', '在线协作设计工具', '', (SELECT id FROM categories WHERE name='设计资源'), '设计,UI,协作', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Dribbble', 'https://dribbble.com', '设计师作品灵感社区', '', (SELECT id FROM categories WHERE name='设计资源'), '设计,灵感,UI', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Unsplash', 'https://unsplash.com', '免费高质量图片素材库', '', (SELECT id FROM categories WHERE name='设计资源'), '图片,素材,免费', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Iconify', 'https://iconify.design', '超过 20 万个开源图标集合', '', (SELECT id FROM categories WHERE name='设计资源'), '图标,开源,SVG', 97, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Coolors', 'https://coolors.co', '在线调色板生成工具', '', (SELECT id FROM categories WHERE name='设计资源'), '颜色,调色板,设计', 96, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Font Awesome', 'https://fontawesome.com', '经典图标字体库', '', (SELECT id FROM categories WHERE name='设计资源'), '图标,字体,前端', 95, 1);

-- 云盘存储
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('阿里云盘', 'https://www.aliyundrive.com', '阿里巴巴大容量云盘，不限速', '', (SELECT id FROM categories WHERE name='云盘存储'), '云盘,存储,阿里', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('OneDrive', 'https://onedrive.live.com', '微软云盘，与 Office 深度集成', '', (SELECT id FROM categories WHERE name='云盘存储'), '云盘,微软,Office', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Google Drive', 'https://drive.google.com', 'Google 云盘，与 Docs 集成', '', (SELECT id FROM categories WHERE name='云盘存储'), '云盘,Google,协作', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Dropbox', 'https://www.dropbox.com', '老牌云存储与文件同步服务', '', (SELECT id FROM categories WHERE name='云盘存储'), '云盘,同步,存储', 97, 1);

-- 社区论坛
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('V2EX', 'https://www.v2ex.com', '开发者与创意工作者社区', '', (SELECT id FROM categories WHERE name='社区论坛'), '社区,技术,论坛', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Hacker News', 'https://news.ycombinator.com', 'Y Combinator 的技术新闻社区', '', (SELECT id FROM categories WHERE name='社区论坛'), '技术,新闻,英文', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Reddit', 'https://www.reddit.com', '全球最大话题讨论社区', '', (SELECT id FROM categories WHERE name='社区论坛'), '社区,讨论,英文', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('掘金', 'https://juejin.cn', '面向开发者的中文技术社区', '', (SELECT id FROM categories WHERE name='社区论坛'), '技术,中文,前端', 97, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('少数派', 'https://sspai.com', '效率工具与数字生活方式媒体', '', (SELECT id FROM categories WHERE name='社区论坛'), '效率,工具,数字生活', 96, 1);

-- 新闻资讯
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('The Verge', 'https://www.theverge.com', '科技与文化新闻媒体', '', (SELECT id FROM categories WHERE name='新闻资讯'), '科技,新闻,英文', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('36氪', 'https://36kr.com', '中国科技创业新闻平台', '', (SELECT id FROM categories WHERE name='新闻资讯'), '科技,创业,中文', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Wired', 'https://www.wired.com', '科技与未来趋势深度报道', '', (SELECT id FROM categories WHERE name='新闻资讯'), '科技,深度,英文', 98, 1);

-- 学习教程
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('MDN Web Docs', 'https://developer.mozilla.org', 'Web 技术权威文档', '', (SELECT id FROM categories WHERE name='学习教程'), '文档,Web,前端', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('freeCodeCamp', 'https://www.freecodecamp.org', '免费学习编程的互动平台', '', (SELECT id FROM categories WHERE name='学习教程'), '编程,学习,免费', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Coursera', 'https://www.coursera.org', '全球顶尖大学在线课程', '', (SELECT id FROM categories WHERE name='学习教程'), '课程,大学,在线', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('YouTube', 'https://www.youtube.com', '全球最大视频平台，海量教程', '', (SELECT id FROM categories WHERE name='学习教程'), '视频,教程,学习', 97, 1);

-- 效率办公
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Notion', 'https://www.notion.so', '全能笔记与知识管理工具', '', (SELECT id FROM categories WHERE name='效率办公'), '笔记,知识库,协作', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Obsidian', 'https://obsidian.md', '基于 Markdown 的本地知识库', '', (SELECT id FROM categories WHERE name='效率办公'), '笔记,Markdown,本地', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Trello', 'https://trello.com', '看板式项目管理工具', '', (SELECT id FROM categories WHERE name='效率办公'), '项目管理,看板,协作', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Linear', 'https://linear.app', '面向工程团队的项目管理工具', '', (SELECT id FROM categories WHERE name='效率办公'), '项目管理,工程,效率', 97, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Excalidraw', 'https://excalidraw.com', '手绘风格在线白板工具', '', (SELECT id FROM categories WHERE name='效率办公'), '白板,绘图,协作', 96, 1);

-- 私密分类示例网址（登录后可见）
INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Cloudflare Dashboard', 'https://dash.cloudflare.com', 'Cloudflare 账号控制台示例，归入私密分类用于演示登录后可见', '', (SELECT id FROM categories WHERE name='内部工具'), '私密,控制台,Cloudflare', 100, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('GitHub Settings', 'https://github.com/settings/profile', 'GitHub 个人设置页面示例', '', (SELECT id FROM categories WHERE name='个人资料'), '私密,GitHub,设置', 99, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Google Account', 'https://myaccount.google.com', 'Google 账号管理页面示例', '', (SELECT id FROM categories WHERE name='个人资料'), '私密,账号,Google', 98, 1);

INSERT OR IGNORE INTO bookmarks (title, url, description, favicon, category_id, tags, sort_order, enabled)
VALUES ('Notion Workspace', 'https://www.notion.so', '个人 Notion 工作区示例', '', (SELECT id FROM categories WHERE name='私人收藏'), '私密,笔记,工作区', 97, 1);
