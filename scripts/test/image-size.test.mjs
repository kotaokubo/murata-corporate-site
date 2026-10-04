import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat, readImageSize } from '../image-size.mjs';

const fixtures = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');

describe('image-size', () => {
  it('PNG の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '1x1.png'));
    assert.equal(detectFormat(buf), 'png');
    assert.deepEqual(readImageSize(buf), { width: 1, height: 1, format: 'png' });
  });

  it('JPEG の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '1x1.jpg'));
    assert.equal(detectFormat(buf), 'jpeg');
    assert.deepEqual(readImageSize(buf), { width: 1, height: 1, format: 'jpeg' });
  });

  it('WebP VP8 の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '1x1-vp8.webp'));
    assert.equal(detectFormat(buf), 'webp');
    assert.deepEqual(readImageSize(buf), { width: 1, height: 1, format: 'webp' });
  });

  it('WebP VP8L の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '1x1-vp8l.webp'));
    assert.equal(detectFormat(buf), 'webp');
    assert.deepEqual(readImageSize(buf), { width: 1, height: 1, format: 'webp' });
  });

  it('WebP VP8X の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '1x1-vp8x.webp'));
    assert.equal(detectFormat(buf), 'webp');
    assert.deepEqual(readImageSize(buf), { width: 1, height: 1, format: 'webp' });
  });

  it('長い辺が 2400 を超える PNG の寸法を読む', () => {
    const buf = readFileSync(join(fixtures, '2401x10.png'));
    assert.deepEqual(readImageSize(buf), { width: 2401, height: 10, format: 'png' });
  });

  it('切れた PNG（IHDR 不足）は null', () => {
    const buf = readFileSync(join(fixtures, '1x1.png')).subarray(0, 20);
    assert.equal(readImageSize(buf), null);
  });

  it('IHDR 直後で切れた PNG は寸法が読めても null', () => {
    // 署名(8) + IHDR 長(4)+型(4)+data(13)+CRC(4) = 33
    const buf = readFileSync(join(fixtures, '1x1.png')).subarray(0, 33);
    assert.equal(detectFormat(buf), 'png');
    assert.equal(readImageSize(buf), null);
  });

  it('IHDR 長さが 13 でない PNG は null', () => {
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1.png')));
    buf.writeUInt32BE(12, 8); // 本来 13
    assert.equal(readImageSize(buf), null);
  });

  it('IEND の後に余分なバイトがあると null', () => {
    const base = readFileSync(join(fixtures, '1x1.png'));
    const buf = Buffer.concat([base, Buffer.from([0x00])]);
    assert.equal(readImageSize(buf), null);
  });

  it('切れた JPEG（先頭のみ）は null', () => {
    const buf = readFileSync(join(fixtures, '1x1.jpg')).subarray(0, 10);
    assert.equal(detectFormat(buf), 'jpeg');
    assert.equal(readImageSize(buf), null);
  });

  it('SOF 直後で切れた JPEG は寸法が読めても null', () => {
    // SOF0 セグメント終端 = 177（fixture 実測）
    const buf = readFileSync(join(fixtures, '1x1.jpg')).subarray(0, 177);
    assert.equal(detectFormat(buf), 'jpeg');
    assert.equal(readImageSize(buf), null);
  });

  it('末尾が EOI でない JPEG は null', () => {
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1.jpg')));
    buf[buf.length - 1] = 0x00;
    assert.equal(readImageSize(buf), null);
  });

  it('JPEG のセグメント長さが不正なら null', () => {
    // SOI + APP0 風で長さがバッファを超える
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xff, 0x00]);
    assert.equal(readImageSize(buf), null);
  });

  it('WebP の RIFF サイズがファイルより長いと null', () => {
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1-vp8.webp')));
    buf.writeUInt32LE(0xffff, 4);
    assert.equal(readImageSize(buf), null);
  });

  it('WebP の RIFF サイズがファイルより短いと null', () => {
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1-vp8.webp')));
    buf.writeUInt32LE(10, 4); // 実際は 22
    assert.equal(readImageSize(buf), null);
  });

  it('riffEnd を越える VP8 チャンクは null', () => {
    // 正当な VP8 WebP を元に、チャンク size だけを膨らませて riffEnd 超えにする
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1-vp8.webp')));
    // offset 12: 'VP8 ', offset 16: size (LE). 実サイズを超える値にする
    const huge = buf.length; // dataEnd = 20 + huge > riffEnd
    buf.writeUInt32LE(huge, 16);
    assert.equal(detectFormat(buf), 'webp');
    assert.equal(readImageSize(buf), null);
  });

  it('SOS 長さが Ns と一致しない JPEG は null', () => {
    const base = Buffer.from(readFileSync(join(fixtures, '1x1.jpg')));
    // SOS マーカーを探し、長さを不正な値（6 未満）にする
    let i = 2;
    while (i < base.length - 2) {
      if (base[i] !== 0xff) break;
      while (i < base.length && base[i] === 0xff) i++;
      const marker = base[i++];
      if (marker === 0xda) {
        base.writeUInt16BE(4, i); // 6 未満
        break;
      }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const len = base.readUInt16BE(i);
      i += len;
    }
    assert.equal(readImageSize(base), null);
  });

  it('SOS の直後が EOI の JPEG（スキャンデータなし）は null', () => {
    // SOI + SOF0(最小) + SOS(Ns=1) + EOI。スキャンデータ 0 バイト
    const parts = [];
    parts.push(Buffer.from([0xff, 0xd8])); // SOI
    // SOF0: len=11, P=8, Y=1, X=1, Nf=1, C1=1, HV=0x11, Tq=0
    parts.push(Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]));
    // SOS: len=8 (=6+2*1), Ns=1, Cs=1, TdTa=0, Ss=0, Se=63, AhAl=0
    parts.push(Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00]));
    parts.push(Buffer.from([0xff, 0xd9])); // EOI（スキャンデータなし）
    const buf = Buffer.concat(parts);
    assert.equal(detectFormat(buf), 'jpeg');
    assert.equal(readImageSize(buf), null);
  });

  it('IDAT の無い PNG は null', () => {
    // 署名 + IHDR + IEND のみ（IDAT なし）
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(1, 0); // width
    ihdrData.writeUInt32BE(1, 4); // height
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 2; // color type RGB
    const ihdrLen = Buffer.alloc(4);
    ihdrLen.writeUInt32BE(13);
    const ihdr = Buffer.concat([ihdrLen, Buffer.from('IHDR'), ihdrData, Buffer.alloc(4)]);
    const iend = Buffer.concat([Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
    const buf = Buffer.concat([sig, ihdr, iend]);
    assert.equal(detectFormat(buf), 'png');
    assert.equal(readImageSize(buf), null);
  });

  it('VP8X のみでビットストリームが無い WebP は null', () => {
    // RIFF + WEBP + VP8X(10) のみ
    const vp8xData = Buffer.alloc(10);
    const body = Buffer.concat([
      Buffer.from('VP8X'),
      (() => {
        const s = Buffer.alloc(4);
        s.writeUInt32LE(10);
        return s;
      })(),
      vp8xData,
    ]);
    const riffSize = Buffer.alloc(4);
    riffSize.writeUInt32LE(4 + body.length);
    const buf = Buffer.concat([Buffer.from('RIFF'), riffSize, Buffer.from('WEBP'), body]);
    assert.equal(detectFormat(buf), 'webp');
    assert.equal(readImageSize(buf), null);
  });
});
