import { InlineKeyboard } from 'grammy';
import pollinationsAPI from '../services/pollinations-api.js';
import { getUserSession, updateUserSettings } from '../utils/session.js';

// Settings categories
const SETTINGS = {
  MAIN: 'main',
  IMAGE: 'image',
  TEXT: 'text',
  AUDIO: 'audio',
  OTHER: 'other'
};

/**
 * Handle /settings command
 * @param {Object} ctx - Telegram context
 */
async function handleSettings(ctx) {
  // 记录收到的设置命令
  console.log('处理设置命令:', ctx.message ? ctx.message.text : '无消息文本', '来自用户:', ctx.from.id);
  
  // 无论是 /settings 还是 /settings@BotName 都显示设置菜单
  await showMainSettings(ctx);
}

/**
 * Show main settings menu
 * @param {Object} ctx - Telegram context
 */
async function showMainSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(isChineseUI ? '🖼️ 图像设置' : '🖼️ Image Settings', `settings:${SETTINGS.IMAGE}`)
    .row()
    .text(isChineseUI ? '💬 文本设置' : '💬 Text Settings', `settings:${SETTINGS.TEXT}`)
    .row()
    .text(isChineseUI ? '🔊 音频设置' : '🔊 Audio Settings', `settings:${SETTINGS.AUDIO}`)
    .row()
    .text(isChineseUI ? '🌐 语言设置' : '🌐 Language Settings', 'settings:language')
    .row()
    .text(isChineseUI ? '⚙️ 其他设置' : '⚙️ Other Settings', `settings:${SETTINGS.OTHER}`);

  const message = isChineseUI ? 
  `
*当前设置*

*图像生成:*
• 模型: ${settings.imageModel}
• 尺寸: ${settings.imageWidth}x${settings.imageHeight}
• 增强提示词: ${settings.enhancePrompts ? '✅' : '❌'}

*文本生成:*
• 模型: ${settings.textModel}

*音频生成:*
• 语音: ${settings.audioVoice}

*其他:*
• 隐私模式: ${settings.privateModeEnabled ? '✅' : '❌'}
• 语言: ${settings.language === 'zh' ? '中文' : 'English'}

请选择要修改的设置类别:
` : 
  `
*Current Settings*

*Image Generation:*
• Model: ${settings.imageModel}
• Size: ${settings.imageWidth}x${settings.imageHeight}
• Enhance Prompts: ${settings.enhancePrompts ? '✅' : '❌'}

*Text Generation:*
• Model: ${settings.textModel}

*Audio Generation:*
• Voice: ${settings.audioVoice}

*Other:*
• Private Mode: ${settings.privateModeEnabled ? '✅' : '❌'}
• Language: ${settings.language === 'zh' ? 'Chinese' : 'English'}

Select a category to change settings:
`;

  // Check if this is a new message or a callback
  if (ctx.callbackQuery) {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } else {
    await ctx.reply(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  }
}

/**
 * Show image settings menu
 * @param {Object} ctx - Telegram context
 */
async function showImageSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(isChineseUI ? '更改模型' : 'Change Model', 'image:model')
    .row()
    .text(isChineseUI ? '更改尺寸' : 'Change Size', 'image:size')
    .row()
    .text(
      isChineseUI ? 
      `增强提示词: ${settings.enhancePrompts ? '开启 ✅' : '关闭 ❌'}` : 
      `Enhance Prompts: ${settings.enhancePrompts ? 'ON ✅' : 'OFF ❌'}`, 
      'image:enhance'
    )
    .row()
    .text(isChineseUI ? '« 返回' : '« Back', `settings:${SETTINGS.MAIN}`);

  const message = isChineseUI ? 
  `
*图像生成设置*

• 当前模型: ${settings.imageModel}
• 当前尺寸: ${settings.imageWidth}x${settings.imageHeight}
• 增强提示词: ${settings.enhancePrompts ? '已启用 ✅' : '已禁用 ❌'}

请选择要更改的选项:
` : 
  `
*Image Generation Settings*

• Current Model: ${settings.imageModel}
• Current Size: ${settings.imageWidth}x${settings.imageHeight}
• Enhance Prompts: ${settings.enhancePrompts ? 'Enabled ✅' : 'Disabled ❌'}

Select an option to change:
`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show text settings menu
 * @param {Object} ctx - Telegram context
 */
async function showTextSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(isChineseUI ? '更改模型' : 'Change Model', 'text:model')
    .row()
    .text(isChineseUI ? '« 返回' : '« Back', `settings:${SETTINGS.MAIN}`);

  const message = isChineseUI ? 
  `
*文本生成设置*

• 当前模型: ${settings.textModel}

请选择要更改的选项:
` : 
  `
*Text Generation Settings*

• Current Model: ${settings.textModel}

Select an option to change:
`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show audio settings menu
 * @param {Object} ctx - Telegram context
 */
async function showAudioSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(isChineseUI ? '更改语音' : 'Change Voice', 'audio:voice')
    .row()
    .text(isChineseUI ? '« 返回' : '« Back', `settings:${SETTINGS.MAIN}`);

  const message = isChineseUI ? 
  `
*音频生成设置*

• 当前语音: ${settings.audioVoice}

请选择要更改的选项:
` : 
  `
*Audio Generation Settings*

• Current Voice: ${settings.audioVoice}

Select an option to change:
`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show other settings menu
 * @param {Object} ctx - Telegram context
 */
async function showOtherSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(
      isChineseUI ? 
      `隐私模式: ${settings.privateModeEnabled ? '开启 ✅' : '关闭 ❌'}` : 
      `Private Mode: ${settings.privateModeEnabled ? 'ON ✅' : 'OFF ❌'}`, 
      'other:private'
    )
    .row()
    .text(isChineseUI ? '« 返回' : '« Back', `settings:${SETTINGS.MAIN}`);

  const message = isChineseUI ? 
  `
*其他设置*

• 隐私模式: ${settings.privateModeEnabled ? '已启用 ✅' : '已禁用 ❌'}
  (启用后，您的生成内容不会出现在公共源中)

请选择要更改的选项:
` : 
  `
*Other Settings*

• Private Mode: ${settings.privateModeEnabled ? 'Enabled ✅' : 'Disabled ❌'}
  (When enabled, your generations won't appear in the public feed)

Select an option to change:
`;

  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show image model selection menu
 * @param {Object} ctx - Telegram context
 */
async function showImageModelSettings(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const settings = getUserSession(userId);
    const isChineseUI = settings.language === 'zh';
    
    // 通知用户我们正在加载模型
    await ctx.answerCallbackQuery(isChineseUI ? '正在加载图像模型列表...' : 'Loading image models...');
    
    // Get available models from Pollinations API
    const models = await pollinationsAPI.listImageModels();
    
    // Verify we have models
    if (!models || models.length === 0) {
      await ctx.answerCallbackQuery(isChineseUI ? '无法获取模型列表，请稍后再试' : 'Could not get model list, please try again later');
      await showImageSettings(ctx);
      return;
    }
    
    // Create keyboard with models
    const keyboard = new InlineKeyboard();
    
    // Add model buttons (2 per row)
    for (let i = 0; i < models.length; i += 2) {
      const firstModel = models[i];
      const secondModel = models[i + 1];
      
      if (secondModel) {
        keyboard.text(
          `${firstModel}${firstModel === settings.imageModel ? ' ✅' : ''}`, 
          `image:model:${firstModel}`
        ).text(
          `${secondModel}${secondModel === settings.imageModel ? ' ✅' : ''}`, 
          `image:model:${secondModel}`
        ).row();
      } else {
        keyboard.text(
          `${firstModel}${firstModel === settings.imageModel ? ' ✅' : ''}`, 
          `image:model:${firstModel}`
        ).row();
      }
    }
    
    // Add back button
    keyboard.text(isChineseUI ? '« 返回' : '« Back', 'image:back');
    
    const message = isChineseUI ? 
    `
*选择图像模型*

当前模型: ${settings.imageModel}

请选择用于图像生成的模型:
` : 
    `
*Select Image Model*

Current model: ${settings.imageModel}

Choose a model for image generation:
`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error in image model settings:', error);
    const userId = ctx.from?.id?.toString();
    const settings = userId ? getUserSession(userId) : null;
    const isChineseUI = settings?.language === 'zh';
    
    await ctx.answerCallbackQuery(isChineseUI ? 
      `获取模型列表失败: ${error.message}` : 
      `Failed to get model list: ${error.message}`);
    await showImageSettings(ctx);
  }
}

/**
 * Show text model selection menu
 * @param {Object} ctx - Telegram context
 */
async function showTextModelSettings(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const settings = getUserSession(userId);
    const isChineseUI = settings.language === 'zh';
    
    // 通知用户我们正在加载模型
    await ctx.answerCallbackQuery(isChineseUI ? '正在加载文本模型列表...' : 'Loading text models...');
    
    // Get available models from Pollinations API
    const models = await pollinationsAPI.listTextModels();
    
    // Verify we have models
    if (!models || models.length === 0) {
      await ctx.answerCallbackQuery(isChineseUI ? '无法获取模型列表，请稍后再试' : 'Could not get model list, please try again later');
      await showTextSettings(ctx);
      return;
    }
    
    // Filter only text models and create keyboard
    const keyboard = new InlineKeyboard();
    
    // Add model buttons with descriptions
    for (const model of models) {
      if (model.type === 'text') {
        // 创建模型描述
        let description = model.description || '';
        if (model.vision) description += ' 👁️';
        if (model.reasoning) description += ' 🤔';
        if (model.censored) description += ' 🔒';
        
        // 添加模型按钮
        keyboard.text(
          `${model.model}${model.model === settings.textModel ? ' ✅' : ''}\n${description}`,
          `text:model:${model.model}`
        ).row();
      }
    }
    
    // Add back button
    keyboard.text(isChineseUI ? '« 返回' : '« Back', 'text:back');
    
    const message = isChineseUI ? 
    `
*选择文本模型*

当前模型: ${settings.textModel}

可用模型列表:
• 每个模型都显示其描述和特殊功能
• 带有 👁️ 的模型支持图像理解
• 带有 🤔 的模型支持高级推理
• 带有 🔒 的模型有内容过滤

请选择要使用的模型:
` : 
    `
*Select Text Model*

Current model: ${settings.textModel}

Available models:
• Each model shows its description and special features
• Models with 👁️ support image understanding
• Models with 🤔 support advanced reasoning
• Models with 🔒 have content filtering

Please select a model to use:
`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error in text model settings:', error);
    const userId = ctx.from?.id?.toString();
    const settings = userId ? getUserSession(userId) : null;
    const isChineseUI = settings?.language === 'zh';
    
    await ctx.answerCallbackQuery(isChineseUI ? 
      `获取模型列表失败: ${error.message}` : 
      `Failed to get model list: ${error.message}`);
    await showTextSettings(ctx);
  }
}

/**
 * Show voice selection menu
 * @param {Object} ctx - Telegram context
 */
async function showVoiceSettings(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const settings = getUserSession(userId);
    const isChineseUI = settings.language === 'zh';
    
    // 通知用户我们正在加载声音列表
    await ctx.answerCallbackQuery(isChineseUI ? '正在加载语音列表...' : 'Loading voice list...');
    
    // Get available models from Pollinations API
    const models = await pollinationsAPI.listTextModels();
    
    // Extract voices from openai-audio model
    const audioModel = models.find(model => model.model === 'openai-audio');
    const voices = audioModel?.voices || [];
    const modelDescription = audioModel?.description || '';
    
    if (!voices.length) {
      await ctx.answerCallbackQuery(isChineseUI ? '暂无可用语音' : 'No voices available');
      await showAudioSettings(ctx);
      return;
    }
    
    // Create keyboard with voices
    const keyboard = new InlineKeyboard();
    
    // Add voice buttons (2 per row)
    for (let i = 0; i < voices.length; i += 2) {
      const firstVoice = voices[i];
      const secondVoice = voices[i + 1];
      
      if (secondVoice) {
        keyboard.text(
          `${firstVoice}${firstVoice === settings.audioVoice ? ' ✅' : ''}`, 
          `audio:voice:${firstVoice}`
        ).text(
          `${secondVoice}${secondVoice === settings.audioVoice ? ' ✅' : ''}`, 
          `audio:voice:${secondVoice}`
        ).row();
      } else {
        keyboard.text(
          `${firstVoice}${firstVoice === settings.audioVoice ? ' ✅' : ''}`, 
          `audio:voice:${firstVoice}`
        ).row();
      }
    }
    
    // Add back button
    keyboard.text(isChineseUI ? '« 返回' : '« Back', 'audio:back');
    
    const message = isChineseUI ? 
    `
*选择语音*

当前语音: ${settings.audioVoice}
当前模型: ${audioModel?.model || 'openai-audio'} ${modelDescription ? `(${modelDescription})` : ''}

请选择要用于语音生成的声音:
` : 
    `
*Select Voice*

Current voice: ${settings.audioVoice}
Current model: ${audioModel?.model || 'openai-audio'} ${modelDescription ? `(${modelDescription})` : ''}

Choose a voice for audio generation:
`;
    
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error in voice settings:', error);
    const userId = ctx.from?.id?.toString();
    const settings = userId ? getUserSession(userId) : null;
    const isChineseUI = settings?.language === 'zh';
    
    await ctx.answerCallbackQuery(isChineseUI ? 
      `获取语音列表失败: ${error.message}` : 
      `Failed to get voice list: ${error.message}`);
    await showAudioSettings(ctx);
  }
}

/**
 * Show image size selection menu
 * @param {Object} ctx - Telegram context
 */
async function showImageSizeSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const isChineseUI = settings.language === 'zh';
  
  // Common sizes
  const sizes = [
    { width: 512, height: 512 },
    { width: 768, height: 768 },
    { width: 1024, height: 1024 },
    { width: 1024, height: 1536 },
    { width: 1536, height: 1024 },
    { width: 1200, height: 1800 },
    { width: 1800, height: 1200 }
  ];
  
  // Create keyboard with sizes
  const keyboard = new InlineKeyboard();
  
  // Add size buttons
  for (const size of sizes) {
    const isCurrentSize = size.width === settings.imageWidth && size.height === settings.imageHeight;
    keyboard.text(
      `${size.width}x${size.height}${isCurrentSize ? ' ✅' : ''}`, 
      `image:size:${size.width}:${size.height}`
    ).row();
  }
  
  // Add back button
  keyboard.text(isChineseUI ? '« 返回' : '« Back', 'image:back');
  
  const message = isChineseUI ? 
  `
*选择图像尺寸*

当前尺寸: ${settings.imageWidth}x${settings.imageHeight}

请选择用于图像生成的尺寸:
` : 
  `
*Select Image Size*

Current size: ${settings.imageWidth}x${settings.imageHeight}

Choose a size for image generation:
`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Handle settings callback
 * @param {Object} ctx - Telegram context
 */
async function handleSettingsCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const userId = ctx.from.id.toString();
    const settings = getUserSession(userId);
    const isChineseUI = settings.language === 'zh';
    
    // Parse callback data
    if (callbackData.startsWith('settings:')) {
      const section = callbackData.split(':')[1];
      
      switch (section) {
        case SETTINGS.MAIN:
          await showMainSettings(ctx);
          break;
        case SETTINGS.IMAGE:
          await showImageSettings(ctx);
          break;
        case SETTINGS.TEXT:
          await showTextSettings(ctx);
          break;
        case SETTINGS.AUDIO:
          await showAudioSettings(ctx);
          break;
        case SETTINGS.OTHER:
          await showOtherSettings(ctx);
          break;
        case 'language':
          // 调用语言选择处理程序
          await showLanguageSettings(ctx);
          break;
      }
    } else if (callbackData.startsWith('image:')) {
      const parts = callbackData.split(':');
      const action = parts[1];
      
      switch (action) {
        case 'model':
          if (parts.length === 2) {
            await showImageModelSettings(ctx);
          } else {
            const model = parts[2];
            updateUserSettings(userId, { imageModel: model });
            const confirmMsg = isChineseUI ? 
              `图像模型已设置为 ${model}` : 
              `Image model set to ${model}`;
            await ctx.answerCallbackQuery(confirmMsg);
            await showImageSettings(ctx);
          }
          break;
        case 'size':
          if (parts.length === 2) {
            await showImageSizeSettings(ctx);
          } else {
            const width = parseInt(parts[2]);
            const height = parseInt(parts[3]);
            updateUserSettings(userId, { imageWidth: width, imageHeight: height });
            const confirmMsg = isChineseUI ? 
              `图像尺寸已设置为 ${width}x${height}` : 
              `Image size set to ${width}x${height}`;
            await ctx.answerCallbackQuery(confirmMsg);
            await showImageSettings(ctx);
          }
          break;
        case 'enhance':
          const enhanceSettings = getUserSession(userId);
          updateUserSettings(userId, { enhancePrompts: !enhanceSettings.enhancePrompts });
          const enhanceMsg = isChineseUI ? 
            `提示词增强已${!enhanceSettings.enhancePrompts ? '启用' : '禁用'}` : 
            `Prompt enhancement ${!enhanceSettings.enhancePrompts ? 'enabled' : 'disabled'}`;
          await ctx.answerCallbackQuery(enhanceMsg);
          await showImageSettings(ctx);
          break;
        case 'back':
          await showImageSettings(ctx);
          break;
      }
    } else if (callbackData.startsWith('text:')) {
      const parts = callbackData.split(':');
      const action = parts[1];
      
      switch (action) {
        case 'model':
          if (parts.length === 2) {
            await showTextModelSettings(ctx);
          } else {
            const model = parts[2];
            updateUserSettings(userId, { textModel: model });
            const confirmMsg = isChineseUI ? 
              `文本模型已设置为 ${model}` : 
              `Text model set to ${model}`;
            await ctx.answerCallbackQuery(confirmMsg);
            await showTextSettings(ctx);
          }
          break;
        case 'back':
          await showTextSettings(ctx);
          break;
      }
    } else if (callbackData.startsWith('audio:')) {
      const parts = callbackData.split(':');
      const action = parts[1];
      
      switch (action) {
        case 'voice':
          if (parts.length === 2) {
            await showVoiceSettings(ctx);
          } else {
            const voice = parts[2];
            updateUserSettings(userId, { audioVoice: voice });
            const confirmMsg = isChineseUI ? 
              `语音已设置为 ${voice}` : 
              `Voice set to ${voice}`;
            await ctx.answerCallbackQuery(confirmMsg);
            await showAudioSettings(ctx);
          }
          break;
        case 'back':
          await showAudioSettings(ctx);
          break;
      }
    } else if (callbackData.startsWith('other:')) {
      const parts = callbackData.split(':');
      const action = parts[1];
      
      switch (action) {
        case 'private':
          const privateSettings = getUserSession(userId);
          updateUserSettings(userId, { privateModeEnabled: !privateSettings.privateModeEnabled });
          const privateMsg = isChineseUI ? 
            `隐私模式已${!privateSettings.privateModeEnabled ? '启用' : '禁用'}` : 
            `Private mode ${!privateSettings.privateModeEnabled ? 'enabled' : 'disabled'}`;
          await ctx.answerCallbackQuery(privateMsg);
          await showOtherSettings(ctx);
          break;
      }
    } else if (callbackData.startsWith('lang:')) {
      const language = callbackData.split(':')[1];
      updateUserSettings(userId, { language });
      
      let confirmationMessage = language === 'zh' ? 
        '✅ 语言已设置为中文' : 
        '✅ Language set to English';
      
      await ctx.answerCallbackQuery(confirmationMessage);
      await showMainSettings(ctx);
    }
    
  } catch (error) {
    console.error('Error in settings callback:', error);
    const userId = ctx.from?.id?.toString();
    const settings = userId ? getUserSession(userId) : null;
    const isChineseUI = settings?.language === 'zh';
    
    await ctx.answerCallbackQuery(isChineseUI ? '发生错误' : 'An error occurred');
  }
}

/**
 * Show language settings menu
 * @param {Object} ctx - Telegram context
 */
async function showLanguageSettings(ctx) {
  const userId = ctx.from.id.toString();
  const settings = getUserSession(userId);
  const currentLanguage = settings.language || 'en';
  const isChineseUI = currentLanguage === 'zh';
  
  const keyboard = new InlineKeyboard()
    .text(`English ${currentLanguage === 'en' ? '✅' : ''}`, 'lang:en')
    .row()
    .text(`中文 ${currentLanguage === 'zh' ? '✅' : ''}`, 'lang:zh')
    .row()
    .text(isChineseUI ? '« 返回' : '« Back', `settings:${SETTINGS.MAIN}`);
  
  const message = isChineseUI ? 
  `
*语言设置*

当前语言: ${currentLanguage === 'zh' ? '中文' : 'English'}

请选择您偏好的语言:
` : 
  `
*Language Settings*

Current Language: ${currentLanguage === 'zh' ? 'Chinese' : 'English'}

Select your preferred language:
`;
  
  await ctx.editMessageText(message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

export default {
  handleSettings,
  handleSettingsCallback
}; 