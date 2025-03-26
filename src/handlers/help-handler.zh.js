const helpMessage = `
*Pollinations.AI Telegram 机器人*

此机器人利用 Pollinations.AI API 提供由 AI 驱动的功能：

*命令：*
• /start - 启动机器人
• /help - 显示此帮助信息
• /image <提示词> - 生成图像
• /tts <文本> - 将文本转换为语音
• /stt - 回复语音消息以将其转录
• /chat <消息> - 与 AI 模型聊天
• /models - 列出可用模型
• /settings - 更改机器人设置
• /clearchat - 清除对话历史

*示例：*
/image 美丽的海上日落
/tts 你好，今天过得怎么样？
/chat 告诉我关于人工智能的信息
/models

更多信息，请访问 [Pollinations.AI](https://pollinations.ai/)
`;

/**
 * 处理 /start 命令
 * @param {Object} ctx - Telegram 上下文
 */
async function handleStart(ctx) {
  await ctx.reply(`欢迎使用 Pollinations.AI Telegram 机器人，${ctx.from.first_name}！🌸\n\n我可以帮助您生成图像、音频，并与 AI 模型聊天。使用 /help 查看可用命令。`);
}

/**
 * 处理 /help 命令
 * @param {Object} ctx - Telegram 上下文
 */
async function handleHelp(ctx) {
  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

export default {
  handleStart,
  handleHelp
}; 