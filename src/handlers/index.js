import imageHandler from './image-handler.js';
import audioHandler from './audio-handler.js';
import chatHandler from './chat-handler.js';
import settingsHandler from './settings-handler.js';
import helpHandler from './help-handler.js';

// Combine all handlers
export default {
  ...imageHandler,
  ...audioHandler,
  ...chatHandler,
  ...settingsHandler,
  ...helpHandler,
}; 