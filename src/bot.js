import { Bot } from 'grammy';
import handlers from './handlers/index.js';
import i18n from './utils/i18n.js';
import { getHelpHandler } from './utils/i18n.js';

/**
 * 处理Bot更新的函数，在非Cloudflare环境和互操作性场景中使用
 * Function to handle bot updates for non-Cloudflare environment and interoperability
 * @param {string} token - Telegram bot token
 * @param {Object} update - Telegram update object
 * @returns {Promise<Object>} - Processing result
 */
export async function handleBotUpdate(token, update) {
  try {
    // 解析 bot ID 和用户名
    const botId = parseInt(token.split(':')[0]);
    // 使用环境变量中的BOT_USERNAME，如果没有则使用AipolBot作为默认值
    const botUsername = process.env.BOT_USERNAME || 'AipolBot';
    
    console.log(`[bot.js] 使用机器人ID=${botId}, 用户名=${botUsername}`);
    
    // 创建 Bot 实例
    const bot = new Bot(token, {
      botInfo: {
        id: botId,
        is_bot: true,
        first_name: "PolliantionsAI",
        username: botUsername,
        can_join_groups: true,
        can_read_all_group_messages: true,
        supports_inline_queries: false
      }
    });
    
    // 确保 bot 已初始化
    if (!bot.botInfo) {
      console.log("[bot.js] 手动初始化 bot...");
      await bot.init();
    }
    
    // 注册命令处理程序
    registerHandlers(bot);
    
    // 处理更新
    await bot.handleUpdate(update);
    return { success: true };
  } catch (error) {
    console.error('[bot.js] 处理更新错误:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * 注册所有处理程序
 * Register all handlers
 * @param {Bot} bot - Grammy Bot实例
 */
function registerHandlers(bot) {
  // 基本中间件
  bot.use(async (ctx, next) => {
    // 确保ctx.state对象存在
    if (!ctx.state) ctx.state = {};
    
    // 处理帮助和开始命令
    if (ctx.message?.text) {
      const startMatch = ctx.message.text.match(/^\/start(@\w+)?$/);
      const helpMatch = ctx.message.text.match(/^\/help(@\w+)?$/);
      
      if (startMatch || helpMatch) {
        const userId = ctx.from.id.toString();
        const helpHandler = getHelpHandler(userId);
        
        if (startMatch) await helpHandler.handleStart(ctx);
        else await helpHandler.handleHelp(ctx);
        return;
      }
    }
    
    await next();
  });
  
  // 命令处理程序
  bot.command('image', handlers.handleImage);
  bot.command('tts', handlers.handleTTSCommand);
  bot.command('stt', handlers.handleSTTCommand);
  bot.command('chat', handlers.handleChat);
  bot.command('clearchat', handlers.handleClearChat);
  bot.command('models', handlers.handleModels);
  bot.command('textmodels', handlers.handleTextModels);
  bot.command('imagemodels', handlers.handleImageModels);
  bot.command('voices', handlers.handleVoices);
  bot.command('settings', handlers.handleSettings);
  bot.command('language', i18n.handleLanguageCommand);
  
  // 回调查询处理
  bot.callbackQuery(/^settings:|^image:|^text:|^audio:|^other:/, handlers.handleSettingsCallback);
  bot.callbackQuery(/^lang:/, i18n.handleLanguageCallback);
  
  // 错误处理
  bot.catch((err) => {
    console.error('[bot.js] Bot错误:', err);
  });
} 