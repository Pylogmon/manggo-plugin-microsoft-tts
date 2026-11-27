import { randomUUID } from "node:crypto";
import { EDGE_MAJOR_VERSION, secMsGec, SEC_MS_GEC_VERSION, TRUSTED_CLIENT_TOKEN } from "./sec-ms-gec.js";
import { resolveVoice } from "./voices.js";

const EDGE_ENDPOINT = {
  url: "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1",
  tokenParameter: "Ocp-Apim-Subscription-Key",
};
const BING_ENDPOINT = {
  url: "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1",
  tokenParameter: "TrustedClientToken",
};
const EDGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    `(KHTML, like Gecko) Chrome/${EDGE_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${EDGE_MAJOR_VERSION}.0.0.0`,
  "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};
const HANDSHAKE_TIMEOUT_MS = 8000;
const MAX_TEXT_BYTES = 4096;
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const DEFAULT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const FORMATS = new Set([
  DEFAULT_FORMAT,
  "audio-24khz-96kbitrate-mono-mp3",
  "audio-48khz-192kbitrate-mono-mp3",
]);
const XML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" };
const decoder = new TextDecoder();

class HandshakeError extends Error {}

export async function tts(text, language, { config, signal } = {}) {
  const input = text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\uD800-\uDFFF\uFFFE\uFFFF]/gu, " ").trim();
  if (!input) throw new Error("请输入要朗读的文本。");

  const settings = speechSettings(language, input, config ?? {});
  const parts = [];
  let length = 0;
  let endpoint = EDGE_ENDPOINT;
  for (const chunk of splitText(input)) {
    const turn = await synthesize(endpoint, chunk, settings, signal, MAX_AUDIO_BYTES - length);
    endpoint = turn.endpoint;
    for (const part of turn.parts) parts.push(part);
    length += turn.length;
  }

  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return { bytes, format: "mp3" };
}

function speechSettings(language, text, config) {
  const { locale, name } = resolveVoice(language, text, config);
  return {
    locale,
    voice: `Microsoft Server Speech Text to Speech Voice (${locale}, ${name})`,
    rate: adjustment(config.rate, "%"),
    pitch: adjustment(config.pitch, "Hz"),
    volume: adjustment(config.volume, "%"),
    format: FORMATS.has(config.outputFormat) ? config.outputFormat : DEFAULT_FORMAT,
  };
}

function adjustment(value, unit) {
  const amount = Number.isInteger(value) && Math.abs(value) <= 50 ? value : 0;
  return (amount < 0 ? "" : "+") + amount + unit;
}

function utf8Width(character) {
  const point = character.codePointAt(0);
  if (point <= 0x7f) return 1;
  if (point <= 0x7ff) return 2;
  return point <= 0xffff ? 3 : 4;
}

function* splitText(text) {
  let chunk = "";
  let bytes = 0;
  let boundary = 0;
  let boundaryBytes = 0;
  for (const character of text) {
    const entity = XML_ENTITIES[character];
    const size = entity?.length ?? utf8Width(character);
    if (bytes + size > MAX_TEXT_BYTES) {
      const split = boundary || chunk.length;
      const part = chunk.slice(0, split);
      if (part.trim()) yield part;
      chunk = chunk.slice(split);
      bytes -= boundary ? boundaryBytes : bytes;
      boundary = 0;
    }
    chunk += entity ?? character;
    bytes += size;

    // A boundary in the latter half keeps each request reasonably full.
    if (bytes >= MAX_TEXT_BYTES / 2 && /[\s.!?。！？；;]/u.test(character)) {
      boundary = chunk.length;
      boundaryBytes = bytes;
    }
  }
  if (chunk.trim()) yield chunk;
}

function connectionId() {
  return randomUUID().replaceAll("-", "");
}

function openEdgeSocket(url) {
  try {
    return new WebSocket(url, {
      headers: { ...EDGE_HEADERS, Cookie: `muid=${connectionId().toUpperCase()};` },
    });
  } catch (error) {
    // Older hosts interpret the options object as a list of subprotocols.
    if (error instanceof TypeError && error.message === "WebSocket protocols must be a string or iterable") {
      throw new Error("请更新到支持 WebSocket 请求头的 Manggo 版本后再使用 Microsoft TTS。");
    }
    throw error;
  }
}

async function synthesize(preferred, text, settings, signal, availableBytes) {
  const alternate = preferred === EDGE_ENDPOINT ? BING_ENDPOINT : EDGE_ENDPOINT;
  const failures = [];
  for (const endpoint of [preferred, alternate]) {
    try {
      return await synthesizeFrom(endpoint, text, settings, signal, availableBytes);
    } catch (error) {
      // A request that reached the service may already have started synthesizing.
      if (!(error instanceof HandshakeError)) throw error;
      failures.push(error.message);
    }
  }
  throw new Error(`Microsoft Edge 朗读连接失败（${failures.join("，")}）。`);
}

function synthesizeFrom(endpoint, text, settings, signal, availableBytes) {
  if (signal?.aborted) throw signal.reason ?? new Error("朗读已取消。");
  const url = new URL(endpoint.url);
  url.searchParams.set(endpoint.tokenParameter, TRUSTED_CLIENT_TOKEN);
  url.searchParams.set("Sec-MS-GEC", secMsGec());
  url.searchParams.set("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION);
  url.searchParams.set("ConnectionId", connectionId());

  return new Promise((resolve, reject) => {
    const socket = openEdgeSocket(url.href);
    socket.binaryType = "arraybuffer";
    const parts = [];
    let length = 0;
    let opened = false;
    const handshakeFailed = () => new HandshakeError(`${url.hostname} 握手失败`);
    const timeout = setTimeout(() => {
      finish(new HandshakeError(`${url.hostname} 连接超时`));
    }, HANDSHAKE_TIMEOUT_MS);

    function finish(error) {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      socket.close();
      if (error) reject(error);
      else resolve({ parts, length, endpoint });
    }

    function abort() {
      finish(signal.reason ?? new Error("朗读已取消。"));
    }

    socket.onopen = () => {
      opened = true;
      clearTimeout(timeout);
      try {
        sendRequest(socket, text, settings);
      } catch (error) {
        finish(error);
      }
    };
    socket.onmessage = ({ data }) => {
      try {
        if (typeof data === "string") {
          const headers = data.split("\r\n\r\n", 1)[0];
          if (/^Path:[ \t]*turn\.end\s*$/im.test(headers)) {
            finish(length ? null : new Error("Microsoft TTS 没有返回音频。"));
          }
          return;
        }

        const audio = audioPayload(data);
        if (!audio.length) return;
        length += audio.length;
        if (length > availableBytes) throw new Error("Microsoft TTS 音频超出 Manggo 的大小限制。");
        parts.push(audio);
      } catch (error) {
        finish(error);
      }
    };
    socket.onerror = () => finish(opened
      ? new Error(`Microsoft TTS 连接中断（${url.hostname}）。`)
      : handshakeFailed());
    socket.onclose = ({ code }) => finish(opened
      ? new Error(`Microsoft TTS 在朗读完成前断开连接（${code}）。`)
      : handshakeFailed());
    signal?.addEventListener("abort", abort, { once: true });
  });
}

function sendRequest(socket, text, { locale, voice, rate, pitch, volume, format }) {
  const timestamp = new Date().toUTCString().replace(
    /^(\w{3}), (\d{2}) (\w{3}) (.+) GMT$/,
    "$1 $3 $2 $4 GMT+0000 (Coordinated Universal Time)",
  );
  const config = JSON.stringify({
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: false },
          outputFormat: format,
        },
      },
    },
  });
  socket.send([
    `X-Timestamp:${timestamp}`,
    "Content-Type:application/json; charset=utf-8",
    "Path:speech.config",
    "",
    config,
    "",
  ].join("\r\n"));

  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${voice}"><prosody rate="${rate}" pitch="${pitch}" volume="${volume}">` +
    text + "</prosody></voice></speak>";
  socket.send([
    `X-RequestId:${connectionId()}`,
    "Content-Type:application/ssml+xml",
    `X-Timestamp:${timestamp}Z`,
    "Path:ssml",
    "",
    ssml,
  ].join("\r\n"));
}

function audioPayload(data) {
  const bytes = new Uint8Array(data);
  if (bytes.length < 2) throw new Error("Microsoft TTS 返回了不完整的音频帧。");
  const end = 2 + ((bytes[0] << 8) | bytes[1]);
  if (end > bytes.length) throw new Error("Microsoft TTS 返回了不完整的音频头。");

  const headers = decoder.decode(bytes.subarray(2, end));
  const path = /^Path:[ \t]*audio\s*$/im.test(headers);
  const mp3 = /^Content-Type:[ \t]*audio\/mpeg\s*$/im.test(headers);
  if (!path || (end < bytes.length && !mp3)) {
    throw new Error("Microsoft TTS 返回了无法识别的音频帧。");
  }
  return bytes.subarray(end);
}
