// /lib/store/evalStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ShareholderData {
  shareholders: Array<{
    id: string
    name: string
    relationship: string
    position: string
    shares: number
    votingRights: number
    votingRatio: number
    isFamily: boolean
    isTopShareholder: boolean
  }>
  totalVotingRights: number
  familyGroupRatio: number
  leadingShareholderGroupRatio: number
  isMinorityShareholder: boolean
  familyGroupVotes: number
  leadingGroupVotes: number
}

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

interface CompanySizeData {
  employees: number
  assets: number
  sales: number
  industry: string
  companySize: 'large' | 'medium' | 'small'
  // 中会社のサブ区分（中の大/中の中/中の小）や大会社/小会社の場合の最終バンド
  lClass?: string
  lRatio: number
}

import { SimilarIndustryDataRow } from "@/lib/database/similarIndustryData";

interface ValuationData {
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  netAssetValue: number
  dividendYield: number
  finalValue: number
  method: string
  similarIndustryValue?: number;
  selectedIndustryData?: SimilarIndustryDataRow;
}

interface EvalStore {
  // 各ステップのデータ
  shareholderData: ShareholderData | null
  specialCompanyData: SpecialCompanyData | null
  companySizeData: CompanySizeData | null
  valuationData: ValuationData | null
  
  // アクション
  setShareholderData: (data: ShareholderData) => void
  setSpecialCompanyData: (data: SpecialCompanyData) => void
  setCompanySizeData: (data: CompanySizeData) => void
  setValuationData: (data: ValuationData) => void
  
  // 全体のリセット
  resetAll: () => void
  
  // レガシーサポート（既存のresult）
  result: any
  setResult: (result: any) => void
}

export const useEvalStore = create<EvalStore>()(
  persist(
    (set) => ({
      // 初期状態
      shareholderData: null,
      specialCompanyData: null,
      companySizeData: null,
      valuationData: null,
      result: null,

      // アクション
      setShareholderData: (data) => set({ shareholderData: data }),
      setSpecialCompanyData: (data) => set({ specialCompanyData: data }),
      setCompanySizeData: (data) => set({ companySizeData: data }),
      setValuationData: (data) => set({ valuationData: data }),
      
      resetAll: () => set({
        shareholderData: null,
        specialCompanyData: null,
        companySizeData: null,
        valuationData: null,
        result: null,
      }),
      
      // レガシーサポート
      setResult: (result) => set({ result }),
    }),
    {
      name: 'eval-store',
      partialize: (state) => ({
        shareholderData: state.shareholderData,
        specialCompanyData: state.specialCompanyData,
        companySizeData: state.companySizeData,
        valuationData: state.valuationData,
        result: state.result,
      }),
    }
  )
)
