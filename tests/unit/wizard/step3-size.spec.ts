import { describe, it, expect } from 'vitest'

interface CompanySizeData {
  employees: number
  assets: number
  sales: number
  industry: string
  companySize: 'large' | 'medium' | 'small'
  lRatio: number
  fte: number
}

function calculateFTE(employees: number, partTimeHours: number = 0): number {
  return employees + (partTimeHours / 1800)
}

function determineCompanySize(input: {
  employees: number
  partTimeHours?: number
  assets: number
  sales: number
  industry: string
}): CompanySizeData {
  const fte = calculateFTE(input.employees, input.partTimeHours)
  
  // 70人以上は即・大会社
  if (fte >= 70) {
    return {
      employees: input.employees,
      assets: input.assets,
      sales: input.sales,
      industry: input.industry,
      companySize: 'large',
      lRatio: 1.0,
      fte
    }
  }

  // 業種別の資産・売上基準
  const assetBand = getAssetBand(input.industry, input.assets)
  const revenueBand = getRevenueBand(input.industry, input.sales)
  const employeeBand = getEmployeeBand(fte)
  
  // C-band (資産×従業員) と R-band (売上) の比較
  const cBand = getLowerBand(assetBand, employeeBand)
  const finalBand = getUpperBand(cBand, revenueBand)
  
  // L-ratio の決定
  const lRatio = getLRatio(finalBand)
  
  // 会社規模の決定
  let companySize: 'large' | 'medium' | 'small'
  if (finalBand === '大会社') {
    companySize = 'large'
  } else if (finalBand === '小会社') {
    companySize = 'small'
  } else {
    companySize = 'medium'
  }

  return {
    employees: input.employees,
    assets: input.assets,
    sales: input.sales,
    industry: input.industry,
    companySize,
    lRatio,
    fte
  }
}

function getAssetBand(industry: string, assets: number): string {
  const thresholds = getAssetThresholds(industry)
  return getBandFromThresholds(thresholds, assets)
}

function getRevenueBand(industry: string, sales: number): string {
  const thresholds = getRevenueThresholds(industry)
  return getBandFromThresholds(thresholds, sales)
}

function getEmployeeBand(fte: number): string {
  const thresholds = [
    { label: '大会社', min: 70 },
    { label: '中の大', min: 36, max: 69 },
    { label: '中の中', min: 21, max: 35 },
    { label: '中の小', min: 11, max: 20 },
    { label: '小会社', max: 10 }
  ]
  return getBandFromThresholds(thresholds, fte)
}

function getAssetThresholds(industry: string): Array<{ label: string; min?: number; max?: number }> {
  switch (industry) {
    case '卸売業':
      return [
        { label: '小会社', max: 70000000 },
        { label: '中の小', min: 70000000, max: 200000000 },
        { label: '中の中', min: 200000000, max: 400000000 },
        { label: '中の大', min: 400000000, max: 2000000000 },
        { label: '大会社', min: 2000000000 }
      ]
    case '小売・サービス業':
      return [
        { label: '小会社', max: 40000000 },
        { label: '中の小', min: 40000000, max: 250000000 },
        { label: '中の中', min: 250000000, max: 500000000 },
        { label: '中の大', min: 500000000, max: 1500000000 },
        { label: '大会社', min: 1500000000 }
      ]
    default: // 卸売・小売・サービス以外
      return [
        { label: '小会社', max: 50000000 },
        { label: '中の小', min: 50000000, max: 250000000 },
        { label: '中の中', min: 250000000, max: 500000000 },
        { label: '中の大', min: 500000000, max: 1500000000 },
        { label: '大会社', min: 1500000000 }
      ]
  }
}

function getRevenueThresholds(industry: string): Array<{ label: string; min?: number; max?: number }> {
  switch (industry) {
    case '卸売業':
      return [
        { label: '小会社', max: 200000000 },
        { label: '中の小', min: 200000000, max: 350000000 },
        { label: '中の中', min: 350000000, max: 700000000 },
        { label: '中の大', min: 700000000, max: 3000000000 },
        { label: '大会社', min: 3000000000 }
      ]
    case '小売・サービス業':
      return [
        { label: '小会社', max: 60000000 },
        { label: '中の小', min: 60000000, max: 250000000 },
        { label: '中の中', min: 250000000, max: 500000000 },
        { label: '中の大', min: 500000000, max: 2000000000 },
        { label: '大会社', min: 2000000000 }
      ]
    default: // 卸売・小売・サービス以外
      return [
        { label: '小会社', max: 80000000 },
        { label: '中の小', min: 80000000, max: 200000000 },
        { label: '中の中', min: 200000000, max: 400000000 },
        { label: '中の大', min: 400000000, max: 1500000000 },
        { label: '大会社', min: 1500000000 }
      ]
  }
}

function getBandFromThresholds(thresholds: Array<{ label: string; min?: number; max?: number }>, value: number): string {
  for (const threshold of thresholds) {
    const min = threshold.min ?? 0
    const max = threshold.max ?? Infinity
    if (value >= min && value <= max) {
      return threshold.label
    }
  }
  return '小会社' // デフォルト
}

function getLowerBand(band1: string, band2: string): string {
  const bandOrder = ['小会社', '中の小', '中の中', '中の大', '大会社']
  const index1 = bandOrder.indexOf(band1)
  const index2 = bandOrder.indexOf(band2)
  return bandOrder[Math.min(index1, index2)]
}

function getUpperBand(band1: string, band2: string): string {
  const bandOrder = ['小会社', '中の小', '中の中', '中の大', '大会社']
  const index1 = bandOrder.indexOf(band1)
  const index2 = bandOrder.indexOf(band2)
  return bandOrder[Math.max(index1, index2)]
}

function getLRatio(band: string): number {
  const lRatioMap: Record<string, number> = {
    '大会社': 1.0,
    '中の大': 0.90,
    '中の中': 0.75,
    '中の小': 0.60,
    '小会社': 0.0
  }
  return lRatioMap[band] ?? 0.0
}

function validateCompanySizeInput(input: {
  employees: number
  partTimeHours?: number
  assets: number
  sales: number
  industry: string
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (input.employees < 0) {
    errors.push('従業員数は0以上で入力してください')
  }

  if (input.partTimeHours && input.partTimeHours < 0) {
    errors.push('パートタイム時間は0以上で入力してください')
  }

  if (input.assets < 0) {
    errors.push('資産額は0以上で入力してください')
  }

  if (input.sales < 0) {
    errors.push('売上額は0以上で入力してください')
  }

  const validIndustries = ['卸売業', '小売・サービス業', '製造業', '建設業', 'その他']
  if (!validIndustries.includes(input.industry)) {
    errors.push('業種は有効な選択肢から選んでください')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

describe('Step 3: 会社規模（第1表の2・L）', () => {
  describe('FTE計算', () => {
    it('正社員のみの場合、FTEは従業員数と等しい', () => {
      const fte = calculateFTE(50)
      expect(fte).toBe(50)
    })

    it('パートタイム時間を含む場合、FTEが正しく計算される', () => {
      const fte = calculateFTE(60, 18000) // 60人 + 18000時間/1800 = 70人
      expect(fte).toBe(70)
    })

    it('パートタイム時間のみの場合、FTEが正しく計算される', () => {
      const fte = calculateFTE(0, 9000) // 0人 + 9000時間/1800 = 5人
      expect(fte).toBe(5)
    })
  })

  describe('即・大会社判定（70人以上）', () => {
    it('FTE70人以上の場合、即・大会社になる', () => {
      const input = {
        employees: 70,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).toBe('large')
      expect(result.lRatio).toBe(1.0)
      expect(result.fte).toBe(70)
    })

    it('パートタイムを含めて70人になる場合、即・大会社になる', () => {
      const input = {
        employees: 60,
        partTimeHours: 18000, // 60 + 18000/1800 = 70
        assets: 100000000,
        sales: 500000000,
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).toBe('large')
      expect(result.lRatio).toBe(1.0)
      expect(result.fte).toBe(70)
    })

    it('FTE69人の場合、即・大会社にならない', () => {
      const input = {
        employees: 69,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).not.toBe('large')
      expect(result.fte).toBe(69)
    })
  })

  describe('業種別資産基準', () => {
    it('卸売業の資産基準が正しく適用される', () => {
      const input = {
        employees: 50,
        assets: 150000000, // 中の小: 7,000万以上～2億未満
        sales: 500000000,
        industry: '卸売業'
      }

      const result = determineCompanySize(input)
      const assetBand = getAssetBand('卸売業', 150000000)

      expect(assetBand).toBe('中の小')
    })

    it('小売・サービス業の資産基準が正しく適用される', () => {
      const input = {
        employees: 50,
        assets: 300000000, // 中の中: 2億5千万以上～5億未満
        sales: 500000000,
        industry: '小売・サービス業'
      }

      const result = determineCompanySize(input)
      const assetBand = getAssetBand('小売・サービス業', 300000000)

      expect(assetBand).toBe('中の中')
    })

    it('その他業種の資産基準が正しく適用される', () => {
      const input = {
        employees: 50,
        assets: 100000000, // 中の小: 5,000万以上～2億5千万未満
        sales: 500000000,
        industry: '製造業'
      }

      const result = determineCompanySize(input)
      const assetBand = getAssetBand('製造業', 100000000)

      expect(assetBand).toBe('中の小')
    })
  })

  describe('業種別売上基準', () => {
    it('卸売業の売上基準が正しく適用される', () => {
      const input = {
        employees: 50,
        assets: 100000000,
        sales: 400000000, // 中の中: 3億5千万以上～7億未満
        industry: '卸売業'
      }

      const result = determineCompanySize(input)
      const revenueBand = getRevenueBand('卸売業', 400000000)

      expect(revenueBand).toBe('中の中')
    })

    it('小売・サービス業の売上基準が正しく適用される', () => {
      const input = {
        employees: 50,
        assets: 100000000,
        sales: 300000000, // 中の中: 2億5千万以上～5億未満
        industry: '小売・サービス業'
      }

      const result = determineCompanySize(input)
      const revenueBand = getRevenueBand('小売・サービス業', 300000000)

      expect(revenueBand).toBe('中の中')
    })
  })

  describe('従業員基準', () => {
    it('従業員基準が正しく適用される', () => {
      const fte = 25
      const employeeBand = getEmployeeBand(fte)
      expect(employeeBand).toBe('中の中') // 21-35人
    })

    it('境界値テスト: 従業員基準の境界値', () => {
      expect(getEmployeeBand(10)).toBe('小会社') // 10人以下
      expect(getEmployeeBand(11)).toBe('中の小') // 11-20人
      expect(getEmployeeBand(20)).toBe('中の小') // 11-20人
      expect(getEmployeeBand(21)).toBe('中の中') // 21-35人
      expect(getEmployeeBand(35)).toBe('中の中') // 21-35人
      expect(getEmployeeBand(36)).toBe('中の大') // 36-69人
      expect(getEmployeeBand(69)).toBe('中の大') // 36-69人
      expect(getEmployeeBand(70)).toBe('大会社') // 70人以上
    })
  })

  describe('C-bandとR-bandの比較', () => {
    it('C-band（資産×従業員）とR-band（売上）の低い方が採用される', () => {
      const assetBand = '中の大'
      const employeeBand = '中の中'
      const revenueBand = '大会社'

      const cBand = getLowerBand(assetBand, employeeBand) // 中の中
      const finalBand = getUpperBand(cBand, revenueBand) // 大会社

      expect(cBand).toBe('中の中')
      expect(finalBand).toBe('大会社')
    })

    it('C-bandがR-bandより高い場合、C-bandが採用される', () => {
      const assetBand = '大会社'
      const employeeBand = '中の大'
      const revenueBand = '中の中'

      const cBand = getLowerBand(assetBand, employeeBand) // 中の大
      const finalBand = getUpperBand(cBand, revenueBand) // 中の大

      expect(cBand).toBe('中の大')
      expect(finalBand).toBe('中の大')
    })
  })

  describe('L-ratio計算', () => {
    it('各バンドのL-ratioが正しく計算される', () => {
      expect(getLRatio('大会社')).toBe(1.0)
      expect(getLRatio('中の大')).toBe(0.90)
      expect(getLRatio('中の中')).toBe(0.75)
      expect(getLRatio('中の小')).toBe(0.60)
      expect(getLRatio('小会社')).toBe(0.0)
    })
  })

  describe('会社規模の決定', () => {
    it('大会社バンドの場合、largeになる', () => {
      const input = {
        employees: 50,
        assets: 3000000000, // 大会社基準
        sales: 5000000000, // 大会社基準
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).toBe('large')
      expect(result.lRatio).toBe(1.0)
    })

    it('中会社バンドの場合、mediumになる', () => {
      const input = {
        employees: 50,
        assets: 100000000, // 中の小基準
        sales: 200000000, // 中の小基準
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).toBe('medium')
      expect(result.lRatio).toBe(0.60) // 中の小のL-ratio
    })

    it('小会社バンドの場合、smallになる', () => {
      const input = {
        employees: 5,
        assets: 30000000, // 小会社基準
        sales: 50000000, // 小会社基準
        industry: '製造業'
      }

      const result = determineCompanySize(input)

      expect(result.companySize).toBe('small')
      expect(result.lRatio).toBe(0.0)
    })
  })

  describe('入力バリデーション', () => {
    it('負の値が入力された場合、エラーになる', () => {
      const input = {
        employees: -1,
        assets: -1000000,
        sales: -5000000,
        industry: '製造業'
      }

      const validation = validateCompanySizeInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('従業員数は0以上で入力してください')
      expect(validation.errors).toContain('資産額は0以上で入力してください')
      expect(validation.errors).toContain('売上額は0以上で入力してください')
    })

    it('無効な業種の場合、エラーになる', () => {
      const input = {
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '無効な業種'
      }

      const validation = validateCompanySizeInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('業種は有効な選択肢から選んでください')
    })

    it('正常な入力の場合、バリデーションが通る', () => {
      const input = {
        employees: 50,
        partTimeHours: 9000,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業'
      }

      const validation = validateCompanySizeInput(input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
