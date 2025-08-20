import { describe, it, expect, beforeEach } from 'vitest'

interface EvaluationData {
  shareholders: Array<{
    name: string
    relationship: string
    position: string
    shares: number
    votingRights: number
    votingRatio: number
  }>
  totalVotingRights: number
  companyInfo: {
    name: string
    employees: number
    assets: number
    sales: number
    industry: string
    establishmentDate: string
    businessStatus: string
  }
}

class RuleRunner {
  evaluateShareholderGroup(data: EvaluationData) {
    const familyGroupVotes = data.shareholders
      .filter(sh => sh.relationship !== '第三者')
      .reduce((sum, sh) => sum + sh.votingRights, 0)

    // 筆頭株主グループ: 最大議決権割合の株主の割合
    const leadingGroupVotes = data.shareholders.reduce((max, sh) => Math.max(max, sh.votingRights), 0)

    const familyGroupRatio = data.totalVotingRights > 0 ? familyGroupVotes / data.totalVotingRights : 0
    const leadingGroupRatio = data.totalVotingRights > 0 ? leadingGroupVotes / data.totalVotingRights : 0

    // 少数株主判定（5%未満）
    const isMinorityShareholder = data.shareholders.some(sh => sh.votingRatio < 0.05)

    return {
      familyGroupRatio,
      leadingShareholderGroupRatio: leadingGroupRatio,
      isMinorityShareholder,
      familyGroupVotes,
      leadingGroupVotes,
    }
  }
}

describe('RuleRunner - 株主判定（第1表の1）', () => {
  let ruleRunner: RuleRunner
  let testData: EvaluationData

  beforeEach(() => {
    ruleRunner = new RuleRunner()
    testData = {
      shareholders: [
        {
          name: '田中太郎',
          relationship: '納税義務者',
          position: '代表取締役',
          shares: 1000,
          votingRights: 1000,
          votingRatio: 0.5,
        },
        {
          name: '田中花子',
          relationship: '配偶者',
          position: '取締役',
          shares: 1000,
          votingRights: 1000,
          votingRatio: 0.5,
        },
      ],
      totalVotingRights: 2000,
      companyInfo: {
        name: 'テスト株式会社',
        employees: 50,
        assets: 100000000,
        sales: 50000000,
        industry: 'サービス',
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
      },
    }
  })

  it('同族関係者グループ比率を正しく計算する', () => {
    const result = ruleRunner.evaluateShareholderGroup(testData)
    
    expect(result.familyGroupRatio).toBe(1.0) // 100%
    expect(result.leadingShareholderGroupRatio).toBe(0.5) // 最大議決権の株主の割合
    expect(result.isMinorityShareholder).toBe(false)
  })

  it('少数株主（5%未満）の判定を正しく行う', () => {
    testData.shareholders = [
      {
        name: '田中太郎',
        relationship: '納税義務者',
        position: '代表取締役',
        shares: 100,
        votingRights: 100,
        votingRatio: 0.02, // 2%
      },
    ]
    testData.totalVotingRights = 5000

    const result = ruleRunner.evaluateShareholderGroup(testData)
    
    expect(result.isMinorityShareholder).toBe(true)
    expect(result.familyGroupRatio).toBe(0.02)
  })

  it('筆頭株主グループの判定を正しく行う', () => {
    testData.shareholders = [
      {
        name: '田中太郎',
        relationship: '納税義務者',
        position: '代表取締役',
        shares: 800,
        votingRights: 800,
        votingRatio: 0.4,
      },
      {
        name: '佐藤次郎',
        relationship: '第三者',
        position: '取締役',
        shares: 1200,
        votingRights: 1200,
        votingRatio: 0.6,
      },
    ]
    testData.totalVotingRights = 2000

    const result = ruleRunner.evaluateShareholderGroup(testData)
    
    expect(result.leadingShareholderGroupRatio).toBe(0.6) // 佐藤次郎が筆頭
    expect(result.familyGroupRatio).toBe(0.4)
  })
})

import { evaluateAll } from '@/lib/engine/ruleRunner'

describe('RuleRunner - 配当還元方式の判定', () => {
  it('同族株主等で5%未満の場合、配当還元方式が適用される', () => {
    const input = {
      shareholders: [
        {
          id: '1',
          name: '田中太郎',
          votes: 50, // 2.5% (5%未満)
          isTaxpayer: true,
          inFamilyGroup: true, // 同族関係者
          inTopGroup: true,    // 筆頭株主
          officer: false
        }
      ],
      totals: { votes: 2000 },
      groups: {
        family: { votes: 600 }, // 30% (同族株主)
        top: { votes: 600 }     // 30% (筆頭株主グループ)
      },
      company: {
        industry: '卸売・小売・サービス以外' as const,
        totalAssetsBook: 100000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 50000000,
        yearsSinceOpening: 10
      },
      valuationInputs: {
        similarIndustryPPS: 1200,
        netAssetPPS: 1000,
        dividendPerShare: 50,
        dividendYield: 0.05
      }
    }

    const result = evaluateAll(input)

    // 配当還元方式が適用される
    expect(result.valuation.perShare).toBe(1000) // 50 / 0.05
    expect(result.valuation.method).toBe('dividendYield')
    
    // 会社規模判定はスキップされる
    expect(result.size.size).toBeUndefined()
    expect(result.size.LClass).toBeUndefined()
  })

  it('同族株主等以外で5%以上の場合、通常の評価方式が適用される', () => {
    const input = {
      shareholders: [
        {
          id: '1',
          name: '田中太郎',
          votes: 200, // 10%
          isTaxpayer: true,
          inFamilyGroup: false,
          inTopGroup: false
        }
      ],
      totals: { votes: 2000 },
      groups: {
        family: { votes: 200 },
        top: { votes: 200 }
      },
      company: {
        industry: '卸売・小売・サービス以外' as const,
        totalAssetsBook: 100000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 50000000,
        yearsSinceOpening: 10
      },
      valuationInputs: {
        similarIndustryPPS: 1200,
        netAssetPPS: 1000
      }
    }

    const result = evaluateAll(input)

    // 通常の評価方式が適用される
    expect(result.valuation.method).toBe('standard')
    expect(result.size.size).toBeDefined()
    expect(result.size.LClass).toBeDefined()
  })

  it('配当利回りが未設定の場合、通常の評価方式が適用される', () => {
    const input = {
      shareholders: [
        {
          id: '1',
          name: '田中太郎',
          votes: 100, // 5%未満
          isTaxpayer: true,
          inFamilyGroup: false,
          inTopGroup: false
        }
      ],
      totals: { votes: 2000 },
      groups: {
        family: { votes: 100 },
        top: { votes: 100 }
      },
      company: {
        industry: '卸売・小売・サービス以外' as const,
        totalAssetsBook: 100000000,
        employees: { full: 50, partTimeHours: 0 },
        turnover1y: 50000000,
        yearsSinceOpening: 10
      },
      valuationInputs: {
        similarIndustryPPS: 1200,
        netAssetPPS: 1000
        // dividendYield 未設定
      }
    }

    const result = evaluateAll(input)

    // 通常の評価方式が適用される
    expect(result.valuation.method).toBe('standard')
    expect(result.size.size).toBeDefined()
    expect(result.size.LClass).toBeDefined()
  })
})
