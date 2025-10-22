# Ether - Slack AI Bot

An AI-powered Slack bot built with OpenAI's GPT-4o-mini, designed as a professional AI teammate for The Alchemists team. The bot responds to mentions and direct messages with concise, context-aware replies.

## Features

- **Contextual Conversations**: Maintains thread context by analyzing up to 16 previous messages
- **Multiple Interaction Modes**:
  - Responds to @mentions in channels
  - Handles direct messages (DMs)
  - Supports `/askgpt` slash command
- **Smart Message Processing**: Automatically strips Slack formatting and user mentions for cleaner AI interactions
- **Flexible Deployment**: Supports both Socket Mode (for development) and HTTP mode (for production)
- **Rate Limit Handling**: Gracefully handles OpenAI rate limits with user-friendly messages

## Architecture

Built with:
- **[@slack/bolt](https://slack.dev/bolt-js/)** v3.17.1 - Slack app framework
- **[openai](https://github.com/openai/openai-node)** v4.28.0 - OpenAI API client (using Responses API)
- **Node.js** with CommonJS modules
- **dotenv** for environment configuration

## Deployment

This bot is deployed on [Render](https://render.com/) in HTTP mode.

## Setup

### Prerequisites

- Node.js (v14 or higher recommended)
- A Slack workspace with admin access
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/atihar/slackbot-openai-node.git
cd slackbot-openai-node
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key

# Optional (for Socket Mode/development)
SLACK_APP_TOKEN=xapp-your-app-token

# Optional (for Render deployment)
PORT=3000
```

### Slack App Configuration

The bot is configured as a custom Slack app for the Ether workspace. To replicate:

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and create a new app
2. Use the manifest from your Slack app configuration (or configure manually):
   - **OAuth & Permissions**: Add required bot token scopes:
     - `app_mentions:read`
     - `channels:history`
     - `chat:write`
     - `im:history`
     - `im:read`
     - `im:write`
   - **Event Subscriptions**: Subscribe to bot events:
     - `app_mention`
     - `message.im`
   - **Slash Commands**: Create `/askgpt` command
   - **Socket Mode**: Enable for local development (optional)

3. Install the app to your workspace
4. Copy the tokens to your `.env` file

## Usage

### Running Locally

For development (Socket Mode):
```bash
node app.js
```

For production testing (HTTP mode):
```bash
# Remove SLACK_APP_TOKEN from .env or leave it empty
node app.js
```

### Interacting with the Bot

1. **In Channels**: Mention the bot
   ```
   @Ether what's the status of the project?
   ```

2. **In DMs**: Just send a message (no need to @mention)
   ```
   Can you help me with this code?
   ```

3. **Slash Command**:
   ```
   /askgpt explain quantum computing
   ```

### Advanced Features

- **Thread Context**: The bot automatically considers the last 16 messages in a thread
- **System Overrides**: Use `[SYSTEM]` prefix to inject system prompts (for advanced users)
- **Custom Personality**: Configured as "Ether" - a brief, professional AI teammate (max 4 sentences per response)

## How It Works

1. Bot receives a mention or DM
2. Fetches the thread history (up to 16 messages)
3. Strips Slack formatting and converts to OpenAI format
4. Sends to GPT-4o-mini via the Responses API
5. Posts a "Thinking…" placeholder
6. Updates the placeholder with the AI's response

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token (starts with `xoxb-`) |
| `SLACK_SIGNING_SECRET` | Yes | Used to verify requests from Slack |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `SLACK_APP_TOKEN` | No | App-level token for Socket Mode (starts with `xapp-`) |
| `PORT` | No | Port for HTTP mode (default: 3000) |

## Deployment on Render

1. Push your code to GitHub
2. Create a new Web Service on [Render](https://render.com/)
3. Connect your repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node app.js`
   - **Environment Variables**: Add all required variables from `.env`
5. Deploy

Note: For Render deployment, do NOT set `SLACK_APP_TOKEN` (use HTTP mode, not Socket Mode).

## Contributing

This bot was built for The Alchemists team. For feature requests or issues, contact the maintainer.

## License

ISC

## Author

Atihar Hossen Mahir

---

**Note**: The Slack app manifest with full configuration details can be found in your Slack App settings at [api.slack.com/apps](https://api.slack.com/apps).
