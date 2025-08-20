import { describe, it, expect, vi } from 'vitest'

// Mock Next.js Response
const mockResponse = () => {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    headers: new Map(),
    setHeader: vi.fn().mockReturnThis(),
  }
  return res
}

// Mock the evaluation engine
const mockEvaluateAll = vi.fn()
const mockDecisionTrailExplainer = {
  generateDecisionTrail: vi.fn()
}

vi.mock('@/lib/engine/ruleRunner', () => ({
  evaluateAll: mockEvaluateAll
}))

vi.mock('@/lib/engine/explain', () => ({
  decisionTrailExplainer: mockDecisionTrailExplainer
}))

describe('API: /api/evaluate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/evaluate - 成功ケース', () => {
    it('正常な入力で評価結果とdecisionTrailが返される', async () => {
      const mockEvaluationResult = {
        shareholder: {
          familyGroupRatio: 0.9,
          topGroupRatio: 0.6,
          minority: false
        },
        special: {
          specialType: null
        },
        size: {
          size: '中会社' as const,
          LClass: '中の中',
          L: 0.5
        },
        valuation: {
          perShare: 1000
        },
        trail: [
          { node: '株主判定', out: '家族グループ比率: 90%', sourceRef: '第1表の1' },
          { node: '会社規模', out: '中会社 (L=0.5)', sourceRef: '第1表の2' },
          { node: '評価方式', out: '組み合わせ方式', sourceRef: '第3表' }
        ]
      }

      const mockDecisionTrail = [
        {
          id: 'shareholder',
          name: '株主判定',
          description: '家族グループ比率: 90%, 筆頭株主グループ比率: 60%',
          sourceRef: '第1表の1',
          children: []
        }
      ]

      mockEvaluateAll.mockReturnValue(mockEvaluationResult)
      mockDecisionTrailExplainer.generateDecisionTrail.mockReturnValue(mockDecisionTrail)

      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          }
        ],
        totalVotingRights: 10000,
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000
      }

      const res = mockResponse()
      
      // 実際のAPI関数を呼び出す（モックされた依存関係を使用）
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(mockEvaluateAll).toHaveBeenCalledWith(input)
      expect(mockDecisionTrailExplainer.generateDecisionTrail).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: {
          shareholder: mockEvaluationResult.shareholder,
          special: mockEvaluationResult.special,
          size: mockEvaluationResult.size,
          valuation: mockEvaluationResult.valuation
        },
        decisionTrail: mockDecisionTrail
      })
    })

    it('少数株主の場合、配当還元方式の結果が返される', async () => {
      const mockEvaluationResult = {
        shareholder: {
          familyGroupRatio: 0.6,
          topGroupRatio: 0.6,
          minority: true
        },
        special: {
          specialType: null
        },
        size: {
          size: '大会社' as const,
          LClass: '大会社',
          L: 1.0
        },
        valuation: {
          perShare: 1000 // 配当還元方式の結果
        },
        trail: [
          { node: '株主判定', out: '少数株主: 4%', sourceRef: '第1表の1' },
          { node: '評価方式', out: '配当還元方式', sourceRef: '第3表' }
        ]
      }

      mockEvaluateAll.mockReturnValue(mockEvaluationResult)
      mockDecisionTrailExplainer.generateDecisionTrail.mockReturnValue([])

      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          },
          {
            name: '山田次郎',
            relationship: '第三者',
            position: '監査役',
            shares: 400,
            votingRights: 400, // 4%
            isFamily: false,
            isTopShareholder: false
          }
        ],
        totalVotingRights: 10000,
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 70,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000,
        dividendYield: 0.05
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(mockEvaluateAll).toHaveBeenCalledWith(input)
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: {
          shareholder: mockEvaluationResult.shareholder,
          special: mockEvaluationResult.special,
          size: mockEvaluationResult.size,
          valuation: mockEvaluationResult.valuation
        },
        decisionTrail: []
      })
    })
  })

  describe('POST /api/evaluate - エラーハンドリング', () => {
    it('無効なJSONの場合、500エラーが返される', async () => {
      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ 
        json: () => Promise.reject(new Error('Invalid JSON')) 
      } as any, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid JSON',
        details: expect.any(String)
      })
    })

    it('評価エンジンでエラーが発生した場合、500エラーが返される', async () => {
      mockEvaluateAll.mockImplementation(() => {
        throw new Error('Evaluation engine error')
      })

      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          }
        ],
        totalVotingRights: 10000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Evaluation engine error',
        details: expect.any(String)
      })
    })

    it('必須フィールドが不足している場合、400エラーが返される', async () => {
      const input = {
        // shareholders が不足
        totalVotingRights: 10000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields',
        details: expect.any(String)
      })
    })
  })

  describe('POST /api/evaluate - レスポンスヘッダー', () => {
    it('キャッシュ制御ヘッダーが正しく設定される', async () => {
      const mockEvaluationResult = {
        shareholder: { familyGroupRatio: 0.9, topGroupRatio: 0.6, minority: false },
        special: { specialType: null },
        size: { size: '中会社' as const, LClass: '中の中', L: 0.5 },
        valuation: { perShare: 1000 },
        trail: []
      }

      mockEvaluateAll.mockReturnValue(mockEvaluationResult)
      mockDecisionTrailExplainer.generateDecisionTrail.mockReturnValue([])

      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          }
        ],
        totalVotingRights: 10000,
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(res.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      )
    })
  })

  describe('POST /api/evaluate - 入力バリデーション', () => {
    it('株主情報が空の場合、エラーが返される', async () => {
      const input = {
        shareholders: [],
        totalVotingRights: 10000,
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields',
        details: expect.stringContaining('shareholders')
      })
    })

    it('総議決権数が0以下の場合、エラーが返される', async () => {
      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          }
        ],
        totalVotingRights: 0, // 無効な値
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Missing required fields',
        details: expect.stringContaining('totalVotingRights')
      })
    })
  })

  describe('POST /api/evaluate - Decision Trail', () => {
    it('decisionTrailが空でない場合、正しく返される', async () => {
      const mockEvaluationResult = {
        shareholder: { familyGroupRatio: 0.9, topGroupRatio: 0.6, minority: false },
        special: { specialType: null },
        size: { size: '中会社' as const, LClass: '中の中', L: 0.5 },
        valuation: { perShare: 1000 },
        trail: [
          { node: '株主判定', out: '家族グループ比率: 90%', sourceRef: '第1表の1' },
          { node: '会社規模', out: '中会社 (L=0.5)', sourceRef: '第1表の2' }
        ]
      }

      const mockDecisionTrail = [
        {
          id: 'shareholder',
          name: '株主判定',
          description: '家族グループ比率: 90%, 筆頭株主グループ比率: 60%',
          sourceRef: '第1表の1',
          children: [
            {
              id: 'family-ratio',
              name: '家族グループ比率計算',
              description: '90%',
              sourceRef: '第1表の1'
            }
          ]
        }
      ]

      mockEvaluateAll.mockReturnValue(mockEvaluationResult)
      mockDecisionTrailExplainer.generateDecisionTrail.mockReturnValue(mockDecisionTrail)

      const input = {
        shareholders: [
          {
            name: '田中太郎',
            relationship: '本人',
            position: '代表取締役',
            shares: 1000,
            votingRights: 6000,
            isFamily: true,
            isTopShareholder: true
          }
        ],
        totalVotingRights: 10000,
        landRatio: 0.3,
        stockRatio: 0.2,
        establishmentDate: '2020-01-01',
        businessStatus: '営業中',
        isLiquidation: false,
        employees: 50,
        assets: 100000000,
        sales: 500000000,
        industry: '製造業',
        dividendPerShare: 50,
        profitPerShare: 100,
        netAssetPerShare: 1000,
        similarIndustryValue: 1200,
        netAssetValue: 1000
      }

      const res = mockResponse()
      
      const { POST } = await import('@/app/api/evaluate/route')
      await POST({ json: () => Promise.resolve(input) } as any, res)

      expect(mockDecisionTrailExplainer.generateDecisionTrail).toHaveBeenCalled()
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        result: {
          shareholder: mockEvaluationResult.shareholder,
          special: mockEvaluationResult.special,
          size: mockEvaluationResult.size,
          valuation: mockEvaluationResult.valuation
        },
        decisionTrail: mockDecisionTrail
      })
    })
  })
})
