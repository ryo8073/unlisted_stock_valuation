// 第3表：評価に必要な情報
export interface ValuationTable3Data {
  // 基本情報
  companyName: string;
  evaluationDate: string;
  
  // 過去3年間の純資産価額（国税庁資料に基づく）
  netAssetValues: {
    current: number;      // 評価時点
    previous1: number;    // 1年前
    previous2: number;    // 2年前
    previous3: number;    // 3年前
  };
  
  // 過去3年間の配当実績
  dividendHistory: {
    current: number;      // 評価時点
    previous1: number;    // 1年前
    previous2: number;    // 2年前
    previous3: number;    // 3年前
  };
  
  // 過去3年間の利益実績
  profitHistory: {
    current: number;      // 評価時点
    previous1: number;    // 1年前
    previous2: number;    // 2年前
    previous3: number;    // 3年前
  };
  
  // 類似業種比準価額の要素
  similarIndustryElements: {
    B1: number;  // 株価収益率
    C1: number;  // 株価純資産倍率
    D1: number;  // 配当利回り
    B2: number;  // 株価収益率（2年目）
    C2: number;  // 株価純資産倍率（2年目）
    D2: number;  // 配当利回り（2年目）
  };
  
  // 評価方式
  evaluationMethod: 'standard' | 'dividendYield' | 'liquidation';
  
  // 計算結果
  calculationResult: {
    perShareValue: number;
    totalValue: number;
    method: string;
    explanation: string;
  };
}

// 国税庁の評価基準に基づく追加情報
export interface NTAGuidelines {
  // 特例的評価方式の適用条件
  specialEvaluationConditions: {
    minorityShareholder: boolean;      // 少数株主（5%未満）
    dividendYieldAvailable: boolean;   // 配当利回りが算定可能
    liquidationExpected: boolean;      // 清算予定
  };
  
  // 評価調整要素
  adjustmentFactors: {
    controlPremium: number;            // 支配株主プレミアム
    minorityDiscount: number;          // 少数株主ディスカウント
    marketabilityDiscount: number;     // 市場性ディスカウント
    otherAdjustments: number;          // その他の調整
  };
  
  // 評価根拠
  evaluationBasis: {
    primaryMethod: string;             // 主要評価方式
    secondaryMethod?: string;          // 補助評価方式
    reasonForMethod: string;           // 方式選択理由
    reliabilityLevel: 'high' | 'medium' | 'low'; // 信頼性レベル
  };
}
