import pollinationsAPI from '../services/pollinations-api.js';
import { getUserSession, addMessageToConversation, getConversation, clearConversation } from '../utils/session.js';

/**
 * Handle /chat command
 * @param {Object} ctx - Telegram context
 */
async function handleChat(ctx) {
  try {
    // Extract message from text (remove '/chat' or '/chat@BotName' from the beginning)
    const message = ctx.message.text.replace(/^\/chat(@\w+)?(\s+)?/i, '').trim();
    
    if (!message) {
      await ctx.reply('Please provide a message for the AI.\n\nExample: /chat Tell me about artificial intelligence');
      return;
    }
    
    // Get user settings and conversation
    const userId = ctx.from.id.toString();
    const settings = getUserSession(userId);
    const conversation = getConversation(userId);
    
    // Send "thinking" message
    const statusMsg = await ctx.reply('🤔 Thinking...');
    
    // Add user message to conversation
    const userMessage = { role: 'user', content: message };
    addMessageToConversation(userId, userMessage);
    
    // Prepare messages for API call
    const messages = [
      { role: 'system', content: 'You are a helpful, friendly AI assistant named Pollinations Bot.' },
      ...conversation
    ];
    
    // Generate text using Pollinations API
    const chatOptions = {
      model: settings.textModel,
      private: settings.privateModeEnabled
    };
    
    const response = await pollinationsAPI.generateText(messages, chatOptions);
    
    // Add AI response to conversation
    const aiMessage = { role: 'assistant', content: response };
    addMessageToConversation(userId, aiMessage);
    
    // Send response to user
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Delete the "thinking" message
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    console.error('Error in chat handler:', error);
    await ctx.reply(`⚠️ Error generating response: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle /clearchat command
 * @param {Object} ctx - Telegram context
 */
async function handleClearChat(ctx) {
  // 此函数由grammy的命令处理器调用，无需额外检查
  const userId = ctx.from.id.toString();
  clearConversation(userId);
  await ctx.reply('🧹 Conversation history cleared.');
}

/**
 * Handle /textmodels command
 * @param {Object} ctx - Telegram context
 */
async function handleTextModels(ctx) {
  try {
    console.log('处理文本模型命令:', ctx.message ? ctx.message.text : '无消息文本', '来自用户:', ctx.from.id);
    
    // Send "fetching" message
    const statusMsg = await ctx.reply('Fetching available text models...');
    
    // Get available models from Pollinations API
    const models = await pollinationsAPI.listTextModels();
    
    // Filter and format text models (exclude audio models)
    const textModels = models
      .filter(model => model?.type === 'text' || !model?.type)
      .map(model => `• ${model.model || model}`);
    
    const response = `*Available Text Models:*\n\n${textModels.join('\n')}\n\nUse /settings to change your default model.`;
    
    // Send models list to user
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Delete the "fetching" message
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    console.error('Error fetching text models:', error);
    await ctx.reply(`⚠️ Error fetching text models: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Handle /models command (general)
 * @param {Object} ctx - Telegram context
 */
async function handleModels(ctx) {
  try {
    console.log('处理模型列表命令:', ctx.message ? ctx.message.text : '无消息文本', '来自用户:', ctx.from.id);
    
    // Send "fetching" message
    const statusMsg = await ctx.reply('正在获取可用模型列表...');
    
    // Get all models in parallel
    const [textModels, imageModels] = await Promise.all([
      pollinationsAPI.listTextModels(),
      pollinationsAPI.listImageModels()
    ]);
    
    // 按类型过滤模型
    const textOnlyModels = textModels
      .filter(model => model.type === 'text')
      .map(model => {
        let modelInfo = `• ${model.model}`;
        if (model.description) {
          modelInfo += ` - ${model.description}`;
        }
        
        // 添加模型特性标记
        if (model.vision) modelInfo += ' [支持图像 👁️]';
        if (model.reasoning) modelInfo += ' [高级推理 🤔]';
        
        return modelInfo;
      });
      
    const audioModels = textModels
      .filter(model => model.type === 'audio')
      .map(model => {
        let modelInfo = `• ${model.model}`;
        if (model.description) {
          modelInfo += ` - ${model.description}`;
        }
        
        // 添加支持的声音数量
        if (model.voices && model.voices.length) {
          modelInfo += ` [${model.voices.length} 个声音]`;
        }
        
        return modelInfo;
      });
    
    const imageModelsList = imageModels.map(model => `• ${model}`);
    
    // Construct response
    let response = '*可用模型列表:*\n\n';
    
    if (textOnlyModels.length) {
      response += '*文本模型:*\n' + textOnlyModels.join('\n') + '\n\n';
    }
    
    if (imageModelsList.length) {
      response += '*图像模型:*\n' + imageModelsList.join('\n') + '\n\n';
    }
    
    if (audioModels.length) {
      response += '*音频模型:*\n' + audioModels.join('\n') + '\n\n';
    }
    
    response += '使用 /settings 更改您的默认模型设置。';
    
    // Send models list to user
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // Delete the "fetching" message
    await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    
  } catch (error) {
    console.error('Error fetching models:', error);
    await ctx.reply(`⚠️ 获取模型列表错误: ${error.message || '未知错误'}`);
  }
}

export default {
  handleChat,
  handleClearChat,
  handleTextModels,
  handleModels
}; 