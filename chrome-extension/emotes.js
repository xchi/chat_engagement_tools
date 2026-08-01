(function (root) {
  "use strict";

  const TOKEN_PATTERN = /\[emote:(\d+):([^\]]+)]/g;
  const IMAGE_PATTERN = /(?:files|images)\.kick\.com\/emotes\/(\d+)(?:\/|$)/i;

  function imageUrl(id) {
    return `https://files.kick.com/emotes/${id}/fullsize`;
  }

  function parseTokens(content) {
    const emotes = [];
    for (const match of String(content || "").matchAll(TOKEN_PATTERN)) {
      emotes.push({ id: match[1], name: match[2], url: imageUrl(match[1]) });
    }
    return emotes;
  }

  function parseImage(image) {
    const match = String(image.currentSrc || image.src || "").match(IMAGE_PATTERN);
    if (!match) return null;
    const id = match[1];
    const name = image.alt || image.title || `emote-${id}`;
    return { id, name, url: imageUrl(id) };
  }

  const api = { imageUrl, parseTokens, parseImage };
  root.KickEmotes = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
