// 国税庁類似業種比準価額データのスキーマ
export interface NTASimilarIndustryData {
  id: string;
  fiscalYear: number;        // 年度（例：2024）
  quarter: number;           // 四半期（1-4）
  industryCode: string;      // 業種コード
  industryName: string;      // 業種名
  industryCategory: string;  // 業種分類
  
  // 第4表：類似業種比準価額の算定要素
  table4Elements: {
    B1: number;  // 株価収益率（1年目）
    C1: number;  // 株価純資産倍率（1年目）
    D1: number;  // 配当利回り（1年目）
    B2: number;  // 株価収益率（2年目）
    C2: number;  // 株価純資産倍率（2年目）
    D2: number;  // 配当利回り（2年目）
  };
  
  // 統計情報
  statistics: {
    sampleCount: number;     // サンプル数
    averageMarketCap: number; // 平均時価総額
    medianMarketCap: number;  // 中央値時価総額
    reliability: 'high' | 'medium' | 'low'; // 信頼性
  };
  
  // メタデータ
  source: string;           // データソース（国税庁）
  publicationDate: Date;    // 公表日
  lastUpdated: Date;        // 最終更新日
  version: string;          // データバージョン
  notes?: string;           // 備考
}

// 業種分類マスタ
export interface IndustryMaster {
  code: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}

// データ取得クエリ
export interface NTADataQuery {
  fiscalYear?: number;
  quarter?: number;
  industryCode?: string;
  industryCategory?: string;
  includeInactive?: boolean;
}

// データベース操作
export interface NTADatabaseOperations {
  // データ取得
  getSimilarIndustryData: (query: NTADataQuery) => Promise<NTASimilarIndustryData[]>;
  
  // 業種マスタ取得
  getIndustryMaster: (includeInactive?: boolean) => Promise<IndustryMaster[]>;
  
  // 利用可能な年度・四半期取得
  getAvailablePeriods: () => Promise<{fiscalYear: number, quarter: number}[]>;
  
  // データ更新
  updateSimilarIndustryData: (data: NTASimilarIndustryData) => Promise<void>;
  
  // データ一括更新
  bulkUpdateSimilarIndustryData: (data: NTASimilarIndustryData[]) => Promise<void>;
  
  // 業種マスタ更新
  updateIndustryMaster: (data: IndustryMaster) => Promise<void>;
  
  // データ検証
  validateData: (data: NTASimilarIndustryData) => Promise<{valid: boolean, errors: string[]}>;
  
  // データインポート（CSV/Excel等）
  importFromFile: (filePath: string, format: 'csv' | 'excel') => Promise<{success: boolean, imported: number, errors: string[]}>;
  
  // データエクスポート
  exportToFile: (query: NTADataQuery, format: 'csv' | 'excel', filePath: string) => Promise<boolean>;
}

// 国税庁の業種分類（令和6年度版に基づく）
export const NTA_INDUSTRY_CATEGORIES = [
  {
    code: '01',
    name: '建設業',
    subCategories: [
      { code: '0101', name: '総合工事業' },
      { code: '0102', name: '職別工事業' },
      { code: '0103', name: '設備工事業' }
    ]
  },
  {
    code: '02',
    name: '製造業',
    subCategories: [
      { code: '0201', name: '食料品製造業' },
      { code: '0202', name: '飲料・たばこ・飼料製造業' },
      { code: '0203', name: '繊維工業' },
      { code: '0204', name: '木材・木製品製造業' },
      { code: '0205', name: '家具・装備品製造業' },
      { code: '0206', name: 'パルプ・紙・紙加工品製造業' },
      { code: '0207', name: '印刷・同関連業' },
      { code: '0208', name: '化学工業' },
      { code: '0209', name: '石油製品・石炭製品製造業' },
      { code: '0210', name: 'プラスチック製品製造業' },
      { code: '0211', name: 'ゴム製品製造業' },
      { code: '0212', name: 'なめし革・同製品・毛皮製造業' },
      { code: '0213', name: '窯業・土石製品製造業' },
      { code: '0214', name: '鉄鋼業' },
      { code: '0215', name: '非鉄金属製造業' },
      { code: '0216', name: '金属製品製造業' },
      { code: '0217', name: 'はん用機械器具製造業' },
      { code: '0218', name: '生産用機械器具製造業' },
      { code: '0219', name: '業務用機械器具製造業' },
      { code: '0220', name: '電子部品・デバイス・電子回路製造業' },
      { code: '0221', name: '電気機械器具製造業' },
      { code: '0222', name: '情報通信機械器具製造業' },
      { code: '0223', name: '輸送用機械器具製造業' },
      { code: '0224', name: 'その他の製造業' }
    ]
  },
  {
    code: '03',
    name: '情報通信業',
    subCategories: [
      { code: '0301', name: '通信業' },
      { code: '0302', name: '放送業' },
      { code: '0303', name: '情報サービス業' },
      { code: '0304', name: 'インターネット附随サービス業' },
      { code: '0305', name: '映像・音声・文字情報制作業' }
    ]
  },
  {
    code: '04',
    name: '運輸業・郵便業',
    subCategories: [
      { code: '0401', name: '鉄道業' },
      { code: '0402', name: '道路旅客運送業' },
      { code: '0403', name: '道路貨物運送業' },
      { code: '0404', name: '水運業' },
      { code: '0405', name: '航空運輸業' },
      { code: '0406', name: '倉庫業' },
      { code: '0407', name: '運輸に附帯するサービス業' },
      { code: '0408', name: '郵便業' }
    ]
  },
  {
    code: '05',
    name: '卸売業・小売業',
    subCategories: [
      { code: '0501', name: '各種商品卸売業' },
      { code: '0502', name: '繊維・衣服等卸売業' },
      { code: '0503', name: '飲食料品卸売業' },
      { code: '0504', name: '建築材料・鉱物・金属材料等卸売業' },
      { code: '0505', name: '機械器具卸売業' },
      { code: '0506', name: 'その他の卸売業' },
      { code: '0507', name: '各種商品小売業' },
      { code: '0508', name: '織物・衣服・身の回り品小売業' },
      { code: '0509', name: '飲食料品小売業' },
      { code: '0510', name: '機械器具小売業' },
      { code: '0511', name: 'その他の小売業' },
      { code: '0512', name: '無店舗小売業' }
    ]
  },
  {
    code: '06',
    name: '金融業・保険業',
    subCategories: [
      { code: '0601', name: '銀行業' },
      { code: '0602', name: '協同組織金融業' },
      { code: '0603', name: '貸金業・クレジットカード業等非預金信用機関' },
      { code: '0604', name: '金融商品取引業・商品先物取引業' },
      { code: '0605', name: '補助的金融業等' },
      { code: '0606', name: '保険業' }
    ]
  },
  {
    code: '07',
    name: '不動産業・物品賃貸業',
    subCategories: [
      { code: '0701', name: '不動産取引業' },
      { code: '0702', name: '不動産賃貸業・管理業' },
      { code: '0703', name: '物品賃貸業' }
    ]
  },
  {
    code: '08',
    name: '学術研究・専門・技術サービス業',
    subCategories: [
      { code: '0801', name: '学術・開発研究業' },
      { code: '0802', name: '専門サービス業' },
      { code: '0803', name: '広告業' },
      { code: '0804', name: '技術サービス業' }
    ]
  },
  {
    code: '09',
    name: '宿泊業・飲食サービス業',
    subCategories: [
      { code: '0901', name: '宿泊業' },
      { code: '0902', name: '飲食店' },
      { code: '0903', name: '持ち帰り・配達飲食サービス業' }
    ]
  },
  {
    code: '10',
    name: '生活関連サービス業・娯楽業',
    subCategories: [
      { code: '1001', name: '洗濯・理容・美容・浴場業' },
      { code: '1002', name: 'その他の生活関連サービス業' },
      { code: '1003', name: '娯楽業' }
    ]
  },
  {
    code: '11',
    name: '教育・学習支援業',
    subCategories: [
      { code: '1101', name: '学校教育' },
      { code: '1102', name: 'その他の教育・学習支援業' }
    ]
  },
  {
    code: '12',
    name: '医療・福祉',
    subCategories: [
      { code: '1201', name: '医療業' },
      { code: '1202', name: '保健衛生' },
      { code: '1203', name: '社会保険・社会福祉・介護事業' }
    ]
  },
  {
    code: '13',
    name: '複合サービス事業',
    subCategories: [
      { code: '1301', name: '郵便局' },
      { code: '1302', name: '協同組合' }
    ]
  },
  {
    code: '14',
    name: 'サービス業（他に分類されないもの）',
    subCategories: [
      { code: '1401', name: '廃棄物処理業' },
      { code: '1402', name: '自動車整備業' },
      { code: '1403', name: '機械等修理業' },
      { code: '1404', name: '職業紹介・労働者派遣業' },
      { code: '1405', name: 'その他の事業サービス業' },
      { code: '1406', name: '政治・経済・文化団体' },
      { code: '1407', name: '宗教' },
      { code: '1408', name: 'その他のサービス業' }
    ]
  }
] as const;
