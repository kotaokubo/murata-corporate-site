// PNG / JPEG / WebP の寸法をヘッダーから読む（依存パッケージなし）
// 構造が不正・寸法が読めない・途中で切れている場合は null を返す（呼び出し側は成功にしない）
import { readFileSync } from 'node:fs';

/** @param {Buffer} buf */
export function detectFormat(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'png';
  if (
    buf.length >= 12 &&
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  if (buf.length >= 6) {
    const sig = buf.toString('ascii', 0, 6);
    if (sig === 'GIF87a' || sig === 'GIF89a') return 'gif';
  }
  return null;
}

/**
 * PNG: チャンクを長さでたどり、IHDR から寸法を読む。
 * 最後が IEND で、IEND の終端がファイル終端と一致すること。
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null}
 */
function readPngSize(buf) {
  if (buf.length < 8) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let sawIhdr = false;
  let sawIend = false;

  while (offset + 8 <= buf.length) {
    const chunkLen = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + chunkLen;
    const chunkEnd = dataEnd + 4; // CRC
    if (chunkEnd > buf.length) return null;

    if (type === 'IHDR') {
      if (chunkLen !== 13) return null;
      if (sawIhdr) return null;
      width = buf.readUInt32BE(dataStart);
      height = buf.readUInt32BE(dataStart + 4);
      if (!width || !height) return null;
      sawIhdr = true;
    } else if (type === 'IEND') {
      if (chunkLen !== 0) return null;
      sawIend = true;
      // IEND の終端がファイル終端と一致すること
      if (chunkEnd !== buf.length) return null;
      offset = chunkEnd;
      break;
    }

    offset = chunkEnd;
  }

  if (!sawIhdr || !sawIend) return null;
  if (offset !== buf.length) return null;
  return { width, height };
}

/**
 * JPEG: SOI の後、セグメントを長さでたどり SOF から寸法を読む。
 * SOF の後に SOS があり、ファイルの最後が EOI（FF D9）であること。
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null}
 */
function readJpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  // ファイル末尾が EOI
  if (buf[buf.length - 2] !== 0xff || buf[buf.length - 1] !== 0xd9) return null;

  let i = 2;
  let width = 0;
  let height = 0;
  let sawSof = false;
  let sawSos = false;

  while (i < buf.length - 2) {
    // マーカー先頭の 0xff を探す（詰まった 0xff を飛ばす）
    if (buf[i] !== 0xff) return null;
    while (i < buf.length && buf[i] === 0xff) i++;
    if (i >= buf.length) return null;
    const marker = buf[i];
    i++;

    // EOI（単独）。SOF/SOS 前に来たら不正。SOS 後はエントロピー領域なのでここには来ない
    if (marker === 0xd9) {
      return null;
    }
    // 単独マーカー（長さなし）: TEM / RST0-7
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue;
    }
    // SOS: エントロピー符号化データの開始
    if (marker === 0xda) {
      if (!sawSof) return null;
      if (i + 2 > buf.length) return null;
      const len = buf.readUInt16BE(i);
      if (len < 2 || i + len > buf.length) return null;
      // SOS セグメント本体のあとはスキャンデータ。末尾 EOI は冒頭で確認済み
      sawSos = true;
      break;
    }
    // 次の SOI などは想定外
    if (marker === 0xd8) return null;

    if (i + 2 > buf.length) return null;
    const len = buf.readUInt16BE(i);
    if (len < 2) return null;
    if (i + len > buf.length) return null;

    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      if (len < 7 || i + 7 > buf.length) return null;
      height = buf.readUInt16BE(i + 3);
      width = buf.readUInt16BE(i + 5);
      if (!width || !height) return null;
      sawSof = true;
    }

    i += len;
  }

  if (!sawSof || !sawSos) return null;
  return { width, height };
}

/**
 * WebP: 各チャンクの終端が RIFF の宣言領域（riffEnd）の内側で、
 * riffEnd がファイル長と一致すること。VP8 / VP8L / VP8X から寸法。
 * @param {Buffer} buf
 * @returns {{ width: number, height: number } | null}
 */
function readWebpSize(buf) {
  if (buf.length < 12) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return null;
  if (buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const riffSize = buf.readUInt32LE(4);
  // RIFF の size は「size フィールド以降のバイト数」。ファイル長は size + 8 と一致必須
  const riffEnd = 8 + riffSize;
  if (riffEnd !== buf.length) return null;

  let offset = 12;
  let width = 0;
  let height = 0;
  let sawDim = false;

  while (offset + 8 <= riffEnd) {
    const fourcc = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    // 各チャンクの終端が riffEnd の内側
    if (dataEnd > riffEnd) return null;

    if (!sawDim && fourcc === 'VP8X') {
      if (size < 10) return null;
      const w = 1 + (buf[dataStart + 4] | (buf[dataStart + 5] << 8) | (buf[dataStart + 6] << 16));
      const h = 1 + (buf[dataStart + 7] | (buf[dataStart + 8] << 8) | (buf[dataStart + 9] << 16));
      if (!w || !h) return null;
      width = w;
      height = h;
      sawDim = true;
    } else if (!sawDim && fourcc === 'VP8 ') {
      // キーフレーム: 3 バイトのフレームタグのあと同期コード 9d 01 2a、続く 14 ビット幅・高さ
      if (size < 10) return null;
      const tag = buf[dataStart] | (buf[dataStart + 1] << 8) | (buf[dataStart + 2] << 16);
      const isKey = (tag & 1) === 0;
      if (
        isKey &&
        buf[dataStart + 3] === 0x9d &&
        buf[dataStart + 4] === 0x01 &&
        buf[dataStart + 5] === 0x2a
      ) {
        const w = buf.readUInt16LE(dataStart + 6) & 0x3fff;
        const h = buf.readUInt16LE(dataStart + 8) & 0x3fff;
        if (!w || !h) return null;
        width = w;
        height = h;
        sawDim = true;
      } else {
        return null;
      }
    } else if (!sawDim && fourcc === 'VP8L') {
      // 署名 0x2f のあと 14 ビット + 1
      if (size < 5 || buf[dataStart] !== 0x2f) return null;
      const bits =
        buf[dataStart + 1] |
        (buf[dataStart + 2] << 8) |
        (buf[dataStart + 3] << 16) |
        (buf[dataStart + 4] << 24);
      const w = (bits & 0x3fff) + 1;
      const h = ((bits >> 14) & 0x3fff) + 1;
      if (!w || !h) return null;
      width = w;
      height = h;
      sawDim = true;
    }

    // チャンクは奇数長ならパディング 1 バイト（パディングも riffEnd 内）
    offset = dataEnd + (size & 1);
    if (offset > riffEnd) return null;
  }

  if (!sawDim) return null;
  // チャンク列の終端が riffEnd（パディングで 1 バイト余ることはチャンク走査で吸収）
  if (offset !== riffEnd) return null;
  return { width, height };
}

/**
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, format: string } | null}
 */
export function readImageSize(buf) {
  const format = detectFormat(buf);
  if (!format || format === 'gif') return null;
  let size = null;
  if (format === 'png') size = readPngSize(buf);
  else if (format === 'jpeg') size = readJpegSize(buf);
  else if (format === 'webp') size = readWebpSize(buf);
  if (!size || !size.width || !size.height) return null;
  return { ...size, format };
}

/** @param {string} filePath */
export function readImageSizeFromFile(filePath) {
  return readImageSize(readFileSync(filePath));
}
