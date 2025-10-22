// app.js (CommonJS)
require('dotenv').config();

const { App } = require('@slack/bolt');
const OpenAI = require('openai');

// --- OpenAI client (uses OPENAI_API_KEY) ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Slack (Socket Mode if SLACK_APP_TOKEN is set; otherwise HTTP receiver) ---
const useSocketMode = Boolean(process.env.SLACK_APP_TOKEN);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: useSocketMode,
  appToken: useSocketMode ? process.env.SLACK_APP_TOKEN : undefined,
});

// ---- System prompts ----
const initialSystemMessages = [
  {
    role: 'system',
    content:
      "You are Ether, the AI teammate for The Alchemists. Communicate like a professional colleague: brief, clear, and proactive. When unsure, ask a short clarifying question instead of guessing. Never exceed 4 sentences",
  },
];

// ---- Cached bot user id ----
const getBotUserId = (() => {
  let id = null;
  return async () => {
    if (id) return id;
    const auth = await app.client.auth.test({ token: process.env.SLACK_BOT_TOKEN });
    id = auth.user_id;
    return id;
  };
})();

// ---- Helpers ----
function stripMentions(text, botUserId) {
  if (!text) return '';
  // Replace this bot's mention with @Assistant and others with @User
  let t = text.replace(new RegExp(`<@${botUserId}>`, 'g'), '@Assistant');
  t = t.replace(/<@[A-Z0-9]+>/gi, '@User');
  // Slack links like <https://example.com|example> -> example (or the URL)
  t = t.replace(/<([^>|]+)\|?([^>]*)>/g, (_, url, label) => label || url);
  return t.trim();
}

async function extractPrompts(slackMessages) {
  const botUserId = await getBotUserId();

  // Map Slack messages to {role, content}
  const mapped = slackMessages
    .filter((m) => !m.subtype || m.subtype === 'thread_broadcast') // ignore joins, edits, etc.
    .map((m) => {
      const isAssistant = m.user === botUserId || m.bot_id;
      let role = isAssistant ? 'assistant' : 'user';
      let content = m.text || '';

      // Allow inline system overrides: [SYSTEM]...
      if (!isAssistant && content.includes('[SYSTEM]')) {
        role = 'system';
        content = content.replace('[SYSTEM]', '');
      }

      content = stripMentions(content, botUserId);
      return { role, content };
    });

  // Limit to last N messages to control tokens
  const MAX_MESSAGES = 16;
  const recent = mapped.slice(-MAX_MESSAGES);

  return [...initialSystemMessages, ...recent];
}

async function replyWithOpenAI({ channel, thread_ts, placeholder_ts, prompts, client }) {
  // Use Responses API (recommended). It supports role-based multi-turn via `input`.
  const response = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: prompts, // array of { role, content }
  });

  const text = response.output_text?.trim() || "I couldn't generate a reply.";

  await client.chat.update({
    channel,
    ts: placeholder_ts,
    text,
  });
}

// ---- Core handler ----
async function handleMessage({ event, say, client }) {
  // Ignore edits, bot messages (including ourselves), channel join/leave, etc.
  if (event.subtype && event.subtype !== 'thread_broadcast') return;
  if (event.bot_id) return;

  // Only react to:
  //  - app_mention (always)
  //  - direct messages (IM) without subtype
  const isMention = event.type === 'app_mention';
  const isDM = event.channel_type === 'im';

  if (!isMention && !isDM) return;

  // Fetch the thread so the model has context of prior messages
  const threadTs = event.thread_ts ?? event.ts;

  const { messages } = await client.conversations.replies({
    channel: event.channel,
    ts: threadTs,
  });

  // Placeholder "thinking…" message so users see activity immediately
  const placeholder = await say({
    thread_ts: threadTs,
    text: 'Thinking…',
  });

  try {
    const prompts = await extractPrompts(messages);
    await replyWithOpenAI({
      channel: event.channel,
      thread_ts: threadTs,
      placeholder_ts: placeholder.ts,
      prompts,
      client,
    });
  } catch (err) {
    console.error('OpenAI/Slack error:', err?.response?.data || err);
    let errorMsg = 'Sorry, I ran into an error.';
    // Friendly rate limit hint
    if (err?.status === 429) errorMsg = 'Rate limited—please try again in a moment.';
    await client.chat.update({
      channel: event.channel,
      ts: placeholder.ts,
      text: errorMsg,
    });
  }
}

// ---- Event bindings ----
// Respond in channels when mentioned
app.event('app_mention', handleMessage);
// Respond in DMs (without needing @mention)
app.event('message', handleMessage);

// (Optional) Slash command /askgpt
app.command('/askgpt', async ({ command, ack, respond }) => {
  await ack();
  const input = command.text?.trim() || 'Say hello!';
  const prompts = [
    ...initialSystemMessages,
    { role: 'user', content: input },
  ];
  try {
    const r = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: prompts,
    });
    await respond(r.output_text?.trim() || '…');
  } catch (e) {
    console.error(e);
    await respond('Failed to get a response. Please try again.');
  }
});

// ---- Boot ----
(async function main() {
  await app.start(process.env.PORT || 3000);
  console.log(
    `⚡️ Bolt app running in ${useSocketMode ? 'Socket Mode' : 'HTTP mode'} on port ${process.env.PORT || 3000}`
  );
})();
