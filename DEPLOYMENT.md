# Deployment Guide for Pollinations.AI Telegram Bot

This guide provides detailed instructions for deploying your Pollinations.AI Telegram Bot to various platforms. Choose the deployment method that works best for your needs.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Cloudflare Workers Deployment](#cloudflare-workers-deployment)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying your bot, make sure you have:

1. **A Telegram Bot Token**: Obtain this from [@BotFather](https://t.me/BotFather) on Telegram
2. **Node.js**: Version 18.0.0 or higher (the project uses ESM module format)
3. **Git**: For cloning the repository and version control

## Local Development

For testing and development, you can run the bot on your local machine:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/pollinations-tg-bot.git
   cd pollinations-tg-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file and add your Telegram Bot Token:
   ```
   BOT_TOKEN=your_telegram_bot_token_here
   DEV_MODE=true
   ```

5. Start the bot in development mode:
   ```bash
   npm run dev
   ```

The bot will now be running in polling mode, which means it will continuously check for new messages. This mode is recommended for development only.

## Cloudflare Workers Deployment

Cloudflare Workers provides a global, low-latency serverless platform:

### Step 1: Set up Cloudflare Workers

1. Create a [Cloudflare](https://www.cloudflare.com/) account if you don't have one

2. Install Wrangler, the Cloudflare Workers CLI (if not already installed in the project):
   ```bash
   npm install -g wrangler
   ```
   
   Note: This project already includes Wrangler as a dev dependency, so you can use the project's version.

3. Authenticate with Cloudflare:
   ```bash
   npx wrangler login
   ```

### Step 2: Configure your project

1. The project already includes a basic `wrangler.toml` file. Edit it to include your bot token:
   ```toml
   name = "pollinations-tg-bot"
   main = "src/cloudflare-entry.js"
   compatibility_date = "2023-07-24"

   [vars]
   BOT_TOKEN = "your_telegram_bot_token_here"
   ```

2. For better security, it's recommended to add your token as a secret using the Wrangler command:
   ```bash
   npx wrangler secret put BOT_TOKEN
   ```
   When prompted, enter your Telegram Bot Token

### Step 3: Deploy to Cloudflare Workers

1. Deploy your bot:
   ```bash
   npm run deploy:cf
   ```
   or manually:
   ```bash
   npx wrangler publish
   ```

2. After deployment, you'll receive a Workers URL (e.g., `https://pollinations-tg-bot.your-username.workers.dev`)

### Step 4: Configure Webhook

1. Edit your `wrangler.toml` file to add the `WEBHOOK_URL`:
   ```toml
   [vars]
   BOT_TOKEN = "your_telegram_bot_token_here"
   WEBHOOK_URL = "https://pollinations-tg-bot.your-username.workers.dev"
   ```

2. Redeploy your bot:
   ```bash
   npm run deploy:cf
   ```

3. Visit your Workers URL in a browser to verify the webhook is set up correctly.

## Docker Deployment

Docker allows you to deploy your bot in a containerized environment:

### Step 1: Build the Docker image

1. Make sure Docker is installed on your system

2. The project already includes a `Dockerfile`. Use it to build the Docker image:
   ```bash
   docker build -t pollinations-tg-bot .
   ```

### Step 2: Run the container

1. Create a `.env` file with your configuration or pass environment variables directly:
   ```bash
   docker run -p 3000:3000 \
     -e BOT_TOKEN=your_telegram_bot_token_here \
     -e WEBHOOK_URL=your_public_url \
     pollinations-tg-bot
   ```

   Or using an `.env` file:
   ```bash
   docker run -p 3000:3000 --env-file .env pollinations-tg-bot
   ```

### Step 3: Set up webhook (for production use)

For production deployment with Docker, you need to ensure your container is accessible via a public URL:

1. Ensure your Docker host has a public IP and domain

2. Configure a reverse proxy (like Nginx) to forward traffic to your Docker container:
   ```nginx
   server {
       listen 443 ssl;
       server_name your-bot-domain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Use HTTPS for your domain (using Let's Encrypt or another certificate provider)

4. Set the `WEBHOOK_URL` to your public HTTPS URL:
   ```
   WEBHOOK_URL=https://your-bot-domain.com
   ```

## Troubleshooting

### Common Issues

1. **Bot doesn't respond**:
   - Check that your `BOT_TOKEN` is correct
   - Verify the webhook is set up correctly (not needed in development mode)
   - Look at the logs for any errors
   - Make sure you're using the correct Node.js version (18+)

2. **Webhook fails to set**:
   - Ensure your `WEBHOOK_URL` uses HTTPS
   - Make sure the URL is publicly accessible
   - Check for any firewall or network restrictions
   - Verify that the application is listening on port 3000

3. **Module import errors**:
   - The project uses ECMAScript module format (ESM)
   - Make sure file extensions are explicitly specified in imports (e.g., `import './module.js'`)
   - Check for any module resolution errors

4. **Cloudflare Workers errors**:
   - Check your `wrangler.toml` configuration
   - Verify you have the correct permissions in your Cloudflare account
   - Look at the deployment logs for specific errors
   - Make sure your Workers script is compatible with Cloudflare's limitations

### Getting Help

If you encounter issues not covered in this guide:

1. Check the project's GitHub issues to see if others have faced similar problems
2. Join Telegram developer communities for assistance
3. Consult the Telegram Bot API documentation for webhook and bot setup guides
4. Check the documentation for the `grammy` library (https://grammy.dev), which is the Telegram bot framework used in this project

---

## Final Steps

After deploying your bot:

1. Test all commands to ensure they work properly:
   - `/start` - Begin using the bot
   - `/help` - Get help information
   - `/chat` - Start a chat
   - `/image` - Generate an image
   - `/tts` - Text-to-speech conversion
   - `/voices` - See available voice list
   - `/settings` - Adjust bot settings

2. Monitor the bot's performance and logs
3. Keep your deployment in sync with latest code changes

With these instructions, your Pollinations.AI Telegram Bot should be successfully deployed and accessible to Telegram users. If you have any deployment-specific issues, refer to the troubleshooting section above. 