import { InputFile } from 'grammy';
import * as pollinationsAPI from '../services/pollinations-api.js';
import { getUserSession } from '../utils/session.js';

/**
 * 创建适用于当前环境的InputFile对象
 * Create an InputFile instance suitable for the current environment
 * @param {Uint8Array} data - The binary data
 * @param {string} filename - The filename to use
 * @returns {InputFile} - A Grammy InputFile instance
 */
function createInputFile(data, filename) {
  console.log(`创建InputFile: ${filename}, 数据大小=${data.length} 字节`);
  
  try {
    // 检查是否在Cloudflare Workers环境中
    const isCloudflareEnv = typeof self !== 'undefined' && self.WorkerGlobalScope !== undefined;
    const isNodeEnv = typeof Buffer !== 'undefined';
    
    console.log(`检测环境: Cloudflare环境=${isCloudflareEnv}, Node环境=${isNodeEnv}`);
    
    if (isCloudflareEnv) {
      // Cloudflare Workers 环境
      console.log('检测到Cloudflare Workers环境，使用Blob创建InputFile');
      // 确保数据是正确的类型
      if (!(data instanceof Uint8Array)) {
        console.log('数据不是Uint8Array类型，尝试转换');
        if (typeof data === 'string') {
          // 如果是base64字符串，尝试解码
          try {
            data = Uint8Array.from(atob(data), c => c.charCodeAt(0));
          } catch (e) {
            console.error('Base64解码失败:', e);
            // 如果不是base64，尝试直接编码
            data = new TextEncoder().encode(data);
          }
        } else if (data instanceof ArrayBuffer) {
          data = new Uint8Array(data);
        }
      }
      
      // 创建Blob对象
      let mimeType = 'image/png';
      if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }
      
      const blob = new Blob([data], { type: mimeType });
      return new InputFile(blob, filename);
    } else if (isNodeEnv) {
      // Node.js 环境
      console.log('检测到Node.js环境，使用Buffer创建InputFile');
      return new InputFile(Buffer.from(data), filename);
    } else {
      // 未知环境，尝试使用Blob
      console.log('检测到未知环境，尝试使用Blob创建InputFile');
      const blob = new Blob([data], { type: 'image/png' });
      return new InputFile(blob, filename);
    }
  } catch (error) {
    console.error(`创建InputFile时出错: ${error.message}`);
    console.error(`错误堆栈: ${error.stack}`);
    
    // 最后尝试：如果InputFile构造失败，尝试直接返回数据
    console.log('InputFile创建失败，尝试直接返回数据');
    return data;
  }
}

/**
 * 获取图像生成URL（用于直接查看）
 * Get image generation URL (for direct viewing)
 * @param {string} prompt - The image prompt
 * @param {Object} options - Image generation options
 * @returns {string|null} - Direct URL to the generated image, or null if the prompt is too long
 */
function getImageGenerationURL(prompt, options) {
  try {
    // 增大允许的最大提示词长度，尽可能使用URL方法
    const MAX_PROMPT_LENGTH = 1000; // 原来是150，增加到1000
    
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.log(`提示词长度(${prompt.length})超过最大限制(${MAX_PROMPT_LENGTH})，尝试使用自定义方法生成URL`);
      
      // 尝试使用Base64编码方法处理长提示词
      try {
        // 使用更高级的URL构建方式 - /c/ 路径
        const baseURL = 'https://pollinations.ai/c/';
        
        // 获取模型和参数
        const model = options.model || 'pollinations/realistic-vision-v4.0';
        const encodedModel = encodeURIComponent(model);
        
        // 对提示词进行Base64编码
        const utf8Prompt = unescape(encodeURIComponent(prompt));
        const base64Prompt = btoa(utf8Prompt);
        
        // 构建参数
        const params = new URLSearchParams();
        if (options.width) params.append('width', options.width);
        if (options.height) params.append('height', options.height);
        if (options.seed) params.append('seed', options.seed);
        
        // 构建完整URL
        const url = `${baseURL}${encodedModel}/${base64Prompt}?${params.toString()}`;
        
        console.log(`使用Base64方法成功生成图像URL，长度: ${url.length}`);
        return url;
      } catch (base64Error) {
        console.error(`Base64方法失败: ${base64Error.message}`);
        // 如果Base64方法失败，尝试使用截断提示词
        const truncatedPrompt = prompt.substring(0, 500);
        return getImageGenerationURL(truncatedPrompt, options);
      }
    }
    
    // 如果提示词长度合适，使用标准方法
    // Base URL for Pollinations Image API
    const baseURL = 'https://image.pollinations.ai/prompt/';
    
    // 使用通用的双重编码方法处理所有特殊字符
    const encodedPrompt = encodeURIComponent(encodeURIComponent(prompt));
    
    // Convert options to URL parameters
    const params = new URLSearchParams();
    if (options.model) params.append('model', options.model);
    if (options.width) params.append('width', options.width);
    if (options.height) params.append('height', options.height);
    
    // 强制设置nologo为true，确保预览图像不带水印
    params.append('nologo', 'true');
    
    // 添加随机种子参数
    const seed = options.seed || Math.floor(Math.random() * 2147483647);
    params.append('seed', seed);
    
    // Always set safe mode for public use
    params.append('safe', 'true');
    
    // 生成完整URL
    const url = `${baseURL}${encodedPrompt}?${params.toString()}`;
    
    // 检查URL长度，如果太长则尝试截断提示词
    if (url.length > 4000) { // 更宽松的长度限制
      console.log(`生成的URL太长(${url.length})，尝试截断提示词`);
      // 递归调用，但使用截断的提示词
      const truncatedPrompt = prompt.substring(0, prompt.length / 2);
      return getImageGenerationURL(truncatedPrompt, options);
    }
    
    console.log(`成功生成标准图像URL，长度: ${url.length}`);
    return url;
  } catch (error) {
    console.error('Error creating preview URL:', error);
    
    // 任何错误情况下，尝试最简单的方法生成URL
    try {
      const baseURL = 'https://image.pollinations.ai/prompt/';
      const shortPrompt = prompt.substring(0, 100);
      const encodedPrompt = encodeURIComponent(shortPrompt);
      
      const model = options.model || 'pollinations/realistic-vision-v4.0';
      const width = options.width || 768;
      const height = options.height || 768;
      
      return `${baseURL}${encodedPrompt}?model=${encodeURIComponent(model)}&width=${width}&height=${height}&nologo=true`;
    } catch (fallbackError) {
      console.error('Fallback URL also failed:', fallbackError);
      return null;
    }
  }
}

/**
 * 处理图像生成请求
 * @param {Context} ctx - grammy Context
 * @returns {Promise<void>}
 */
export async function handleImage(ctx) {
  try {
    // 从消息中提取提示词
    const message = ctx.message || ctx.channelPost;
    if (!message) {
      await ctx.reply('无法识别消息内容。请确保您已提供正确的命令格式。');
      return;
    }

    // 提取命令和参数
    let prompt = message.text || message.caption || '';
    const commandEntity = message.entities?.find(e => e.type === 'bot_command') || 
                          message.caption_entities?.find(e => e.type === 'bot_command');
    
    if (commandEntity) {
      prompt = prompt.slice(commandEntity.offset + commandEntity.length).trim();
    }

    // 如果没有提供提示词，提示用户
    if (!prompt) {
      await ctx.reply('请提供生成图像的提示词。\n\n例如：/image 一只可爱的猫咪在阳光下');
      return;
    }

    // 记录收到的图像生成请求
    const chatId = ctx.chat.id;
    const chatType = ctx.chat.type;
    const fromId = ctx.from?.id;
    console.log(`处理图像命令: chatId=${chatId}, fromId=${fromId}, chatType=${chatType}`);
    console.log(`收到图像生成请求: 提示词长度=${prompt.length} 字符, 聊天ID=${chatId}`);
    console.log(`提示词前100个字符: "${prompt.substring(0, 100)}..."`);

    // 判断是否在Cloudflare环境
    const isCloudflareEnv = typeof self !== 'undefined' && self.WorkerGlobalScope !== undefined;
    console.log(`检测环境: Cloudflare环境=${isCloudflareEnv}`);

    // 获取用户设置
    let userSettings;
    try {
      userSettings = getUserSession(fromId?.toString() || chatId.toString());
      // 使用imageModel等属性
      userSettings = {
        model: userSettings.imageModel,
        width: userSettings.imageWidth,
        height: userSettings.imageHeight,
        enhance: userSettings.enhancePrompts,
        private: userSettings.privateModeEnabled
      };
    } catch (error) {
      console.warn(`无法获取用户设置: ${error.message}，使用默认设置`);
      userSettings = {};
    }

    // 图像生成选项
    const imageOptions = {
      model: userSettings.model || 'flux',  // 默认使用flux模型，速度更快
      width: userSettings.width || 1024,
      height: userSettings.height || 1024,
      enhance: userSettings.enhance === true,
      private: userSettings.private === true,
      nologo: userSettings.nologo !== false, // 默认不显示水印
      seed: Math.floor(Math.random() * 1000000000),
      timeout: isCloudflareEnv ? 20000 : 45000, // Cloudflare环境使用更短的超时
    };

    console.log(`图像生成选项: ${JSON.stringify(imageOptions)}`);

    // 发送处理中消息
    const statusMessage = await ctx.reply(
      isCloudflareEnv 
        ? '⏳ 正在生成您的图像，请稍候...\n\n请注意，在网页环境中生成大型图像可能需要更多时间，请耐心等待。如果提示词过长，可能会被截断。'
        : '⏳ 正在生成您的图像，请稍候...\n\n高质量图像生成可能需要10-40秒，请耐心等待。'
    );

    // 生成图像 - 修改：使用pollinationsAPI.generateImage
    const imageData = await pollinationsAPI.generateImage(prompt, imageOptions);
    console.log(`成功生成图像，大小: ${imageData.length} 字节`);

    // 创建可用于发送的InputFile对象
    const imageFile = createInputFile(imageData, 'generated_image.png');
    console.log(`准备发送图像给用户，大小: ${imageData.length} 字节`);

    // 发送图像
    await ctx.replyWithPhoto(imageFile, {
      caption: `🎨 生成完成！\n\n${prompt.length > 100 ? prompt.substring(0, 100) + '...' : prompt}`,
      parse_mode: 'HTML',
      reply_to_message_id: message.message_id,
    });

    // 删除状态消息
    try {
      await ctx.api.deleteMessage(chatId, statusMessage.message_id);
    } catch (error) {
      console.warn(`无法删除状态消息: ${error.message}`);
    }
  } catch (error) {
    console.error(`图像生成失败: ${error.message}`);
    
    // 构建友好的错误消息
    let errorMessage = '⚠️ 图像生成失败。';
    
    if (error.message.includes('timeout') || error.message.includes('socket hang up')) {
      errorMessage += '\n\n可能的原因：提示词过长或服务器响应超时。';
      errorMessage += '\n\n建议：';
      errorMessage += '\n- 减少提示词长度（建议不超过300字符）';
      errorMessage += '\n- 简化提示词内容，去掉不必要的细节描述';
      errorMessage += '\n- 稍后再试，服务器可能暂时负载过高';
    } else if (error.message.includes('404') || error.message.includes('Not Found')) {
      errorMessage += '\n\n可能的原因：API端点不可用或已更改。';
      errorMessage += '\n\n建议：';
      errorMessage += '\n- 使用更简短的提示词';
      errorMessage += '\n- 稍后再试，服务可能正在维护';
    } else {
      errorMessage += '\n\n请尝试使用更简短的提示词，或稍后再试。';
    }
    
    // 添加一个直接链接让用户自己在浏览器中尝试
    errorMessage += '\n\n您可以直接在浏览器中访问 https://pollinations.ai 尝试手动生成图像。';
    
    try {
      await ctx.reply(errorMessage);
    } catch (replyError) {
      console.error(`回复错误消息失败: ${replyError.message}`);
    }
  }
}

/**
 * 从图像数据创建InputFile对象
 * @param {Uint8Array} imageData - 图像数据
 * @returns {InputFile} InputFile对象
 */
async function createInputFileFromImageData(imageData) {
  console.log(`创建InputFile: generated_image.png, 数据大小=${imageData.length} 字节`);
  
  // 检测环境
  const isCloudflareEnv = typeof self !== 'undefined' && self.WorkerGlobalScope !== undefined;
  const isNodeEnv = typeof process !== 'undefined' && process.versions && process.versions.node;
  console.log(`检测环境: Cloudflare环境=${isCloudflareEnv}, Node环境=${isNodeEnv}`);
  
  // 在Node.js环境中
  if (isNodeEnv) {
    console.log(`检测到Node.js环境，使用Buffer创建InputFile`);
    // 使用Node.js的Buffer
    const buffer = Buffer.from(imageData);
    return new InputFile(buffer, 'generated_image.png');
  }
  
  // 在Cloudflare Workers环境中
  if (isCloudflareEnv) {
    console.log(`检测到Cloudflare环境，使用Blob创建InputFile`);
    // 使用Blob
    const blob = new Blob([imageData], { type: 'image/png' });
    return new InputFile(blob, 'generated_image.png');
  }
  
  // 默认情况
  console.log(`未检测到特定环境，尝试通用方法创建InputFile`);
  return new InputFile(imageData, 'generated_image.png');
}

/**
 * 轮询检查图像生成状态并发送结果
 * Poll for image generation status and send the result when done
 * @param {Object} ctx - Telegram context
 * @param {string} prompt - The image prompt
 * @param {Object} options - Image generation options 
 * @param {number} statusMsgId - ID of the status message to update/delete
 */
async function pollImageGeneration(ctx, prompt, options, statusMsgId) {
  try {
    // 验证ctx对象是否包含所有必要的属性
    if (!ctx || !ctx.chat || !ctx.from) {
      console.error("轮询过程中发现ctx对象不完整:", {
        hasCtx: !!ctx,
        hasChat: ctx && !!ctx.chat,
        hasChatId: ctx && ctx.chat && !!ctx.chat.id,
        hasFrom: ctx && !!ctx.from,
        hasFromId: ctx && ctx.from && !!ctx.from.id
      });
      throw new Error("缺少处理图像生成所需的上下文信息");
    }
    
    // 创建上下文对象的副本，以便在异步操作中不会丢失
    const chatId = ctx.chat.id;
    const fromId = ctx.from.id;
    
    console.log(`开始生成图像: 用户ID=${fromId}, 聊天ID=${chatId}, 提示词长度=${prompt.length}, 状态消息ID=${statusMsgId}`);
    
    // 更新状态消息
    try {
      await ctx.api.editMessageText(
        chatId, 
        statusMsgId,
        `🎨 *正在生成您的图像...*\n\n` +
        `请耐心等待，正在处理您的请求。图像生成可能需要30-60秒。\n\n` +
        `⏳ 正在处理中...`,
        { parse_mode: 'Markdown' }
      );
      console.log("已更新状态消息");
    } catch (updateErr) {
      console.warn('无法更新状态消息:', updateErr.message);
    }
    
    // 保存原始选项用于失败重试
    const originalOptions = {...options};
    
    console.log("开始生成图像...", JSON.stringify(options));
    
    try {
      // 增加超时设置
      options.timeout = 50000; // 50秒超时
      
      // 直接进行单次请求，而不是多次尝试
      console.log("发起单次请求生成图像...");
      const imageData = await pollinationsAPI.generateImage(prompt, options);
      
      // 检查图像数据是否有效
      if (imageData && imageData.length > 1000) {
        console.log("图像生成成功，图像大小:", imageData.length, "字节");
        await sendGeneratedImage(ctx, imageData, prompt, options, statusMsgId);
        return;
      } else {
        console.error("返回的图像数据无效或过小:", imageData ? imageData.length : "无数据");
        throw new Error("图像数据无效");
      }
    } catch (error) {
      console.error("图像生成请求失败:", error.message);
      
      // 更新状态消息
      try {
        await ctx.api.editMessageText(
          chatId, 
          statusMsgId,
          `🎨 *正在生成您的图像...*\n\n` +
          `第一次尝试未成功，正在使用替代方法...\n\n` +
          `⏳ 请继续等待...`,
          { parse_mode: 'Markdown' }
        );
      } catch (updateErr) {
        console.warn('无法更新状态消息:', updateErr.message);
      }
      
      // 尝试使用替代模型
      try {
        console.log("尝试使用替代模型生成图像...");
        
        // 切换到替代模型
        const alternativeModels = ['flux', 'sdxl', 'pixart'];
        const currentModel = originalOptions.model;
        const newModel = alternativeModels.find(m => m !== currentModel) || 'flux';
        
        const fallbackOptions = {...originalOptions, model: newModel, timeout: 60000};
        console.log("使用替代模型:", newModel);
        
        const imageData = await pollinationsAPI.generateImage(prompt, fallbackOptions);
        
        if (imageData && imageData.length > 1000) {
          console.log("使用替代模型成功生成图像，大小:", imageData.length, "字节");
          await sendGeneratedImage(ctx, imageData, prompt, fallbackOptions, statusMsgId, false, true);
          return;
        } else {
          console.error("替代模型返回的图像数据无效:", imageData ? imageData.length : "无数据");
          throw new Error("替代模型图像数据无效");
        }
      } catch (fallbackError) {
        console.error("替代模型也失败:", fallbackError.message);
        
        // 最后尝试：使用简化的提示词
        try {
          await ctx.api.editMessageText(
            chatId, 
            statusMsgId,
            `🎨 *正在生成您的图像...*\n\n` +
            `之前的尝试未成功，正在使用简化的提示词进行最后尝试...\n\n` +
            `⏳ 最后尝试生成图像...`,
            { parse_mode: 'Markdown' }
          );
          
          // 简化提示词
          const shortenedPrompt = prompt.substring(0, 300);
          console.log("使用简化提示词进行最后尝试，长度:", shortenedPrompt.length);
          
          const imageData = await pollinationsAPI.generateImage(shortenedPrompt, {
            ...originalOptions,
            model: 'flux', // 使用最稳定的模型
            timeout: 70000, // 更长的超时
            enhance: true   // 启用提示词增强
          });
          
          if (imageData && imageData.length > 1000) {
            console.log("简化提示词成功生成图像，大小:", imageData.length);
            await sendGeneratedImage(ctx, imageData, prompt, originalOptions, statusMsgId, true);
            return;
          } else {
            throw new Error("简化提示词生成的图像数据无效");
          }
        } catch (finalError) {
          // 所有尝试都失败
          console.error("所有图像生成尝试都失败:", finalError.message);
          throw new Error("多次尝试后仍无法生成图像");
        }
      }
    }
  } catch (error) {
    console.error("图像生成过程中出现严重错误:", error.message);
    if (error.stack) {
      console.error("错误堆栈:", error.stack);
    }
    
    // 确保ctx仍然可用
    if (ctx && ctx.chat && ctx.chat.id) {
      try {
        await ctx.reply(
          `⚠️ 在生成图像过程中出现错误:\n${error.message}\n\n` +
          `请尝试以下方法:\n` +
          `1. 简化您的提示词\n` +
          `2. 移除特殊字符和括号\n` +
          `3. 使用 /settings 切换到不同的图像模型\n` +
          `4. 稍后重试`
        );
      } catch (notifyError) {
        console.error("发送错误通知失败:", notifyError.message);
      }
      
      // 尝试删除状态消息
      if (statusMsgId) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, statusMsgId);
        } catch (err) {
          console.warn('无法删除状态消息:', err.message);
        }
      }
    }
  }
}

/**
 * 发送生成的图像给用户
 * Send generated image to user
 * @param {Object} ctx - Telegram context
 * @param {Uint8Array} imageData - Image data
 * @param {string} prompt - The original prompt
 * @param {Object} options - Image generation options
 * @param {number} statusMsgId - Status message ID to delete
 * @param {boolean} usedShortenedPrompt - Whether a shortened prompt was used
 * @param {boolean} usedAlternativeModel - Whether an alternative model was used
 */
async function sendGeneratedImage(ctx, imageData, prompt, options, statusMsgId, usedShortenedPrompt = false, usedAlternativeModel = false) {
  try {
    // 记录图像发送开始
    console.log(`开始发送生成的图像: 用户ID=${ctx.from.id}, 图像大小=${imageData.length} 字节`);
    
    try {
      // 创建 InputFile 实例
      const photo = createInputFile(imageData, 'generated_image.png');
      console.log(`已创建InputFile实例，准备发送图像`);
      
      // 准备图像说明文字
      // 限制提示词长度，防止超过telegram的caption限制（1024字符）
      const maxPromptLength = 800; // 为其他元数据保留一些空间
      const truncatedPrompt = prompt.length > maxPromptLength 
        ? prompt.substring(0, maxPromptLength) + "..." 
        : prompt;
      
      // 建立说明文本，包含模型信息
      let caption = `🖼️ *生成的图像*\n\n`;
      
      // 添加模型信息
      if (usedAlternativeModel) {
        caption += `⚠️ *原始模型失败，使用了备选模型*\n`;
      }
      
      // 添加提示词信息
      if (usedShortenedPrompt) {
        caption += `⚠️ *使用了简化的提示词*\n\n`;
        caption += `*简化提示词:* ${truncatedPrompt}\n\n`;
      } else {
        caption += `*提示词:* ${truncatedPrompt}\n\n`;
      }
      
      // 添加模型和分辨率信息
      caption += `*模型:* ${options.model || "flux"}\n`;
      caption += `*分辨率:* ${options.width || 1024}x${options.height || 1024}\n`;
      
      // 添加种子信息（如果存在）
      // if (options.seed) {
      //   caption += `*种子:* ${options.seed}\n`;
      // }
      
      try {
        // 尝试发送图像
        console.log(`尝试发送图像(${imageData.length}字节)作为照片...`);
        await ctx.replyWithPhoto(photo, { 
          caption: caption,
          parse_mode: 'Markdown'
        });
        console.log(`图像发送成功`);
      } catch (photoError) {
        console.error(`作为照片发送图像失败: ${photoError.message}, 尝试作为文档发送...`);
        
        // 如果作为照片发送失败，尝试作为文档发送
        try {
          const document = createInputFile(imageData, 'generated_image.png');
          await ctx.replyWithDocument(document, { 
            caption: caption,
            parse_mode: 'Markdown'
          });
          console.log(`图像作为文档发送成功`);
        } catch (documentError) {
          console.error(`作为文档发送图像也失败: ${documentError.message}`);
          
          // 最后一次尝试：使用Telegram API直接发送
          try {
            console.log(`尝试使用Telegram API直接发送图像...`);
            
            // 创建FormData对象（在不同环境中）
            let formData;
            
            if (typeof FormData !== 'undefined') {
              // Web或Cloudflare Workers环境
              formData = new FormData();
              const blob = new Blob([imageData], { type: 'image/png' });
              formData.append('photo', blob, 'image.png');
              formData.append('chat_id', ctx.chat.id);
              formData.append('caption', caption);
              formData.append('parse_mode', 'Markdown');
            } else {
              // Node.js环境
              const FormData = require('form-data');
              formData = new FormData();
              formData.append('photo', Buffer.from(imageData), { 
                filename: 'image.png',
                contentType: 'image/png' 
              });
              formData.append('chat_id', ctx.chat.id);
              formData.append('caption', caption);
              formData.append('parse_mode', 'Markdown');
            }
            
            // 发送请求到Telegram API
            const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
            
            if (!response.ok) {
              throw new Error(`Telegram API响应错误: ${response.status} ${response.statusText}`);
            }
            
            console.log(`使用Telegram API直接发送图像成功`);
          } catch (directApiError) {
            console.error(`使用Telegram API直接发送图像失败: ${directApiError.message}`);
            throw new Error('无法以任何方式发送图像');
          }
        }
      }
      
      // 如果提示词被截断，发送完整提示词作为额外消息
      if (prompt.length > maxPromptLength) {
        try {
          await ctx.reply(`📝 *完整提示词:*\n\n${prompt}`, { parse_mode: 'Markdown' });
          console.log(`已发送完整提示词作为单独消息`);
        } catch (promptMsgError) {
          console.warn(`发送完整提示词失败: ${promptMsgError.message}`);
        }
      }
      
      // 尝试删除状态消息
      if (statusMsgId) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, statusMsgId);
          console.log(`状态消息已删除`);
        } catch (deleteError) {
          console.warn(`删除状态消息失败: ${deleteError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`发送图像过程中遇到错误: ${error.message}`);
      
      // 通知用户图像生成成功但发送失败
      await ctx.reply(`⚠️ 图像已生成，但发送过程中遇到错误: ${error.message}\n\n请重试 /image 命令。`);
      
      // 尝试删除状态消息
      if (statusMsgId) {
        try {
          await ctx.api.deleteMessage(ctx.chat.id, statusMsgId);
        } catch (deleteError) {
          console.warn(`删除状态消息失败: ${deleteError.message}`);
        }
      }
      
      throw error; // 重新抛出错误以便上层处理
    }
    
  } catch (outerError) {
    console.error(`sendGeneratedImage 外层错误: ${outerError.message}`);
    throw outerError;
  }
}

/**
 * Handle /models command for image models
 * 处理 /models 命令获取图像模型列表
 * @param {Object} ctx - Telegram context
 */
async function handleImageModels(ctx) {
  try {
    // Send "fetching" message
    // 发送"正在获取"消息
    const statusMsg = await ctx.reply('Fetching available image models...');
    
    // 设置超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Fetching models timed out after 10 seconds'));
      }, 10000); // 10秒超时
    });
    
    // Get available models from Pollinations API with timeout
    // 从 Pollinations API 获取可用模型列表（带超时）
    const models = await Promise.race([
      pollinationsAPI.listImageModels(),
      timeoutPromise
    ]);
    
    // Format the response
    // 格式化响应
    const modelsList = models.map(model => `• ${model}`).join('\n');
    const response = `*Available Image Models:*\n\n${modelsList}\n\nUse /settings to change your default model.`;
    
    // Send models list to user
    // 向用户发送模型列表
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Delete the "fetching" message
    // 删除"正在获取"消息
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (err) {
      console.warn('Could not delete status message:', err.message);
    }
    
  } catch (error) {
    console.error('Error fetching image models:', error);
    let errorMessage = `⚠️ Error fetching image models: ${error.message || 'Unknown error'}`;
    
    if (error.message.includes('timed out')) {
      errorMessage = '⚠️ Fetching models timed out. The server took too long to respond. Please try again later.';
    }
    
    await ctx.reply(errorMessage);
  }
}

export default {
  handleImage,
  handleImageModels
};