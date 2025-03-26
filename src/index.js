import { Bot, session } from 'grammy';
import dotenv from 'dotenv';
import handlers from './handlers/index.js';
import i18n from './utils/i18n.js';
import { getHelpHandler } from './utils/i18n.js';

// Load environment variables
// 加载环境变量
dotenv.config();

// Create bot instance
// 创建机器人实例
export const bot = new Bot(process.env.BOT_TOKEN);

// Set up session middleware
// 设置会话中间件
bot.use(session({ initial: () => ({}) }));

// Custom middleware to handle localized help commands
// 自定义中间件处理本地化帮助命令
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    // 使用正则表达式匹配 /start 或 /help，支持带有机器人用户名的格式
    const startMatch = ctx.message.text.match(/^\/start(@\w+)?$/);
    const helpMatch = ctx.message.text.match(/^\/help(@\w+)?$/);
    
    if (startMatch || helpMatch) {
      const userId = ctx.from.id.toString();
      const helpHandler = getHelpHandler(userId);  // 根据用户语言获取对应的帮助处理程序
      
      if (startMatch) {
        await helpHandler.handleStart(ctx);  // 调用适当语言的启动处理程序
      } else {
        await helpHandler.handleHelp(ctx);   // 调用适当语言的帮助处理程序
      }
      return;
    }
  }
  
  return next();
});

// 自定义中间件来处理所有命令，包括带有机器人用户名的格式
// 这个中间件在标准命令处理之前运行，确保格式正确解析
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text && ctx.message.text.startsWith('/')) {
    // 记录收到的命令以进行调试
    const commandText = ctx.message.text;
    console.log(`收到命令: ${commandText}`);
    
    // 提取命令部分（不包括参数）
    const commandMatch = commandText.match(/^\/([a-zA-Z0-9_]+)(@\w+)?(\s|$)/);
    if (commandMatch) {
      const commandName = commandMatch[1].toLowerCase();
      console.log(`提取的命令: ${commandName}`);
      
      // 确保ctx.state是一个对象
      if (!ctx.state) {
        ctx.state = {};
      }
      
      // 存储原始命令文本，以便后续处理函数可以使用
      ctx.state.originalCommandText = commandText;
      
      // 直接处理各种命令，确保支持 /command@BotName 格式
      // 这个逻辑会补充标准的命令处理程序，确保所有命令在群组中能够正常工作
      const restOfMessage = commandText.replace(/^\/[a-zA-Z0-9_]+(@\w+)?/, '').trim();
      
      switch (commandName) {
        case 'settings':
          await handlers.handleSettings(ctx);
          return; // 处理完毕，不继续执行后续中间件
        case 'models':
          await handlers.handleModels(ctx);
          return;
        case 'textmodels':
          await handlers.handleTextModels(ctx);
          return;
        case 'imagemodels':
          await handlers.handleImageModels(ctx);
          return;
        case 'voices':
          await handlers.handleVoices(ctx);
          return;
        case 'language':
          await i18n.handleLanguageCommand(ctx);
          return;
        case 'clearchat':
          await handlers.handleClearChat(ctx);
          return;
        // 有参数的命令允许继续到标准处理程序
      }
    }
  }
  
  // 继续到下一个中间件（包括标准命令处理器）
  return next();
});

// 设置命令列表，使其在群组中也能显示命令提示
async function setupBotCommands() {
  try {
    // 定义中英文命令描述
    const commands = [
      { command: "start", description: "Start the bot / 启动机器人" },
      { command: "help", description: "Show help information / 显示帮助信息" },
      { command: "image", description: "Generate an image / 生成图片" },
      { command: "tts", description: "Convert text to speech / 文字转语音" },
      { command: "stt", description: "Transcribe audio / 语音转文字" },
      { command: "chat", description: "Chat with AI / 与AI聊天" },
      { command: "models", description: "List available models / 列出可用模型" },
      { command: "settings", description: "Change settings / 更改设置" },
      { command: "language", description: "Change language / 更改语言" },
      { command: "clearchat", description: "Clear chat history / 清除聊天历史" }
    ];
    
    // 设置所有群组和私聊中的命令列表
    await bot.api.setMyCommands(commands, {
      scope: { type: "default" }
    });
    
    // 专门为群组设置命令列表
    await bot.api.setMyCommands(commands, {
      scope: { type: "all_group_chats" }
    });
    
    console.log("Bot commands set up successfully");
  } catch (error) {
    console.error("Error setting up bot commands:", error);
  }
}

// Register command handlers
// 注册命令处理程序
bot.command('image', handlers.handleImage);        // 图像生成命令
bot.command('tts', handlers.handleTTSCommand);     // 文本转语音命令
bot.command('stt', handlers.handleSTTCommand);     // 语音转文本命令
bot.command('chat', handlers.handleChat);          // 聊天命令
bot.command('clearchat', handlers.handleClearChat); // 清除聊天历史命令
bot.command('models', handlers.handleModels);       // 获取所有模型列表
bot.command('textmodels', handlers.handleTextModels); // 获取文本模型列表
bot.command('imagemodels', handlers.handleImageModels); // 获取图像模型列表
bot.command('voices', handlers.handleVoices);       // 获取可用声音列表
bot.command('settings', handlers.handleSettings);    // 设置命令
bot.command('language', i18n.handleLanguageCommand); // 语言切换命令

// Handle settings callbacks
// 处理设置回调
bot.callbackQuery(/^settings:|^image:|^text:|^audio:|^other:/, handlers.handleSettingsCallback);

// Handle language selection callbacks
// 处理语言选择回调
bot.callbackQuery(/^lang:/, i18n.handleLanguageCallback);

// Handle errors
// 处理错误
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start the bot (if running directly)
// 启动机器人（如果直接运行）
if (process.env.DEV_MODE === 'true') {
  console.log('Starting bot in development mode (polling)...');
  setupBotCommands().then(() => {
    bot.start();
  });
} else {
  // 即使在webhook模式下也设置命令列表
  setupBotCommands();
}

export default bot; 