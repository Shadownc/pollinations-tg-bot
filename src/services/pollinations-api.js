import axios from 'axios';
import FormData from 'form-data';

// 获取环境变量的函数（兼容Cloudflare Workers）
// Function to get environment variables (compatible with Cloudflare Workers)
export function getEnv(key, defaultValue) {
  // 尝试从全局对象获取环境变量
  if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env) {
    const value = globalThis.process.env[key];
    console.log(`从globalThis.process.env获取环境变量[${key}]: ${value || '未设置，使用默认值'}`);
    return value || defaultValue;
  }
  // 尝试从全局环境变量获取
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    console.log(`从process.env获取环境变量[${key}]: ${value || '未设置，使用默认值'}`);
    return value || defaultValue;
  }
  
  console.log(`无法获取环境变量[${key}]，使用默认值: ${defaultValue}`);
  // 返回默认值
  return defaultValue;
}

// 图像 API 基础 URL
const IMAGE_API_BASE = getEnv('POLLINATIONS_IMAGE_API', 'https://image.pollinations.ai');
// 文本 API 基础 URL
const TEXT_API_BASE = getEnv('POLLINATIONS_TEXT_API', 'https://text.pollinations.ai');

/**
 * 在 Cloudflare Workers 环境中使用的 Buffer polyfill
 * Buffer polyfill for Cloudflare Workers environment
 */
class BufferPolyfill {
  static from(arrayBufferOrString, encoding) {
    if (typeof arrayBufferOrString === 'string') {
      const encoder = new TextEncoder();
      return new Uint8Array(encoder.encode(arrayBufferOrString));
    }
    return new Uint8Array(arrayBufferOrString);
  }
}

// 使用正确的 Buffer 实现
// Use the correct Buffer implementation
const BufferImpl = typeof Buffer !== 'undefined' ? Buffer : BufferPolyfill;

/**
 * Generates an image using the Pollinations.AI API
 * 使用 Pollinations.AI API 生成图像
 * @param {string} prompt - The text prompt 文本提示词
 * @param {Object} options - Options for image generation 图像生成选项
 * @returns {Promise<Uint8Array>} - Image data as Uint8Array 图像数据
 */
export async function generateImage(prompt, options = {}) {
  const {
    model = 'flux',       // 模型名称
    width = 1024,         // 图像宽度
    height = 1024,        // 图像高度
    seed = undefined,     // 随机种子
    nologo = true,        // 是否移除水印，默认为true
    enhance = false,      // 是否增强提示词
    private: isPrivate = false, // 是否为私有（不在公共源中显示）
    safe = true,          // 是否启用安全过滤
  } = options;

  // 检测是否在Cloudflare Workers环境中运行
  const isCloudflareEnv = typeof self !== 'undefined' && self.WorkerGlobalScope !== undefined;
  console.log(`检测环境: 是否Cloudflare环境 = ${isCloudflareEnv}`);
  
  // 对于长提示词，尝试简化处理策略
  let currentPrompt = prompt;
  
  // 如果提示词非常长，可能需要简化
  if (prompt.length > 1000) {
    console.log(`提示词长度${prompt.length}超过1000字符，尝试简化...`);
    
    // 提取提示词的前面部分，通常包含关键词和风格
    const firstPart = prompt.split(/[,.!?]/).slice(0, 5).join(", ");
    if (firstPart.length > 100) {
      currentPrompt = firstPart;
      console.log(`使用提示词的前5个短语: ${currentPrompt.substring(0, 100)}...`);
    } else {
      // 如果前5个短语不够，则取前300个字符
      currentPrompt = prompt.substring(0, 300);
      console.log(`使用提示词的前300个字符: ${currentPrompt.substring(0, 100)}...`);
    }
  }
  
  try {
    // 始终尝试GET请求，因为POST端点似乎已失效
    return await generateImageWithGet(currentPrompt, options);
  } catch (error) {
    console.error(`图像生成错误: ${error.message}`);
    
    // 如果第一次尝试失败，进一步简化提示词
    if (currentPrompt.length > 200) {
      const simplifiedPrompt = currentPrompt.substring(0, 200);
      console.log(`第一次尝试失败，使用更简化的提示词(200字符): ${simplifiedPrompt}`);
      
      try {
        return await generateImageWithGet(simplifiedPrompt, options);
      } catch (secondError) {
        // 如果再次失败，使用最基本的提示词部分
        const basicPrompt = currentPrompt.substring(0, 100);
        console.log(`第二次尝试失败，使用最简化的提示词(100字符): ${basicPrompt}`);
        
        return await generateImageWithGet(basicPrompt, options);
      }
    } else {
      throw error;
    }
  }
}

/**
 * 使用GET请求生成图像
 * @param {string} prompt - 提示词
 * @param {Object} options - 生成选项
 * @returns {Promise<Uint8Array>} - 图像数据
 */
async function generateImageWithGet(prompt, options = {}) {
  const {
    model = 'flux',       // 模型名称
    width = 1024,         // 图像宽度
    height = 1024,        // 图像高度
    seed = undefined,     // 随机种子
    nologo = true,        // 是否移除水印，默认为true
    enhance = false,      // 是否增强提示词
    private: isPrivate = false, // 是否为私有（不在公共源中显示）
    safe = true,          // 是否启用安全过滤
  } = options;

  // 构建 URL 参数
  const params = new URLSearchParams();
  if (model) params.append('model', model);
  if (width) params.append('width', width);
  if (height) params.append('height', height);
  if (seed !== undefined) params.append('seed', seed);
  // 强制设置nologo为true并使用字符串值
  params.append('nologo', 'true');
  if (enhance) params.append('enhance', 'true');
  if (isPrivate) params.append('private', 'true');
  if (safe) params.append('safe', 'true');
  
  // 在Cloudflare环境中添加缩短的超时
  const isCloudflareEnv = typeof self !== 'undefined' && self.WorkerGlobalScope !== undefined;
  if (isCloudflareEnv) {
    // 在Cloudflare中，设置更短的超时防止Worker超时
    params.append('timeout', '15000'); // 15秒超时参数传递给API
    console.log('在Cloudflare环境中设置较短的API超时时间: 15秒');
  }

  try {
    // 确保提示词不会太长，在此处限制
    const maxPromptLength = 500; // 设置一个合理的最大长度限制
    let effectivePrompt = prompt;
    
    if (prompt.length > maxPromptLength) {
      console.log(`提示词过长(${prompt.length})，截断至${maxPromptLength}字符`);
      effectivePrompt = prompt.substring(0, maxPromptLength);
    }
    
    // 更通用的编码方法：对提示词进行两次编码
    const encodedPrompt = encodeURIComponent(encodeURIComponent(effectivePrompt));
    
    const url = `${IMAGE_API_BASE}/prompt/${encodedPrompt}?${params.toString()}`;
    
    console.log(`Generating image with URL (length ${url.length}): ${url.substring(0, 150)}...`);
    
    // 在Cloudflare环境中使用更短的客户端超时
    const timeout = isCloudflareEnv ? 25000 : 60000; // Cloudflare 25秒, Node.js 60秒
    
    // 使用fetch API而不是axios
    if (isCloudflareEnv) {
      console.log('使用fetch API获取图像（Cloudflare环境）');
      const response = await fetch(url, {
        method: 'GET',
        cf: { cacheTtl: 0 }, // 禁用缓存
        timeout: timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } else {
      // 在Node.js环境中继续使用axios
      console.log('使用axios获取图像（Node.js环境）');
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: timeout,
        maxRedirects: 5,
        validateStatus: status => status < 400
      });
      return new Uint8Array(response.data);
    }
  } catch (error) {
    console.error('GET图像生成错误:', error.message);
    // 提供更详细的错误信息以辅助调试
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      if (error.response.data) {
        try {
          const errorText = new TextDecoder().decode(error.response.data);
          console.error('Response data:', errorText.substring(0, 200));
        } catch (e) {
          console.error('无法解码响应数据');
        }
      }
    }
    throw error;
  }
}

/**
 * 使用POST请求生成图像 (适用于长提示词)
 * @param {string} prompt - 提示词
 * @param {Object} options - 生成选项
 * @returns {Promise<Uint8Array>} - 图像数据
 */
async function generateImageWithPost(prompt, options = {}) {
  const {
    model = 'flux',       // 模型名称
    width = 1024,         // 图像宽度
    height = 1024,        // 图像高度
    seed = undefined,     // 随机种子
    nologo = true,        // 是否移除水印，默认为true
    enhance = false,      // 是否增强提示词
    private: isPrivate = false, // 是否为私有（不在公共源中显示）
    safe = true,          // 是否启用安全过滤
  } = options;

  // 使用标准JSON格式构建请求数据
  // JSON格式处理复杂字符更可靠，无需手动处理特殊字符
  const payload = {
    prompt: prompt,        // 直接使用原始提示词，JSON会正确处理所有特殊字符
    model: model,
    width: Number(width),  // 确保数值类型正确
    height: Number(height),
    nologo: true,         // 布尔值更可靠
    safe: Boolean(safe),
    enhance: Boolean(enhance),
    private: Boolean(isPrivate)
  };
  
  if (seed !== undefined) {
    payload.seed = Number(seed);
  }

  console.log(`Generating image with POST method, prompt length: ${prompt.length} characters, model: ${model}`);
  
  try {
    // 使用POST方法发送完整提示词
    const response = await axios.post(`${IMAGE_API_BASE}/generate`, payload, { 
      responseType: 'arraybuffer',
      timeout: 120000, // 增加超时时间到120秒，因为长提示词可能需要更长处理时间
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'image/*'
      },
      maxRedirects: 5 // 允许重定向
    });
    return new Uint8Array(response.data);
  } catch (error) {
    console.error('POST图像生成错误:', error.message);
    // 提供更详细的错误信息以辅助调试
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      if (error.response.data) {
        try {
          const errorText = new TextDecoder().decode(error.response.data);
          console.error('Response data:', errorText.substring(0, 200));
        } catch (e) {
          console.error('无法解码响应数据');
        }
      }
    }
    throw error;
  }
}

/**
 * 使用修改后的POST请求生成图像 (适用于Cloudflare环境或其他POST方式)
 * @param {string} prompt - 提示词
 * @param {Object} options - 生成选项
 * @returns {Promise<Uint8Array>} - 图像数据
 */
async function generateImageWithModifiedPost(prompt, options = {}) {
  const {
    model = 'flux',       // 模型名称
    width = 1024,         // 图像宽度
    height = 1024,        // 图像高度
    seed = undefined,     // 随机种子
    nologo = true,        // 是否移除水印，默认为true
    enhance = false,      // 是否增强提示词
    private: isPrivate = false, // 是否为私有（不在公共源中显示）
    safe = true,          // 是否启用安全过滤
  } = options;

  // 构建请求载荷
  const payload = {
    prompt: prompt,
    model: model,
    width: Number(width),
    height: Number(height),
    nologo: true,
    safe: Boolean(safe),
    enhance: Boolean(enhance),
    private: Boolean(isPrivate)
  };
  
  if (seed !== undefined) {
    payload.seed = Number(seed);
  }

  console.log(`Generating image with modified POST method, prompt length: ${prompt.length} characters, model: ${model}`);
  
  try {
    // 尝试使用不同的端点
    const response = await axios.post(`${IMAGE_API_BASE}/api/imagine`, payload, { 
      responseType: 'arraybuffer',
      timeout: 120000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'image/*'
      },
      maxRedirects: 5
    });
    return new Uint8Array(response.data);
  } catch (error) {
    console.error('Modified POST图像生成错误:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response headers:', JSON.stringify(error.response.headers));
      if (error.response.data) {
        try {
          const errorText = new TextDecoder().decode(error.response.data);
          console.error('Response data:', errorText.substring(0, 200));
        } catch (e) {
          console.error('无法解码响应数据');
        }
      }
    }
    throw error;
  }
}

/**
 * Lists available image models
 * 列出可用的图像模型
 * @returns {Promise<string[]>} - List of available models 可用模型列表
 */
export async function listImageModels() {
  // 默认图像模型列表（当API请求失败时使用）
  const defaultImageModels = ['flux', 'sdxl', 'pixart', 'pixart-anime', 'pixart-lcm', 'dalle', 'kandinsky'];
  
  try {
    const response = await axios.get(`${IMAGE_API_BASE}/models`);
    // 检查响应数据是否有效
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data;
    } else {
      console.warn('API返回了空的图像模型列表，使用默认列表');
      return defaultImageModels;
    }
  } catch (error) {
    console.error('获取图像模型列表错误:', error);
    console.warn('无法从API获取图像模型，使用默认列表');
    return defaultImageModels;
  }
}

/**
 * Generates text using the Pollinations.AI API
 * 使用 Pollinations.AI API 生成文本
 * @param {Array} messages - Array of message objects with role and content 带有角色和内容的消息对象数组
 * @param {Object} options - Options for text generation 文本生成选项
 * @returns {Promise<string>} - Generated text 生成的文本
 */
export async function generateText(messages, options = {}) {
  const {
    model = 'openai',     // 模型名称
    seed = undefined,     // 随机种子
    jsonMode = false,     // 是否以 JSON 格式返回
    reasoningEffort = undefined, // 推理努力级别
    private: isPrivate = false   // 是否为私有
  } = options;

  // 构建请求载荷
  const payload = {
    messages,
    model,
    jsonMode,
    private: isPrivate
  };

  if (seed !== undefined) payload.seed = seed;
  if (reasoningEffort) payload.reasoning_effort = reasoningEffort;

  try {
    const response = await axios.post(`${TEXT_API_BASE}/`, payload);
    return response.data;
  } catch (error) {
    console.error('Error generating text:', error);
    throw new Error(error.response?.data || error.message);
  }
}

/**
 * Lists available text models
 * 列出可用的文本模型
 * @returns {Promise<Object>} - Object containing available models and their types 包含可用模型及其类型的对象
 */
export async function listTextModels() {
  // 默认文本模型列表（当API请求失败时使用）
  const defaultTextModels = [
    { model: 'openai', type: 'text' },
    { model: 'mistral', type: 'text' },
    { model: 'gemini', type: 'text' },
    { model: 'llama', type: 'text' },
    { 
      model: 'openai-audio', 
      type: 'audio',
      voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    }
  ];
  
  try {
    const response = await axios.get(`${TEXT_API_BASE}/models`);
    
    // 检查响应数据是否有效
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // 转换API返回的模型格式
      return response.data.map(model => ({
        model: model.name,
        type: model.type === 'chat' ? 'text' : model.type,
        description: model.description,
        censored: model.censored,
        baseModel: model.baseModel,
        vision: model.vision,
        reasoning: model.reasoning,
        provider: model.provider,
        audio: model.audio,
        voices: model.voices
      }));
    } else {
      console.warn('API返回了空的文本模型列表，使用默认列表');
      return defaultTextModels;
    }
  } catch (error) {
    console.error('获取文本模型列表错误:', error);
    console.warn('无法从API获取文本模型，使用默认列表');
    return defaultTextModels;
  }
}

/**
 * Generates audio from text using Pollinations.AI API
 * 使用 Pollinations.AI API 将文本转换为音频
 * @param {string} text - Text to convert to speech 要转换为语音的文本
 * @param {Object} options - Options for audio generation 音频生成选项
 * @returns {Promise<Uint8Array>} - Audio data as Uint8Array 音频数据
 */
export async function generateAudio(text, options = {}) {
  const { 
    voice = 'alloy',       // 语音声音
    model = 'openai-audio' // 音频模型
  } = options;
  
  // 限制文本长度，防止过长导致问题
  const limitedText = text.length > 500 ? text.substring(0, 500) + '...' : text;
  
  console.log(`生成音频中: 语音=${voice}, 文本="${limitedText.substring(0, 50)}..."`);
  
  // 尝试不同的方法生成音频
  const methods = [
    // 方法1: POST到openai-audio端点
    async () => {
      console.log("尝试方法1: POST到openai-audio端点");
      const payload = {
        model: model,
        voice: voice,
        messages: [
          { role: "user", content: limitedText }
        ]
      };
      
      const response = await axios.post(`${TEXT_API_BASE}/openai-audio`, payload, { 
        responseType: 'arraybuffer',
        timeout: 60000 // 60秒超时
      });
      
      return new Uint8Array(response.data);
    },
    
    // 方法2: 使用GET请求，与URL参数
    async () => {
      console.log("尝试方法2: GET请求与URL参数");
      const params = new URLSearchParams();
      params.append('model', model);
      params.append('voice', voice);
      
      const encodedText = encodeURIComponent(limitedText);
      const url = `${TEXT_API_BASE}/${encodedText}?${params.toString()}`;
      
      const response = await axios.get(url, { 
        responseType: 'arraybuffer',
        timeout: 60000 
      });
      
      return new Uint8Array(response.data);
    },
    
    // 方法3: POST到openai端点，不同格式
    async () => {
      console.log("尝试方法3: POST到主openai端点");
      const payload = {
        model: "openai-audio",
        messages: [
          {
            role: "user",
            content: [
              { 
                type: "text", 
                text: `Convert this text to speech using voice ${voice}: ${limitedText}` 
              }
            ]
          }
        ]
      };
      
      const response = await axios.post(`${TEXT_API_BASE}/openai`, payload, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      
      return new Uint8Array(response.data);
    }
  ];
  
  // 尝试所有方法，直到一个成功
  let lastError = null;
  let audioData = null;
  
  for (const method of methods) {
    try {
      audioData = await method();
      
      // 验证音频数据
      if (audioData && audioData.length > 1000) {
        console.log(`成功生成音频: ${audioData.length} 字节`);
        return audioData;
      } else {
        console.warn('生成的音频太小，尝试下一个方法');
      }
    } catch (error) {
      console.error('音频生成方法失败:', error.message);
      lastError = error;
    }
  }
  
  // 如果所有方法都失败，抛出最后一个错误
  if (!audioData || audioData.length < 1000) {
    throw new Error('所有生成音频的方法都失败了: ' + (lastError ? lastError.message : '未知错误'));
  }
  
  return audioData;
}

/**
 * Transcribes audio to text
 * 将音频转录为文本
 * @param {Uint8Array} audioData - Audio data to transcribe 要转录的音频数据
 * @param {string} format - Audio format (e.g., 'mp3', 'wav') 音频格式（如 'mp3'、'wav'）
 * @returns {Promise<string>} - Transcribed text 转录后的文本
 */
export async function transcribeAudio(audioData, format = 'ogg') {
  // 验证音频数据
  if (!audioData || audioData.length < 100) {
    throw new Error('音频文件过小或为空');
  }

  console.log(`准备转录音频: 格式=${format}, 大小=${audioData.length} 字节`);
  
  try {
    // 对于非常大的文件，可能需要压缩或分块处理
    if (audioData.length > 10 * 1024 * 1024) { // 超过10MB
      console.log('音频文件过大，可能需要更长的处理时间');
    }
    
    // 转换 Uint8Array 到 base64
    const base64Audio = arrayBufferToBase64(audioData.buffer);
    
    // 构建请求载荷
    const payload = {
      model: "openai-audio",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this audio accurately" },
            { 
              type: "input_audio", 
              input_audio: { 
                data: base64Audio, 
                format: format 
              } 
            }
          ]
        }
      ]
    };

    console.log('发送转录请求到API...');
    
    const response = await axios.post(`${TEXT_API_BASE}/openai`, payload, {
      timeout: 120000 // 增加超时时间到120秒，因为转录可能需要更长时间
    });
    
    // 验证响应
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      console.error('API响应格式异常:', JSON.stringify(response.data));
      throw new Error('转录API返回了无效的响应格式');
    }
    
    const transcription = response.data.choices[0].message.content;
    console.log(`转录完成: 获得${transcription.length}个字符`);
    
    return transcription;
  } catch (error) {
    console.error('音频转录错误:', error);
    
    // 提供更详细的错误信息
    let errorMessage = error.message;
    
    if (error.response) {
      // 如果API返回了错误响应
      const responseData = error.response.data;
      console.error('API错误响应:', responseData);
      
      if (typeof responseData === 'string') {
        errorMessage = responseData;
      } else if (responseData && responseData.error) {
        errorMessage = responseData.error.message || responseData.error;
      }
    }
    
    throw new Error(`转录失败: ${errorMessage}`);
  }
}

/**
 * Helper function to convert ArrayBuffer to base64
 * 辅助函数，将 ArrayBuffer 转换为 base64
 * @param {ArrayBuffer} buffer - The array buffer to convert
 * @returns {string} - Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // 在 Cloudflare Workers 环境中使用 btoa 函数
  return btoa(binary);
}

export default {
  generateImage,
  listImageModels,
  generateText,
  listTextModels,
  generateAudio,
  transcribeAudio
}; 