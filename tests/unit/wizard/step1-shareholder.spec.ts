import { describe, it, expect, beforeEach } from 'vitest'

interface Shareholder {
  id: string
  name: string
  relationship: string
  position: string
  shares: number
  votingRights: number
  votingRatio: number
  isFamily: boolean
  isTopShareholder: boolean
}

interface ShareholderData {
  shareholders: Shareholder[]
  totalVotingRights: number
  familyGroupRatio: number
  leadingShareholderGroupRatio: number
  isMinorityShareholder: boolean
  familyGroupVotes: number
  leadingGroupVotes: number
}

function calculateShareholderResults(data: {
  shareholders: Shareholder[]
  totalVotingRights: number
}): ShareholderData {
  const familyGroupVotes = data.shareholders
    .filter(sh => sh.isFamily)
    .reduce((sum, sh) => sum + sh.votingRights, 0)
  
  const leadingGroupVotes = data.shareholders
    .filter(sh => sh.isTopShareholder)
    .reduce((sum, sh) => sum + sh.votingRights, 0)

  const familyGroupRatio = data.totalVotingRights > 0 ? familyGroupVotes / data.totalVotingRights : 0
  const leadingShareholderGroupRatio = data.totalVotingRights > 0 ? leadingGroupVotes / data.totalVotingRights : 0

  // 少数株主判定（5%未満）
  const isMinorityShareholder = data.shareholders.some(sh => sh.votingRatio < 0.05)

  return {
    shareholders: data.shareholders,
    totalVotingRights: data.totalVotingRights,
    familyGroupRatio,
    leadingShareholderGroupRatio,
    isMinorityShareholder,
    familyGroupVotes,
    leadingGroupVotes,
  }
}

function validateShareholderInput(data: {
  shareholders: Shareholder[]
  totalVotingRights: number
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.totalVotingRights || data.totalVotingRights <= 0) {
    errors.push('総議決権数は必須です')
  }

  if (data.shareholders.length === 0) {
    errors.push('株主情報は必須です')
  }

  // 議決権数の合計チェック
  const totalVotes = data.shareholders.reduce((sum, sh) => sum + sh.votingRights, 0)
  if (totalVotes > data.totalVotingRights) {
    errors.push('株主の議決権数の合計が総議決権数を超えています')
  }

  // 各株主の議決権比率チェック
  data.shareholders.forEach((sh, index) => {
    if (sh.votingRatio < 0 || sh.votingRatio > 1) {
      errors.push(`株主${index + 1}の議決権比率が不正です`)
    }
  })

  return {
    isValid: errors.length === 0,
    errors
  }
}

describe('Step 1: 株主判定（第1表の1）', () => {
  describe('家族グループ比率計算', () => {
    it('家族グループの議決権比率を正しく計算する', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '田中花子', relationship: '配偶者', position: '取締役', shares: 500, votingRights: 3000, votingRatio: 0.3, isFamily: true, isTopShareholder: false },
          { id: '3', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 1000, votingRatio: 0.1, isFamily: false, isTopShareholder: false }
        ],
        totalVotingRights: 10000
      }

      const result = calculateShareholderResults(input)

      expect(result.familyGroupRatio).toBe(0.9) // (6000 + 3000) / 10000
      expect(result.familyGroupVotes).toBe(9000)
    })

    it('総議決権数が0の場合、比率は0になる', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 0, votingRatio: 0, isFamily: true, isTopShareholder: true }
        ],
        totalVotingRights: 0
      }

      const result = calculateShareholderResults(input)

      expect(result.familyGroupRatio).toBe(0)
      expect(result.leadingShareholderGroupRatio).toBe(0)
    })
  })

  describe('筆頭株主グループ比率計算', () => {
    it('筆頭株主グループの議決権比率を正しく計算する', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '田中花子', relationship: '配偶者', position: '取締役', shares: 500, votingRights: 3000, votingRatio: 0.3, isFamily: true, isTopShareholder: false },
          { id: '3', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 1000, votingRatio: 0.1, isFamily: false, isTopShareholder: false }
        ],
        totalVotingRights: 10000
      }

      const result = calculateShareholderResults(input)

      expect(result.leadingShareholderGroupRatio).toBe(0.6) // 6000 / 10000
      expect(result.leadingGroupVotes).toBe(6000)
    })
  })

  describe('少数株主判定', () => {
    it('5%未満の株主がいる場合、少数株主フラグが立つ', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 400, votingRatio: 0.04, isFamily: false, isTopShareholder: false } // 4% < 5%
        ],
        totalVotingRights: 10000
      }

      const result = calculateShareholderResults(input)

      expect(result.isMinorityShareholder).toBe(true)
    })

    it('全株主が5%以上の場合、少数株主フラグが立たない', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 500, votingRatio: 0.05, isFamily: false, isTopShareholder: false } // 5% >= 5%
        ],
        totalVotingRights: 10000
      }

      const result = calculateShareholderResults(input)

      expect(result.isMinorityShareholder).toBe(false)
    })

    it('境界値テスト: 4.999%は少数株主、5.000%は少数株主ではない', () => {
      const input1 = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 499, votingRatio: 0.04999, isFamily: true, isTopShareholder: true }
        ],
        totalVotingRights: 10000
      }

      const input2 = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 500, votingRatio: 0.05, isFamily: true, isTopShareholder: true }
        ],
        totalVotingRights: 10000
      }

      const result1 = calculateShareholderResults(input1)
      const result2 = calculateShareholderResults(input2)

      expect(result1.isMinorityShareholder).toBe(true)
      expect(result2.isMinorityShareholder).toBe(false)
    })
  })

  describe('入力バリデーション', () => {
    it('総議決権数が空の場合、エラーになる', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true }
        ],
        totalVotingRights: 0
      }

      const validation = validateShareholderInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('総議決権数は必須です')
    })

    it('株主情報が空の場合、エラーになる', () => {
      const input = {
        shareholders: [],
        totalVotingRights: 10000
      }

      const validation = validateShareholderInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('株主情報は必須です')
    })

    it('議決権数の合計が総議決権数を超える場合、エラーになる', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 5000, votingRatio: 0.5, isFamily: false, isTopShareholder: false }
        ],
        totalVotingRights: 10000 // 合計11000 > 10000
      }

      const validation = validateShareholderInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('株主の議決権数の合計が総議決権数を超えています')
    })

    it('議決権比率が不正な場合、エラーになる', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 1.5, isFamily: true, isTopShareholder: true } // 150% > 100%
        ],
        totalVotingRights: 10000
      }

      const validation = validateShareholderInput(input)

      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('株主1の議決権比率が不正です')
    })

    it('正常な入力の場合、バリデーションが通る', () => {
      const input = {
        shareholders: [
          { id: '1', name: '田中太郎', relationship: '本人', position: '代表取締役', shares: 1000, votingRights: 6000, votingRatio: 0.6, isFamily: true, isTopShareholder: true },
          { id: '2', name: '山田次郎', relationship: '第三者', position: '監査役', shares: 500, votingRights: 4000, votingRatio: 0.4, isFamily: false, isTopShareholder: false }
        ],
        totalVotingRights: 10000
      }

      const validation = validateShareholderInput(input)

      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })
})
