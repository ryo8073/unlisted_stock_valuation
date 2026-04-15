"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormActions } from "@/components/FormCard";
import { CurrencyInput } from "@/components/NumberInput";
import { useEvalStore } from "@/lib/store/evalStore";
import { validators, getErrorMessage } from "@/lib/utils";
import { Tooltip } from "@/components/Tooltip";
import { similarIndustryDatabase, SimilarIndustryDataRow, SimilarIndustryDatabase } from "@/lib/database/similarIndustryData";

interface ValuationData {
  dividendPerShare: number;
  profitPerShare: number;
  netAssetPerShare: number;
  netAssetValue: number;
  dividendYield: number;
  capitalPerShare: number; // 1株当たりの資本金等の額（通達188-2条）
  finalValue: number;
  method: string;
  similarIndustryValue?: number;
  selectedIndustryData?: SimilarIndustryDataRow;
}

export default function Step4ValuationPage() {
  const router = useRouter();
  const { 
    setValuationData, 
    valuationData, 
    shareholderData, 
    companySizeData 
  } = useEvalStore();
  
  const [data, setData] = useState<ValuationData>(
    valuationData || {
      dividendPerShare: 0,
      profitPerShare: 0,
      netAssetPerShare: 0,
      netAssetValue: 0,
      dividendYield: 0.05,
      capitalPerShare: 50, // デフォルト50円（額面50円）
      finalValue: 0,
      method: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [selectedYear, setSelectedYear] = useState<string>('令和7年'); // Default to latest year
  const [selectedMajorCategory, setSelectedMajorCategory] = useState<string>('');
  const [selectedMediumCategory, setSelectedMediumCategory] = useState<string>('');
  const [selectedMinorCategory, setSelectedMinorCategory] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('1月'); // Default to January
  const [stockPriceSelectionRule, setStockPriceSelectionRule] = useState<'lowest3Months' | 'previousYearAverage' | 'last2YearsAverage'>('lowest3Months');
  const [selectedIndustryData, setSelectedIndustryData] = useState<SimilarIndustryDataRow | undefined>(undefined);

  // リアルタイム計算結果
  const [calculationResult, setCalculationResult] = useState<{
    finalValue: number;
    method: string;
    isValid: boolean;
  }>({
    finalValue: 0,
    method: "",
    isValid: false
  });

  const updateData = (field: keyof ValuationData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    // リアルタイム計算はuseEffect（line 290）で実行される
  };

  // Effect to update selectedIndustryData based on selections
  useEffect(() => {
    if (selectedYear && selectedMajorCategory && selectedMediumCategory && selectedMinorCategory) {
      const foundData = similarIndustryDatabase[selectedYear]?.find(
        (row) =>
          row.majorCategory === selectedMajorCategory &&
          row.mediumCategory === selectedMediumCategory &&
          row.minorCategory === selectedMinorCategory
      );
      setSelectedIndustryData(foundData);
    } else {
      setSelectedIndustryData(undefined);
    }
  }, [selectedYear, selectedMajorCategory, selectedMediumCategory, selectedMinorCategory]);

  // Derived state for dropdown options
  const years = Object.keys(similarIndustryDatabase);
  const majorCategories = selectedYear ? [...new Set(similarIndustryDatabase[selectedYear]?.map(row => row.majorCategory))] : [];
  const mediumCategories = selectedYear && selectedMajorCategory ? [...new Set(similarIndustryDatabase[selectedYear]?.filter(row => row.majorCategory === selectedMajorCategory).map(row => row.mediumCategory))] : [];
  const minorCategories = selectedYear && selectedMajorCategory && selectedMediumCategory ? [...new Set(similarIndustryDatabase[selectedYear]?.filter(row => row.majorCategory === selectedMajorCategory && row.mediumCategory === selectedMediumCategory).map(row => row.minorCategory))] : [];

  /**
   * 類似業種比準価額のA（株価）を選択する
   * 通達182条：課税時期の月、前月、前々月、前年平均、前々年平均のうち最も低い値
   * 現在のデータでは月次データがないため、年平均Aをベースに判定する
   */
  const getAValue = (
    year: string,
    _month: string,
    rule: 'lowest3Months' | 'previousYearAverage' | 'last2YearsAverage',
    industryData: SimilarIndustryDataRow,
    database: SimilarIndustryDatabase
  ): number => {
    const currentYearNumber = parseInt(year.replace('令和', '').replace('年', ''));

    const findData = (targetYear: string) =>
      database[targetYear]?.find(
        (row) =>
          row.majorCategory === industryData.majorCategory &&
          row.mediumCategory === industryData.mediumCategory &&
          row.minorCategory === industryData.minorCategory
      );

    if (rule === 'lowest3Months') {
      // 月次データがない場合は当年の年平均Aをフォールバック使用
      // TODO: monthlyAデータが追加されたら月次比較に対応
      return industryData.A || 0;
    } else if (rule === 'previousYearAverage') {
      const previousYearData = findData(`令和${currentYearNumber - 1}年`);
      return previousYearData ? previousYearData.A : 0;
    } else if (rule === 'last2YearsAverage') {
      const prev1 = findData(`令和${currentYearNumber - 1}年`);
      const prev2 = findData(`令和${currentYearNumber - 2}年`);
      const values: number[] = [];
      if (prev1) values.push(prev1.A);
      if (prev2) values.push(prev2.A);
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
    }
    return 0;
  };

  /**
   * 類似業種比準価額を計算する（しんしゃく率適用済み）
   * 通達180条: A × { (b/B' + c/C' + d/D') / 3 } × しんしゃく率
   * しんしゃく率: 大会社0.7、中会社0.6、小会社0.5
   */
  const calcSimilarIndustryValue = (sizeLabel: 'large' | 'medium' | 'small'): number => {
    if (!selectedIndustryData || data.dividendPerShare <= 0 || data.profitPerShare <= 0 || data.netAssetPerShare <= 0) {
      return 0;
    }
    const A = getAValue(selectedYear, selectedMonth, stockPriceSelectionRule, selectedIndustryData, similarIndustryDatabase);
    const bRatio = data.dividendPerShare / selectedIndustryData.B_prime;
    const cRatio = data.profitPerShare / selectedIndustryData.C_prime;
    const dRatio = data.netAssetPerShare / selectedIndustryData.D_prime;

    const discountRate = sizeLabel === 'large' ? 0.7 : sizeLabel === 'medium' ? 0.6 : 0.5;
    return A * ((bRatio + cRatio + dRatio) / 3) * discountRate;
  };

  const performRealTimeCalculation = () => {
    const { companySize, lRatio } = companySizeData || {};
    const { isMinorityShareholder } = shareholderData || {};

    // 少数株主特則の適用（配当還元方式）通達188-2条
    // 配当還元価額 = (年配当金額 ÷ 10%) × (1株当たりの資本金等の額 ÷ 50円)
    if (isMinorityShareholder && data.dividendPerShare > 0) {
      const adjustedDividend = Math.max(data.dividendPerShare, 2.5);
      const capitalFactor = (data.capitalPerShare || 50) / 50;
      const dividendYieldValue = (adjustedDividend / 0.10) * capitalFactor;
      setCalculationResult({
        finalValue: dividendYieldValue,
        method: "dividendYield",
        isValid: true
      });
      return;
    }

    const similarValue = calcSimilarIndustryValue(companySize || 'small');

    // 基本的なバリデーション
    const hasRequiredValues = similarValue > 0 && data.netAssetValue > 0;

    if (!hasRequiredValues || !companySize) {
      setCalculationResult({
        finalValue: 0,
        method: "",
        isValid: false
      });
      return;
    }

    // 会社規模別の評価方式
    switch (companySize) {
      case "large": {
        // 大会社: 類似業種比準価額と純資産価額の低い方
        const lowerValue = Math.min(similarValue, data.netAssetValue);
        setCalculationResult({
          finalValue: lowerValue,
          method: similarValue <= data.netAssetValue ? "similarIndustry" : "netAsset",
          isValid: true
        });
        break;
      }

      case "medium": {
        // 中会社: 類似業種比準価額×L + 純資産価額(80%相当額)×(1-L)
        // 80%相当額 = 純資産価額 × 0.8
        const na80 = data.netAssetValue * 0.8;
        const combinedValue = similarValue * (lRatio || 0) + na80 * (1 - (lRatio || 0));
        // 純資産価額（100%）との比較で低い方を採用
        const finalValue = Math.min(combinedValue, data.netAssetValue);
        setCalculationResult({
          finalValue,
          method: "combined",
          isValid: true
        });
        break;
      }

      case "small":
      default: {
        // 小会社: 原則は純資産価額
        // 併用方式（任意適用）: 類似業種比準価額×0.5 + 純資産価額×0.5
        const combinedSmall = similarValue * 0.5 + data.netAssetValue * 0.5;
        const smallFinal = Math.min(combinedSmall, data.netAssetValue);
        // 純資産価額が低い場合は純資産価額、併用方式が低い場合は併用方式
        setCalculationResult({
          finalValue: Math.min(data.netAssetValue, smallFinal),
          method: smallFinal < data.netAssetValue ? "smallCombined" : "netAsset",
          isValid: true
        });
        break;
      }
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validators.required(data.dividendPerShare)) {
      newErrors.dividendPerShare = getErrorMessage("1株当たり年配当", "required");
    }
    if (!validators.positive(data.dividendPerShare)) {
      newErrors.dividendPerShare = getErrorMessage("1株当たり年配当", "positive");
    }

    if (!validators.required(data.profitPerShare)) {
      newErrors.profitPerShare = getErrorMessage("1株当たり年利益", "required");
    }
    if (!validators.positive(data.profitPerShare)) {
      newErrors.profitPerShare = getErrorMessage("1株当たり年利益", "positive");
    }

    if (!validators.required(data.netAssetPerShare)) {
      newErrors.netAssetPerShare = getErrorMessage("1株当たり純資産価額", "required");
    }
    if (!validators.positive(data.netAssetPerShare)) {
      newErrors.netAssetPerShare = getErrorMessage("1株当たり純資産価額", "positive");
    }

    if (!selectedIndustryData) {
      newErrors.similarIndustryValue = getErrorMessage("類似業種比準価額のデータ", "required");
    }

    if (!validators.required(data.netAssetValue)) {
      newErrors.netAssetValue = getErrorMessage("純資産価額", "required");
    }
    if (!validators.positive(data.netAssetValue)) {
      newErrors.netAssetValue = getErrorMessage("純資産価額", "positive");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const similarValue = calcSimilarIndustryValue(companySizeData?.companySize || 'small');
    const finalData = {
      ...data,
      similarIndustryValue: similarValue,
      finalValue: calculationResult.finalValue,
      method: calculationResult.method,
      selectedIndustryData: selectedIndustryData
        ? { ...selectedIndustryData, year: selectedYear }
        : undefined,
    };
    setValuationData(finalData);
    router.push("/wizard/step5-result");
  };

  const handleBack = () => {
    router.push("/wizard/step3-size");
  };

  const { companySize, lRatio } = companySizeData || {};
  const { isMinorityShareholder } = shareholderData || {};

  // 初期化時にリアルタイム計算を実行
  useEffect(() => {
    performRealTimeCalculation();
  }, [data, companySize, lRatio, isMinorityShareholder, selectedIndustryData]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <FormCard
        title="評価方式・計算（第3表）"
        description="会社規模に応じた評価方式を選択し、最終的な株式価額を計算します。"
        step={4}
        totalSteps={5}
      >
        <FormSection title="基本数値（第4表・第5表）" required>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり年配当
                  <Tooltip text="会社の年間の配当金を株式数で割った値です。第4表で計算します。" />
                </div>
              }
              value={data.dividendPerShare}
              onChange={(value) => updateData("dividendPerShare", value)}
              placeholder="例: 50"
              min={0}
              error={errors.dividendPerShare}
              dataTestId="dividend-per-share"
            />
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり年利益
                  <Tooltip text="会社の年間の利益を株式数で割った値です。第4表で計算します。" />
                </div>
              }
              value={data.profitPerShare}
              onChange={(value) => updateData("profitPerShare", value)}
              placeholder="例: 100"
              min={0}
              error={errors.profitPerShare}
              dataTestId="profit-per-share"
            />
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり純資産価額
                  <Tooltip text="会社の純資産を株式数で割った値です。第5表で計算します。" />
                </div>
              }
              value={data.netAssetPerShare}
              onChange={(value) => updateData("netAssetPerShare", value)}
              placeholder="例: 800"
              min={0}
              error={errors.netAssetPerShare}
              dataTestId="net-asset-per-share"
            />
      </div>
        </FormSection>

        <FormSection title="評価価額" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                評価年
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setSelectedMajorCategory('');
                  setSelectedMediumCategory('');
                  setSelectedMinorCategory('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                評価月
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => `${i + 1}月`).map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                大分類
              </label>
              <select
                value={selectedMajorCategory}
                onChange={(e) => {
                  setSelectedMajorCategory(e.target.value);
                  setSelectedMediumCategory('');
                  setSelectedMinorCategory('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {majorCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                中分類
              </label>
              <select
                value={selectedMediumCategory}
                onChange={(e) => {
                  setSelectedMediumCategory(e.target.value);
                  setSelectedMinorCategory('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {mediumCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                小分類
              </label>
              <select
                value={selectedMinorCategory}
                onChange={(e) => setSelectedMinorCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {minorCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                株価選択ルール
              </label>
              <div className="flex flex-col space-y-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="stockPriceSelectionRule"
                    value="lowest3Months"
                    checked={stockPriceSelectionRule === 'lowest3Months'}
                    onChange={(e) => setStockPriceSelectionRule(e.target.value as any)}
                  />
                  <span className="ml-2 text-sm text-gray-700">直前3か月のうち最低</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="stockPriceSelectionRule"
                    value="previousYearAverage"
                    checked={stockPriceSelectionRule === 'previousYearAverage'}
                    onChange={(e) => setStockPriceSelectionRule(e.target.value as any)}
                  />
                  <span className="ml-2 text-sm text-gray-700">前年平均</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="stockPriceSelectionRule"
                    value="last2YearsAverage"
                    checked={stockPriceSelectionRule === 'last2YearsAverage'}
                    onChange={(e) => setStockPriceSelectionRule(e.target.value as any)}
                  />
                  <span className="ml-2 text-sm text-gray-700">直前2年平均</span>
                </label>
              </div>
            </div>

            {selectedIndustryData && (
              <div className="md:col-span-2 bg-gray-100 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">選択された業種データ</h4>
                <p className="text-sm text-gray-700">A (年平均株価): {selectedIndustryData.A}</p>
                <p className="text-sm text-gray-700">B&apos; (配当): {selectedIndustryData.B_prime}</p>
                <p className="text-sm text-gray-700">C&apos; (利益): {selectedIndustryData.C_prime}</p>
                <p className="text-sm text-gray-700">D&apos; (純資産): {selectedIndustryData.D_prime}</p>
                {selectedIndustryData.monthlyA && (
                  <div className="mt-2">
                    <h5 className="font-medium text-gray-800">月次株価 (A)</h5>
                    <div className="grid grid-cols-4 gap-1 text-xs text-gray-600">
                      {Object.entries(selectedIndustryData.monthlyA).map(([month, value]) => (
                        <span key={month}>{month}: {value}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <CurrencyInput
              label={
                <div className="flex items-center">
                  純資産価額（1株当たり）
                  <Tooltip text="相続税評価額ベースの純資産価額です。法人税額等相当額（37%）を控除した後の金額を入力してください。算式: (相続税評価額による総資産 - 負債 - 法人税額等相当額) ÷ 発行済株式数" />
                </div>
              }
              value={data.netAssetValue}
              onChange={(value) => updateData("netAssetValue", value)}
              placeholder="例: 800"
              min={0}
              error={errors.netAssetValue}
              dataTestId="net-asset-value"
            />
            <div className="md:col-span-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-700 mb-1">純資産価額の算定について（通達185条）</p>
              <p>法人税額等相当額 = (相続税評価額による純資産 - 帳簿価額による純資産) × 37%</p>
              <p>1株当たり純資産価額 = (相続税評価額による総資産 - 負債合計 - 法人税額等相当額) ÷ 発行済株式数</p>
            </div>
          </div>
        </FormSection>

        {isMinorityShareholder && (
          <FormSection title="少数株主特則（配当還元方式）">
            <div className="bg-blue-50 p-4 rounded-lg space-y-3">
              <p className="text-sm text-blue-800">
                少数株主（5%未満）のため、配当還元方式が適用されます。
              </p>
              <p className="text-xs text-blue-700">
                計算式: (年配当金額（下限2円50銭）÷ 10%) × (1株当たり資本金等の額 ÷ 50円)
              </p>
              <div className="mt-2">
                <CurrencyInput
                  label={
                    <div className="flex items-center">
                      1株当たりの資本金等の額
                      <Tooltip text="直前期末の資本金等の額 ÷ 発行済株式数で計算します。額面50円の場合は50円です。" />
                    </div>
                  }
                  value={data.capitalPerShare}
                  onChange={(value) => updateData("capitalPerShare", value)}
                  placeholder="例: 50"
                  min={0}
                  dataTestId="capital-per-share"
                />
              </div>
              <p className="text-xs text-blue-600">
                ※ 通達188-2条により還元率は10%（固定）です。資本金等の額が50円でない場合は調整が行われます。
              </p>
            </div>
          </FormSection>
        )}

        <FormSection title="評価方式">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2 text-sm">
              {companySize === "large" && (
                <div>
                  <p className="font-medium">大会社: 類似業種比準価額と純資産価額の低い方を採用</p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;) / 3) × 0.7（しんしゃく率）
                  </p>
                  <p className="text-xs text-gray-600">
                    評価式: min(類似業種比準価額, 純資産価額)
                  </p>
                </div>
              )}
              {companySize === "medium" && (
                <div>
                  <p className="font-medium">中会社{companySizeData?.lClass ? `（${companySizeData.lClass}）` : ''}: 併用方式（L = {lRatio}）</p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;) / 3) × 0.6（しんしゃく率）
                  </p>
                  <p className="text-xs text-gray-600">
                    評価式: min(類似業種比準価額 × {lRatio} + 純資産価額(80%相当額) × (1 - {lRatio}), 純資産価額)
                  </p>
                </div>
              )}
              {companySize === "small" && (
                <div>
                  <p className="font-medium">小会社: 純資産価額方式（併用方式の任意適用あり）</p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;) / 3) × 0.5（しんしゃく率）
                  </p>
                  <p className="text-xs text-gray-600">
                    原則: 純資産価額 / 併用: min(類似業種比準 × 0.5 + 純資産 × 0.5, 純資産価額)
                  </p>
                </div>
              )}
              {isMinorityShareholder && (
                <div>
                  <p className="font-medium text-blue-600">少数株主特則: 配当還元方式</p>
                  <p className="text-xs text-gray-600">
                    評価式: (年配当金額（下限2円50銭） ÷ 10%) × (1株当たり資本金等の額 ÷ 50円)
                  </p>
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {calculationResult.isValid && calculationResult.finalValue > 0 && (
          <FormSection title="リアルタイム計算結果">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-green-900">最終評価額</h4>
                  <p className="text-sm text-green-700">
                    評価方式: {calculationResult.method === "dividendYield" ? "配当還元方式" :
                              calculationResult.method === "similarIndustry" ? "類似業種比準価額方式" :
                              calculationResult.method === "netAsset" ? "純資産価額方式" :
                              calculationResult.method === "smallCombined" ? "併用方式（小会社任意適用）" : "併用方式"}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ※ 入力値を変更すると自動的に再計算されます
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-900">
                    {new Intl.NumberFormat('ja-JP').format(calculationResult.finalValue)}円
                  </div>
                  <div className="text-sm text-green-700">1株当たり</div>
                </div>
              </div>
            </div>
          </FormSection>
        )}

        {!calculationResult.isValid && (data.dividendPerShare > 0 || data.profitPerShare > 0 || data.netAssetPerShare > 0 || (data.similarIndustryValue ?? 0) > 0 || data.netAssetValue > 0) && (
          <FormSection title="計算結果">
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm text-yellow-800">
                    すべての必須項目を入力すると、リアルタイムで計算結果が表示されます。
                  </p>
                </div>
              </div>
            </div>
          </FormSection>
        )}

        <FormActions>
          <button
            onClick={handleBack}
            className="btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <button
            onClick={handleNext}
            className="btn-primary"
            data-testid="next-step"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            次へ（結果確認）
          </button>
        </FormActions>
      </FormCard>
    </div>
  );
}
