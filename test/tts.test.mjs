import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { tts } from "../main.js";
import { resolveVoice } from "../voices.js";

const readJSON = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const manifest = readJSON("../manggo.plugin.json");
const speech = manifest.services.find(({ kind }) => kind === "speech");

// Manggo's client language selector uses these tags. Older hosts can also
// supply the underscored locale codes in the manifest.
const clientLanguages = {
  "zh-Hans": ["zh-CN", "voiceZhCN"],
  "zh-Hant": ["zh-TW", "voiceZhTW"],
  en: ["en-US", "voiceEnUS"],
  ja: ["ja-JP", "voiceJaJP"],
  ko: ["ko-KR", "voiceKoKR"],
  de: ["de-DE", "voiceDeDE"],
  fr: ["fr-FR", "voiceFrFR"],
  es: ["es-ES", "voiceEsES"],
  it: ["it-IT", "voiceItIT"],
  "pt-BR": ["pt-BR", "voicePtBR"],
  "pt-PT": ["pt-PT", "voicePtPT"],
  ru: ["ru-RU", "voiceRuRU"],
  uk: ["uk-UA", "voiceUkUA"],
  vi: ["vi-VN", "voiceViVN"],
};

test("all and only Manggo client languages have locale mappings and voice settings", () => {
  const autoLanguage = speech.config.find(({ key }) => key === "autoLanguage");
  assert.equal(autoLanguage.default, "auto");
  const languageMap = { auto: "auto" };
  for (const [tag, [locale, key]] of Object.entries(clientLanguages)) {
    const hostLocale = locale.replaceAll("-", "_");
    languageMap[hostLocale] = locale;
    const field = speech.config.find((field) => field.key === key);
    const expected = { locale, name: field.default.slice(locale.length + 1) };
    assert.deepEqual(resolveVoice(tag, "test"), expected, tag);
    assert.deepEqual(resolveVoice(hostLocale.toUpperCase(), "test"), expected, hostLocale);
    assert.deepEqual(resolveVoice("auto", "test", { autoLanguage: locale }), expected);
    assert.ok(field.options.some(({ value }) => value === field.default));
    for (const { value } of field.options) {
      assert.ok(value.startsWith(`${locale}-`), value);
      assert.deepEqual(resolveVoice(tag, "test", { [key]: value }), {
        locale, name: value.slice(locale.length + 1),
      });
    }
  }
  assert.deepEqual(speech.language, languageMap);
  assert.deepEqual(autoLanguage.options.map(({ value }) => value).sort(), Object.values(languageMap).sort());
  for (const language of ["ar-SA", "fr-CA", "zh-HK", "en-GB", "constructor"]) {
    assert.throws(() => resolveVoice(language, "test"), /不支持语言/, language);
  }
});

test("preserves the previous defaults and saved voice preferences", () => {
  for (const [tag, key, fallback, saved] of [
    ["zh-Hans", "voiceZhCN", "XiaoxiaoNeural", "zh-CN-YunxiNeural"],
    ["zh-Hant", "voiceZhTW", "HsiaoChenNeural", "zh-TW-YunJheNeural"],
    ["en", "voiceEnUS", "JennyNeural", "en-US-AriaNeural"],
    ["ja", "voiceJaJP", "NanamiNeural", "ja-JP-KeitaNeural"],
    ["ko", "voiceKoKR", "SunHiNeural", "ko-KR-InJoonNeural"],
  ]) {
    const field = speech.config.find((field) => field.key === key);
    assert.equal(resolveVoice(tag, "test").name, fallback);
    assert.ok(field.options.some(({ value }) => value === saved));
    const { locale, name } = resolveVoice(tag, "test", { [key]: saved });
    assert.equal(`${locale}-${name}`, saved);
    assert.equal(resolveVoice(tag, "test", { [key]: "de-DE-TanjaNeural" }).name, fallback);
  }
});

test("chooses a default for untagged text without overriding a supplied locale", () => {
  for (const [text, locale] of [
    ["Hello", "en-US"],
    ["欢迎", "zh-CN"],
    ["こんにちは", "ja-JP"],
    ["안녕하세요", "ko-KR"],
    ["Привет", "ru-RU"],
    ["Вітаю", "uk-UA"],
  ]) {
    assert.equal(resolveVoice("auto", text).locale, locale);
    assert.equal(resolveVoice(undefined, text).locale, locale);
  }
  assert.equal(resolveVoice("", "Bonjour", { autoLanguage: "fr-FR" }).locale, "fr-FR");
  assert.equal(resolveVoice("pt_PT", "Olá", { autoLanguage: "pt-BR" }).locale, "pt-PT");
  assert.equal(resolveVoice("pt", "Olá").locale, "pt-BR");
});

test("sends the resolved Edge locale and voice in SSML and returns audio", async (t) => {
  const messages = [];
  const WebSocket = globalThis.WebSocket;
  t.after(() => { globalThis.WebSocket = WebSocket; });
  globalThis.WebSocket = class {
    constructor() { queueMicrotask(() => this.onopen()); }
    send(message) {
      messages.push(message);
      if (!message.includes("Path:ssml")) return;
      queueMicrotask(() => {
        const headers = new TextEncoder().encode("Content-Type:audio/mpeg\r\nPath:audio\r\n");
        const frame = new Uint8Array(headers.length + 3);
        frame[1] = headers.length;
        frame.set(headers, 2);
        frame[frame.length - 1] = 255;
        this.onmessage({ data: frame.buffer });
        this.onmessage({ data: "Path:turn.end\r\n\r\n" });
      });
    }
    close() {}
  };

  const audio = await tts("Bonjour & bienvenue", "fr", { config: { voiceFrFR: "fr-FR-HenriNeural" } });
  assert.deepEqual(audio, { format: "mp3", bytes: new Uint8Array([255]) });
  assert.match(messages[1], /xml:lang="fr-FR"/);
  assert.match(messages[1], /Microsoft Server Speech Text to Speech Voice \(fr-FR, HenriNeural\)/);
  assert.match(messages[1], /Bonjour &amp; bienvenue/);
});

test("native update feed references releases of this plugin", () => {
  const feed = readJSON("../updates.json");
  assert.equal(manifest.updateUrl, "https://raw.githubusercontent.com/Pylogmon/manggo-plugin-microsoft-tts/main/updates.json");
  assert.equal(feed.id, manifest.id);
  assert.ok(feed.versions.length);
  const versions = new Set();
  for (const release of feed.versions) {
    assert.match(release.version, /^\d+\.\d+(?:\.\d+)?$/);
    assert.ok(!versions.has(release.version), `duplicate release ${release.version}`);
    versions.add(release.version);
    assert.equal(release.url, `${manifest.homepage}/releases/download/v${release.version}/manggo-plugin-microsoft-tts.mplugin`);
    assert.match(release.sha256, /^[0-9a-f]{64}$/);
  }
});
