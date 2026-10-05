import { test, expect } from '@playwright/test';

// 入力チェックと mailto: 組み立てを確かめる。実際のメールソフト起動はしない
test.describe('エントリーフォームの入力チェック', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/recruit/entry/'); });

  test('何も入れずに確認すると、必須項目のエラーが出る', async ({ page }) => {
    const errors = await page.evaluate(() => (window as any).__validateEntry());
    for (const label of ['お名前', 'フリガナ', 'メールアドレス', '電話番号', '希望職種', '希望勤務地', '志望動機']) {
      expect(errors.join('\n')).toContain(label);
    }
    expect(errors.join('\n')).toContain('同意');
  });

  test('メールアドレスの形式が誤っているとエラーになる', async ({ page }) => {
    await page.fill('#email', 'not-an-email');
    const errors: string[] = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors).toContain('メールアドレスの形式が正しくありません');
  });

  test('正しく入れるとエラーが出ない', async ({ page }) => {
    await page.fill('#name', '山田 太郎');
    await page.fill('#kana', 'ヤマダ タロウ');
    await page.fill('#email', 'taro@example.com');
    await page.fill('#tel', '089-000-0000');
    await page.selectOption('#job', { index: 1 });
    await page.selectOption('#place', { index: 1 });
    await page.fill('#motive', 'テスト');
    await page.check('#agree');
    const errors: string[] = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors).toEqual([]);
  });

  test('正しく入れて送信すると mailto URL が組み立てられる', async ({ page }) => {
    await page.fill('#name', '山田 太郎');
    await page.fill('#kana', 'ヤマダ タロウ');
    await page.fill('#email', 'taro@example.com');
    await page.fill('#tel', '089-000-0000');
    await page.selectOption('#job', { index: 1 });
    await page.selectOption('#place', { index: 1 });
    await page.fill('#motive', 'テスト');
    await page.check('#agree');

    const mailto: string = await page.evaluate(() => (window as any).__buildEntryMailto());
    expect(mailto.startsWith('mailto:info@murata-jewelry.co.jp?')).toBe(true);
    expect(mailto).toContain(encodeURIComponent('【エントリー】山田 太郎（セールススタッフ）'));
    expect(mailto).toContain(encodeURIComponent('電話番号：089-000-0000'));
    // 改行は CRLF で符号化する
    expect(mailto).toContain('%0D%0A');
    expect(mailto).toContain(encodeURIComponent('志望動機：テスト'));
  });

  test('本文が長すぎるときは、自己PRと志望動機を省いて書き足しを頼む', async ({ page }) => {
    await page.fill('#name', '山田 太郎');
    await page.selectOption('#job', { index: 1 });
    await page.fill('#motive', 'あ'.repeat(1000));
    const mailto: string = await page.evaluate(() => (window as any).__buildEntryMailto());
    expect(mailto.length).toBeLessThanOrEqual(1800);
    expect(mailto).not.toContain(encodeURIComponent('あああ'));
    expect(mailto).toContain(encodeURIComponent('（自己PRと志望動機は、このメールに書き足してください）'));
  });

  test('名前とフリガナを上限いっぱいに入れても、URL は 1800 文字に収まる', async ({ page }) => {
    // 名前とフリガナは40文字まで入る。それを超える分は入力されない
    await page.fill('#name', '山'.repeat(40));
    await page.fill('#kana', 'ヤ'.repeat(40));
    await page.fill('#email', `${'a'.repeat(80)}@example.co.jp`);
    await page.selectOption('#job', { index: 1 });
    await page.selectOption('#place', { index: 1 });
    await page.fill('#motive', 'あ'.repeat(1000));
    const mailto: string = await page.evaluate(() => (window as any).__buildEntryMailto());
    expect(mailto.length).toBeLessThanOrEqual(1800);
    // 名前は切り捨てずに本文に残る
    expect(mailto).toContain(encodeURIComponent('山'.repeat(40)));
    // 外したフリガナは書き足しを頼む
    expect(mailto).toContain(encodeURIComponent('（フリガナ、自己PR、志望動機は、このメールに書き足してください）'));
  });

  test('送信ボタン（メールを作成する）が押せる', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'メールを作成する' })).toBeEnabled();
  });
});
