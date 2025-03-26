# Pollinations.AI Telegram 机器人部署指南

本指南提供了将 Pollinations.AI Telegram 机器人部署到各种平台的详细说明。请选择最适合您需求的部署方法。

## 目录
- [前提条件](#前提条件)
- [本地开发](#本地开发)
- [Cloudflare Workers 部署](#cloudflare-workers-部署)
- [Docker 部署](#docker-部署)
- [故障排除](#故障排除)

## 前提条件

在部署机器人之前，请确保您具备以下条件：

1. **Telegram 机器人令牌**：从 Telegram 上的 [@BotFather](https://t.me/BotFather) 获取
2. **Node.js**：版本 18.0.0 或更高（本项目使用 ESM 模块格式）
3. **Git**：用于克隆存储库和版本控制

## 本地开发

对于测试和开发，您可以在本地机器上运行机器人：

1. 克隆存储库：
   ```bash
   git clone https://github.com/yourusername/pollinations-tg-bot.git
   cd pollinations-tg-bot
   ```

2. 安装依赖项：
   ```bash
   npm install
   ```

3. 创建 `.env` 文件：
   ```bash
   cp .env.example .env
   ```

4. 编辑 `.env` 文件并添加您的 Telegram 机器人令牌：
   ```
   BOT_TOKEN=您的_telegram_机器人令牌
   DEV_MODE=true
   ```

5. 以开发模式启动机器人：
   ```bash
   npm run dev
   ```

现在，机器人将以轮询模式运行，这意味着它将持续检查新消息。此模式仅推荐用于开发。

## Cloudflare Workers 部署

Cloudflare Workers 提供了一个全球性、低延迟的无服务器平台：

### 步骤 1：设置 Cloudflare Workers

1. 如果您还没有 [Cloudflare](https://www.cloudflare.com/) 账户，请创建一个

2. 安装 Wrangler，Cloudflare Workers CLI（如果项目中尚未安装）：
   ```bash
   npm install -g wrangler
   ```
   
   注意：本项目已包含 Wrangler 作为开发依赖，因此您可以使用项目的版本。

3. 与 Cloudflare 进行身份验证：
   ```bash
   npx wrangler login
   ```

### 步骤 2：配置您的项目

1. 项目已包含基本的 `wrangler.toml` 文件。编辑它以包含您的机器人令牌：
   ```toml
   name = "pollinations-tg-bot"
   main = "src/cloudflare-entry.js"
   compatibility_date = "2023-07-24"

   [vars]
   BOT_TOKEN = "您的_telegram_机器人令牌"
   ```

2. 为了更好的安全性，建议使用 Wrangler 命令将您的令牌添加为机密：
   ```bash
   npx wrangler secret put BOT_TOKEN
   ```
   出现提示时，输入您的 Telegram 机器人令牌

### 步骤 3：部署到 Cloudflare Workers

1. 部署您的机器人：
   ```bash
   npm run deploy:cf
   ```
   或手动执行：
   ```bash
   npx wrangler publish
   ```

2. 部署后，您将收到一个 Workers URL（例如，`https://pollinations-tg-bot.your-username.workers.dev`）

### 步骤 4：配置 Webhook

1. 编辑您的 `wrangler.toml` 文件以添加 `WEBHOOK_URL`：
   ```toml
   [vars]
   BOT_TOKEN = "您的_telegram_机器人令牌"
   WEBHOOK_URL = "https://pollinations-tg-bot.your-username.workers.dev"
   ```

2. 重新部署您的机器人：
   ```bash
   npm run deploy:cf
   ```

3. 在浏览器中访问您的 Workers URL，以验证 webhook 设置是否正确。

## Docker 部署

Docker 允许您在容器化环境中部署机器人：

### 步骤 1：构建 Docker 镜像

1. 确保您的系统上安装了 Docker

2. 项目已包含 `Dockerfile`。使用它构建 Docker 镜像：
   ```bash
   docker build -t pollinations-tg-bot .
   ```

### 步骤 2：运行容器

1. 创建一个包含您配置的 `.env` 文件，或直接传递环境变量：
   ```bash
   docker run -p 3000:3000 \
     -e BOT_TOKEN=您的_telegram_机器人令牌 \
     -e WEBHOOK_URL=您的_公共_URL \
     pollinations-tg-bot
   ```

   或使用 `.env` 文件：
   ```bash
   docker run -p 3000:3000 --env-file .env pollinations-tg-bot
   ```

### 步骤 3：设置 webhook（用于生产环境）

对于使用 Docker 的生产部署，您需要确保您的容器可通过公共 URL 访问：

1. 确保您的 Docker 主机有公共 IP 和域名

2. 配置反向代理（如 Nginx）将流量转发到您的 Docker 容器：
   ```nginx
   server {
       listen 443 ssl;
       server_name your-bot-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. 为您的域名使用 HTTPS（使用 Let's Encrypt 或其他证书提供商）

4. 将 `WEBHOOK_URL` 设置为您的公共 HTTPS URL：
   ```
   WEBHOOK_URL=https://your-bot-domain.com
   ```

## 故障排除

### 常见问题

1. **机器人无响应**：
   - 检查您的 `BOT_TOKEN` 是否正确
   - 验证 webhook 设置是否正确（开发模式不需要）
   - 查看日志中是否有错误
   - 确保您使用的是正确的 Node.js 版本（18+）

2. **Webhook 设置失败**：
   - 确保您的 `WEBHOOK_URL` 使用 HTTPS
   - 确保 URL 可公开访问
   - 检查任何防火墙或网络限制
   - 验证应用程序是否在端口 3000 上监听

3. **模块导入错误**：
   - 该项目使用 ECMAScript 模块格式（ESM）
   - 确保在导入中明确指定文件扩展名（例如，`import './module.js'`）
   - 检查是否有任何模块解析错误

4. **Cloudflare Workers 错误**：
   - 检查您的 `wrangler.toml` 配置
   - 验证您在 Cloudflare 账户中拥有正确的权限
   - 查看部署日志中的具体错误
   - 确保您的 Workers 脚本与 Cloudflare 的限制兼容

### 获取帮助

如果您遇到本指南未涵盖的问题：

1. 查看项目的 GitHub issues，看看其他人是否遇到过类似问题
2. 加入 Telegram 开发者社区寻求帮助
3. 查阅 Telegram Bot API 文档，了解 webhook 和机器人设置指南
4. 查看 `grammy` 库的文档（https://grammy.dev），这是该项目使用的 Telegram 机器人框架

---

## 最终步骤

部署机器人后：

1. 测试所有命令，确保它们正常工作：
   - `/start` - 开始使用机器人
   - `/help` - 获取帮助信息
   - `/chat` - 开始聊天
   - `/image` - 生成图像
   - `/tts` - 文本转语音转换
   - `/voices` - 查看可用的语音列表
   - `/settings` - 调整机器人设置

2. 监控机器人的性能和日志
3. 保持您的部署与最新代码更改同步

按照这些说明，您的 Pollinations.AI Telegram 机器人应该成功部署并可供 Telegram 用户访问。如果您有任何与部署相关的特定问题，请参阅上面的故障排除部分。 