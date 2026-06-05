# 点名宝 — 极简课堂签到系统

专为大学教师设计的极简课堂签到工具，30秒发起签到，课后自动统计出勤情况。

## 技术栈

- **Next.js 16** (App Router) + **TypeScript** (严格模式)
- **TailwindCSS v4** + **shadcn/ui** (Apple + Notion 设计风格)
- **Prisma ORM v7** + **SQLite** (libSQL 适配器)
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

### 示例账号

| 角色 | 邮箱 | 密码 |
|------|------|------|
| 教师 | teacher@demo.com | 123456 |

示例课程：高等数学（2026春季），已导入10名学生。

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
│   └── middleware.ts        # 路由守护
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
6. **动态二维码** — 每30秒自动刷新，显示倒计时和实时签到人数
7. **学生签到** — 扫码进入，输入学号+姓名验证
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
| DATABASE_URL | SQLite 数据库路径 | file:./dev.db |
| JWT_SECRET | JWT 签名密钥 | (必须设置) |
| NEXT_PUBLIC_APP_URL | 应用URL | http://localhost:3000 |

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
