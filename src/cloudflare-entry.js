import { Bot } from 'grammy';
import handlers from './handlers/index.js';
import i18n from './utils/i18n.js';
import { getHelpHandler } from './utils/i18n.js';
import { Context as BotContext } from 'grammy';
import { getEnv } from './services/pollinations-api.js';
import { handleBotUpdate } from './bot.js';
import { generateImage } from './services/pollinations-api.js';

// 在 Cloudflare Workers 环境中不使用 dotenv
// Do not use dotenv in Cloudflare Workers environment
// Instead, env variables are passed from wrangler.toml or secrets

// Set webhook options
// 设置 webhook 选项
const webhookOptions = {
  timeoutMilliseconds: 60000, // 60 seconds (60 秒超时)
};

// 设置全局环境变量（Cloudflare Workers 兼容方式）
// Setup global environment variables (Cloudflare Workers compatible way)
function setupEnvironment(env) {
  // 确保 globalThis.process 存在
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {};
  }
  
  // 确保 globalThis.process.env 存在
  if (typeof globalThis.process.env === 'undefined') {
    globalThis.process.env = {};
  }
  
  // 将 env 中的变量复制到 globalThis.process.env
  Object.keys(env).forEach(key => {
    globalThis.process.env[key] = env[key];
  });
}

// 确保在所有环境中都可以使用的安全Base64编码函数
function safeBase64Encode(str) {
  try {
    // 优先使用内置的btoa函数
    if (typeof btoa === 'function') {
      return btoa(str);
    }
    
    // 如果没有btoa函数，手动实现Base64编码
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    
    for (let i = 0; i < str.length; i += 3) {
      const chr1 = str.charCodeAt(i);
      const chr2 = i + 1 < str.length ? str.charCodeAt(i + 1) : 0;
      const chr3 = i + 2 < str.length ? str.charCodeAt(i + 2) : 0;
      
      const enc1 = chr1 >> 2;
      const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      const enc4 = chr3 & 63;
      
      output += chars.charAt(enc1) + chars.charAt(enc2) +
                ((i + 1 < str.length) ? chars.charAt(enc3) : '=') +
                ((i + 2 < str.length) ? chars.charAt(enc4) : '=');
    }
    
    return output;
  } catch (e) {
    console.error('Base64编码错误:', e);
    return '';
  }
}

// 简化的 webhook 设置函数
// Simplified webhook setup function
async function setupWebhook(token, webhookUrl) {
  if (!webhookUrl) {
    return { success: false, message: 'WEBHOOK_URL is not set in environment variables' };
  }
  
  try {
    // 解析机器人ID和用户名
    const botId = parseInt(token.split(':')[0]);
    
    // 创建Bot实例
    const bot = new Bot(token);
    
    // 先获取机器人信息
    try {
      const me = await bot.api.getMe();
      console.log("Verified bot info:", JSON.stringify(me));
      
      // 设置BOT_USERNAME环境变量
      if (me.username) {
        process.env.BOT_USERNAME = me.username;
        console.log(`Set BOT_USERNAME to ${me.username} from API response`);
      }
    } catch (infoError) {
      console.error("Error getting bot info:", infoError);
      // 如果无法获取，使用默认值
      process.env.BOT_USERNAME = process.env.BOT_USERNAME || 'AipolBot';
    }
    
    // 设置webhook
    await bot.api.setWebhook(webhookUrl);
    console.log(`Webhook set to ${webhookUrl}`);
    
    // 设置命令列表，使其在群组中也能显示命令提示
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
    } catch (cmdError) {
      console.error("Error setting up bot commands:", cmdError);
    }
    
    return { 
      success: true, 
      message: 'Webhook set successfully', 
      webhook_url: webhookUrl,
      bot_username: process.env.BOT_USERNAME 
    };
  } catch (error) {
    console.error('Error setting webhook:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// 简化的 webhook 处理函数 
// Simplified webhook handling function
async function handleBotUpdateInternal(token, update) {
  try {
    // 解析 bot ID 和用户名
    const botId = parseInt(token.split(':')[0]);
    // 使用环境变量中的BOT_USERNAME，如果没有则使用AipolBot作为默认值
    const botUsername = process.env.BOT_USERNAME || 'AipolBot';
    
    console.log(`使用机器人ID=${botId}, 用户名=${botUsername}`);
    
    // 创建 Bot 并明确提供 botInfo
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
      console.log("手动初始化 bot...");
      await bot.init();
    }
    
    // 添加上下文初始化中间件，确保ctx.state总是存在
    bot.use((ctx, next) => {
      if (!ctx.state) {
        ctx.state = {};
      }
      return next();
    });
    
    // 打印调试信息
    if (update.message && update.message.text) {
      console.log(`处理消息: "${update.message.text.substring(0, 50)}${update.message.text.length > 50 ? '...' : ''}", botInfo:`, 
        JSON.stringify(bot.botInfo));
    }
    
    // 注册所有处理程序
    registerHandlers(bot);
    
    // 直接处理更新
    await bot.handleUpdate(update);
    return { success: true };
  } catch (error) {
    console.error('Error handling update:', error);
    
    // 如果有必要，尝试直接通知用户
    if (update.message && update.message.chat && update.message.chat.id) {
      try {
        const chatId = update.message.chat.id;
        
        // 直接使用fetch API发送消息，避免需要初始化bot
        const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
        const payload = {
          chat_id: chatId,
          text: `⚠️ 处理命令时出错: ${error.message}\n请稍后重试。`
        };
        
        await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      } catch (notifyError) {
        console.error('通知用户出错:', notifyError);
      }
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// 注册所有处理程序的函数
// Function to register all handlers
function registerHandlers(bot) {
  // 设置基本中间件
  bot.use(async (ctx, next) => {
    // 确保ctx.state对象始终存在
    if (!ctx.state) {
      ctx.state = {};
    }
    
    // 语言支持和帮助命令处理
    if (ctx.message && ctx.message.text) {
      // 使用正则表达式匹配 /start 或 /help，支持带有机器人用户名的格式
      const startMatch = ctx.message.text.match(/^\/start(@\w+)?$/);
      const helpMatch = ctx.message.text.match(/^\/help(@\w+)?$/);
      
      if (startMatch || helpMatch) {
        const userId = ctx.from.id.toString();
        const helpHandler = getHelpHandler(userId);
        
        if (startMatch) {
          await helpHandler.handleStart(ctx);
        } else {
          await helpHandler.handleHelp(ctx);
        }
        return;
      }
    }
    
    await next();
  });
  
  // 自定义中间件来处理所有命令，包括带有机器人用户名的格式
  // 这个中间件在标准命令处理之前运行，确保格式正确解析
  bot.use(async (ctx, next) => {
    if (!ctx.message || !ctx.message.text || !ctx.message.text.startsWith('/')) {
      return next();
    }
    
    if (!ctx.from) {
      console.warn("ctx.from 为空，无法处理命令");
      return next();
    }
    
    // 确保ctx.state对象存在
    if (!ctx.state) {
      ctx.state = {};
    }
    
    // 记录收到的命令以进行调试
    const commandText = ctx.message.text;
    const chatId = ctx.chat ? ctx.chat.id : '未知';
    const userId = ctx.from ? ctx.from.id : '未知';
    const chatType = ctx.chat ? ctx.chat.type : '未知';
    
    console.log(`收到命令: ${commandText}, 聊天ID: ${chatId}, 用户ID: ${userId}, 聊天类型: ${chatType}`);
    
    // 提取命令部分和机器人用户名
    const commandMatch = commandText.match(/^\/([a-zA-Z0-9_]+)(@(\w+))?(\s|$)/);
    if (!commandMatch) {
      console.log("不是有效的命令格式");
      return next();
    }
    
    const commandName = commandMatch[1].toLowerCase();
    const specifiedBotUsername = commandMatch[3]; // 可能是undefined
    
    console.log(`解析命令: ${commandName}, 机器人用户名: ${specifiedBotUsername || '未指定'}`);
    
    // 如果指定了机器人用户名，检查是否为当前机器人
    if (specifiedBotUsername) {
      // 获取当前机器人的用户名
      const currentBotUsername = ctx.me?.username || ctx.botInfo?.username || 'AipolBot';
      console.log(`当前机器人用户名: ${currentBotUsername}`);
      
      // 检查用户名是否匹配，区分大小写比较
      // 修改: 用户名比较时忽略大小写
      if (specifiedBotUsername.toLowerCase() !== currentBotUsername.toLowerCase()) {
        console.log(`命令不是给当前机器人的，忽略。目标: ${specifiedBotUsername}, 当前: ${currentBotUsername}`);
        return; // 不处理其他机器人的命令
      }
    }
    
    // 确保ctx.state是一个对象
    if (!ctx.state) {
      ctx.state = {};
    }
    
    // 存储原始命令文本，以便后续处理函数可以使用
    ctx.state.originalCommandText = commandText;
    
    // 直接处理各种命令，确保支持 /command@BotName 格式
    // 这个逻辑会补充标准的命令处理程序，确保所有命令在群组中能够正常工作
    const restOfMessage = commandText.replace(/^\/[a-zA-Z0-9_]+(@\w+)?/, '').trim();
    console.log(`命令参数: "${restOfMessage}"`);
    
    switch (commandName) {
      case 'start':
        console.log(`处理 start 命令`);
        const startHandler = getHelpHandler(userId.toString());
        await startHandler.handleStart(ctx);
        return; // 处理完毕，不继续执行后续中间件
        
      case 'help':
        console.log(`处理 help 命令`);
        const helpHandler = getHelpHandler(userId.toString());
        await helpHandler.handleHelp(ctx);
        return; // 处理完毕，不继续执行后续中间件
        
      case 'settings':
        console.log(`处理 settings 命令`);
        await handlers.handleSettings(ctx);
        return; // 处理完毕，不继续执行后续中间件
      
      case 'models':
        console.log(`处理 models 命令`);
        await handlers.handleModels(ctx);
        return;
        
      case 'textmodels':
        console.log(`处理 textmodels 命令`);
        await handlers.handleTextModels(ctx);
        return;
        
      case 'imagemodels':
        console.log(`处理 imagemodels 命令`);
        await handlers.handleImageModels(ctx);
        return;
        
      case 'voices':
        console.log(`处理 voices 命令`);
        await handlers.handleVoices(ctx);
        return;
        
      case 'language':
        console.log(`处理 language 命令`);
        await i18n.handleLanguageCommand(ctx);
        return;
        
      case 'clearchat':
        console.log(`处理 clearchat 命令`);
        await handlers.handleClearChat(ctx);
        return;
        
      case 'image':
        console.log(`处理 image 命令`);
        await handlers.handleImage(ctx);
        return;
        
      case 'tts':
        console.log(`处理 tts 命令`);
        await handlers.handleTTSCommand(ctx);
        return;
        
      case 'stt':
        console.log(`处理 stt 命令`);
        await handlers.handleSTTCommand(ctx);
        return;
        
      case 'chat':
        console.log(`处理 chat 命令`);
        await handlers.handleChat(ctx);
        return;
        
      default:
        console.log(`未知命令: ${commandName}，继续到标准命令处理`);
    }
    
    // 继续到下一个中间件（包括标准命令处理器）
    return next();
  });
  
  // 命令处理程序
  bot.command('image', handlers.handleImage);
  bot.command('tts', handlers.handleTTSCommand);
  bot.command('stt', handlers.handleSTTCommand);
  bot.command('chat', handlers.handleChat);
  // 下面的命令我们已经在中间件中处理了，但仍然保留这些处理程序以防万一
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
    console.error('Bot error:', err);
  });
}

/**
 * 单独处理图像生成命令
 * 这个函数用于专门处理需要更长时间的图像生成流程
 * @param {string} token - Telegram 机器人令牌
 * @param {Object} update - Telegram 更新对象
 * @returns {Promise<Object>} 处理结果
 */
async function handleImageCommand(token, update) {
  try {
    console.log("处理图像命令...");
    
    // 获取聊天和用户信息
    const message = update.message;
    const chatId = message.chat.id;
    
    // 提取提示词 - 处理带或不带机器人用户名的/image命令
    const messageText = message.text || '';
    const prompt = messageText.replace(/^\/image(@\w+)?(\s+)?/, '').trim();
    
    // 如果没有提供提示词，发送错误消息
    if (!prompt) {
      await sendTelegramMessage(
        token, 
        chatId, 
        '请在命令后输入您想要生成的图像描述。例如: /image 美丽的海滩日落'
      );
      return;
    }

    console.log(`收到图像生成请求: 提示词长度=${prompt.length} 字符`);
    
    // 首先发送状态消息
    const statusMsg = await sendTelegramMessage(
      token, 
      chatId, 
      "🖼️ 正在准备您的图像...\n\n请稍候，图像生成中...",
      message.message_id
    );
    
    try {
      // 生成随机种子，避免缓存问题
      const seed = Math.floor(Math.random() * 1000000000);
      
      // 选择合适的模型和尺寸
      const model = 'flux'; // 使用更快速的模型
      const width = 512;    // 选择较小尺寸以提高生成速度
      const height = 512;
      
      // 获取Pollinations API URL (从pollinations-api.js模块的getEnv函数)
      const pollinationsApiUrl = 'https://image.pollinations.ai'; // 默认值
      
      // 处理提示词
      let effectivePrompt = prompt;
      // 如果提示词过长，截断至300字符
      if (prompt.length > 300) {
        effectivePrompt = prompt.substring(0, 300);
        console.log(`提示词过长(${prompt.length})，截断至300字符`);
      }
      
      // 使用双重编码保护特殊字符
      const encodedPrompt = encodeURIComponent(encodeURIComponent(effectivePrompt));
      
      // 构建多个URL格式尝试
      const imageUrl = `${pollinationsApiUrl}/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`;
      
      // 尝试使用Telegram API直接发送图像URL
      console.log(`尝试通过URL发送图片: ${imageUrl.substring(0, 100)}...`);
      
      const telegramUrl = `https://api.telegram.org/bot${token}/sendPhoto`;
      const photoData = {
        chat_id: chatId,
        photo: imageUrl,
        reply_to_message_id: message.message_id,
        caption: `🖼️ 已生成图像\n\n提示词: ${prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt}`
      };
      
      // 发送请求
      let response;
      try {
        response = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoData),
          timeout: 25000 // 25秒超时
        });
      } catch (fetchError) {
        console.error(`Fetch错误: ${fetchError.message}`);
        throw new Error(`请求失败: ${fetchError.message}`);
      }
      
      // 检查响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`请求返回错误状态: ${response.status} ${response.statusText}, ${JSON.stringify(errorData)}`);
      }
      
      // 处理响应
      const responseData = await response.json().catch(() => {
        throw new Error(`无法解析响应JSON`);
      });
      
      // 检查是否成功
      if (!responseData.ok) {
        throw new Error(`Telegram API返回错误: ${responseData.description || "未知错误"}`);
      }
      
      console.log(`成功发送图像URL`);
      
      // 尝试删除状态消息
      if (statusMsg && statusMsg.message_id) {
        try {
          const deleteUrl = `https://api.telegram.org/bot${token}/deleteMessage`;
          await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: statusMsg.message_id
            })
          });
        } catch (deleteError) {
          console.error(`删除状态消息失败: ${deleteError.message}`);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error(`图像生成过程中发生错误: ${error.message}`);
      
      // 如果全部尝试失败，发送一个简洁的错误消息和建议
      const failMessage = `⚠️ 图像生成失败\n\n可能原因：\n- 提示词过长 (${prompt.length}字符)\n- 服务器暂时不可用\n\n建议：\n- 使用更简短的提示词 (100-300字符)\n- 简化描述，保留关键词\n- 直接访问 https://pollinations.ai 尝试`;
      
      await sendTelegramMessage(
        token,
        chatId,
        failMessage,
        message.message_id
      );
      
      // 尝试删除状态消息
      if (statusMsg && statusMsg.message_id) {
        try {
          const deleteUrl = `https://api.telegram.org/bot${token}/deleteMessage`;
          await fetch(deleteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              message_id: statusMsg.message_id
            })
          });
        } catch (deleteError) {
          console.error(`删除状态消息失败: ${deleteError.message}`);
        }
      }
      
      return { success: false, error: error.message };
    }
  } catch (error) {
    console.error(`处理图像命令时发生意外错误: ${error.message}`);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

/**
 * 生成图像预览URL
 * @param {string} baseUrl 基础URL
 * @param {string} prompt 图像提示词
 * @param {Object} options 图像生成选项
 */
function generatePreviewUrl(baseUrl, prompt, options = {}) {
  console.log(`生成图像预览URL，提示词长度: ${prompt.length}字符`);

  try {
    // 安全处理长提示词
    let processedPrompt = prompt;
    if (prompt.length > 1000) {
      // 太长的提示词，截断并添加省略号
      processedPrompt = prompt.substring(0, 1000) + "...";
      console.log(`提示词已截断至1000字符`);
    }

    // 尝试使用compressed URL (c/路径)方法
    try {
      // 使用更高级的URL构建方式 - /c/ 路径
      const baseURL = `${baseUrl}/c/`;
      
      // 获取模型和参数
      const model = options.model || 'pollinations/realistic-vision-v4.0';
      const encodedModel = encodeURIComponent(model);
      
      // 对提示词进行Base64编码
      const utf8Prompt = unescape(encodeURIComponent(processedPrompt));
      let base64Prompt;
      
      // 安全地使用btoa (在一些环境中可能不可用)
      try {
        base64Prompt = btoa(utf8Prompt);
      } catch (e) {
        console.error(`btoa编码失败: ${e.message}, 使用自定义编码方法`);
        // 自定义Base64编码方法
        base64Prompt = customBase64Encode(utf8Prompt);
      }
      
      // 构建参数
      const params = new URLSearchParams();
      if (options.width) params.append('width', options.width);
      if (options.height) params.append('height', options.height);
      if (options.seed) params.append('seed', options.seed);
      
      // 构建完整URL
      const url = `${baseURL}${encodedModel}/${base64Prompt}?${params.toString()}`;
      
      console.log(`已生成压缩URL(c/路径)，URL长度: ${url.length}`);
      return url;
    } catch (compressedError) {
      console.error(`压缩URL方法失败: ${compressedError.message}, 尝试标准URL方法`);
      
      // 如果压缩URL方法失败，回退到标准URL方法
      // Base URL for Pollinations Image API
      const baseURL = `${baseUrl}/p/`;
      
      // 限制提示词长度以确保URL不会太长
      const limitedPrompt = processedPrompt.length > 500 ? 
        processedPrompt.substring(0, 500) + "..." : 
        processedPrompt;
      
      // 使用通用的双重编码方法处理所有特殊字符
      const encodedPrompt = encodeURIComponent(encodeURIComponent(limitedPrompt));
      
      // 构建参数
      const params = new URLSearchParams();
      if (options.model) params.append('model', options.model);
      if (options.width) params.append('width', options.width);
      if (options.height) params.append('height', options.height);
      
      // 添加随机种子参数
      const seed = options.seed || Math.floor(Math.random() * 2147483647);
      params.append('seed', seed);
      
      // 构建URL
      const url = `${baseURL}${encodedPrompt}?${params.toString()}`;
      
      console.log(`已生成标准URL(p/路径)，URL长度: ${url.length}`);
      return url;
    }
  } catch (error) {
    // 所有方法都失败，回退到最简单的URL
    console.error(`所有URL生成方法都失败: ${error.message}, 回退到最简单的URL形式`);
    
    // 使用最小化的提示词
    const minimalPrompt = prompt.substring(0, 100);
    const encodedPrompt = encodeURIComponent(minimalPrompt);
    
    // 返回pollinations.ai主页链接
    return `${baseUrl}/create?p=${encodedPrompt}`;
  }
}

/**
 * 自定义Base64编码函数，用于环境中不支持btoa的情况
 * @param {string} input 输入字符串
 * @returns {string} Base64编码结果
 */
function customBase64Encode(input) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  while (i < input.length) {
    const chr1 = input.charCodeAt(i++);
    const chr2 = i < input.length ? input.charCodeAt(i++) : 0;
    const chr3 = i < input.length ? input.charCodeAt(i++) : 0;
    
    const enc1 = chr1 >> 2;
    const enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    const enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    const enc4 = chr3 & 63;
    
    output += chars.charAt(enc1) + chars.charAt(enc2) + 
              (isNaN(chr2) ? '=' : chars.charAt(enc3)) + 
              (isNaN(chr3) ? '=' : chars.charAt(enc4));
  }
  
  return output;
}

// 发送Telegram消息
async function sendTelegramMessage(token, chatId, text, replyToMessageId = null, parseMode = null) {
  try {
    const apiUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    
    // 构建请求数据
    const data = {
      chat_id: chatId,
      text: text,
      disable_web_page_preview: false
    };
    
    // 如果指定了回复消息ID，则添加
    if (replyToMessageId) {
      data.reply_to_message_id = replyToMessageId;
    }
    
    // 如果指定了解析模式，则添加
    if (parseMode) {
      data.parse_mode = parseMode;
    }
    
    // 发送请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      timeout: 10000, // 10秒超时
    });
    
    // 检查响应
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API错误 (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error("发送Telegram消息错误:", error);
    throw error;
  }
}

// Cloudflare Workers 主处理程序
export default {
  async fetch(request, env, ctx) {
    // 设置环境变量
    setupEnvironment(env);
    
    try {
      // 获取 bot token
      const token = env.BOT_TOKEN;
      
      if (!token) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'BOT_TOKEN not set in environment variables' 
        }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // POST 请求处理 webhook 更新
      if (request.method === 'POST') {
        // 获取 update 对象
        const update = await request.json();
        console.log(`Processing update ${update.update_id}`);
        
        // 检查是否是耗时命令（如图像生成、语音生成等）
        const hasCommandPattern = (text) => {
          if (!text) return false;
          
          // 检查是否是命令，支持带@的格式
          const patterns = [
            /^\/image(@\w+)?(\s|$)/,
            /^\/tts(@\w+)?(\s|$)/,
            /^\/chat(@\w+)?(\s|$)/,
            /^\/stt(@\w+)?(\s|$)/
          ];
          
          return patterns.some(pattern => text.match(pattern));
        };
        
        // 检查命令是否针对当前机器人
        const isCommandForThisBot = (text, update) => {
          if (!text) return false;
          
          // 提取命令和机器人用户名
          const commandMatch = text.match(/^\/([a-zA-Z0-9_]+)(@(\w+))?/);
          if (!commandMatch) return false;
          
          // 如果没有@，在私聊中总是给当前机器人，在群聊中需要进一步检查
          if (!commandMatch[2]) {
            return update.message?.chat?.type === 'private';
          }
          
          // 取得@后的用户名
          const targetBotUsername = commandMatch[3];
          if (!targetBotUsername) return true;
          
          // 获取当前机器人用户名
          const currentBotUsername = env.BOT_USERNAME || 'AipolBot';
          
          console.log(`命令目标: ${targetBotUsername}, 当前机器人: ${currentBotUsername}`);
          
          // 忽略大小写比较用户名
          return targetBotUsername.toLowerCase() === currentBotUsername.toLowerCase();
        };
        
        // 获取更新中的消息文本
        const messageText = update.message?.text;
        
        // 检查是否是需要特殊处理的命令
        const isLongRunningTask = messageText && hasCommandPattern(messageText);
        const isTargetedToThisBot = messageText && isCommandForThisBot(messageText, update);
        
        // 检查是否是图像生成命令（需要特殊处理）
        const isImageGeneration = 
          messageText && 
          messageText.match(/^\/image(@\w+)?(\s|$)/) && 
          isTargetedToThisBot;
        
        console.log(`更新 ${update.update_id}: 是否长任务=${isLongRunningTask}, 是否针对当前机器人=${isTargetedToThisBot}, 是否图像生成=${isImageGeneration}`);
        
        // 如果不是针对当前机器人的命令，立即返回成功响应
        if (isLongRunningTask && !isTargetedToThisBot) {
          console.log(`忽略非当前机器人命令: ${messageText}`);
          return new Response('OK', { status: 200 });
        }
        
        if (isLongRunningTask && isTargetedToThisBot) {
          // 对于耗时任务，立即返回成功响应，然后在后台处理
          // 将处理任务加入 waitUntil 以防止 Worker 过早终止
          
          // 图像生成命令直接处理，不放入后台任务
          if (isImageGeneration) {
            try {
              console.log(`直接处理图像生成命令 ${update.update_id}`);
              // 直接处理图像命令并返回成功
              await handleImageCommand(token, update);
              return new Response('OK', { status: 200 });
            } catch (imageError) {
              console.error(`图像命令处理失败: ${imageError.message}`);
              return new Response('OK', { status: 200 }); // 仍然返回成功，避免Telegram重试
            }
          }
          
          // 其他耗时任务放入后台处理
          ctx.waitUntil(
            (async () => {
              try {
                console.log(`开始后台处理更新 ${update.update_id}, 是否图像生成: ${isImageGeneration ? '是' : '否'}`);
                
                // 其他长时间运行任务
                const result = await handleBotUpdateInternal(token, update);
                console.log(`后台处理完成，更新 ${update.update_id}:`, 
                  result.success ? '成功' : '失败');
              } catch (err) {
                console.error(`后台处理错误，更新 ${update.update_id}:`, err);
              }
            })()
          );
          
          // 立即返回成功响应给 Telegram
          return new Response('OK', { status: 200 });
        } else {
          // 对于其他命令，正常处理
          const result = await handleBotUpdateInternal(token, update);
          
          if (result.success) {
            return new Response('OK', { status: 200 });
          } else {
            console.error('Failed to process update:', result.error);
            return new Response(JSON.stringify({ error: result.error }), { 
              status: 500, 
              headers: { 'Content-Type': 'application/json' } 
            });
          }
        }
      }
      
      // GET 请求设置 webhook
      if (request.method === 'GET') {
        const webhookUrl = env.WEBHOOK_URL;
        const result = await setupWebhook(token, webhookUrl);
        
        return new Response(JSON.stringify(result), { 
          status: result.success ? 200 : 400, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      // 其他请求方法不允许
      return new Response('Method not allowed. Use GET to set webhook or POST to receive updates.', { 
        status: 405, 
        headers: { 'Allow': 'GET, POST', 'Content-Type': 'text/plain' } 
      });
      
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  }
}; 