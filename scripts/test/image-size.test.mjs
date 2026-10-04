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

  it('IHDR 長さが 13 でない PNG は null', () => {
    const buf = Buffer.from(readFileSync(join(fixtures, '1x1.png')));
    buf.writeUInt32BE(12, 8); // 本来 13
    assert.equal(readImageSize(buf), null);
  });

  it('切れた JPEG は null', () => {
    const buf = readFileSync(join(fixtures, '1x1.jpg')).subarray(0, 10);
    assert.equal(detectFormat(buf), 'jpeg');
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
});
