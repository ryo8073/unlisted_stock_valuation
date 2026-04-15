import { describe, it, expect } from 'vitest'

interface SpecialCompanyData {
  hasSpecialElements: boolean
  landRatio: number
  stockRatio: number
  establishmentDate: string
  businessStatus: string
  isLiquidation: boolean
  specialTypes: string[]
  isSpecialCompany: boolean
}

function determineSpecialCompany(input: {
  landRatio: number
  stockRatio: number
  establishmentDate: string
  businessStatus: string
  isLiquidation: boolean
}): SpecialCompanyData {
  const specialTypes: string[] = []
  let hasSpecialElements = false

  // 土地保有比率判定（70%以上）
  if (input.landRatio >= 0.7) {
    specialTypes.push('landHolding')
    hasSpecialElements = true
  }

  // 株式等保有比率判定（50%以上）
  if (input.stockRatio >= 0.5) {
    specialTypes.push('stockHolding')
    hasSpecialElements = true
  }

  // 設立からの期間判定（2年未満）
  const establishmentDate = new Date(input.establishmentDate)
  const currentDate = new Date()
  const yearsSinceEstablishment = (currentDate.getTime() - establishmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  
  if (yearsSinceEstablishment < 2) {
    specialTypes.push('newCompany')
    hasSpecialElements = true
  }

  // 事業状況判定
  if (input.businessStatus === '開業前' || input.businessStatus === '休業中') {
    specialTypes.push('preOpening')
    hasSpecialElements = true
  }

  // 清算中判定
  if (input.isLiquidation) {
    specialTypes.push('liquidation')
    hasSpecialElements = true
  }

  return {
    hasSpecialElements,
    landRatio: input.landRatio,
    stockRatio: input.stockRatio,
    establishmentDate: input.establishmentDate,
    businessStatus: input.businessStatus,
    isLiquidation: input.isLiquidation,
    specialTypes,
    isSpecialCompany: hasSpecialElements
  }
}

function validateSpecialCompanyInput(input: {
  landRatio: number
  stockRatio: number
  establishmentDate: string
  businessStatus: string
  isLiquidation: boolean
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // 比率の範囲チェック（0-100%）
  if (input.landRatio < 0 || input.landRatio > 1) {
    errors.push('土地保有比率は0%から100%の範囲で入力してください')
  }

  if (input.stockRatio < 0 || input.stockRatio > 1) {
    errors.push('株式等保有比率は0%から100%の範囲で入力してください')
  }

  // 設立日の妥当性チェック
  const establishmentDate = new Date(input.establishmentDate)
  if (isNaN(establishmentDate.getTime())) {
    errors.push('設立日は有効な日付を入力してください')
  }

  const currentDate = new Date()
  if (establishmentDate > currentDate) {
    errors.push('設立日は現在日以前の日付を入力してください')
  }

  // 事業状況の選択チェック
  const validBusinessStatuses = ['営業中', '開業前', '休業中']
  if (!validBusinessStatuses.includes(input.businessStatus)) {
    errors.push('事業状況は有効な選択肢から選んでください')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

describe('Step 2: 特定会社等（第2表）', () => {
  describe('土地保有比率判定', () => {
    it('土地保有比率70%以上の場合、landHoldingが含まれる', () => {
      const input = {
        landRatio: 0.7,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('landHolding')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('土地保有比率69.99%の場合、landHoldingが含まれない', () => {
      const input = {
        landRatio: 0.6999,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).not.toContain('landHolding')
      expect(result.isSpecialCompany).toBe(false)
    })
  })

  describe('株式等保有比率判定', () => {
    it('株式等保有比率50%以上の場合、stockHoldingが含まれる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.5,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('stockHolding')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('株式等保有比率49.99%の場合、stockHoldingが含まれない', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.4999,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).not.toContain('stockHolding')
      expect(result.isSpecialCompany).toBe(false)
    })
  })

  describe('設立からの期間判定', () => {
    it('設立から2年未満の場合、newCompanyが含まれる', () => {
      const twoYearsAgo = new Date()
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 1) // 1年前

      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: twoYearsAgo.toISOString().split('T')[0],
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('newCompany')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('設立から2年以上の場合、newCompanyが含まれない', () => {
      const threeYearsAgo = new Date()
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3) // 3年前

      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: threeYearsAgo.toISOString().split('T')[0],
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).not.toContain('newCompany')
      expect(result.isSpecialCompany).toBe(false)
    })
  })

  describe('事業状況判定', () => {
    it('開業前の場合、preOpeningが含まれる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '開業前',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('preOpening')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('休業中の場合、preOpeningが含まれる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '休業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('preOpening')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('営業中の場合、preOpeningが含まれない', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).not.toContain('preOpening')
      expect(result.isSpecialCompany).toBe(false)
    })
  })

  describe('清算中判定', () => {
    it('清算中の場合、liquidationが含まれる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: true
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('liquidation')
      expect(result.isSpecialCompany).toBe(true)
    })

    it('清算中でない場合、liquidationが含まれない', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).not.toContain('liquidation')
      expect(result.isSpecialCompany).toBe(false)
    })
  })

  describe('複数条件の組み合わせ', () => {
    it('複数の条件に該当する場合、全てのタイプが含まれる', () => {
      const input = {
        landRatio: 0.8, // 70%以上
        stockRatio: 0.6, // 50%以上
        establishmentDate: '2025-06-01', // 2年未満
        businessStatus: '開業前',
        isLiquidation: true
      }

      const result = determineSpecialCompany(input)

      expect(result.specialTypes).toContain('landHolding')
      expect(result.specialTypes).toContain('stockHolding')
      expect(result.specialTypes).toContain('newCompany')
      expect(result.specialTypes).toContain('preOpening')
      expect(result.specialTypes).toContain('liquidation')
      expect(result.isSpecialCompany).toBe(true)
    })
  })

  describe('入力バリデーション', () => {
    it('土地保有比率が範囲外の場合、エラーになる', () => {
      const input = {
        landRatio: 1.2, // 120% > 100%
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('土地保有比率は0%から100%の範囲で入力してください')
    })

    it('株式等保有比率が負の値の場合、エラーになる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: -0.1, // -10% < 0%
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('株式等保有比率は0%から100%の範囲で入力してください')
    })

    it('設立日が無効な日付の場合、エラーになる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: 'invalid-date',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('設立日は有効な日付を入力してください')
    })

    it('設立日が未来の場合、エラーになる', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: futureDate.toISOString().split('T')[0],
        businessStatus: '営業中',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('設立日は現在日以前の日付を入力してください')
    })

    it('事業状況が無効な値の場合、エラーになる', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '無効な値',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('事業状況は有効な選択肢から選んでください')
    })

    it('正常な入力の場合、バリデーションが通る', () => {
      const input = {
        landRatio: 0.3,
        stockRatio: 0.3,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false
      }

      const validation = validateSpecialCompanyInput(input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
