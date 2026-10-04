# 点名宝 — 极简课堂签到系统

专为大学教师设计的极简课堂签到工具，30秒发起签到，课后自动统计出勤情况。

## 技术栈

- **Next.js 16** (App Router) + **TypeScript** (严格模式)
- **TailwindCSS v4** + **shadcn/ui** (Apple + Notion 设计风格)
- **Prisma ORM v7** + **PostgreSQL**
- **jose** (JWT 认证)
- **qrcode.react** (动态二维码)
- **xlsx** (Excel 导入/导出)
- **PWA** 支持

## 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装

```bash
# 1. 进入项目
cd dianmingbao

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET（生产环境务必修改）

# 4. 初始化数据库
npx prisma migrate dev --name init

# 5. 导入示例数据（可选）
npx tsx prisma/seed.ts

# 6. 启动开发服务器
npm run dev
```

访问 http://localhost:3000

## 项目结构

```
dianmingbao/
├── prisma/
│   ├── schema.prisma        # 数据库Schema
│   └── seed.ts              # 示例数据
├── src/
│   ├── app/                 # Next.js App Router 页面
│   │   ├── page.tsx         # 首页
│   │   ├── login/           # 登录
│   │   ├── register/        # 注册
│   │   ├── dashboard/       # 仪表盘
│   │   ├── courses/         # 课程管理
│   │   │   ├── [id]/        # 课程详情
│   │   │   ├── [id]/students/   # 学生管理
│   │   │   ├── [id]/attendance/ # 签到记录
│   │   │   └── [id]/attendance/[sessionId]/ # 签到详情
│   │   ├── attend/[token]/  # 学生签到（无需登录）
│   │   └── api/             # API 路由
│   ├── components/          # React 组件
│   │   ├── layout/          # 布局组件
│   │   ├── courses/         # 课程相关
│   │   ├── attendance/      # 签到相关
│   │   └── ui/              # shadcn/ui 组件
│   ├── lib/                 # 工具库
│   │   ├── prisma.ts        # Prisma 客户端
│   │   ├── auth.ts          # JWT 认证
│   │   ├── attendance.ts    # 签到业务逻辑
│   │   ├── excel.ts         # Excel 处理
│   │   └── stats.ts         # 统计计算
│   ├── types/               # TypeScript 类型
│   └── proxy.ts             # 路由守护（Next 16 的 middleware）
├── public/
│   └── manifest.json        # PWA 配置
└── package.json
```

## 功能模块

1. **教师登录系统** — 邮箱+密码注册/登录（JWT Cookie认证）
2. **首页仪表盘** — 课程数量、学生人数、签到统计
3. **课程管理** — 创建、编辑、删除课程
4. **学生管理** — 手动添加/编辑/删除 + Excel批量导入
5. **发起签到** — 选择时长，生成动态二维码
6. **动态二维码** — 每30秒更换签名，截图/转发的旧二维码 1 分钟内失效；支持投屏模式
7. **学生签到** — 扫码进入，输入姓名验证
8. **签到记录** — 查看全部签到历史和详情
9. **签到详情** — 应到/实到/缺席名单
10. **学期统计** — 每个学生出勤率自动计算
11. **Excel导出** — 一键下载课程考勤统计表

## 数据库模型

| 表 | 说明 |
|---|---|
| User | 教师账号 |
| Course | 课程 |
| Student | 学生 |
| AttendanceSession | 签到任务 |
| AttendanceRecord | 签到记录 |

## 部署

### 生产构建

```bash
npm run build
npm start
```

### Docker 部署

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DATABASE_URL | PostgreSQL 连接地址。Vercel 上请使用 Supabase **连接池地址（pooler，端口 6543）** | (必须设置) |
| JWT_SECRET | JWT 签名 + 二维码签名密钥（至少 32 位随机字符串） | (必须设置) |
| RESEND_API_KEY | 邮件验证码发送。生产环境必须配置，否则无法注册 | — |
| DB_POOL_MAX | 每个实例的数据库连接数 | 5 |
| DB_CONNECT_TIMEOUT_MS | 获取数据库连接超时 | 10000 |
| DB_STATEMENT_TIMEOUT_MS | 单条 SQL 最长执行时间 | 15000 |

## 测试

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm test             # 单元测试（二维码签名、限流、姓名匹配、时区）
# 端到端冒烟测试（需要已启动的服务和数据库）
BASE_URL=http://localhost:3000 E2E_EMAIL=教师邮箱 E2E_PASSWORD=密码 npm run test:e2e
```

## 运维

- 健康检查：`GET /api/health`（数据库可用返回 200，否则 503），可接入 UptimeRobot 等监控
- 服务端异常以 JSON 结构化日志输出（`"level":"error"`），在 Vercel Logs 中可直接检索
- 数据库初始化：新环境用 `npx prisma migrate deploy`，或在 Supabase SQL Editor 执行 `supabase-init.sql`（两者结构一致）

## 设计规范

- **主色**: #2563EB
- **成功色**: #10B981
- **背景色**: #F8FAFC
- **卡片色**: #FFFFFF
- **危险色**: #EF4444
- **圆角**: 大圆角 (1rem)
- **字体**: 系统字体优先
- **风格**: Apple + Notion 极简风格

---

**点名宝** · 让课堂签到变得更简单
