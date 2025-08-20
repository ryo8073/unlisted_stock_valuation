import { describe, it, expect } from 'vitest'

interface ValuationInput {
  companySize: 'large' | 'medium' | 'small'
  lRatio?: number
  similarIndustryValue: number
  netAssetValue: number
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  isMinorityShareholder?: boolean
  dividendYield?: number
}

function calculateValuation(input: ValuationInput) {
  // 少数株主特則の適用
  if (input.isMinorityShareholder && input.dividendYield) {
    const dividendYieldValue = input.dividendPerShare / input.dividendYield
    return {
      finalValue: dividendYieldValue,
      method: 'dividendYield',
      similarIndustryValue: input.similarIndustryValue,
      netAssetValue: input.netAssetValue,
    }
  }

  // 会社規模別の評価方式
  switch (input.companySize) {
    case 'large':
      // 大会社: 類似業種比準価額と純資産価額の低い方
      const lowerValue = Math.min(input.similarIndustryValue, input.netAssetValue)
      return {
        finalValue: lowerValue,
        method: input.similarIndustryValue <= input.netAssetValue ? 'similarIndustry' : 'netAsset',
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
      }

    case 'medium':
      // 中会社: L×類似業種比準価額 + (1-L)×純資産価額の80%相当額（第1表の2 準拠）
      const l = input.lRatio || 0
      const combinedValue = input.similarIndustryValue * l + (input.netAssetValue * 0.8) * (1 - l)
      // 純資産価額との比較で低い方を採用
      const finalValue = Math.min(combinedValue, input.netAssetValue)
      return {
        finalValue,
        method: 'combined',
        lRatio: input.lRatio,
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
      }

    case 'small':
    default:
      // 小会社: 純資産価額
      return {
        finalValue: input.netAssetValue,
        method: 'netAsset',
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
      }
  }
}

describe('Calculators - 第3表評価方式', () => {
  it('大会社の評価方式（類似業種比準価額と純資産価額の低い方）', () => {
    const result = calculateValuation({
      companySize: 'large',
      similarIndustryValue: 1000,
      netAssetValue: 800,
      dividendPerShare: 50,
      profitPerShare: 100,
      netAssetPerShare: 800,
    })

    expect(result.finalValue).toBe(800) // 純資産価額の方が低い
    expect(result.method).toBe('netAsset')
    expect(result.similarIndustryValue).toBe(1000)
    expect(result.netAssetValue).toBe(800)
  })

  it('中会社の評価方式（L×類似業種比準価額 + (1-L)×純資産価額）', () => {
    const result = calculateValuation({
      companySize: 'medium',
      lRatio: 0.75, // 中の中のL値
      similarIndustryValue: 1000,
      netAssetValue: 800,
      dividendPerShare: 50,
      profitPerShare: 100,
      netAssetPerShare: 800,
    })

    // 計算式: 0.75 × 1000 + 0.25 × 800 = 750 + 200 = 950 → 純資産価額(800)との低い方 → 800
    expect(result.finalValue).toBe(800)
    expect(result.method).toBe('combined')
    expect(result.lRatio).toBe(0.75)
  })

  it('小会社の評価方式（純資産価額）', () => {
    const result = calculateValuation({
      companySize: 'small',
      similarIndustryValue: 1000,
      netAssetValue: 800,
      dividendPerShare: 50,
      profitPerShare: 100,
      netAssetPerShare: 800,
    })

    expect(result.finalValue).toBe(800)
    expect(result.method).toBe('netAsset')
  })

  it('中会社の純資産価額との比較', () => {
    const result = calculateValuation({
      companySize: 'medium',
      lRatio: 0.75,
      similarIndustryValue: 2000,
      netAssetValue: 800,
      dividendPerShare: 50,
      profitPerShare: 100,
      netAssetPerShare: 800,
    })

    // 計算値: 0.75 × 2000 + 0.25 × 800 = 1500 + 200 = 1700 → 純資産価額(800)との低い方 → 800
    expect(result.finalValue).toBe(800)
  })

  it('配当還元方式の計算（少数株主特則）', () => {
    const result = calculateValuation({
      companySize: 'small',
      isMinorityShareholder: true,
      dividendPerShare: 50,
      dividendYield: 0.05, // 5%
      similarIndustryValue: 1000,
      netAssetValue: 800,
      profitPerShare: 100,
      netAssetPerShare: 800,
    })

    // 配当還元価額 = 年配当 ÷ 配当利回り
    // 50 ÷ 0.05 = 1000
    expect(result.finalValue).toBe(1000)
    expect(result.method).toBe('dividendYield')
  })

  it('配当還元方式が優先される（会社規模判定をスキップ）', () => {
    const result = calculateValuation({
      companySize: 'medium', // 会社規模は関係ない
      isMinorityShareholder: true,
      dividendPerShare: 30,
      dividendYield: 0.03, // 3%
      similarIndustryValue: 1200,
      netAssetValue: 1000,
      profitPerShare: 100,
      netAssetPerShare: 1000,
    })

    // 配当還元価額 = 年配当 ÷ 配当利回り
    // 30 ÷ 0.03 = 1000
    expect(result.finalValue).toBe(1000)
    expect(result.method).toBe('dividendYield')
  })
})
