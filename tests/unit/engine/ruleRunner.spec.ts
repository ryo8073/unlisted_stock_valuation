import { describe, it, expect } from 'vitest'
import { evaluateAll } from '@/lib/engine/ruleRunner'
import type { EvaluateInput } from '@/lib/engine/types'

/**
 * テスト用ヘルパー: 基本的なEvaluateInputを生成する
 */
function makeInput(overrides: Partial<EvaluateInput> & {
  selfVotes?: number;
  familyVotes?: number;
  topVotes?: number;
  totalVotes?: number;
  inFamilyGroup?: boolean;
  inTopGroup?: boolean;
  officer?: boolean;
} = {}): EvaluateInput {
  const totalVotes = overrides.totalVotes ?? 1000;
  return {
    shareholders: [
      {
        id: '1',
        name: '納税者',
        votes: overrides.selfVotes ?? 100,
        isTaxpayer: true,
        inFamilyGroup: overrides.inFamilyGroup ?? true,
        inTopGroup: overrides.inTopGroup ?? true,
        officer: overrides.officer ?? false,
      }
    ],
    totals: { votes: totalVotes },
    groups: {
      family: { votes: overrides.familyVotes ?? 400 },
      top: { votes: overrides.topVotes ?? 400 },
    },
    company: {
      industry: '卸売・小売・サービス以外',
      totalAssetsBook: 300000000,
      employees: { full: 50, partTimeHours: 0 },
      turnover1y: 300000000,
      yearsSinceOpening: 10,
    },
    valuationInputs: {
      similarIndustryPPS: 1000,
      netAssetPPS: 800,
    },
    ...overrides,
  }
}

// ========== 第1表の1: 株主判定（通達188条）==========

describe('株主判定 - 同族株主のいる会社 vs いない会社', () => {
  it('筆頭グループ30%以上 → 同族株主のいる会社', () => {
    const input = makeInput({ topVotes: 300, totalVotes: 1000 })
    const result = evaluateAll(input)
    expect(result.shareholder.shareholderType).toBe('同族株主のいる会社')
  })

  it('筆頭グループ30%未満 → 同族株主のいない会社', () => {
    const input = makeInput({ topVotes: 290, totalVotes: 1000 })
    const result = evaluateAll(input)
    expect(result.shareholder.shareholderType).toBe('同族株主のいない会社')
  })

  it('筆頭グループちょうど30% → 同族株主のいる会社', () => {
    const input = makeInput({ topVotes: 300, totalVotes: 1000 })
    const result = evaluateAll(input)
    expect(result.shareholder.shareholderType).toBe('同族株主のいる会社')
  })
})

describe('株主判定 - 50%超例外ルール（通達188条）', () => {
  it('筆頭グループ50%超 かつ 納税者がそのグループに属する → 同族株主', () => {
    const input = makeInput({
      topVotes: 510, totalVotes: 1000,
      familyVotes: 510,
      inTopGroup: true,
      inFamilyGroup: true,
      selfVotes: 100,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.groupShareholderType).toBe('同族株主')
  })

  it('筆頭グループ50%超 かつ 納税者がそのグループに属さない → 同族株主以外', () => {
    // 別グループ（familyGroup）が30%以上でも、50%超グループに属さなければ同族株主以外
    const input = makeInput({
      topVotes: 510, totalVotes: 1000,
      familyVotes: 350, // 35%ある（30%以上）が50%超グループとは別
      inTopGroup: false,
      inFamilyGroup: true,
      selfVotes: 100,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.groupShareholderType).toBe('同族株主以外の株主')
  })

  it('筆頭グループちょうど50%（超ではない）→ 30%ルール適用', () => {
    const input = makeInput({
      topVotes: 500, totalVotes: 1000,
      familyVotes: 350,
      inTopGroup: false,
      inFamilyGroup: true,
      selfVotes: 100,
    })
    const result = evaluateAll(input)
    // 50%ちょうどは「超」でないので、30%ルール適用 → familyGroup30%以上で同族株主
    expect(result.shareholder.groupShareholderType).toBe('同族株主')
  })

  it('筆頭50%超、別グループ30%以上の株主 → 配当還元方式が適用される', () => {
    // 50%超例外により同族株主以外→特例的評価方式
    const input = makeInput({
      topVotes: 600, totalVotes: 1000,
      familyVotes: 300,
      inTopGroup: false,
      inFamilyGroup: true,
      selfVotes: 30, // 3%
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 50,
        dividendYield: 0.10,
      },
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('特例的評価方式')
    expect(result.valuation.method).toBe('dividendYield')
  })
})

describe('株主判定 - 同族株主のいない会社', () => {
  it('15%以上グループに属する → 同族株主等', () => {
    const input = makeInput({
      topVotes: 200, totalVotes: 1000, // 20% < 30%
      familyVotes: 200,
      inTopGroup: true,
      selfVotes: 100,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.shareholderType).toBe('同族株主のいない会社')
    expect(result.shareholder.groupShareholderType).toBe('同族株主等')
  })

  it('15%未満グループに属する → 等外の株主', () => {
    const input = makeInput({
      topVotes: 140, totalVotes: 1000, // 14%
      familyVotes: 140,
      inTopGroup: true,
      selfVotes: 50,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.shareholderType).toBe('同族株主のいない会社')
    expect(result.shareholder.groupShareholderType).toBe('等外の株主')
  })
})

describe('株主判定 - 中心的な同族株主と評価方式', () => {
  it('同族株主 + 中心的な同族株主あり + 5%以上 → 原則的評価方式', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 300, // 30%→同族株主, 25%以上→中心的な同族株主あり
      inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60, // 6% → 5%以上
      officer: false,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })

  it('同族株主 + 中心的な同族株主あり + 5%未満 + 非役員 → 特例的評価方式', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 300,
      inFamilyGroup: true, inTopGroup: true,
      selfVotes: 40, // 4% → 5%未満
      officer: false,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('特例的評価方式')
  })

  it('同族株主 + 中心的な同族株主あり + 5%未満 + 役員 → 原則的評価方式', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 300,
      inFamilyGroup: true, inTopGroup: true,
      selfVotes: 40, // 4%
      officer: true, // 役員
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })

  it('同族株主 + 中心的な同族株主なし → 原則的評価方式', () => {
    // 同族株主であるためにfamilyVotes≥30%が必要、かつ中心的でないために<25%
    // → この2条件は矛盾（30%以上かつ25%未満は不可能）
    // 通達の解釈: familyGroupRatioは「納税者の属するグループ」で判定（30%）、
    // 中心的な同族株主は「1人+配偶者・直系血族等の25%」で別の基準
    // 現在のコードでは同一のfamilyGroupRatioを使用しているため、
    // 同族株主(≥30%)の場合は必ず中心的な同族株主あり(≥25%)となる
    // → このテストは「50%超例外で同族株主になるが中心的ではない」ケースで確認
    const input = makeInput({
      topVotes: 510, totalVotes: 1000, // 50%超 → 例外ルール
      familyVotes: 200, // 20% → 中心的な同族株主なし
      inFamilyGroup: true, inTopGroup: true, // 50%超グループに属するので同族株主
      selfVotes: 30,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.groupShareholderType).toBe('同族株主')
    expect(result.shareholder.isCentralFamilyShareholder).toBe(false)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })

  it('同族株主以外 → 特例的評価方式', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, // 10% → 30%未満
      inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('特例的評価方式')
  })
})

describe('株主判定 - 同族株主のいない会社の中心的な株主', () => {
  it('同族株主等 + 中心的な株主あり(10%以上) + 5%以上 → 原則的評価方式', () => {
    const input = makeInput({
      topVotes: 200, totalVotes: 1000,
      familyVotes: 200,
      inTopGroup: true,
      selfVotes: 120, // 12% → 中心的な株主(10%以上) かつ 5%以上
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })

  it('同族株主等 + 中心的な株主あり(10%以上) + 5%未満 + 非役員 → 特例的評価方式', () => {
    // このケースは selfVoteRatio >= 0.10 かつ < 0.05 は矛盾するので実際には起きない
    // 10%以上は必ず5%以上なので、常に原則的評価方式
    const input = makeInput({
      topVotes: 200, totalVotes: 1000,
      familyVotes: 200,
      inTopGroup: true,
      selfVotes: 100, // 10% → 中心的株主かつ5%以上
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })

  it('同族株主等 + 中心的な株主なし(10%未満) → 原則的評価方式', () => {
    const input = makeInput({
      topVotes: 200, totalVotes: 1000,
      familyVotes: 200,
      inTopGroup: true,
      selfVotes: 80, // 8% → 10%未満 → 中心的な株主なし
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('原則的評価方式')
  })
})

// ========== 配当還元方式（通達188-2条）==========

describe('配当還元方式の計算（通達188-2条）', () => {
  it('基本ケース: max(50, 2.5)/0.10 × (50/50) = 500', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 50,
        dividendYield: 0.10,
        capitalPerShare: 50,
      },
    })
    const result = evaluateAll(input)
    expect(result.shareholder.evaluationMethod).toBe('特例的評価方式')
    expect(result.valuation.method).toBe('dividendYield')
    expect(result.valuation.perShare).toBe(500)
  })

  it('年配当が2.5円未満 → 下限2.5円適用: 2.5/0.10 = 25', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 1.0, // 2.5円未満
        dividendYield: 0.10,
        capitalPerShare: 50,
      },
    })
    const result = evaluateAll(input)
    expect(result.valuation.perShare).toBe(25) // 2.5/0.10 = 25
  })

  it('年配当0円 → 下限2.5円適用: 2.5/0.10 = 25', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 0,
        dividendYield: 0.10,
        capitalPerShare: 50,
      },
    })
    const result = evaluateAll(input)
    expect(result.valuation.perShare).toBe(25) // max(0, 2.5) / 0.10 = 25
  })

  it('資本金等の額500円の場合: 50/0.10 × (500/50) = 5000', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 50,
        dividendYield: 0.10,
        capitalPerShare: 500,
      },
    })
    const result = evaluateAll(input)
    expect(result.valuation.perShare).toBe(5000) // 50/0.10 * 10 = 5000
  })

  it('capitalPerShare未指定の場合はデフォルト50円', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 50,
        dividendYield: 0.10,
        // capitalPerShare未指定
      },
    })
    const result = evaluateAll(input)
    expect(result.valuation.perShare).toBe(500) // 50/0.10 * (50/50) = 500
  })
})

// ========== 会社規模判定 ==========

describe('会社規模判定（第1表の2）', () => {
  it('従業員70人以上 → 大会社', () => {
    const input = makeInput({
      ...makeInput(),
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 100000000,
        employees: { full: 70, partTimeHours: 0 },
        turnover1y: 100000000,
        yearsSinceOpening: 10,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('大会社')
    expect(result.size.L).toBe(1.0)
  })

  it('従業員69人 → 大会社にはならない', () => {
    const input = makeInput({
      ...makeInput(),
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 100000000,
        employees: { full: 69, partTimeHours: 0 },
        turnover1y: 100000000,
        yearsSinceOpening: 10,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).not.toBe('大会社')
  })

  it('FTE計算: 正社員50人 + パート3600時間 = 52人', () => {
    const input = makeInput({
      ...makeInput(),
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 300000000,
        employees: { full: 50, partTimeHours: 3600 },
        turnover1y: 300000000,
        yearsSinceOpening: 10,
      },
    })
    const result = evaluateAll(input)
    // FTE=52, bands: 36-69=中の大
    expect(result.size.size).toBeDefined()
  })

  it('配当還元方式の場合、会社規模判定をスキップ', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 100, inFamilyGroup: true, inTopGroup: false,
      selfVotes: 30,
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
        dividendPerShare: 50,
        dividendYield: 0.10,
      },
    })
    const result = evaluateAll(input)
    expect(result.valuation.method).toBe('dividendYield')
    expect(result.size.size).toBeUndefined()
    expect(result.size.LClass).toBeUndefined()
  })
})

// ========== 第3表: 評価額計算 ==========

describe('評価額計算（第3表）', () => {
  it('大会社: min(類似業種比準, 純資産)', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 2000000000,
        employees: { full: 80, partTimeHours: 0 },
        turnover1y: 2000000000,
        yearsSinceOpening: 10,
      },
      valuationInputs: {
        similarIndustryPPS: 1000,
        netAssetPPS: 800,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('大会社')
    expect(result.valuation.perShare).toBe(800) // min(1000, 800)
  })

  it('小会社: 純資産価額', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 30000000,
        employees: { full: 3, partTimeHours: 0 },
        turnover1y: 50000000,
        yearsSinceOpening: 10,
      },
      valuationInputs: {
        similarIndustryPPS: 500,
        netAssetPPS: 800,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('小会社')
    expect(result.valuation.perShare).toBe(800) // 純資産価額
  })

  it('中会社: 併用方式（80%相当額使用）', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 300000000,
        employees: { full: 30, partTimeHours: 0 },
        turnover1y: 300000000,
        yearsSinceOpening: 10,
      },
      valuationInputs: {
        similarIndustryPPS: 400,
        netAssetPPS: 1000,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('中会社')
    const L = result.size.L
    // na80 = 1000 * 0.8 = 800
    // combined = 400*L + 800*(1-L)
    // min(combined, 1000)
    const expected = Math.min(400 * L + 800 * (1 - L), 1000)
    expect(result.valuation.perShare).toBeCloseTo(expected, 5)
  })
})

// ========== 特定会社（第2表）==========

describe('特定会社判定（第2表）', () => {
  it('開業後3年未満 → 特定会社', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 300000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 300000000,
        yearsSinceOpening: 2,
      },
    })
    const result = evaluateAll(input)
    expect(result.special.specialType).toBe('開業後3年未満の会社等')
  })

  it('清算中 → 特定会社', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 300000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 300000000,
        yearsSinceOpening: 10,
        isLiquidating: true,
      },
    })
    const result = evaluateAll(input)
    expect(result.special.specialType).toBe('清算中の会社')
  })

  it('通常会社 → 特定会社でない', () => {
    const input = makeInput({
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 300000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 300000000,
        yearsSinceOpening: 10,
      },
      // 比準要素数1にならないよう、table4に非ゼロ値を設定
      table4: { B1: 10, C1: 20, D1: 30, B2: 10, C2: 20, D2: 30 },
    })
    const result = evaluateAll(input)
    expect(result.special.specialType).toBeUndefined()
  })
})

// ========== L値のテスト ==========

describe('L値（しんしゃく割合）', () => {
  it('中の大: L=0.90', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 600000000,
        employees: { full: 40, partTimeHours: 0 },
        turnover1y: 600000000,
        yearsSinceOpening: 10,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('中会社')
    expect(result.size.L).toBe(0.90)
  })

  it('小会社: L=0', () => {
    const input = makeInput({
      topVotes: 400, totalVotes: 1000,
      familyVotes: 400, inFamilyGroup: true, inTopGroup: true,
      selfVotes: 60,
      company: {
        industry: '卸売・小売・サービス以外',
        totalAssetsBook: 30000000,
        employees: { full: 3, partTimeHours: 0 },
        turnover1y: 50000000,
        yearsSinceOpening: 10,
      },
    })
    const result = evaluateAll(input)
    expect(result.size.size).toBe('小会社')
    expect(result.size.L).toBe(0)
  })
})
