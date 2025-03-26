const helpMessage = `
*Pollinations.AI Telegram Bot*

This bot leverages the Pollinations.AI API to provide AI-powered features:

*Commands:*
• /start - Start the bot
• /help - Show this help message
• /image <prompt> - Generate an image
• /tts <text> - Convert text to speech
• /stt - Reply to a voice message to transcribe it
• /chat <message> - Chat with AI models
• /models - List available models
• /settings - Change bot settings
• /clearchat - Clear conversation history

*Examples:*
/image A beautiful sunset over the ocean
/tts Hello, how are you today?
/chat Tell me about artificial intelligence
/models

For more information, visit [Pollinations.AI](https://pollinations.ai/)
`;

/**
 * Handle /start command
 * @param {Object} ctx - Telegram context
 */
async function handleStart(ctx) {
  await ctx.reply(`Welcome to the Pollinations.AI Telegram Bot, ${ctx.from.first_name}! 🌸\n\nI can help you generate images, audio, and chat with AI models. Use /help to see available commands.`);
}

/**
 * Handle /help command
 * @param {Object} ctx - Telegram context
 */
async function handleHelp(ctx) {
  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

export default {
  handleStart,
  handleHelp
}; 