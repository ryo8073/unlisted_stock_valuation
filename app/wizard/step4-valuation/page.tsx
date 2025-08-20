"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormActions } from "@/components/FormCard";
import { NumberInput, CurrencyInput } from "@/components/NumberInput";
import { useEvalStore } from "@/lib/store/evalStore";
import { validators, getErrorMessage } from "@/lib/utils";

interface ValuationData {
  dividendPerShare: number;
  profitPerShare: number;
  netAssetPerShare: number;
  similarIndustryValue: number;
  netAssetValue: number;
  dividendYield: number;
  finalValue: number;
  method: string;
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
      similarIndustryValue: 0,
      netAssetValue: 0,
      dividendYield: 0.05, // デフォルト5%
      finalValue: 0,
      method: "",
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    // リアルタイムで計算を実行
    setTimeout(() => performRealTimeCalculation(), 0);
  };

  const performRealTimeCalculation = () => {
    const { companySize, lRatio } = companySizeData || {};
    const { isMinorityShareholder } = shareholderData || {};

    // 基本的なバリデーション
    const hasRequiredValues = data.dividendPerShare > 0 && 
                             data.profitPerShare > 0 && 
                             data.netAssetPerShare > 0 && 
                             data.similarIndustryValue > 0 && 
                             data.netAssetValue > 0;

    if (!hasRequiredValues || !companySize) {
      setCalculationResult({
        finalValue: 0,
        method: "",
        isValid: false
      });
      return;
    }

    // 少数株主特則の適用
    if (isMinorityShareholder && data.dividendYield > 0) {
      const dividendYieldValue = data.dividendPerShare / data.dividendYield;
      setCalculationResult({
        finalValue: dividendYieldValue,
        method: "dividendYield",
        isValid: true
      });
      return;
    }

    // 会社規模別の評価方式
    switch (companySize) {
      case "large":
        // 大会社: 類似業種比準価額と純資産価額の低い方
        const lowerValue = Math.min(data.similarIndustryValue, data.netAssetValue);
        setCalculationResult({
          finalValue: lowerValue,
          method: data.similarIndustryValue <= data.netAssetValue ? "similarIndustry" : "netAsset",
          isValid: true
        });
        break;

      case "medium":
        // 中会社: L×類似業種比準価額 + (1-L)×純資産価額
        const combinedValue = data.similarIndustryValue * (lRatio || 0) + data.netAssetValue * (1 - (lRatio || 0));
        const finalValue = Math.min(combinedValue, data.netAssetValue);
        setCalculationResult({
          finalValue,
          method: "combined",
          isValid: true
        });
        break;

      case "small":
      default:
        // 小会社: 純資産価額
        setCalculationResult({
          finalValue: data.netAssetValue,
          method: "netAsset",
          isValid: true
        });
        break;
    }
  };

  const calculateValuation = () => {
    const { companySize, lRatio } = companySizeData || {};
    const { isMinorityShareholder } = shareholderData || {};

    // 少数株主特則の適用
    if (isMinorityShareholder) {
      const dividendYieldValue = data.dividendPerShare / data.dividendYield;
      return {
        finalValue: dividendYieldValue,
        method: "dividendYield",
      };
    }

    // 会社規模別の評価方式
    switch (companySize) {
      case "large":
        // 大会社: 類似業種比準価額と純資産価額の低い方
        const lowerValue = Math.min(data.similarIndustryValue, data.netAssetValue);
        return {
          finalValue: lowerValue,
          method: data.similarIndustryValue <= data.netAssetValue ? "similarIndustry" : "netAsset",
        };

      case "medium":
        // 中会社: L×類似業種比準価額 + (1-L)×純資産価額
        const combinedValue = data.similarIndustryValue * (lRatio || 0) + data.netAssetValue * (1 - (lRatio || 0));
        
        // 80%相当額の上限チェック
        const eightyPercentValue = data.netAssetValue * 0.8;
        const finalValue = Math.min(combinedValue, eightyPercentValue);
        
        return {
          finalValue,
          method: "combined",
        };

      case "small":
      default:
        // 小会社: 純資産価額
        return {
          finalValue: data.netAssetValue,
          method: "netAsset",
        };
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

    if (!validators.required(data.similarIndustryValue)) {
      newErrors.similarIndustryValue = getErrorMessage("類似業種比準価額", "required");
    }
    if (!validators.positive(data.similarIndustryValue)) {
      newErrors.similarIndustryValue = getErrorMessage("類似業種比準価額", "positive");
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

  const handleCalculate = () => {
    if (!validateForm()) return;
    performRealTimeCalculation();
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const finalData = { 
      ...data, 
      finalValue: calculationResult.finalValue,
      method: calculationResult.method
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
  }, [data, companySize, lRatio, isMinorityShareholder]);

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
              label="1株当たり年配当"
              value={data.dividendPerShare}
              onChange={(value) => updateData("dividendPerShare", value)}
              placeholder="例: 50"
              min={0}
              error={errors.dividendPerShare}
              dataTestId="dividend-per-share"
            />
            <CurrencyInput
              label="1株当たり年利益"
              value={data.profitPerShare}
              onChange={(value) => updateData("profitPerShare", value)}
              placeholder="例: 100"
              min={0}
              error={errors.profitPerShare}
              dataTestId="profit-per-share"
            />
            <CurrencyInput
              label="1株当たり純資産価額"
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
            <CurrencyInput
              label="類似業種比準価額"
              value={data.similarIndustryValue}
              onChange={(value) => updateData("similarIndustryValue", value)}
              placeholder="例: 1000"
              min={0}
              error={errors.similarIndustryValue}
              dataTestId="similar-industry-value"
            />
            <CurrencyInput
              label="純資産価額"
              value={data.netAssetValue}
              onChange={(value) => updateData("netAssetValue", value)}
              placeholder="例: 800"
              min={0}
              error={errors.netAssetValue}
              dataTestId="net-asset-value"
            />
          </div>
        </FormSection>

        {isMinorityShareholder && (
          <FormSection title="少数株主特則">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                少数株主（5%未満）のため、配当還元方式が適用されます。
              </p>
              <NumberInput
                label="配当利回り"
                value={data.dividendYield}
                onChange={(value) => updateData("dividendYield", value)}
                placeholder="0.05"
                min={0.01}
                max={1}
                step={0.01}
                error={errors.dividendYield}
                dataTestId="dividend-yield"
              />
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
                    評価式: min(類似業種比準価額, 純資産価額)
                  </p>
                </div>
              )}
              {companySize === "medium" && (
                <div>
                  <p className="font-medium">中会社{companySizeData?.lClass ? `（${companySizeData.lClass}）` : ''}: 併用方式（L = {lRatio}）</p>
                  <p className="text-xs text-gray-600">
                    評価式: min(類似業種比準価額 × {lRatio} + 純資産価額 × (1 - {lRatio}), 純資産価額)
                  </p>
          </div>
        )}
              {companySize === "small" && (
                <div>
                  <p className="font-medium">小会社: 純資産価額方式</p>
                  <p className="text-xs text-gray-600">
                    評価式: 純資産価額
                  </p>
      </div>
              )}
              {isMinorityShareholder && (
                <div>
                  <p className="font-medium text-blue-600">少数株主特則: 配当還元方式</p>
                  <p className="text-xs text-gray-600">
                    評価式: 年配当 ÷ 配当利回り
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
                              calculationResult.method === "netAsset" ? "純資産価額方式" : "併用方式"}
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

        {!calculationResult.isValid && (data.dividendPerShare > 0 || data.profitPerShare > 0 || data.netAssetPerShare > 0 || data.similarIndustryValue > 0 || data.netAssetValue > 0) && (
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
