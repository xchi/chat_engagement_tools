const assert = require("node:assert/strict");
const { imageUrl, parseTokens, parseImage } = require("./emotes.js");

assert.equal(imageUrl("5756504"), "https://files.kick.com/emotes/5756504/fullsize");
assert.deepEqual(
  parseTokens("hi [emote:5756504:NODDERS][emote:37226:KEKW]"),
  [
    { id: "5756504", name: "NODDERS", url: "https://files.kick.com/emotes/5756504/fullsize" },
    { id: "37226", name: "KEKW", url: "https://files.kick.com/emotes/37226/fullsize" }
  ]
);
assert.deepEqual(
  parseImage({ src: "https://files.kick.com/emotes/5756504/fullsize", alt: "NODDERS" }),
  { id: "5756504", name: "NODDERS", url: "https://files.kick.com/emotes/5756504/fullsize" }
);
console.log("emote parser tests passed");
