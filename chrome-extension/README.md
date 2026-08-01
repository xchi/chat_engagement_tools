# Kick Stream Pulse Chrome extension

This unpacked Manifest V3 extension adds a streamer dashboard to any open
`kick.com/<streamer>` channel. The default 30-second rolling window reports
live sentiment, unique chatters, messages per minute, and trending emotes.
It also colours chat green, amber, or red as audience activity moves through
configurable unique-chatter thresholds. It does not require Kick API credentials.
An AI-style chat read turns those local signals into a short natural-language
summary. It is deterministic and does not call an AI or external service.

The shared emote representation is:

```js
{
  id: "5756504",
  name: "NODDERS",
  url: "https://files.kick.com/emotes/5756504/fullsize"
}
```

It recognizes raw chat tokens (`[emote:ID:name]`) and rendered emote images.
Counts and sentiment samples are kept only in the tab's memory and expire at
the end of the selected rolling window. Sentiment is an approximate local
lexicon score; no chat content is sent to an AI service.

All analytics run locally inside the open Kick tab using information already
rendered on the page. The extension makes no backend or analytics API requests,
and samples disappear when the tab is closed or refreshed.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this `chrome-extension` directory.
4. Open or reload a live Kick stream. The overlay appears at top-right.

Run the dependency-free parser check with:

```bash
node test-emotes.js
node test-chat-analytics.js
```
