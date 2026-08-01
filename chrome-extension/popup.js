const DEFAULTS = { enabled: true, colorChat: true, windowSeconds: 30, warmThreshold: 5, hotThreshold: 12 };
const fields = { enabled: document.querySelector("#enabled"), colorChat: document.querySelector("#color-chat"), windowSeconds: document.querySelector("#window"), warmThreshold: document.querySelector("#warm"), hotThreshold: document.querySelector("#hot") };
const status = document.querySelector("#status");
chrome.storage.local.get(DEFAULTS, (settings) => Object.entries(fields).forEach(([key, field]) => { if (field.type === "checkbox") field.checked = settings[key]; else field.value = String(settings[key]); }));
Object.entries(fields).forEach(([key, field]) => field.addEventListener("change", () => {
  let value = field.type === "checkbox" ? field.checked : Number(field.value);
  if (key === "warmThreshold") value = Math.max(1, value);
  if (key === "hotThreshold") value = Math.max(Number(fields.warmThreshold.value) + 1, value);
  field.value = String(value); chrome.storage.local.set({ [key]: value });
}));
chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab?.id || !tab.url?.startsWith("https://kick.com/")) return;
  chrome.tabs.sendMessage(tab.id, { type: "getPulseState" }, (state) => {
    if (chrome.runtime.lastError || !state) return;
    status.textContent = `${state.streamer} · ${state.uniqueChatters} unique · sentiment ${state.sentiment}`;
  });
});
