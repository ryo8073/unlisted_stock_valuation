import { 
  NTASimilarIndustryData, 
  IndustryMaster, 
  NTADataQuery, 
  NTADatabaseOperations,
  NTA_INDUSTRY_CATEGORIES 
} from './ntaDataSchema';

// 国税庁データベース実装
export class NTADatabase implements NTADatabaseOperations {
  private db: any; // 実際の実装では適切なDBクライアント
  private mockData: NTASimilarIndustryData[] = [];

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    // データベース初期化
    console.log('NTA database initialized');
    
    // サンプルデータを初期化
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // 令和6年度のサンプルデータ（実際のデータは国税庁から取得）
    this.mockData = [
      {
        id: '1',
        fiscalYear: 2024,
        quarter: 1,
        industryCode: '0201',
        industryName: '食料品製造業',
        industryCategory: '製造業',
        table4Elements: {
          B1: 15.2,
          C1: 1.8,
          D1: 2.1,
          B2: 14.8,
          C2: 1.7,
          D2: 2.3
        },
        statistics: {
          sampleCount: 150,
          averageMarketCap: 50000000000,
          medianMarketCap: 30000000000,
          reliability: 'high'
        },
        source: '国税庁',
        publicationDate: new Date('2024-06-25'),
        lastUpdated: new Date('2024-06-25'),
        version: 'R06-1Q'
      },
      {
        id: '2',
        fiscalYear: 2024,
        quarter: 1,
        industryCode: '0208',
        industryName: '化学工業',
        industryCategory: '製造業',
        table4Elements: {
          B1: 12.5,
          C1: 1.5,
          D1: 1.8,
          B2: 12.0,
          C2: 1.4,
          D2: 2.0
        },
        statistics: {
          sampleCount: 120,
          averageMarketCap: 80000000000,
          medianMarketCap: 50000000000,
          reliability: 'high'
        },
        source: '国税庁',
        publicationDate: new Date('2024-06-25'),
        lastUpdated: new Date('2024-06-25'),
        version: 'R06-1Q'
      },
      {
        id: '3',
        fiscalYear: 2024,
        quarter: 1,
        industryCode: '0303',
        industryName: '情報サービス業',
        industryCategory: '情報通信業',
        table4Elements: {
          B1: 18.5,
          C1: 2.2,
          D1: 1.5,
          B2: 17.8,
          C2: 2.1,
          D2: 1.6
        },
        statistics: {
          sampleCount: 200,
          averageMarketCap: 120000000000,
          medianMarketCap: 80000000000,
          reliability: 'high'
        },
        source: '国税庁',
        publicationDate: new Date('2024-06-25'),
        lastUpdated: new Date('2024-06-25'),
        version: 'R06-1Q'
      }
    ];
  }

  async getSimilarIndustryData(query: NTADataQuery): Promise<NTASimilarIndustryData[]> {
    // 実際の実装ではSQLクエリを実行
    let filteredData = this.mockData;

    if (query.fiscalYear) {
      filteredData = filteredData.filter(d => d.fiscalYear === query.fiscalYear);
    }

    if (query.quarter) {
      filteredData = filteredData.filter(d => d.quarter === query.quarter);
    }

    if (query.industryCode) {
      filteredData = filteredData.filter(d => d.industryCode === query.industryCode);
    }

    if (query.industryCategory) {
      filteredData = filteredData.filter(d => d.industryCategory === query.industryCategory);
    }

    return filteredData;
  }

  async getIndustryMaster(includeInactive: boolean = false): Promise<IndustryMaster[]> {
    const master: IndustryMaster[] = [];

    NTA_INDUSTRY_CATEGORIES.forEach(category => {
      // 大分類
      master.push({
        code: category.code,
        name: category.name,
        category: '大分類',
        description: `${category.name}の大分類`,
        isActive: true
      });

      // 中分類
      category.subCategories.forEach(sub => {
        master.push({
          code: sub.code,
          name: sub.name,
          category: category.name,
          description: `${category.name}の${sub.name}`,
          isActive: true
        });
      });
    });

    return includeInactive ? master : master.filter(m => m.isActive);
  }

  async getAvailablePeriods(): Promise<{fiscalYear: number, quarter: number}[]> {
    const periods = new Set<string>();
    
    this.mockData.forEach(data => {
      periods.add(`${data.fiscalYear}-${data.quarter}`);
    });

    return Array.from(periods)
      .map(p => {
        const [year, quarter] = p.split('-');
        return { fiscalYear: parseInt(year), quarter: parseInt(quarter) };
      })
      .sort((a, b) => {
        if (a.fiscalYear !== b.fiscalYear) {
          return b.fiscalYear - a.fiscalYear;
        }
        return b.quarter - a.quarter;
      });
  }

  async updateSimilarIndustryData(data: NTASimilarIndustryData): Promise<void> {
    const index = this.mockData.findIndex(d => d.id === data.id);
    if (index >= 0) {
      this.mockData[index] = data;
    } else {
      this.mockData.push(data);
    }
    console.log('Updated similar industry data:', data.id);
  }

  async bulkUpdateSimilarIndustryData(data: NTASimilarIndustryData[]): Promise<void> {
    for (const item of data) {
      await this.updateSimilarIndustryData(item);
    }
    console.log('Bulk updated similar industry data:', data.length, 'records');
  }

  async updateIndustryMaster(data: IndustryMaster): Promise<void> {
    console.log('Updated industry master:', data.code);
  }

  async validateData(data: NTASimilarIndustryData): Promise<{valid: boolean, errors: string[]}> {
    const errors: string[] = [];

    // 基本バリデーション
    if (!data.industryCode) {
      errors.push('業種コードが指定されていません');
    }

    if (!data.industryName) {
      errors.push('業種名が指定されていません');
    }

    if (!data.fiscalYear || data.fiscalYear < 2000 || data.fiscalYear > 2030) {
      errors.push('年度が無効です');
    }

    if (!data.quarter || data.quarter < 1 || data.quarter > 4) {
      errors.push('四半期が無効です');
    }

    // 第4表要素のバリデーション
    const elements = data.table4Elements;
    if (elements.B1 <= 0) {
      errors.push('株価収益率（B1）が無効です');
    }
    if (elements.C1 <= 0) {
      errors.push('株価純資産倍率（C1）が無効です');
    }
    if (elements.D1 <= 0) {
      errors.push('配当利回り（D1）が無効です');
    }
    if (elements.B2 <= 0) {
      errors.push('株価収益率（B2）が無効です');
    }
    if (elements.C2 <= 0) {
      errors.push('株価純資産倍率（C2）が無効です');
    }
    if (elements.D2 <= 0) {
      errors.push('配当利回り（D2）が無効です');
    }

    // 統計情報のバリデーション
    if (data.statistics.sampleCount <= 0) {
      errors.push('サンプル数が無効です');
    }

    if (data.statistics.averageMarketCap <= 0) {
      errors.push('平均時価総額が無効です');
    }

    if (data.statistics.medianMarketCap <= 0) {
      errors.push('中央値時価総額が無効です');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async importFromFile(filePath: string, format: 'csv' | 'excel'): Promise<{success: boolean, imported: number, errors: string[]}> {
    // 実際の実装ではファイルを読み込んでデータをインポート
    console.log(`Importing data from ${filePath} (${format} format)`);
    
    // サンプル実装
    const imported = 10;
    const errors: string[] = [];
    
    return {
      success: errors.length === 0,
      imported,
      errors
    };
  }

  async exportToFile(query: NTADataQuery, format: 'csv' | 'excel', filePath: string): Promise<boolean> {
    // 実際の実装ではデータをエクスポート
    console.log(`Exporting data to ${filePath} (${format} format)`);
    
    const data = await this.getSimilarIndustryData(query);
    console.log(`Exported ${data.length} records`);
    
    return true;
  }

  // 追加のユーティリティメソッド
  async getLatestData(industryCode?: string): Promise<NTASimilarIndustryData | null> {
    const periods = await this.getAvailablePeriods();
    if (periods.length === 0) return null;

    const latest = periods[0];
    const query: NTADataQuery = {
      fiscalYear: latest.fiscalYear,
      quarter: latest.quarter,
      industryCode
    };

    const data = await this.getSimilarIndustryData(query);
    return data.length > 0 ? data[0] : null;
  }

  async searchByIndustryName(name: string): Promise<NTASimilarIndustryData[]> {
    return this.mockData.filter(d => 
      d.industryName.toLowerCase().includes(name.toLowerCase())
    );
  }

  async getIndustryTrend(industryCode: string, periods: number = 4): Promise<NTASimilarIndustryData[]> {
    const allData = this.mockData.filter(d => d.industryCode === industryCode);
    return allData
      .sort((a, b) => {
        if (a.fiscalYear !== b.fiscalYear) {
          return b.fiscalYear - a.fiscalYear;
        }
        return b.quarter - a.quarter;
      })
      .slice(0, periods);
  }
}

// シングルトンインスタンス
export const ntaDatabase = new NTADatabase();
