// Match the languages in Manggo's language selector, not every Edge locale.
const VOICES = {
  "zh-CN": { key: "voiceZhCN", fallback: "XiaoxiaoNeural" },
  "zh-TW": { key: "voiceZhTW", fallback: "HsiaoChenNeural" },
  "en-US": { key: "voiceEnUS", fallback: "JennyNeural" },
  "ja-JP": { key: "voiceJaJP", fallback: "NanamiNeural" },
  "ko-KR": { key: "voiceKoKR", fallback: "SunHiNeural" },
  "de-DE": { key: "voiceDeDE", fallback: "TanjaNeural" },
  "fr-FR": { key: "voiceFrFR", fallback: "DeniseNeural" },
  "es-ES": { key: "voiceEsES", fallback: "ElviraNeural" },
  "it-IT": { key: "voiceItIT", fallback: "ElsaNeural" },
  "pt-BR": { key: "voicePtBR", fallback: "FranciscaNeural" },
  "pt-PT": { key: "voicePtPT", fallback: "RaquelNeural" },
  "ru-RU": { key: "voiceRuRU", fallback: "SvetlanaNeural" },
  "uk-UA": { key: "voiceUkUA", fallback: "PolinaNeural" },
  "vi-VN": { key: "voiceViVN", fallback: "HoaiMyNeural" },
};

const LOCALES = new Map([
  ["zh-hans", "zh-CN"],
  ["zh-hant", "zh-TW"],
]);
for (const locale of Object.keys(VOICES)) {
  const tag = locale.toLowerCase();
  LOCALES.set(tag, locale);
  const lang = tag.split("-", 1)[0];
  // Bare zh and pt default to zh-CN and pt-BR respectively.
  if (!LOCALES.has(lang)) LOCALES.set(lang, locale);
}

function normalizeTag(tag) {
  return tag.trim().replaceAll("_", "-").toLowerCase();
}

function detectLocale(text) {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)) return "ja-JP";
  if (/\p{Script=Hangul}/u.test(text)) return "ko-KR";
  if (/\p{Script=Han}/u.test(text)) return "zh-CN";
  if (/[іїєґ]/iu.test(text)) return "uk-UA";
  if (/\p{Script=Cyrillic}/u.test(text)) return "ru-RU";
  return "en-US";
}

function resolveLocale(language, text, autoLanguage) {
  const tag = normalizeTag(language ?? "");
  if (!tag || tag === "auto") {
    const configured = typeof autoLanguage === "string" && LOCALES.get(normalizeTag(autoLanguage));
    return configured || detectLocale(text);
  }

  const locale = LOCALES.get(tag);
  if (!locale) throw new Error(`Microsoft TTS 不支持语言「${language}」。`);
  return locale;
}

export function resolveVoice(language, text, config = {}) {
  const locale = resolveLocale(language, text, config.autoLanguage);
  const { key, fallback } = VOICES[locale];
  const saved = config[key];
  const name = typeof saved === "string" && saved.startsWith(`${locale}-`) ? saved.slice(locale.length + 1) : "";
  return { locale, name: /^[a-z][a-z0-9]*Neural$/i.test(name) ? name : fallback };
}
