import { test, expect } from '@playwright/test';

// 入力チェックだけを確かめる。実際の送信はしない
test.describe('エントリーフォームの入力チェック', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/recruit/entry/'); });

  test('何も入れずに確認すると、必須項目のエラーが出る', async ({ page }) => {
    const errors = await page.evaluate(() => (window as any).__validateEntry());
    for (const label of ['お名前', 'フリガナ', 'メールアドレス', '電話番号', '希望職種', '希望勤務地', '志望動機', '履歴書添付']) {
      expect(errors.join('\n')).toContain(label);
    }
    expect(errors.join('\n')).toContain('同意');
  });

  test('メールアドレスの形式が誤っているとエラーになる', async ({ page }) => {
    await page.fill('#email', 'not-an-email');
    const errors: string[] = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors).toContain('メールアドレスの形式が正しくありません');
  });

  test('添付できない形式と、10MB を超えるファイルはエラーになる', async ({ page }) => {
    await page.setInputFiles('#resume', { name: 'resume.png', mimeType: 'image/png', buffer: Buffer.from('x') });
    let errors: string[] = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors.join('\n')).toContain('PDF、Word、Excel 形式');
    await page.setInputFiles('#resume', { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) });
    errors = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors.join('\n')).toContain('10MB以下');
  });

  test('正しく入れるとエラーが出ない', async ({ page }) => {
    await page.fill('#name', '山田 太郎');
    await page.fill('#kana', 'ヤマダ タロウ');
    await page.fill('#email', 'taro@example.com');
    await page.fill('#tel', '089-000-0000');
    await page.selectOption('#job', { index: 1 });
    await page.selectOption('#place', { index: 1 });
    await page.fill('#motive', 'テスト');
    await page.setInputFiles('#resume', { name: 'resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4') });
    await page.check('#agree');
    const errors: string[] = await page.evaluate(() => (window as any).__validateEntry());
    expect(errors).toEqual([]);
  });

  test('送信の仕組みができるまで、送信ボタンは押せない', async ({ page }) => {
    await expect(page.getByRole('button', { name: '送信内容を確認する' })).toBeDisabled();
  });
});
