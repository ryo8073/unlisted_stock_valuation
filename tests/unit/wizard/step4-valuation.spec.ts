
import { describe, it, expect } from 'vitest'

interface ValuationData {
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  similarIndustryValue: number
  netAssetValue: number
  dividendYield: number
  finalValue: number
  method: string
}

function calculateValuation(input: {
  companySize: 'large' | 'medium' | 'small'
  lRatio?: number
  similarIndustryValue: number
  netAssetValue: number
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  isMinorityShareholder?: boolean
  dividendYield?: number
}): ValuationData {
  // 少数株主特則の適用（配当還元方式）
  if (input.isMinorityShareholder && input.dividendYield) {
    const dividendYieldValue = input.dividendPerShare / input.dividendYield
    return {
      dividendPerShare: input.dividendPerShare,
      profitPerShare: input.profitPerShare,
      netAssetPerShare: input.netAssetPerShare,
      similarIndustryValue: input.similarIndustryValue,
      netAssetValue: input.netAssetValue,
      dividendYield: input.dividendYield,
      finalValue: dividendYieldValue,
      method: 'dividendYield'
    }
  }

  // 会社規模別の評価方式
  switch (input.companySize) {
    case 'large':
      // 大会社: 類似業種比準価額と純資産価額の低い方
      const lowerValue = Math.min(input.similarIndustryValue, input.netAssetValue)
      return {
        dividendPerShare: input.dividendPerShare,
        profitPerShare: input.profitPerShare,
        netAssetPerShare: input.netAssetPerShare,
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
        dividendYield: input.dividendYield || 0,
        finalValue: lowerValue,
        method: input.similarIndustryValue <= input.netAssetValue ? 'similarIndustry' : 'netAsset'
      }

    case 'medium':
      // 中会社: L×類似業種比準価額 + (1-L)×純資産価額 を純資産価額と比較して低い方
      const lRatio = input.lRatio || 0
      const combinedValue = input.similarIndustryValue * lRatio + input.netAssetValue * (1 - lRatio)
      const finalValue = Math.min(combinedValue, input.netAssetValue)
      return {
        dividendPerShare: input.dividendPerShare,
        profitPerShare: input.profitPerShare,
        netAssetPerShare: input.netAssetPerShare,
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
        dividendYield: input.dividendYield || 0,
        finalValue,
        method: 'combined'
      }

    case 'small':
    default:
      // 小会社: 純資産価額
      return {
        dividendPerShare: input.dividendPerShare,
        profitPerShare: input.profitPerShare,
        netAssetPerShare: input.netAssetPerShare,
        similarIndustryValue: input.similarIndustryValue,
        netAssetValue: input.netAssetValue,
        dividendYield: input.dividendYield || 0,
        finalValue: input.netAssetValue,
        method: 'netAsset'
      }
  }
}

function validateValuationInput(input: {
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  similarIndustryValue: number
  netAssetValue: number
  dividendYield?: number
  isMinorityShareholder?: boolean
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 必須項目のチェック
  if (input.dividendPerShare < 0) {
    errors.push('1株当たり配当金は0以上で入力してください')
  }

  if (input.profitPerShare < 0) {
    errors.push('1株当たり利益は0以上で入力してください')
  }

  if (input.netAssetPerShare < 0) {
    errors.push('1株当たり純資産額は0以上で入力してください')
  }

  if (input.similarIndustryValue < 0) {
    errors.push('類似業種比準価額は0以上で入力してください')
  }

  if (input.netAssetValue < 0) {
    errors.push('純資産価額は0以上で入力してください')
  }

  // 少数株主の場合の配当利回りチェック
  if (input.isMinorityShareholder) {
    if (!input.dividendYield || input.dividendYield <= 0) {
      errors.push('少数株主の場合は配当利回りを入力してください')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

describe('Step 4: 評価方式（第3表）', () => {
  describe('大会社の評価方式', () => {
    it('類似業種比準価額が純資産価額より低い場合、類似業種比準価額が採用される', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 800,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(800)
      expect(result.method).toBe('similarIndustry')
    })

    it('純資産価額が類似業種比準価額より低い場合、純資産価額が採用される', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(1000)
      expect(result.method).toBe('netAsset')
    })

    it('類似業種比準価額と純資産価額が等しい場合、どちらでも良い', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 1000,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(1000)
      expect(result.method).toBe('similarIndustry') // 実装では類似業種比準価額を優先
    })
  })

  describe('中会社の評価方式', () => {
    it('L-ratioを使用した組み合わせ計算が正しく行われる（純資産との低い方）', () => {
      const input = {
        companySize: 'medium' as const,
        lRatio: 0.75, // 中の中のL値
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)
      const expectedCombined = 1200 * 0.75 + 1000 * 0.25 // 1200*0.75 + 1000*0.25 = 900 + 250 = 1150 → 純資産(1000)との低い方 → 1000

      expect(result.finalValue).toBe(1000)
      expect(result.method).toBe('combined')
    })

    it('併用価額が純資産価額を超える場合の制限', () => {
      const input = {
        companySize: 'medium' as const,
        lRatio: 0.75,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)
      const combinedValue = 1200 * 0.75 + 1000 * 0.25 // 1150

      // 併用価額(1150) > 純資産価額(1000) なので純資産価額が採用される
      expect(result.finalValue).toBe(1000)
      expect(result.method).toBe('combined')
    })

    it('併用価額が純資産価額未満の場合、併用価額が採用される', () => {
      const input = {
        companySize: 'medium' as const,
        lRatio: 0.25,
        similarIndustryValue: 800,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)
      const combinedValue = 800 * 0.25 + 1000 * 0.75 // 200 + 750 = 950

      expect(result.finalValue).toBe(950)
      expect(result.method).toBe('combined')
    })

    it('L-ratioが未定義の場合、0として扱われる', () => {
      const input = {
        companySize: 'medium' as const,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000
      }

      const result = calculateValuation(input)
      const expectedCombined = 1200 * 0 + 1000 * 1 // 1000 → 純資産(1000)との低い方 → 1000

      expect(result.finalValue).toBe(1000)
      expect(result.method).toBe('combined')
    })
  })

  describe('小会社の評価方式', () => {
    it('純資産価額が採用される', () => {
      const input = {
        companySize: 'small' as const,
        similarIndustryValue: 1200,
        netAssetValue: 800,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 800
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(800)
      expect(result.method).toBe('netAsset')
    })

    it('類似業種比準価額が高くても純資産価額が採用される', () => {
      const input = {
        companySize: 'small' as const,
        similarIndustryValue: 1500,
        netAssetValue: 800,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 800
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(800)
      expect(result.method).toBe('netAsset')
    })
  })

  describe('少数株主特則（配当還元方式）', () => {
    it('少数株主で配当利回りが設定されている場合、配当還元方式が適用される', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        isMinorityShareholder: true,
        dividendYield: 0.05 // 5%
      }

      const result = calculateValuation(input)
      const expectedValue = 50 / 0.05 // 1000

      expect(result.finalValue).toBe(expectedValue)
      expect(result.method).toBe('dividendYield')
    })

    it('少数株主でも配当利回りが設定されていない場合、通常の評価方式が適用される', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 800,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        isMinorityShareholder: true
        // dividendYield 未設定
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(800)
      expect(result.method).toBe('similarIndustry')
    })

    it('少数株主でない場合、配当還元方式は適用されない', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 800,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        isMinorityShareholder: false,
        dividendYield: 0.05
      }

      const result = calculateValuation(input)

      expect(result.finalValue).toBe(800)
      expect(result.method).toBe('similarIndustry')
    })
  })

  describe('境界値テスト', () => {
      it('中会社の境界値テスト', () => {
    const input = {
      companySize: 'medium' as const,
      lRatio: 0.9, // 中の大のL値
      similarIndustryValue: 1000,
      netAssetValue: 1000,
      dividendPerShare: 50,
      profitPerShare: 100,
      netAssetPerShare: 1000
    }

    const result = calculateValuation(input)
    const combinedValue = 1000 * 0.9 + 1000 * 0.1 // 900 + 100 = 1000

    expect(result.finalValue).toBe(1000) // 併用価額 = 純資産価額
  })

    it('配当利回りの境界値テスト', () => {
      const input = {
        companySize: 'large' as const,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        isMinorityShareholder: true,
        dividendYield: 0.01 // 1%
      }

      const result = calculateValuation(input)
      const expectedValue = 50 / 0.01 // 5000

      expect(result.finalValue).toBe(expectedValue)
      expect(result.method).toBe('dividendYield')
    })
  })

  describe('入力バリデーション', () => {
    it('負の値が入力された場合、エラーになる', () => {
      const input = {
        dividendPerShare: -10,
        profitPerShare: -20,
        netAssetPerShare: -30,
        similarIndustryValue: -40,
        netAssetValue: -50
      }

      const validation = validateValuationInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('1株当たり配当金は0以上で入力してください')
      expect(validation.errors).toContain('1株当たり利益は0以上で入力してください')
      expect(validation.errors).toContain('1株当たり純資産額は0以上で入力してください')
      expect(validation.errors).toContain('類似業種比準価額は0以上で入力してください')
      expect(validation.errors).toContain('純資産価額は0以上で入力してください')
    })

    it('少数株主で配当利回りが未設定の場合、エラーになる', () => {
      const input = {
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        isMinorityShareholder: true
        // dividendYield 未設定
      }

      const validation = validateValuationInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('少数株主の場合は配当利回りを入力してください')
    })

    it('少数株主で配当利回りが0以下の場合、エラーになる', () => {
      const input = {
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        isMinorityShareholder: true,
        dividendYield: 0
      }

      const validation = validateValuationInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('少数株主の場合は配当利回りを入力してください')
    })

    it('正常な入力の場合、バリデーションが通る', () => {
      const input = {
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        isMinorityShareholder: false
      }

      const validation = validateValuationInput(input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('少数株主で配当利回りが設定されている場合、バリデーションが通る', () => {
      const input = {
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        isMinorityShareholder: true,
        dividendYield: 0.05
      }

      const validation = validateValuationInput(input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
