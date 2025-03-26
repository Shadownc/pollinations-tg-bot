import helpHandlerEn from '../handlers/help-handler.js';
import helpHandlerZh from '../handlers/help-handler.zh.js';
import { getUserSession, updateUserSettings } from './session.js';

// 支持的语言代码
export const SUPPORTED_LANGUAGES = {
  EN: 'en',  // 英语
  ZH: 'zh'   // 中文
};

// 按语言代码映射的帮助处理程序
const helpHandlers = {
  [SUPPORTED_LANGUAGES.EN]: helpHandlerEn,  // 英文帮助处理程序
  [SUPPORTED_LANGUAGES.ZH]: helpHandlerZh   // 中文帮助处理程序
};

/**
 * 获取用户的语言设置
 * @param {string} userId - Telegram 用户 ID
 * @returns {string} 语言代码
 */
export function getUserLanguage(userId) {
  const settings = getUserSession(userId);
  return settings.language || SUPPORTED_LANGUAGES.EN; // 默认为英语
}

/**
 * 设置用户的语言
 * @param {string} userId - Telegram 用户 ID
 * @param {string} language - 语言代码
 * @returns {Object} 更新的设置
 */
export function setUserLanguage(userId, language) {
  if (!Object.values(SUPPORTED_LANGUAGES).includes(language)) {
    throw new Error(`不支持的语言: ${language}`);
  }
  return updateUserSettings(userId, { language });
}

/**
 * 根据用户的语言偏好获取适当的帮助处理程序
 * @param {string} userId - Telegram 用户 ID
 * @returns {Object} 帮助处理程序
 */
export function getHelpHandler(userId) {
  const language = getUserLanguage(userId);
  return helpHandlers[language] || helpHandlers[SUPPORTED_LANGUAGES.EN];
}

/**
 * 处理 /language 命令
 * 显示语言选择菜单
 * @param {Object} ctx - Telegram 上下文
 */
export async function handleLanguageCommand(ctx) {
  const userId = ctx.from.id.toString();
  const currentLanguage = getUserLanguage(userId);
  
  // 创建语言选择按钮
  const keyboard = {
    inline_keyboard: [
      [
        { 
          text: `English ${currentLanguage === SUPPORTED_LANGUAGES.EN ? '✅' : ''}`, 
          callback_data: `lang:${SUPPORTED_LANGUAGES.EN}` 
        },
        { 
          text: `中文 ${currentLanguage === SUPPORTED_LANGUAGES.ZH ? '✅' : ''}`, 
          callback_data: `lang:${SUPPORTED_LANGUAGES.ZH}` 
        }
      ]
    ]
  };
  
  // 发送语言选择菜单
  await ctx.reply('Please select your language / 请选择您的语言:', {
    reply_markup: keyboard
  });
}

/**
 * 处理语言选择回调
 * 当用户点击语言选择按钮时的处理函数
 * @param {Object} ctx - Telegram 上下文
 */
export async function handleLanguageCallback(ctx) {
  try {
    const userId = ctx.from.id.toString();
    const callbackData = ctx.callbackQuery.data;
    const language = callbackData.split(':')[1];  // 从回调数据中提取语言代码
    
    // 更新用户的语言设置
    setUserLanguage(userId, language);
    
    // 根据选择的语言发送确认消息
    let confirmationMessage;
    if (language === SUPPORTED_LANGUAGES.ZH) {
      confirmationMessage = '✅ 语言已设置为中文';
    } else {
      confirmationMessage = '✅ Language set to English';
    }
    
    await ctx.answerCallbackQuery(confirmationMessage);
    await ctx.editMessageText(confirmationMessage);
  } catch (error) {
    console.error('语言回调错误:', error);
    await ctx.answerCallbackQuery('Error setting language / 设置语言时出错');
  }
}

export default {
  SUPPORTED_LANGUAGES,
  getUserLanguage,
  setUserLanguage,
  getHelpHandler,
  handleLanguageCommand,
  handleLanguageCallback
}; 