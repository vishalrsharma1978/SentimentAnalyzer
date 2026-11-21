const { test } = require("node:test");
const assert = require("node:assert/strict");
const { translateToEnglish } = require("./googleTranslate");

const reply = (text, iso) => ({ text, from: { language: { iso } } });

test("translates to English and reports the detected source language", async () => {
  const calls = [];
  const translate = async (text, options) => {
    calls.push({ text, options });
    return reply("Hello, the transfer arrived late", "es");
  };
  const result = await translateToEnglish(
    "Hola, la transferencia llegó tarde",
    translate,
  );
  assert.deepEqual(result, {
    translatedText: "Hello, the transfer arrived late",
    detectedSourceLanguage: "es",
  });
  assert.deepEqual(calls, [
    { text: "Hola, la transferencia llegó tarde", options: { to: "en" } },
  ]);
});

test("rejects a response without text or a detected language", async () => {
  await assert.rejects(
    translateToEnglish("hola", async () => ({
      from: { language: { iso: "es" } },
    })),
    /invalid response/,
  );
  await assert.rejects(
    translateToEnglish("hola", async () => reply("hello", "")),
    /invalid response/,
  );
  await assert.rejects(
    translateToEnglish("hola", async () => ({ text: "hello" })),
    /invalid response/,
  );
});

test("a provider failure is passed on so the route can report it", async () => {
  await assert.rejects(
    translateToEnglish("hola", async () => {
      throw new Error("Too Many Requests");
    }),
    /Too Many Requests/,
  );
});
