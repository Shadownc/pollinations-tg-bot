// In-memory session storage (use a database for production)
// 内存中的会话存储（生产环境建议使用数据库）
const sessions = new Map();

/**
 * Default settings for new users
 * 新用户的默认设置
 */
const defaultSettings = {
  imageModel: 'flux',      // 默认图像生成模型
  imageWidth: 1024,        // 默认图像宽度
  imageHeight: 1024,       // 默认图像高度
  textModel: 'openai',     // 默认文本生成模型
  audioModel: 'openai-audio', // 默认音频生成模型
  audioVoice: 'alloy',     // 默认语音声音
  enhancePrompts: false,   // 是否增强提示词
  privateModeEnabled: false, // 是否启用隐私模式
  language: 'en',          // 默认语言设置
  conversation: []         // 存储对话历史记录
};

/**
 * Get user session, create if doesn't exist
 * 获取用户会话，如果不存在则创建
 * @param {string} userId - Telegram user ID
 * @returns {Object} User settings
 */
export function getUserSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { ...defaultSettings });
  }
  return sessions.get(userId);
}

/**
 * Update user settings
 * 更新用户设置
 * @param {string} userId - Telegram user ID
 * @param {Object} newSettings - New settings to update 需要更新的新设置
 * @returns {Object} Updated settings 更新后的设置
 */
export function updateUserSettings(userId, newSettings) {
  const currentSettings = getUserSession(userId);
  const updatedSettings = { ...currentSettings, ...newSettings };
  sessions.set(userId, updatedSettings);
  return updatedSettings;
}

/**
 * Clear user conversation history
 * 清除用户对话历史记录
 * @param {string} userId - Telegram user ID
 */
export function clearConversation(userId) {
  const session = getUserSession(userId);
  session.conversation = [];
  sessions.set(userId, session);
}

/**
 * Add message to user conversation history
 * 将消息添加到用户对话历史记录
 * @param {string} userId - Telegram user ID
 * @param {Object} message - Message to add (role, content) 要添加的消息（角色，内容）
 */
export function addMessageToConversation(userId, message) {
  const session = getUserSession(userId);
  session.conversation.push(message);
  
  // Limit conversation history to last 20 messages to prevent context getting too large
  // 将对话历史记录限制为最后 20 条消息，以防止上下文变得过大
  if (session.conversation.length > 20) {
    session.conversation = session.conversation.slice(-20);
  }
  
  sessions.set(userId, session);
}

/**
 * Get user conversation history
 * 获取用户对话历史记录
 * @param {string} userId - Telegram user ID
 * @returns {Array} Conversation history 对话历史记录
 */
export function getConversation(userId) {
  const session = getUserSession(userId);
  return session.conversation || [];
}

export default {
  getUserSession,
  updateUserSettings,
  clearConversation,
  addMessageToConversation,
  getConversation
}; 