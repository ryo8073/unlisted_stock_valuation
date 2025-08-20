import React, { useState, useEffect } from 'react';
import { ntaDatabase } from '@/lib/database/ntaDatabase';
import { NTASimilarIndustryData, IndustryMaster } from '@/lib/database/ntaDataSchema';

interface NTADataSelectorProps {
  onDataSelect: (data: NTASimilarIndustryData) => void;
  selectedData?: NTASimilarIndustryData;
}

export default function NTADataSelector({ onDataSelect, selectedData }: NTADataSelectorProps) {
  const [availablePeriods, setAvailablePeriods] = useState<{fiscalYear: number, quarter: number}[]>([]);
  const [industryMaster, setIndustryMaster] = useState<IndustryMaster[]>([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(2024);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [selectedIndustryCode, setSelectedIndustryCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredIndustries, setFilteredIndustries] = useState<IndustryMaster[]>([]);

  // 初期データ読み込み
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [periods, master] = await Promise.all([
          ntaDatabase.getAvailablePeriods(),
          ntaDatabase.getIndustryMaster()
        ]);

        setAvailablePeriods(periods);
        setIndustryMaster(master);
        setFilteredIndustries(master);

        // 最新の期間をデフォルトに設定
        if (periods.length > 0) {
          const latest = periods[0];
          setSelectedFiscalYear(latest.fiscalYear);
          setSelectedQuarter(latest.quarter);
        }

        // 選択されたデータがある場合は設定
        if (selectedData) {
          setSelectedFiscalYear(selectedData.fiscalYear);
          setSelectedQuarter(selectedData.quarter);
          setSelectedIndustryCode(selectedData.industryCode);
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
      }
    };

    loadInitialData();
  }, [selectedData]);

  // 業種検索フィルタリング
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredIndustries(industryMaster);
    } else {
      const filtered = industryMaster.filter(industry =>
        industry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        industry.code.includes(searchTerm)
      );
      setFilteredIndustries(filtered);
    }
  }, [searchTerm, industryMaster]);

  // データ選択時の処理
  const handleIndustrySelect = async (industryCode: string) => {
    setSelectedIndustryCode(industryCode);
    setIsLoading(true);

    try {
      const data = await ntaDatabase.getSimilarIndustryData({
        fiscalYear: selectedFiscalYear,
        quarter: selectedQuarter,
        industryCode
      });

      if (data.length > 0) {
        onDataSelect(data[0]);
      }
    } catch (error) {
      console.error('Failed to load industry data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 期間変更時の処理
  const handlePeriodChange = async () => {
    if (selectedIndustryCode) {
      await handleIndustrySelect(selectedIndustryCode);
    }
  };

  useEffect(() => {
    handlePeriodChange();
  }, [selectedFiscalYear, selectedQuarter]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          国税庁類似業種比準価額データ選択
        </h3>
        <p className="text-blue-700 text-sm">
          国税庁が公表する業種別株価等調査に基づく類似業種比準価額の算定要素を選択してください。
        </p>
        <div className="mt-2 text-xs text-blue-600">
          データソース: <a href="https://www.nta.go.jp/law/tsutatsu/kobetsu/hyoka/r06/2406/index.htm" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline hover:text-blue-800">
            国税庁 令和6年度分 業種別株価等調査
          </a>
        </div>
      </div>

      {/* 期間選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            年度
          </label>
          <select
            value={selectedFiscalYear}
            onChange={(e) => setSelectedFiscalYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from(new Set(availablePeriods.map(p => p.fiscalYear)))
              .sort((a, b) => b - a)
              .map((year) => (
                <option key={year} value={year}>
                  {year}年度
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            四半期
          </label>
          <select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {availablePeriods
              .filter(p => p.fiscalYear === selectedFiscalYear)
              .map((period) => (
                <option key={period.quarter} value={period.quarter}>
                  {period.quarter}Q
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 業種検索 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          業種検索
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="業種名またはコードで検索..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* 業種選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          業種選択
        </label>
        <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md">
          {filteredIndustries.map((industry) => (
            <button
              key={industry.code}
              onClick={() => handleIndustrySelect(industry.code)}
              className={`w-full text-left px-4 py-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                selectedIndustryCode === industry.code ? 'bg-primary-50 border-primary-200' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-gray-900">{industry.name}</div>
                  <div className="text-sm text-gray-500">
                    {industry.code} - {industry.category}
                  </div>
                  {industry.description && (
                    <div className="text-xs text-gray-400 mt-1">{industry.description}</div>
                  )}
                </div>
                {selectedIndustryCode === industry.code && (
                  <div className="text-primary-600">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ローディング表示 */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">データを読み込み中...</span>
        </div>
      )}

      {/* 選択されたデータの表示 */}
      {selectedData && !isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-800 mb-3">選択されたデータ</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-gray-700 mb-2">基本情報</h5>
              <div className="space-y-1 text-sm">
                <div>業種: {selectedData.industryName}</div>
                <div>業種コード: {selectedData.industryCode}</div>
                <div>分類: {selectedData.industryCategory}</div>
                <div>期間: {selectedData.fiscalYear}年度 {selectedData.quarter}Q</div>
                <div>データソース: {selectedData.source}</div>
                <div>公表日: {selectedData.publicationDate.toLocaleDateString()}</div>
                <div>バージョン: {selectedData.version}</div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-2">第4表算定要素</h5>
              <div className="space-y-1 text-sm">
                <div>株価収益率（1年目）: {selectedData.table4Elements.B1}</div>
                <div>株価純資産倍率（1年目）: {selectedData.table4Elements.C1}</div>
                <div>配当利回り（1年目）: {selectedData.table4Elements.D1}%</div>
                <div>株価収益率（2年目）: {selectedData.table4Elements.B2}</div>
                <div>株価純資産倍率（2年目）: {selectedData.table4Elements.C2}</div>
                <div>配当利回り（2年目）: {selectedData.table4Elements.D2}%</div>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-gray-700 mb-2">統計情報</h5>
              <div className="space-y-1 text-sm">
                <div>サンプル数: {selectedData.statistics.sampleCount}</div>
                <div>平均時価総額: ¥{selectedData.statistics.averageMarketCap.toLocaleString()}</div>
                <div>中央値時価総額: ¥{selectedData.statistics.medianMarketCap.toLocaleString()}</div>
                <div>信頼性: {selectedData.statistics.reliability}</div>
              </div>
            </div>

            {selectedData.notes && (
              <div>
                <h5 className="font-medium text-gray-700 mb-2">備考</h5>
                <div className="text-sm text-gray-600">{selectedData.notes}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* データが見つからない場合 */}
      {!selectedData && !isLoading && selectedIndustryCode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            選択された条件のデータが見つかりませんでした。他の期間または業種を選択してください。
          </p>
        </div>
      )}
    </div>
  );
}
