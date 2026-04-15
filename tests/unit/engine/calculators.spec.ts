import { describe, it, expect } from 'vitest'
import {
  applyDiscountRate,
  largeFormula,
  midFormula,
  smallFormula,
  smallCombinedFormula,
  dividendYieldFormula,
  roundPPS,
} from '@/lib/engine/calculators'

describe('applyDiscountRate - 類似業種比準価額のしんしゃく率（通達180条）', () => {
  // A=100, bRatio=1.0, cRatio=1.0, dRatio=1.0 → base = 100 * (3/3) = 100
  const A = 100
  const bRatio = 1.0
  const cRatio = 1.0
  const dRatio = 1.0

  it('大会社: しんしゃく率0.7', () => {
    const result = applyDiscountRate(A, bRatio, cRatio, dRatio, '大会社')
    expect(result).toBe(100 * 1.0 * 0.7) // 70
  })

  it('中会社: しんしゃく率0.6', () => {
    const result = applyDiscountRate(A, bRatio, cRatio, dRatio, '中会社')
    expect(result).toBe(100 * 1.0 * 0.6) // 60
  })

  it('小会社: しんしゃく率0.5', () => {
    const result = applyDiscountRate(A, bRatio, cRatio, dRatio, '小会社')
    expect(result).toBe(100 * 1.0 * 0.5) // 50
  })

  it('比準要素の比率が異なる場合の正しい計算', () => {
    // A=200, b/B'=0.5, c/C'=2.0, d/D'=1.5
    // (0.5 + 2.0 + 1.5) / 3 = 4.0/3 ≈ 1.3333
    // 200 * 1.3333 * 0.7 = 186.667
    const result = applyDiscountRate(200, 0.5, 2.0, 1.5, '大会社')
    expect(result).toBeCloseTo(200 * (4.0 / 3) * 0.7, 5)
  })

  it('A=0の場合は0', () => {
    expect(applyDiscountRate(0, 1, 1, 1, '大会社')).toBe(0)
  })

  it('比準要素がすべて0の場合は0', () => {
    expect(applyDiscountRate(100, 0, 0, 0, '大会社')).toBe(0)
  })
})

describe('largeFormula - 大会社（通達179条(1)）', () => {
  it('類似業種比準価額が低い場合はそちらを採用', () => {
    expect(largeFormula(500, 800)).toBe(500)
  })

  it('純資産価額が低い場合はそちらを採用', () => {
    expect(largeFormula(1000, 800)).toBe(800)
  })

  it('同額の場合はその値', () => {
    expect(largeFormula(800, 800)).toBe(800)
  })
})

describe('midFormula - 中会社・併用方式（通達179条(2)）', () => {
  it('L=0.90（中の大）の場合', () => {
    // similar=1000, L=0.90, netAsset=800
    // na80 = 800 * 0.8 = 640
    // combined = 1000*0.90 + 640*0.10 = 900 + 64 = 964
    // min(964, 800) = 800
    expect(midFormula(1000, 0.90, 800)).toBe(800)
  })

  it('L=0.75（中の中）で併用値が純資産より低い場合', () => {
    // similar=400, L=0.75, netAsset=800
    // na80 = 640
    // combined = 400*0.75 + 640*0.25 = 300 + 160 = 460
    // min(460, 800) = 460
    expect(midFormula(400, 0.75, 800)).toBe(460)
  })

  it('L=0.60（中の小）の場合', () => {
    // similar=500, L=0.60, netAsset=1000
    // na80 = 800
    // combined = 500*0.60 + 800*0.40 = 300 + 320 = 620
    // min(620, 1000) = 620
    expect(midFormula(500, 0.60, 1000)).toBe(620)
  })

  it('80%相当額が明示的に指定された場合はそちらを使用', () => {
    // similar=500, L=0.60, netAsset=1000, na80=700
    // combined = 500*0.60 + 700*0.40 = 300 + 280 = 580
    // min(580, 1000) = 580
    expect(midFormula(500, 0.60, 1000, 700)).toBe(580)
  })

  it('純資産価額100%との比較で常に低い方を採用', () => {
    // similar=2000, L=0.90, netAsset=500
    // na80 = 400
    // combined = 2000*0.90 + 400*0.10 = 1800 + 40 = 1840
    // min(1840, 500) = 500
    expect(midFormula(2000, 0.90, 500)).toBe(500)
  })
})

describe('smallFormula - 小会社（通達179条(3)原則）', () => {
  it('純資産価額をそのまま返す', () => {
    expect(smallFormula(800)).toBe(800)
  })
})

describe('smallCombinedFormula - 小会社・併用方式（任意適用）', () => {
  it('類似×0.5 + 純資産×0.5 が純資産より低い場合', () => {
    // similar=400, netAsset=800
    // combined = 400*0.5 + 800*0.5 = 200 + 400 = 600
    // min(600, 800) = 600
    expect(smallCombinedFormula(400, 800)).toBe(600)
  })

  it('併用値が純資産以上の場合は純資産', () => {
    // similar=1200, netAsset=800
    // combined = 1200*0.5 + 800*0.5 = 600 + 400 = 1000
    // min(1000, 800) = 800
    expect(smallCombinedFormula(1200, 800)).toBe(800)
  })

  it('同額の場合', () => {
    expect(smallCombinedFormula(800, 800)).toBe(800)
  })
})

describe('dividendYieldFormula - 配当還元方式（通達188-2条）', () => {
  it('標準ケース: 年配当50円、額面50円', () => {
    // max(50, 2.5) / 0.10 * (50/50) = 50 / 0.10 * 1 = 500
    expect(dividendYieldFormula(50, 50)).toBe(500)
  })

  it('年配当が2円50銭未満の場合は2円50銭が下限', () => {
    // max(1.0, 2.5) / 0.10 * (50/50) = 2.5 / 0.10 = 25
    expect(dividendYieldFormula(1.0, 50)).toBe(25)
  })

  it('年配当0円の場合も2円50銭が下限', () => {
    // max(0, 2.5) / 0.10 = 25
    expect(dividendYieldFormula(0, 50)).toBe(25)
  })

  it('年配当がちょうど2円50銭の場合', () => {
    // max(2.5, 2.5) / 0.10 = 25
    expect(dividendYieldFormula(2.5, 50)).toBe(25)
  })

  it('資本金等の額が50円でない場合の調整（額面500円）', () => {
    // max(50, 2.5) / 0.10 * (500/50) = 500 * 10 = 5000
    expect(dividendYieldFormula(50, 500)).toBe(5000)
  })

  it('資本金等の額が50円でない場合の調整（額面5000円）', () => {
    // max(10, 2.5) / 0.10 * (5000/50) = 100 * 100 = 10000
    expect(dividendYieldFormula(10, 5000)).toBe(10000)
  })

  it('デフォルト額面（50円）の場合', () => {
    // max(30, 2.5) / 0.10 * (50/50) = 300
    expect(dividendYieldFormula(30)).toBe(300)
  })
})

describe('roundPPS - 端数処理', () => {
  it('1円単位の切り捨て', () => {
    expect(roundPPS(123.45, 1)).toBe(123)
  })

  it('10円単位の切り捨て', () => {
    expect(roundPPS(1234.56, 10)).toBe(1230)
  })
})
