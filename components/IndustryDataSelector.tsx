import React, { useState, useEffect } from 'react';
import { IndustryCategory, INDUSTRY_CATEGORIES } from '@/lib/database/schema';
import { industryDataDB } from '@/lib/database/industryData';

interface IndustryDataSelectorProps {
  onDataSelect: (data: any) => void;
  dataType: 'table4' | 'table5' | 'both';
}

export default function IndustryDataSelector({ onDataSelect, dataType }: IndustryDataSelectorProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryCategory>('製造業');
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(1);
  const [availablePeriods, setAvailablePeriods] = useState<{year: number, quarter: number}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedData, setSelectedData] = useState<any>(null);

  // 利用可能な期間を取得
  useEffect(() => {
    const loadAvailablePeriods = async () => {
      try {
        const periods = await industryDataDB.getAvailablePeriods(selectedIndustry);
        setAvailablePeriods(periods);
        
        // 最新の期間をデフォルトに設定
        if (periods.length > 0) {
          const latest = periods[0];
          setSelectedYear(latest.year);
          setSelectedQuarter(latest.quarter);
        }
      } catch (error) {
        console.error('Failed to load available periods:', error);
      }
    };

    loadAvailablePeriods();
  }, [selectedIndustry]);

  // データを取得
  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await industryDataDB.getIndustryData({
        industry: selectedIndustry,
        year: selectedYear,
        quarter: selectedQuarter,
        dataType
      });
      
      if (data.length > 0) {
        setSelectedData(data[0]);
        onDataSelect(data[0]);
      }
    } catch (error) {
      console.error('Failed to load industry data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedIndustry && selectedYear && selectedQuarter) {
      loadData();
    }
  }, [selectedIndustry, selectedYear, selectedQuarter]);

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          業種データ選択
        </h3>
        <p className="text-blue-700 text-sm">
          国税庁の業種別株価等調査に基づくデータを選択してください。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 業種選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            業種
          </label>
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value as IndustryCategory)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {INDUSTRY_CATEGORIES.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* 年選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            年
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {Array.from(new Set(availablePeriods.map(p => p.year)))
              .sort((a, b) => b - a)
              .map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
          </select>
        </div>

        {/* 四半期選択 */}
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
              .filter(p => p.year === selectedYear)
              .map((period) => (
                <option key={period.quarter} value={period.quarter}>
                  {period.quarter}Q
                </option>
              ))}
          </select>
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
                <div>業種: {selectedData.industry}</div>
                <div>期間: {selectedData.year}年 {selectedData.quarter}Q</div>
                <div>データソース: {selectedData.source}</div>
                <div>最終更新: {selectedData.lastUpdated.toLocaleDateString()}</div>
              </div>
            </div>

            {selectedData.table4Data && (
              <div>
                <h5 className="font-medium text-gray-700 mb-2">第4表データ</h5>
                <div className="space-y-1 text-sm">
                  <div>株価収益率: {selectedData.table4Data.B1}</div>
                  <div>株価純資産倍率: {selectedData.table4Data.C1}</div>
                  <div>配当利回り: {selectedData.table4Data.D1}%</div>
                  <div>サンプル数: {selectedData.table4Data.sampleCount}</div>
                  <div>信頼性: {selectedData.table4Data.reliability}</div>
                </div>
              </div>
            )}

            {selectedData.table5Data && (
              <div>
                <h5 className="font-medium text-gray-700 mb-2">第5表データ</h5>
                <div className="space-y-1 text-sm">
                  <div>1株当たり純資産価額: ¥{selectedData.table5Data.netAssetPerShare.toLocaleString()}</div>
                  <div>総資産: ¥{selectedData.table5Data.totalAssets.toLocaleString()}</div>
                  <div>総負債: ¥{selectedData.table5Data.totalLiabilities.toLocaleString()}</div>
                  <div>発行済株式総数: {selectedData.table5Data.totalShares.toLocaleString()}株</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* データが見つからない場合 */}
      {!selectedData && !isLoading && availablePeriods.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            選択された条件のデータが見つかりませんでした。他の期間を選択してください。
          </p>
        </div>
      )}
    </div>
  );
}
