(function () {
  "use strict";

  const DEFAULTS = { enabled: true, colorChat: true, windowSeconds: 30, warmThreshold: 5, hotThreshold: 12 };
  const MESSAGE_SELECTOR = [
    "#chatroom-messages [data-index]",
    "[data-chat-entry]",
    "[data-testid*='chat-message']",
    "[class*='chat-entry']",
    "[class*='chat-message']"
  ].join(", ");
  const USERNAME_SELECTOR = [
    "button[data-prevent-expand='true']",
    "[data-testid*='username']",
    "[data-chat-username]",
    "[class*='username']",
    "[class*='sender']"
  ].join(", ");
  const seenRoots = new WeakSet();
  const events = [];
  let settings = { ...DEFAULTS };
  let panel;

  function extensionContextAvailable() {
    try { return Boolean(chrome?.runtime?.id); } catch (_error) { return false; }
  }

  function saveSettings(values) {
    if (!extensionContextAvailable()) return;
    try { chrome.storage.local.set(values); } catch (_error) { /* Extension was reloaded; the page will refresh next. */ }
  }

  const streamerFromLocation = () => decodeURIComponent(location.pathname.split("/").filter(Boolean)[0] || "Kick");

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement("aside");
    panel.id = "kick-stream-pulse";
    panel.innerHTML = `
      <header><div class="ksp-live"><i></i> LIVE SIGNAL</div><button type="button" title="Hide dashboard" aria-label="Hide dashboard">×</button></header>
      <div class="ksp-title"><div><strong>Chat pulse</strong><small></small></div><span class="ksp-window">30s</span></div>
      <section class="ksp-gauge" aria-label="Live chat sentiment">
        <div class="ksp-dial"><div class="ksp-arc"></div><div class="ksp-needle"></div><div class="ksp-hub"></div><b>50</b></div>
        <div class="ksp-scale"><span>NEGATIVE</span><span>POSITIVE</span></div><p>Neutral mood</p>
      </section>
      <section class="ksp-stats"><div><small>UNIQUE CHATTERS</small><b class="ksp-chatters">0</b></div><div><small>MESSAGES / MIN</small><b class="ksp-rate">0</b></div></section>
      <section class="ksp-read"><div><span>✦ CHAT READ</span><small>LOCAL · AI-STYLE</small></div><p>Waiting for enough chat to read the room.</p></section>
      <section class="ksp-activity"><div><span>CHAT ACTIVITY</span><b>CALM</b></div><div class="ksp-bars"><i></i><i></i><i></i></div><small>Chat colour follows audience activity</small></section>
      <section class="ksp-trends"><div><span>TRENDING EMOTES</span><small>LAST 30S</small></div><ol></ol><p>Waiting for live chat…</p></section>`;
    panel.querySelector("button").addEventListener("click", () => {
      settings.enabled = false;
      applyVisibility();
      saveSettings({ enabled: false });
    });
    document.documentElement.appendChild(panel);
    applyVisibility();
  }

  function messageRoot(node) {
    const element = node instanceof Element ? node : node.parentElement;
    return element?.closest(MESSAGE_SELECTOR) || null;
  }

  function usernameFromRoot(root) {
    const candidate = root.querySelector(USERNAME_SELECTOR);
    return (candidate?.textContent || candidate?.getAttribute("title") || "unknown").trim();
  }

  function contentFromRoot(root) {
    // Kick's current virtualized chat uses the final font-normal span as the
    // message body. Prefer it so timestamps, badges, and usernames do not
    // contaminate sentiment analysis.
    const kickBody = root.querySelector("span.font-normal.leading-\\[1\\.55\\]")
      || root.querySelector("span.font-normal:last-child");
    return (kickBody?.textContent || root.textContent || "").trim();
  }

  function collectEmotes(root) {
    const rendered = [...root.querySelectorAll("[data-emote-id]")];
    if (rendered.length) return rendered.map((element) => {
      const id = element.dataset.emoteId;
      const name = element.dataset.emoteName || element.querySelector("img")?.alt || `emote-${id}`;
      return { id, name, url: `https://files.kick.com/emotes/${encodeURIComponent(id)}/fullsize` };
    }).filter((emote) => emote.id);
    const found = KickEmotes.parseTokens(contentFromRoot(root));
    const tokenIds = new Set(found.map((emote) => emote.id));
    for (const image of root.querySelectorAll("img")) {
      const emote = KickEmotes.parseImage(image);
      if (emote && !tokenIds.has(emote.id)) found.push(emote);
    }
    return found;
  }

  function processNode(node) {
    const root = messageRoot(node);
    if (!root || seenRoots.has(root) || root.closest("#kick-stream-pulse")) return;
    seenRoots.add(root);
    const username = usernameFromRoot(root);
    const content = contentFromRoot(root);
    if (!content) return;
    const emotes = collectEmotes(root);
    events.push({ username, content, emotes, sentiment: KickChatAnalytics.sentimentScore(content), at: Date.now() });
    render();
  }

  function processTree(node) {
    processNode(node);
    if (node instanceof Element) node.querySelectorAll(MESSAGE_SELECTOR).forEach(processNode);
  }

  function moodLabel(value) {
    if (value >= 72) return "Chat is loving it";
    if (value >= 58) return "Positive momentum";
    if (value <= 28) return "Chat is frustrated";
    if (value <= 42) return "Mood is cooling";
    return "Neutral mood";
  }

  function render() {
    ensurePanel();
    const now = Date.now();
    const summary = KickChatAnalytics.summarize(events, now, settings.windowSeconds);
    events.splice(0, events.length, ...summary.active);
    const level = KickChatAnalytics.activityLevel(summary.uniqueChatters, { warm: settings.warmThreshold, hot: settings.hotThreshold });
    panel.dataset.activity = level;
    panel.querySelector(".ksp-title small").textContent = streamerFromLocation();
    panel.querySelector(".ksp-window").textContent = `${settings.windowSeconds}s`;
    const gauge = panel.querySelector(".ksp-gauge");
    gauge.querySelector("b").textContent = summary.sentiment;
    gauge.setAttribute("aria-label", `Live chat sentiment: ${summary.sentiment} out of 100, ${moodLabel(summary.sentiment)}`);
    panel.querySelector(".ksp-gauge p").textContent = moodLabel(summary.sentiment);
    // CSS angles start pointing right. Sweep the visible upper semicircle from
    // left (-180deg), through vertical (-90deg), to right (0deg).
    panel.querySelector(".ksp-needle").style.transform = `rotate(${summary.sentiment * 1.8 - 180}deg)`;
    panel.querySelector(".ksp-chatters").textContent = summary.uniqueChatters;
    panel.querySelector(".ksp-rate").textContent = summary.messagesPerMinute;
    panel.querySelector(".ksp-read p").textContent = KickChatAnalytics.chatInsight(summary.active, summary);
    panel.querySelector(".ksp-activity b").textContent = level.toUpperCase();
    panel.querySelector(".ksp-trends > div small").textContent = `LAST ${settings.windowSeconds}S`;
    const totals = new Map();
    for (const event of summary.active) for (const emote of event.emotes) totals.set(emote.id, { ...emote, count: (totals.get(emote.id)?.count || 0) + 1 });
    const ranked = [...totals.values()].sort((a, b) => b.count - a.count).slice(0, 4);
    panel.querySelector("ol").replaceChildren(...ranked.map((emote) => {
      const item = document.createElement("li");
      item.innerHTML = `<img><span></span><b></b>`;
      item.querySelector("img").src = emote.url; item.querySelector("img").alt = emote.name;
      item.querySelector("span").textContent = emote.name; item.querySelector("b").textContent = `×${emote.count}`;
      return item;
    }));
    panel.querySelector(".ksp-trends > p").hidden = ranked.length > 0;
    document.documentElement.dataset.kspActivity = settings.colorChat ? level : "off";
  }

  function applyVisibility() { if (panel) panel.hidden = !settings.enabled; }

  function start(stored = DEFAULTS) {
    settings = { ...DEFAULTS, ...stored };
    ensurePanel();
    new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach(processTree))).observe(document.body, { childList: true, subtree: true });
    document.querySelectorAll(MESSAGE_SELECTOR).forEach(processNode);
    setInterval(render, 1000);
  }

  if (extensionContextAvailable()) {
    try {
      chrome.storage.local.get(DEFAULTS, start);
      chrome.storage.onChanged.addListener((changes) => {
        for (const key of Object.keys(DEFAULTS)) if (changes[key]) settings[key] = changes[key].newValue;
        applyVisibility(); render();
      });
      chrome.runtime.onMessage.addListener((message, _sender, reply) => {
        if (message?.type === "getPulseState") {
          const summary = KickChatAnalytics.summarize(events, Date.now(), settings.windowSeconds);
          reply({ streamer: streamerFromLocation(), ...summary, active: undefined });
        }
      });
    } catch (_error) {
      // A reload can invalidate the context between the availability check and
      // API call. Leave the stale script dormant until the Kick tab refreshes.
    }
  }
})();
