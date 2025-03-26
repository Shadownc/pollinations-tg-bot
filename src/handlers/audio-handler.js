import { InputFile } from 'grammy';
import pollinationsAPI from '../services/pollinations-api.js';
import { getUserSession } from '../utils/session.js';
import fetch from 'node-fetch';

/**
 * 创建一个适合 Cloudflare Workers 环境的 InputFile 实例
 * Create an InputFile instance compatible with Cloudflare Workers
 * @param {Uint8Array} data - The audio data
 * @param {string} filename - The filename
 * @returns {InputFile} - A grammy InputFile instance
 */
function createInputFile(data, filename) {
  // 检查环境是否支持 Buffer
  if (typeof Buffer !== 'undefined') {
    // Node.js 环境
    return new InputFile(Buffer.from(data), filename);
  } else {
    // Cloudflare Workers 环境
    // 创建 Blob 对象
    const blob = new Blob([data]);
    return new InputFile(blob, filename);
  }
}

/**
 * 获取二进制数据并返回 Uint8Array
 * Fetch binary data and return Uint8Array
 * @param {string} url - The URL to fetch
 * @returns {Promise<Uint8Array>} - The binary data as Uint8Array
 */
async function fetchBinaryData(url) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`无法下载音频文件: ${response.status} ${response.statusText}`);
  }
  
  // 在不同环境中处理响应
  if (typeof Response !== 'undefined' && response instanceof Response) {
    // Cloudflare Workers 环境
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else {
    // Node.js 环境（使用 node-fetch）
    const buffer = await response.buffer();
    return new Uint8Array(buffer);
  }
}

/**
 * Handle /tts (text-to-speech) command
 * @param {Object} ctx - Telegram context
 */
export async function handleTTSCommand(ctx) {
  try {
    // 从消息中获取文本
    const messageText = ctx.message.text;
    const text = messageText.replace(/^\/tts(\s+)?(@\w+)?(\s+)?/i, '').trim();
    
    // 如果没有文本，发送使用说明
    if (!text) {
      return await ctx.reply('请在命令后输入要转换为语音的文本。例如: /tts 你好，世界！');
    }
    
    // 获取用户会话
    const session = getUserSession(ctx.from.id.toString());
    const { audioModel = 'openai-audio', audioVoice = 'alloy' } = session;
    
    // 发送处理中的消息
    const processingMsg = await ctx.reply('🔊 正在生成语音，请稍候（可能需要10-20秒）...');
    
    // 生成语音
    const audioData = await pollinationsAPI.generateAudio(text, {
      model: audioModel,
      voice: audioVoice
    });
    
    // 验证音频文件大小
    if (!audioData || audioData.length < 1000) {
      throw new Error('生成的音频文件过小或为空');
    }
    
    console.log(`成功生成音频，大小: ${audioData.length} 字节`);
    
    // 创建适用于当前环境的 InputFile
    const voiceFile = createInputFile(audioData, 'voice.ogg');
    const audioFile = createInputFile(audioData, 'audio.mp3');
    
    // 尝试使用两种不同的方法发送语音
    try {
      // 方法1：作为语音消息发送，适合语音和语音笔记
      await ctx.replyWithVoice(voiceFile);
    } catch (voiceError) {
      console.warn('无法作为语音发送，尝试作为音频文件发送:', voiceError.message);
      
      try {
        // 方法2：作为音频文件发送，适合音乐和其他音频
        await ctx.replyWithAudio(audioFile, {
          title: '文本转语音',
          performer: 'Pollinations AI'
        });
      } catch (audioError) {
        console.error('两种发送方法都失败了:', audioError.message);
        throw new Error('无法发送生成的音频，请重试');
      }
    }
    
    // 删除处理中的消息
    try {
      await ctx.api.deleteMessage(ctx.chat.id, processingMsg.message_id);
    } catch (deleteError) {
      console.warn('无法删除状态消息:', deleteError.message);
    }
    
  } catch (error) {
    console.error('TTS命令处理错误:', error);
    
    // 发送详细的错误消息
    let errorMessage = '生成语音时出错。';
    
    // 添加更具体的错误信息
    if (error.message.includes('过小或为空')) {
      errorMessage += '生成的音频无效。';
    } else if (error.message.includes('timeout')) {
      errorMessage += '请求超时，请稍后再试。';
    } else if (error.message.includes('Bad Request')) {
      errorMessage += '服务器拒绝了请求，生成的音频格式可能有问题。';
    }
    
    errorMessage += '\n\n请尝试以下操作：\n';
    errorMessage += '1. 输入较短的文本\n';
    errorMessage += '2. 尝试使用不同的语音模型或声音\n';
    errorMessage += '3. 使用 /settings 命令更改TTS设置';
    
    await ctx.reply(errorMessage);
  }
}

/**
 * Handle /stt (speech-to-text) command
 * @param {Object} ctx - Telegram context
 */
export async function handleSTTCommand(ctx) {
  try {
    // 检查是否回复了语音消息
    if (!ctx.message.reply_to_message || (!ctx.message.reply_to_message.voice && !ctx.message.reply_to_message.audio)) {
      await ctx.reply('请回复一条语音消息并使用 /stt 命令来转录它。\n\n例如：\n1. 发送或转发一条语音消息\n2. 回复该语音消息并输入 /stt');
      return;
    }
    
    // 获取语音消息文件ID
    const fileId = ctx.message.reply_to_message.voice 
      ? ctx.message.reply_to_message.voice.file_id 
      : ctx.message.reply_to_message.audio.file_id;
    
    // 发送"正在转录"消息
    const statusMsg = await ctx.reply('🎙️ 正在转录音频，请稍候...');
    
    // 获取文件信息和下载URL
    const fileInfo = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${fileInfo.file_path}`;
    
    // 下载音频文件
    const audioData = await fetchBinaryData(fileUrl);
    
    // 检查音频文件大小
    if (audioData.length < 100) {
      throw new Error('音频文件太小，无法处理');
    }
    
    // 从文件路径获取格式
    const format = fileInfo.file_path.split('.').pop() || 'ogg';
    console.log(`Processing audio file: ${fileInfo.file_path}, format: ${format}, size: ${audioData.length} bytes`);
    
    // 使用Pollinations API转录音频
    const transcription = await pollinationsAPI.transcribeAudio(audioData, format);
    
    // 验证转录结果
    if (!transcription || transcription.trim() === '') {
      throw new Error('无法从音频中识别出文本');
    }
    
    // 发送转录结果给用户
    await ctx.reply(`📝 *转录结果:*\n\n${transcription}`, { parse_mode: 'Markdown' });
    
    // 删除"正在转录"消息
    // 使用try-catch包装删除操作，确保即使删除失败也不会影响整体功能
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (deleteError) {
      console.warn('无法删除状态消息:', deleteError.message);
    }
    
  } catch (error) {
    console.error('语音转文本处理错误:', error);
    
    // 发送详细的错误消息
    let errorMessage = '音频转录失败。';
    
    if (error.message.includes('太小')) {
      errorMessage += '音频文件太小或损坏。';
    } else if (error.message.includes('无法识别')) {
      errorMessage += '无法从音频中识别出文本，请确保音频清晰且包含语音。';
    } else if (error.message.includes('下载')) {
      errorMessage += '无法下载音频文件，请重试。';
    }
    
    errorMessage += '\n\n请尝试：\n';
    errorMessage += '1. 发送更清晰的语音消息\n';
    errorMessage += '2. 确保语音消息不是太短或太安静\n';
    errorMessage += '3. 尝试使用不同的录音设备';
    
    await ctx.reply(errorMessage);
  }
}

/**
 * Handle /voices command to list available voices
 * @param {Object} ctx - Telegram context
 */
async function handleVoices(ctx) {
  try {
    // 发送"正在获取"消息
    const statusMsg = await ctx.reply('正在获取可用的语音列表...');
    
    // 从Pollinations API获取可用模型
    const models = await pollinationsAPI.listTextModels();
    const voices = models.find(model => model.model === 'openai-audio')?.voices || [];
    
    if (!voices.length) {
      await ctx.reply('目前没有可用的语音。请稍后再试。');
      try {
        await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
      } catch (deleteError) {
        console.warn('无法删除状态消息:', deleteError.message);
      }
      return;
    }
    
    // 格式化响应
    const voicesList = voices.map(voice => `• ${voice}`).join('\n');
    const response = `*可用的语音列表:*\n\n${voicesList}\n\n使用 /settings 更改您的默认语音。`;
    
    // 向用户发送语音列表
    await ctx.reply(response, { parse_mode: 'Markdown' });
    
    // 删除"正在获取"消息
    try {
      await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id);
    } catch (deleteError) {
      console.warn('无法删除状态消息:', deleteError.message);
    }
    
  } catch (error) {
    console.error('获取语音列表错误:', error);
    await ctx.reply(`⚠️ 获取语音列表错误: ${error.message || '未知错误'}`);
  }
}

export default {
  handleTTSCommand,
  handleSTTCommand,
  handleVoices
}; 