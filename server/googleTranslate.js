// Comment translation through the google-translate-api-x package. It talks to Google's public web
// endpoint, so it needs no API key. That endpoint is unofficial and rate limited: callers must keep
// their own caching and limits, and treat a failure as "translation temporarily unavailable".
const googleTranslate = require("google-translate-api-x");

const TARGET_LANGUAGE = "en";

// `translate` is injectable so tests never reach the network.
async function translateToEnglish(text, translate = googleTranslate) {
  const result = await translate(text, { to: TARGET_LANGUAGE });
  const translatedText = result?.text;
  const detectedSourceLanguage = result?.from?.language?.iso;
  if (
    typeof translatedText !== "string" ||
    typeof detectedSourceLanguage !== "string" ||
    !detectedSourceLanguage
  ) {
    throw new Error("Translation service returned an invalid response.");
  }
  return { translatedText, detectedSourceLanguage };
}

module.exports = { translateToEnglish };
