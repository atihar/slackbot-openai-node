require('dotenv').config()
const { App } = require("@slack/bolt");
const { OpenAI } = require('openai');
// const ngrok = require('ngrok');

// gets API Key from environment variable OPENAI_API_KEY
const openai = new OpenAI();

const app = new App({
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: !!process.env.SLACK_APP_TOKEN,
    token: process.env.SLACK_BOT_TOKEN,
});

// Define initial system messages
const initialSystemMessages = [
    { role: "system", content: "You are Ether an AI assistant to increase productivity of The Alchemists by Atihar Hossen Mahir. Reply in this manner. " },
    // Add more initial system messages as needed
];

const getBotUserId = (() => {
    let id;

    return async () => {
        if (id) return id;

        const botUser = await app.client.auth.test();
        id = botUser.user_id;

        return id;
    };
})();

async function handleMessage({ event, say, client }) {
    // Prevent infinite loops in DMs by only permitting new, human-written messages (which lack a subtype).
    if (event.subtype) return;

    const threads = await client.conversations.replies({
        channel: event.channel,
        ts: event.thread_ts ?? event.ts,
    });

    const message = await say({
        thread_ts: event.thread_ts ?? event.ts,
        text: "Thinking…",
    });

    console.log(threads)
    try {
        const prompts = await extractPrompts(threads.messages);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: prompts,
        });

        const reply = completion.choices[0].message?.content;

        await client.chat.update({
            channel: event.channel,
            ts: message.ts,
            text: reply,
        });
    } catch (e) {
        console.error(e);
        await client.chat.update({
            channel: event.channel,
            ts: message.ts,
            text: "Sorry, I'm having trouble processing your request.",
        });
    }
}

app.event("app_mention", handleMessage);
app.event("message", handleMessage);

function stripMentions(text, botUserId) {
    text = text.replace(`<@${botUserId}>`, "@Assistant");
    return text.replace(/<@[A-Z0-9]+>/gi, "@User");
}

async function extractPrompts(slackMessages) {
    const botUserId = await getBotUserId();

    const dynamicPrompts = slackMessages.map((message) => {
        let messageText = message.text;

        let role = "user";
        if (message.user === botUserId) {
            role = "assistant";
        }

        if (role === "user" && messageText.includes("[SYSTEM]")) {
            role = "system";
            messageText = messageText.replace("[SYSTEM]", "");
        }

        messageText = stripMentions(messageText, botUserId);

        return { role, content: messageText };
    });
    // Prepend initial system messages to dynamic prompts
    return [...initialSystemMessages, ...dynamicPrompts];
}

async function main() {
    await app.start(process.env.PORT || 3000);
    console.log("⚡️ Bolt app is running!");
}

// (async function () {
//     const url = await ngrok.connect({
//         addr: process.env.PORT || 3000,
//         authtoken: "1uIxTkc8CfxQmsLG2gkLWhGfez6_5bSkCifGVuV25dxQEZMtz"
//     });
//     console.log(url)
// })();

main();