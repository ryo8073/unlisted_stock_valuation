#!/usr/bin/env npx tsx
/**
 * 国税庁「類似業種比準価額」データ鮮度チェックスクリプト
 *
 * 用途:
 *   - 現在のデータが最新かどうかを検証
 *   - 月次株価データの欠損を検出
 *   - CI/CD パイプラインから自動実行
 *
 * 使い方:
 *   npx tsx scripts/check-nta-data.ts
 *
 * 出典: https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/
 */

import { similarIndustryDatabase } from '../lib/database/similarIndustryData'

// ─────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────

/** 現在の和暦年（令和）を計算 */
function getCurrentReiwaYear(): number {
  const year = new Date().getFullYear()
  return year - 2018 // 令和元年 = 2019年
}

// 国税庁が公表する月次株価の公表スケジュール（2ヶ月ごと）
// 例: 1・2月分 → 3月下旬公表、3・4月分 → 5月下旬公表
const PUBLICATION_LAG_MONTHS = 2

/** 利用可能なはずの最新月を計算 */
function getExpectedLatestMonth(): { year: string; month: string } {
  const now = new Date()
  const expectedMonth = now.getMonth() + 1 - PUBLICATION_LAG_MONTHS
  let expectedYear = getCurrentReiwaYear()

  if (expectedMonth <= 0) {
    return {
      year: `令和${expectedYear - 1}年`,
      month: `${12 + expectedMonth}月`,
    }
  }
  return { year: `令和${expectedYear}年`, month: `${expectedMonth}月` }
}

// ─────────────────────────────────────────────
// チェック関数
// ─────────────────────────────────────────────

interface CheckResult {
  passed: boolean
  warnings: string[]
  errors: string[]
}

function checkDataFreshness(): CheckResult {
  const result: CheckResult = { passed: true, warnings: [], errors: [] }
  const currentReiwaYear = getCurrentReiwaYear()
  const currentYearKey = `令和${currentReiwaYear}年`
  const prevYearKey = `令和${currentReiwaYear - 1}年`
  const expected = getExpectedLatestMonth()

  console.log('='.repeat(60))
  console.log('国税庁 類似業種比準価額データ 鮮度チェック')
  console.log('='.repeat(60))
  console.log(`現在日時: ${new Date().toLocaleString('ja-JP')}`)
  console.log(`現在の令和: ${currentReiwaYear}年`)
  console.log(`期待される最新月次データ: ${expected.year} ${expected.month}`)
  console.log('')

  // 最新の収録年を確認
  const availableYears = Object.keys(similarIndustryDatabase)
    .map((k) => parseInt(k.replace('令和', '').replace('年', '')))
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a)
  const latestAvailableYear = availableYears[0] ?? 0

  // 1. 当年データ（未公表の可能性あり）→ 警告のみ
  // 国税庁は当年分を通常7〜8月頃公表。4月時点では未公表が通常。
  if (!similarIndustryDatabase[currentYearKey]) {
    const monthNow = new Date().getMonth() + 1
    if (monthNow >= 9) {
      // 9月以降は公表済みのはずなのでエラー
      result.errors.push(
        `❌ ${currentYearKey}のデータが存在しません（9月以降は公表済みのはずです）。` +
          `\n   URL: https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/`
      )
      result.passed = false
    } else {
      result.warnings.push(
        `⚠️  ${currentYearKey}のデータは未登録です（未公表の可能性あり）。` +
          `\n   公表後は lib/database/similarIndustryData.ts に追加してください。` +
          `\n   URL: https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/`
      )
    }
  } else {
    const count = similarIndustryDatabase[currentYearKey].length
    console.log(`✅ ${currentYearKey}: ${count}業種のデータが存在します`)
  }

  // 2. 前年データの存在確認（確実に存在すべき）→ エラー
  if (!similarIndustryDatabase[prevYearKey]) {
    result.errors.push(
      `❌ ${prevYearKey}のデータが存在しません（前年確定値は必須です）。` +
        `\n   URL: https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/`
    )
    result.passed = false
  } else {
    const count = similarIndustryDatabase[prevYearKey].length
    console.log(`✅ ${prevYearKey}: ${count}業種のデータが存在します`)
  }

  // 3. 最新データが2年以上古い場合はエラー
  if (latestAvailableYear < currentReiwaYear - 2) {
    result.errors.push(
      `❌ 最新データが令和${latestAvailableYear}年と古すぎます（${currentReiwaYear - latestAvailableYear}年遅れ）。` +
        `\n   速やかに更新してください。`
    )
    result.passed = false
  }

  // 4. 月次株価データの確認
  const currentYearData = similarIndustryDatabase[currentYearKey]
  if (currentYearData) {
    const expectedMonthNum = parseInt(expected.month.replace('月', ''))
    const missingMonths: string[] = []

    // 期待される月まで順に確認
    for (let m = 1; m <= expectedMonthNum; m++) {
      const monthKey = `${m}月`
      const entriesWithMonth = currentYearData.filter(
        (row) => row.monthlyA && row.monthlyA[monthKey] !== undefined
      )

      if (entriesWithMonth.length === 0) {
        missingMonths.push(monthKey)
      } else {
        const totalEntries = currentYearData.length
        const coverage = Math.round(
          (entriesWithMonth.length / totalEntries) * 100
        )
        if (coverage < 50) {
          missingMonths.push(
            `${monthKey}（${coverage}%しかカバーされていない）`
          )
        } else {
          console.log(
            `  ✅ ${currentYearKey} ${monthKey}: ${entriesWithMonth.length}/${totalEntries}業種 (${coverage}%)`
          )
        }
      }
    }

    if (missingMonths.length > 0) {
      result.warnings.push(
        `⚠️  ${currentYearKey}の以下の月次株価データが不完全です:\n` +
          missingMonths.map((m) => `   - ${m}`).join('\n') +
          `\n   国税庁で公表済みの場合は更新が必要です。` +
          `\n   URL: https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/`
      )
    }
  }

  // 5. データ整合性チェック
  const yearCount = Object.keys(similarIndustryDatabase).length
  if (yearCount < 2) {
    result.warnings.push(
      `⚠️  年度データが${yearCount}年分しかありません。過去3〜5年分の保持を推奨します。`
    )
  }

  // 6. 必須フィールドチェック
  for (const [year, rows] of Object.entries(similarIndustryDatabase)) {
    for (const row of rows) {
      if (!row.A || row.A <= 0) {
        result.errors.push(
          `❌ ${year} No.${row.no} (${row.majorCategory}): A（株価）が無効です`
        )
        result.passed = false
      }
      if (!row.B_prime || row.B_prime <= 0) {
        result.errors.push(
          `❌ ${year} No.${row.no} (${row.majorCategory}): B'（配当）が無効です`
        )
        result.passed = false
      }
      if (!row.C_prime || row.C_prime <= 0) {
        result.errors.push(
          `❌ ${year} No.${row.no} (${row.majorCategory}): C'（利益）が無効です`
        )
        result.passed = false
      }
      if (!row.D_prime || row.D_prime <= 0) {
        result.errors.push(
          `❌ ${year} No.${row.no} (${row.majorCategory}): D'（純資産）が無効です`
        )
        result.passed = false
      }
    }
  }

  return result
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────

function main() {
  const result = checkDataFreshness()

  console.log('')

  if (result.warnings.length > 0) {
    console.log('警告:')
    result.warnings.forEach((w) => console.log(w))
    console.log('')
  }

  if (result.errors.length > 0) {
    console.log('エラー:')
    result.errors.forEach((e) => console.log(e))
    console.log('')
  }

  console.log('='.repeat(60))
  if (result.passed && result.warnings.length === 0) {
    console.log('✅ すべてのチェックがパスしました')
  } else if (result.passed) {
    console.log('⚠️  警告があります（デプロイはブロックされません）')
    console.log('   データを更新することを推奨します')
  } else {
    console.log('❌ エラーが検出されました（デプロイをブロック）')
    process.exit(1)
  }
  console.log('='.repeat(60))
}

main()
