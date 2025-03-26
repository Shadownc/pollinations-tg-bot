# Pollinations.AI Telegram 机器人

[English](README.md) | [中文](README.zh-CN.md)

一个利用 Pollinations.AI API 实现多种 AI 功能的 Telegram 机器人：
- 🎨 图像生成
- 🔊 音频生成（文字转语音）
- 👂 语音转文字
- 💬 与 AI 模型聊天
- 🤖 为每种功能选择不同模型
- 🌐 多语言支持（中文/英文）

## 功能特性

- 使用各种模型生成图像（flux、stable-diffusion 等）
- 使用不同声音生成音频（13种以上 OpenAI 声音）
- 语音转文字
- 与 AI 模型聊天（OpenAI、Mistral、Llama 等）
- 可自定义参数（种子、尺寸等）
- 语言切换（中文/英文界面）
- 详细的模型信息显示，包含模型功能标记

## 安装设置

1. 克隆此仓库
```bash
git clone https://github.com/yourusername/pollinations-tg-bot.git
cd pollinations-tg-bot
```

2. 安装依赖
```bash
npm install
```

3. 创建一个 `.env` 文件（使用 `.env.example` 作为模板）
```bash
cp .env.example .env
```

4. 从 [@BotFather](https://t.me/BotFather) 获取 Telegram 机器人令牌并添加到您的 `.env` 文件中

5. 本地启动机器人
```bash
npm run dev
```

## 环境变量

机器人使用以下环境变量：

| 变量 | 描述 | 是否必需 | 默认值 | 示例 |
|----------|-------------|----------|---------|---------|
| `BOT_TOKEN` | 来自 @BotFather 的 Telegram 机器人令牌 | 是 | - | `123456789:AABBccDDee-12345abcde` |
| `DEV_MODE` | 设置为 "true" 用于本地开发（使用轮询模式） | 否 | `false` | `true` |
| `WEBHOOK_URL` | Webhook 的公共 URL（仅生产环境需要） | 生产环境必需 | - | `https://your-bot.example.com` |
| `POLLINATIONS_IMAGE_API` | 自定义图像 API 端点 | 否 | `https://image.pollinations.ai` | - |
| `POLLINATIONS_TEXT_API` | 自定义文本 API 端点 | 否 | `https://text.pollinations.ai` | - |

## 部署方式

### Cloudflare Workers 部署

1. 在您的 wrangler.toml 文件中配置 `BOT_TOKEN` 和 `WEBHOOK_URL` 变量
2. 部署
```bash
npm run deploy:cf
```

### Docker 部署

1. 构建 Docker 镜像
```bash
docker build -t pollinations-tg-bot .
```

2. 运行容器
```bash
docker run -p 3000:3000 --env-file .env pollinations-tg-bot
```

## 使用方法

机器人运行后，您可以在 Telegram 上与其交互：

- `/start` - 启动机器人
- `/help` - 显示帮助信息
- `/image <提示词>` - 生成图像
- `/tts <文本>` - 将文本转换为语音
- `/stt` - 回复语音消息以将其转录
- `/chat <消息>` - 与 AI 模型聊天
- `/models` - 列出可用模型
- `/settings` - 更改机器人设置
- `/language` - 切换机器人语言
- `/clearchat` - 清除对话历史

## 配置选项

您可以通过 `/settings` 命令自定义以下设置：
- **图像设置**：默认模型、图像尺寸、提示词增强
- **文本设置**：文本生成模型
- **音频设置**：文字转语音的声音
- **语言设置**：界面语言（中文/英文）
- **其他设置**：隐私模式（在公共源中隐藏生成内容）

## 支持的模型

机器人支持多种模型：
- **文本模型**：OpenAI、Mistral、Llama、Gemini 等
- **图像模型**：Flux、SDXL、Pixart、DALL-E 等
- **音频模型**：OpenAI 提供的多种声音

模型能力通过图标显示：
- 👁️ - 支持图像理解
- 🤔 - 高级推理能力
- 🔒 - 启用内容过滤

## 国际化

机器人支持以下语言：
- 英语（默认）
- 中文

您可以随时使用 `/language` 命令或通过设置菜单切换语言。

## 项目结构

本机器人的项目结构如下：
- `src/` - 包含所有源代码
  - `services/` - Pollinations.AI 的 API 客户端
  - `handlers/` - 机器人的命令处理程序
  - `utils/` - 用于管理状态的实用函数
  - 针对不同部署选项的平台特定入口点

## 许可证

MIT 