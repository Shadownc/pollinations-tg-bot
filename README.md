# Pollinations.AI Telegram Bot

[English](README.md) | [中文](README.zh-CN.md)

A Telegram bot leveraging the Pollinations.AI API for various AI features:
- 🎨 Image generation
- 🔊 Audio generation (text-to-speech)
- 👂 Speech-to-text transcription
- 💬 Chat with AI models
- 🤖 Model selection for each capability
- 🌐 Multi-language support (English/Chinese)

## Features

- Image generation with various models (flux, stable-diffusion, etc.)
- Audio generation with different voices (13+ OpenAI voices)
- Speech-to-text transcription
- Chat with AI models (OpenAI, Mistral, Llama, etc.)
- Customizable parameters (seed, size, etc.)
- Language switching (English/Chinese interface)
- Detailed model information display with capabilities

## Setup

1. Clone this repository
```bash
git clone https://github.com/yourusername/pollinations-tg-bot.git
cd pollinations-tg-bot
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file (use `.env.example` as a template)
```bash
cp .env.example .env
```

4. Get a Telegram Bot Token from [@BotFather](https://t.me/BotFather) and add it to your `.env` file

5. Start the bot locally
```bash
npm run dev
```

## Environment Variables

The bot uses the following environment variables:

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `BOT_TOKEN` | Telegram Bot Token from @BotFather | Yes | - | `123456789:AABBccDDee-12345abcde` |
| `DEV_MODE` | Set to "true" for local development with polling | No | `false` | `true` |
| `WEBHOOK_URL` | Public URL for webhook (production only) | Required for production | - | `https://your-bot.example.com` |
| `POLLINATIONS_IMAGE_API` | Custom Image API endpoint | No | `https://image.pollinations.ai` | - |
| `POLLINATIONS_TEXT_API` | Custom Text API endpoint | No | `https://text.pollinations.ai` | - |

## Deployment

### Cloudflare Workers

1. Configure your wrangler.toml file with your `BOT_TOKEN` and `WEBHOOK_URL` variables
2. Deploy
```bash
npm run deploy:cf
```

### Docker

1. Build the Docker image
```bash
docker build -t pollinations-tg-bot .
```

2. Run the container
```bash
docker run -p 3000:3000 --env-file .env pollinations-tg-bot
```

## Usage

Once the bot is running, you can interact with it on Telegram:

- `/start` - Start the bot
- `/help` - Show help information
- `/image <prompt>` - Generate an image
- `/tts <text>` - Convert text to speech
- `/stt` - Reply to a voice message to transcribe it
- `/chat <message>` - Chat with AI models
- `/models` - List available models
- `/settings` - Change bot settings
- `/language` - Change the bot language
- `/clearchat` - Clear conversation history

## Configuration

You can customize the following settings via the `/settings` command:
- **Image Settings**: Default model, image size, prompt enhancement
- **Text Settings**: Model for text generation
- **Audio Settings**: Voice for text-to-speech
- **Language Settings**: Interface language (English/Chinese)
- **Other Settings**: Privacy mode (hide generations from public feed)

## Supported Models

The bot supports a wide range of models:
- **Text Models**: OpenAI, Mistral, Llama, Gemini, and more
- **Image Models**: Flux, SDXL, Pixart, DALL-E, and more
- **Audio Model**: OpenAI with multiple voices

Models display their capabilities with icons:
- 👁️ - Support for image understanding
- 🤔 - Advanced reasoning capabilities
- 🔒 - Content filtering enabled

## Internationalization

The bot comes with support for the following languages:
- English (default)
- Chinese (中文)

You can switch between languages at any time using the `/language` command or through the settings menu.

## License

MIT 