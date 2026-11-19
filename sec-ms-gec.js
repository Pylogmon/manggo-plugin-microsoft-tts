import { createHash } from "node:crypto";

export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_VERSION = "155.0.4283.45";
export const EDGE_MAJOR_VERSION = EDGE_VERSION.split(".")[0];
export const SEC_MS_GEC_VERSION = `2-${EDGE_VERSION}`;

// Sec-MS-GEC v2 protocol constants documented in rany2/edge-tts#492.
const PREFIX = "Copyright (C) Microsoft Corporation. All rights reserved.";
const WINDOWS_EPOCH_SECONDS = 11644473600;

function swapAndMultiply(word, factor) {
  return Math.imul((word << 16) | (word >>> 16), factor);
}

function cs64(input, digest) {
  const padded = Buffer.alloc(Math.ceil(input.length / 8) * 8);
  padded.set(input);
  const evenKey = digest.readUInt32LE(0) | 1;
  const oddKey = digest.readUInt32LE(4) | 1;
  let state = 0;
  let stateSum = 0;
  let swapSum = 0;
  let lastSwap = 0;

  for (let offset = 0; offset < padded.length; offset += 8) {
    const even = padded.readUInt32LE(offset);
    const odd = padded.readUInt32LE(offset + 4);
    const evenTerm = Math.imul(even, evenKey);
    const oddTerm = Math.imul(odd, oddKey);

    const leftSwap = swapAndMultiply(swapAndMultiply(even, 0xef0569fb) + evenTerm, 0x76f50f34);
    const rightSwap = swapAndMultiply(swapAndMultiply(odd, 0xc31713db) + oddTerm, 0x1881ce3c);
    lastSwap = (swapAndMultiply(rightSwap, 0x35bd1ec9) + rightSwap) | 0;
    swapSum = (swapSum + swapAndMultiply(leftSwap, 0xc3efea97) + leftSwap + lastSwap) | 0;

    let left = Math.imul(state, evenKey) + evenTerm;
    for (const factor of [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83]) {
      left = swapAndMultiply(left, factor);
    }
    state = Math.imul(left, oddKey) + oddTerm;
    for (const factor of [0xa27416f5, 0xd38396ff, 0x7c932b89, 0xbfa49f69]) {
      state = swapAndMultiply(state, factor);
    }
    stateSum = (stateSum + left + state) | 0;
  }

  const checksum = Buffer.alloc(8);
  checksum.writeUInt32LE((lastSwap ^ state) >>> 0, 0);
  checksum.writeUInt32LE((swapSum ^ stateSum) >>> 0, 4);
  return checksum.toString("hex");
}

export function secMsGec(now = Date.now()) {
  const seconds = WINDOWS_EPOCH_SECONDS + now / 1000;
  const ticks = (Math.floor(seconds / 300) * 300 * 10000000).toFixed(0);
  const input = Buffer.from(PREFIX + ticks + TRUSTED_CLIENT_TOKEN);
  const digest = createHash("sha256").update(input).digest();
  return (cs64(input, digest) + "-" + digest.toString("hex")).toUpperCase();
}
