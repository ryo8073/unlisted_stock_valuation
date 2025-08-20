export type BandLabel = "大会社"|"中の大"|"中の中"|"中の小"|"小会社";
export type SizeResult = { size: "大会社"|"中会社"|"小会社"; LClass: BandLabel; L: number };

export type ShareholderRow = { id: string; name: string; relation?: string; officer?: boolean; votes: number; inFamilyGroup?: boolean; inTopGroup?: boolean; isTaxpayer?: boolean; };

export type EvaluateInput = {
  shareholders: ShareholderRow[];
  totals: { votes: number };
  groups: { family: { votes: number }, top: { votes: number } };
  company: {
    industry: "卸売業"|"小売・サービス業"|"卸売・小売・サービス以外";
    totalAssetsBook: number;
    employees: { full: number; partTimeHours: number };
    turnover1y: number;
    hasTreasuryStock?: boolean;
    isPreOpeningOrSuspended?: boolean;
    isLiquidating?: boolean;
    yearsSinceOpening?: number;
  };
  valuationInputs?: { 
    similarIndustryPPS?: number; 
    netAssetPPS?: number; 
    netAssetPPS80?: number; 
    liquidationExpectedPerShare?: number;
    dividendPerShare?: number;
    dividendYield?: number;
  };
  table4?: { B1?: number; C1?: number; D1?: number; B2?: number; C2?: number; D2?: number; }; // 第2表の補助
}

export interface Rule {
  id: string
  name: string
  condition: any
  action: any
  sourceRef: string
  priority: number
  description: string
}

export interface RuleSet {
  name: string
  version: string
  description: string
  rules: Rule[]
  metadata: Record<string, any>
}

export interface RuleResult {
  id: string
  name: string
  description: string
  sourceRef: string
  result: string
}

export interface EvaluationResult {
  shareholderResult?: {
    familyGroupRatio: number
    leadingShareholderGroupRatio: number
    isMinorityShareholder: boolean
    appliedRules: RuleResult[]
  }
  specialCompanyResult?: {
    isSpecialCompany: boolean
    specialTypes: string[]
    appliedRules: RuleResult[]
  }
  companySizeResult?: {
    companySize: 'large' | 'medium' | 'small'
    lRatio: number
    appliedRules: RuleResult[]
  }
  valuationResult?: {
    method: string
    finalValue: number
    appliedRules: RuleResult[]
  }
}

export interface DecisionNode {
  id: string
  name: string
  description: string
  sourceRef?: string
  children?: DecisionNode[]
  result?: string
}
