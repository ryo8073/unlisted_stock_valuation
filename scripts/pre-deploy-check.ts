#!/usr/bin/env npx tsx
/**
 * Pre-mortem Validation Script
 * デプロイ前に想定されるすべての障害パターンを事前にチェック
 *
 * 使い方:
 *   npx tsx scripts/pre-deploy-check.ts
 *
 * 終了コード:
 *   0 = すべてのチェックがパス
 *   1 = 1件以上のエラーがあり、デプロイ不可
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '..')

interface CheckItem {
  name: string
  check: () => { passed: boolean; message: string }
}

// ─────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────

function run(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' })
    return { ok: true, output }
  } catch (e: any) {
    return { ok: false, output: e.stdout + e.stderr }
  }
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath))
}

// ─────────────────────────────────────────────
// チェック項目
// ─────────────────────────────────────────────

const checks: CheckItem[] = [
  {
    name: '必須ファイルの存在確認',
    check: () => {
      const required = [
        'app/wizard/step1-shareholder/page.tsx',
        'app/wizard/step4-valuation/page.tsx',
        'lib/database/similarIndustryData.ts',
        'lib/store/evalStore.ts',
        'next.config.js',
        'package.json',
        '.husky/pre-commit',
        '.husky/pre-push',
        '.github/workflows/ci.yml',
      ]
      const missing = required.filter((f) => !fileExists(f))
      if (missing.length > 0) {
        return { passed: false, message: `不足ファイル: ${missing.join(', ')}` }
      }
      return {
        passed: true,
        message: `必須ファイル ${required.length}件すべて存在`,
      }
    },
  },
  {
    name: 'TypeScript 型チェック',
    check: () => {
      const result = run('npx tsc --noEmit')
      if (!result.ok) {
        const errors = result.output.trim().split('\n').slice(0, 5).join('\n')
        return { passed: false, message: `型エラー:\n${errors}` }
      }
      return { passed: true, message: '型エラーなし' }
    },
  },
  {
    name: 'ESLint チェック',
    check: () => {
      const result = run('npx next lint --quiet')
      if (!result.ok) {
        return {
          passed: false,
          message: `Lintエラー:\n${result.output.trim().split('\n').slice(0, 5).join('\n')}`,
        }
      }
      return { passed: true, message: 'Lintエラーなし' }
    },
  },
  {
    name: 'ユニットテスト',
    check: () => {
      const result = run('npx vitest run --reporter=verbose 2>&1')
      if (!result.ok) {
        return {
          passed: false,
          message: `テスト失敗:\n${result.output.trim().split('\n').slice(-10).join('\n')}`,
        }
      }
      // テスト数を抽出
      const match = result.output.match(/Tests\s+(\d+) passed/)
      const count = match ? match[1] : '?'
      return { passed: true, message: `${count}件のテストがパス` }
    },
  },
  {
    name: 'Next.js ビルド',
    check: () => {
      const result = run('npx next build 2>&1')
      if (!result.ok) {
        return {
          passed: false,
          message: `ビルドエラー:\n${result.output.trim().split('\n').slice(-10).join('\n')}`,
        }
      }
      return { passed: true, message: 'ビルド成功' }
    },
  },
  {
    name: '国税庁データ整合性',
    check: () => {
      const result = run('npx tsx scripts/check-nta-data.ts 2>&1')
      if (!result.ok) {
        return {
          passed: false,
          message: `NTAデータエラー:\n${result.output.trim().split('\n').slice(0, 5).join('\n')}`,
        }
      }
      // 警告があっても(exit 0なら)デプロイはブロックしない
      return {
        passed: true,
        message: 'NTAデータ検証OK（警告がある場合は更新を推奨）',
      }
    },
  },
  {
    name: 'package.json の必須スクリプト確認',
    check: () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')
      )
      const required = [
        'build',
        'test:run',
        'type-check',
        'lint',
        'validate',
        'check-nta',
      ]
      const missing = required.filter((s) => !pkg.scripts?.[s])
      if (missing.length > 0) {
        return {
          passed: false,
          message: `package.json に不足スクリプト: ${missing.join(', ')}`,
        }
      }
      return {
        passed: true,
        message: `必須スクリプト ${required.length}件すべて定義済み`,
      }
    },
  },
  {
    name: 'vercel.json の存在確認',
    check: () => {
      if (!fileExists('vercel.json')) {
        return { passed: false, message: 'vercel.json が存在しません' }
      }
      try {
        JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'))
        return { passed: true, message: 'vercel.json が有効なJSON' }
      } catch {
        return { passed: false, message: 'vercel.json のJSONが無効です' }
      }
    },
  },
]

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60))
  console.log('Pre-mortem Validation')
  console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}`)
  console.log('='.repeat(60))
  console.log('')

  let allPassed = true
  const results: { name: string; passed: boolean; message: string }[] = []

  for (const item of checks) {
    process.stdout.write(`▶ ${item.name}... `)
    try {
      const result = item.check()
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.message}`)
      results.push({ name: item.name, ...result })
      if (!result.passed) allPassed = false
    } catch (e: any) {
      console.log(`❌ 例外: ${e.message}`)
      results.push({
        name: item.name,
        passed: false,
        message: `例外: ${e.message}`,
      })
      allPassed = false
    }
  }

  console.log('')
  console.log('='.repeat(60))
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  console.log(`結果: ${passed}件パス / ${failed}件失敗`)
  console.log('')

  if (allPassed) {
    console.log(
      '✅ すべてのPre-mortemチェックがパスしました。デプロイ可能です。'
    )
  } else {
    console.log(
      '❌ Pre-mortemチェックに失敗しました。デプロイを中止してください。'
    )
    console.log('')
    console.log('失敗した項目:')
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}`)
        r.message.split('\n').forEach((line) => console.log(`     ${line}`))
      })
    process.exit(1)
  }
  console.log('='.repeat(60))
}

main()
