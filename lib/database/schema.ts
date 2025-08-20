// 第4表・第5表のデータベーススキーマ
export interface IndustryData {
  id: string;
  industry: string;
  year: number;
  quarter: number;
  dataType: 'table4' | 'table5';
  
  // 第4表：類似業種比準価額の算定
  table4Data?: {
    B1: number;  // 株価収益率
    C1: number;  // 株価純資産倍率
    D1: number;  // 配当利回り
    B2: number;  // 株価収益率（2年目）
    C2: number;  // 株価純資産倍率（2年目）
    D2: number;  // 配当利回り（2年目）
    sampleCount: number;  // サンプル数
    reliability: 'high' | 'medium' | 'low';  // 信頼性
  };
  
  // 第5表：純資産価額の算定
  table5Data?: {
    netAssetPerShare: number;  // 1株当たり純資産価額
    totalAssets: number;       // 総資産
    totalLiabilities: number;  // 総負債
    totalShares: number;       // 発行済株式総数
    adjustmentFactors: {       // 調整要素
      landRevaluation: number;     // 土地の時価評価
      securitiesRevaluation: number; // 有価証券の時価評価
      otherAdjustments: number;    // その他の調整
    };
  };
  
  // メタデータ
  source: string;           // データソース（国税庁等）
  lastUpdated: Date;        // 最終更新日
  version: string;          // データバージョン
}

// 業種分類
export const INDUSTRY_CATEGORIES = [
  '製造業',
  '建設業',
  '卸売・小売業',
  'サービス業',
  '運輸・通信業',
  '金融・保険業',
  '不動産業',
  'その他'
] as const;

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number];

// データ取得クエリ
export interface DataQuery {
  industry: IndustryCategory;
  year: number;
  quarter?: number;
  dataType: 'table4' | 'table5' | 'both';
}

// データベース操作
export interface DatabaseOperations {
  // データ取得
  getIndustryData: (query: DataQuery) => Promise<IndustryData[]>;
  
  // データ更新
  updateIndustryData: (data: IndustryData) => Promise<void>;
  
  // データ一括更新
  bulkUpdateIndustryData: (data: IndustryData[]) => Promise<void>;
  
  // 利用可能な期間取得
  getAvailablePeriods: (industry: IndustryCategory) => Promise<{year: number, quarter: number}[]>;
  
  // データ検証
  validateData: (data: IndustryData) => Promise<{valid: boolean, errors: string[]}>;
}
