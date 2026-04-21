import { test, expect } from '@playwright/test'

test.describe('株式評価ウィザード - E2Eテスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('正常フロー（Step 1→5）', () => {
    test('基本的な評価フローが正常に完了する', async ({ page }) => {
      // Step 1: 株主判定
      await page.getByLabel('総議決権数').fill('10000')

      // 株主1を追加
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('6000')

      // 家族グループと筆頭株主にチェック
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()

      // 株主2を追加
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').nth(1).fill('山田次郎')
      await page.getByLabel('続柄').nth(1).selectOption('第三者')
      await page.getByLabel('役職').nth(1).fill('監査役')
      await page.getByLabel('株式数').nth(1).fill('500')
      await page.getByLabel('議決権数').nth(1).fill('4000')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 2: 特定会社等
      await expect(page.getByText('特定会社等の判定')).toBeVisible()
      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByLabel('清算中').uncheck()

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 3: 会社規模
      await expect(page.getByText('会社規模の判定')).toBeVisible()
      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('パートタイム時間').fill('9000')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 4: 評価方式
      await expect(page.getByText('評価方式の選択')).toBeVisible()
      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('1200')
      await page.getByLabel('純資産価額').fill('1000')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 5: 結果表示
      await expect(page.getByText('評価結果')).toBeVisible()
      await expect(page.getByText('1株当たり評価額')).toBeVisible()

      // PDF出力ボタンが存在することを確認
      await expect(page.getByRole('button', { name: 'PDF出力' })).toBeVisible()
    })
  })

  test.describe('少数株主フロー', () => {
    test('少数株主の場合、配当還元方式が適用される', async ({ page }) => {
      // Step 1: 少数株主を含む株主構成
      await page.getByLabel('総議決権数').fill('10000')

      // 筆頭株主
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('6000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()

      // 少数株主（4%）
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').nth(1).fill('山田次郎')
      await page.getByLabel('続柄').nth(1).selectOption('第三者')
      await page.getByLabel('役職').nth(1).fill('監査役')
      await page.getByLabel('株式数').nth(1).fill('400')
      await page.getByLabel('議決権数').nth(1).fill('400') // 4%

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 2-3: 通常の入力
      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')
      await page.getByRole('button', { name: '次へ' }).click()

      // Step 4: 少数株主の場合、配当利回り入力が表示される
      await expect(page.getByText('少数株主特則')).toBeVisible()
      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('1200')
      await page.getByLabel('純資産価額').fill('1000')
      await page.getByLabel('配当利回り').fill('5')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 5: 配当還元方式で計算された結果
      await expect(page.getByText('配当還元方式')).toBeVisible()
      await expect(page.getByText('1,000円')).toBeVisible() // 50円 ÷ 5% = 1,000円
    })
  })

  test.describe('大会社フロー（70人以上）', () => {
    test('従業員70人以上の場合、即・大会社判定される', async ({ page }) => {
      // Step 1: 通常の株主構成
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('10000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 2: 通常の入力
      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByRole('button', { name: '次へ' }).click()

      // Step 3: 70人以上の従業員
      await page.getByLabel('従業員数').fill('70')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 4: 大会社の評価方式
      await expect(page.getByText('大会社')).toBeVisible()
      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('800')
      await page.getByLabel('純資産価額').fill('1000')

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 5: 類似業種比準価額が採用される
      await expect(page.getByText('類似業種比準価額')).toBeVisible()
      await expect(page.getByText('800円')).toBeVisible()
    })
  })

  test.describe('特定会社等フロー', () => {
    test('土地保有比率70%以上の場合、特定会社等に該当する', async ({
      page,
    }) => {
      // Step 1: 通常の株主構成
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('10000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()

      await page.getByRole('button', { name: '次へ' }).click()

      // Step 2: 土地保有比率70%以上
      await page.getByLabel('土地保有比率').fill('75')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')

      await page.getByRole('button', { name: '次へ' }).click()

      // 特定会社等の判定結果が表示される
      await expect(page.getByText('土地保有会社')).toBeVisible()

      // Step 3-5: 通常の入力
      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('1200')
      await page.getByLabel('純資産価額').fill('1000')
      await page.getByRole('button', { name: '次へ' }).click()

      await expect(page.getByText('評価結果')).toBeVisible()
    })
  })

  test.describe('バリデーションエラー', () => {
    test('Step 1で必須項目が未入力の場合、エラーが表示される', async ({
      page,
    }) => {
      await page.getByRole('button', { name: '次へ' }).click()

      await expect(page.getByText('総議決権数は必須です')).toBeVisible()
      await expect(page.getByText('株主情報は必須です')).toBeVisible()
    })

    test('Step 2で比率が100%を超える場合、エラーが表示される', async ({
      page,
    }) => {
      // Step 1を完了
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('10000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()
      await page.getByRole('button', { name: '次へ' }).click()

      // Step 2で無効な値を入力
      await page.getByLabel('土地保有比率').fill('120')
      await page.getByRole('button', { name: '次へ' }).click()

      await expect(
        page.getByText('土地保有比率は0%から100%の範囲で入力してください')
      ).toBeVisible()
    })

    test('Step 4で少数株主で配当利回りが未入力の場合、エラーが表示される', async ({
      page,
    }) => {
      // Step 1-3を完了（少数株主を含む）
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('6000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()

      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').nth(1).fill('山田次郎')
      await page.getByLabel('続柄').nth(1).selectOption('第三者')
      await page.getByLabel('役職').nth(1).fill('監査役')
      await page.getByLabel('株式数').nth(1).fill('400')
      await page.getByLabel('議決権数').nth(1).fill('400')

      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')
      await page.getByRole('button', { name: '次へ' }).click()

      // Step 4で配当利回りを未入力
      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('1200')
      await page.getByLabel('純資産価額').fill('1000')
      await page.getByRole('button', { name: '次へ' }).click()

      await expect(
        page.getByText('少数株主の場合は配当利回りを入力してください')
      ).toBeVisible()
    })
  })

  test.describe('状態の永続化', () => {
    test('Step 3でページをリフレッシュしても入力値が保持される', async ({
      page,
    }) => {
      // Step 1-2を完了
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('10000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByRole('button', { name: '次へ' }).click()

      // Step 3で値を入力
      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('パートタイム時間').fill('9000')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')

      // ページをリフレッシュ
      await page.reload()

      // 入力値が保持されていることを確認
      await expect(page.getByLabel('従業員数')).toHaveValue('50')
      await expect(page.getByLabel('パートタイム時間')).toHaveValue('9000')
      await expect(page.getByLabel('資産額')).toHaveValue('100000000')
      await expect(page.getByLabel('売上額')).toHaveValue('500000000')
      await expect(page.getByLabel('業種')).toHaveValue('製造業')
    })
  })

  test.describe('PDF出力', () => {
    test('評価完了後にPDFが正常にダウンロードされる', async ({ page }) => {
      // 完全な評価フローを実行
      await page.getByLabel('総議決権数').fill('10000')
      await page.getByRole('button', { name: '株主を追加' }).click()
      await page.getByLabel('氏名').first().fill('田中太郎')
      await page.getByLabel('続柄').first().selectOption('本人')
      await page.getByLabel('役職').first().fill('代表取締役')
      await page.getByLabel('株式数').first().fill('1000')
      await page.getByLabel('議決権数').first().fill('10000')
      await page.getByLabel('家族グループ').first().check()
      await page.getByLabel('筆頭株主グループ').first().check()
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('土地保有比率').fill('30')
      await page.getByLabel('株式等保有比率').fill('20')
      await page.getByLabel('設立日').fill('2020-01-01')
      await page.getByLabel('事業状況').selectOption('営業中')
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('従業員数').fill('50')
      await page.getByLabel('資産額').fill('100000000')
      await page.getByLabel('売上額').fill('500000000')
      await page.getByLabel('業種').selectOption('製造業')
      await page.getByRole('button', { name: '次へ' }).click()

      await page.getByLabel('1株当たり配当金').fill('50')
      await page.getByLabel('1株当たり利益').fill('100')
      await page.getByLabel('1株当たり純資産額').fill('1000')
      await page.getByLabel('類似業種比準価額').fill('1200')
      await page.getByLabel('純資産価額').fill('1000')
      await page.getByRole('button', { name: '次へ' }).click()

      // PDF出力ボタンをクリック
      const downloadPromise = page.waitForEvent('download')
      await page.getByRole('button', { name: 'PDF出力' }).click()
      const download = await downloadPromise

      // ダウンロードされたファイル名を確認
      expect(download.suggestedFilename()).toContain('株式評価結果')
      expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    })
  })
})
