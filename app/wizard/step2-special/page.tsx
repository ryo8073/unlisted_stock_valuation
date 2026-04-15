"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormActions } from "@/components/FormCard";
import { PercentageInput } from "@/components/NumberInput";
import { SpecialCompanyBadge } from "@/components/RatioBadge";
import { useEvalStore } from "@/lib/store/evalStore";
import { Tooltip } from "@/components/Tooltip";

interface SpecialCompanyData {
  hasSpecialElements: boolean;
  landRatio: number;
  stockRatio: number;
  establishmentDate: string;
  businessStatus: string;
  isLiquidation: boolean;
  specialTypes: string[];
}

export default function Step2SpecialPage() {
  const router = useRouter();
  const { setSpecialCompanyData, specialCompanyData } = useEvalStore();
  // Note: companySizeData is not yet available at Step 2 (set in Step 3)
  // Land threshold defaults to 70% (large/medium). For small companies, the NTA
  // uses asset-level-based thresholds in 第2表, but that requires Step 3 data.
  const [data, setData] = useState<SpecialCompanyData>(
    specialCompanyData || {
      hasSpecialElements: false,
      landRatio: 0,
      stockRatio: 0,
      establishmentDate: "",
      businessStatus: "営業中",
      isLiquidation: false,
      specialTypes: [],
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (field: keyof SpecialCompanyData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const determineSpecialTypes = (): string[] => {
    const types: string[] = [];

    // 土地保有特定会社の判定
    // 大会社・中会社: 70%以上、小会社: 90%以上
    // ※会社規模はStep3で判定するため、ここでは70%を基準とする
    const landThreshold = 70;
    if (data.landRatio >= landThreshold) {
      types.push("landHolding");
    }

    // 株式等保有特定会社の判定
    if (data.stockRatio >= 50) {
      types.push("stockHolding");
    }

    // 開業後3年未満の判定（日付ベースで正確に計算）
    if (data.establishmentDate) {
      const establishment = new Date(data.establishmentDate);
      const now = new Date();
      const diffMs = now.getTime() - establishment.getTime();
      const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
      if (diffYears < 3) {
        types.push("newCompany");
      }
    }

    // 開業前・休業中の判定
    if (data.businessStatus === "開業前" || data.businessStatus === "休業中") {
      types.push("preOpening");
    }

    // 清算中の判定
    if (data.isLiquidation) {
      types.push("liquidation");
    }

    return types;
  };

  const isSpecialCompany = (): boolean => {
    return determineSpecialTypes().length > 0;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (data.hasSpecialElements) {
      if (data.landRatio > 100) {
        newErrors.landRatio = "土地保有比率は100%以下で入力してください";
      }
      if (data.stockRatio > 100) {
        newErrors.stockRatio = "株式等保有比率は100%以下で入力してください";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const specialTypes = determineSpecialTypes();
    const result = {
      ...data,
      specialTypes,
      isSpecialCompany: specialTypes.length > 0,
    };

    setSpecialCompanyData(result);
    router.push("/wizard/step3-size");
  };

  const handleBack = () => {
    router.push("/wizard/step1-shareholder");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <FormCard
        title="特定会社等の判定（第2表）"
        description="土地保有特定会社、株式等保有特定会社、開業後3年未満等の判定を行います。"
        step={2}
        totalSteps={5}
      >
        <FormSection title="特定会社等の判定">
        <div className="space-y-4">
            <label className="flex items-center">
            <input
                type="checkbox"
                checked={data.hasSpecialElements}
                onChange={(e) => updateData("hasSpecialElements", e.target.checked)}
                className="mr-2"
                data-testid="has-special-elements"
              />
              <span className="text-sm font-medium">特定会社等の判定を行う</span>
              <Tooltip text="会社が特定の条件に該当する場合、評価方法が異なることがあります。該当しないことが明らかな場合はチェックを外してください。" />
          </label>

            {data.hasSpecialElements && (
              <div className="space-y-6 pl-6 border-l-4 border-primary-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PercentageInput
                    label={
                      <div className="flex items-center">
                        土地保有比率
                        <Tooltip text="総資産に占める土地等の割合です。大会社・中会社は70%以上、小会社は90%以上で特定会社に該当します（会社規模は次のステップで判定）。" />
                      </div>
                    }
                    value={data.landRatio}
                    onChange={(value) => updateData("landRatio", value)}
                    placeholder="0.0"
                    error={errors.landRatio}
                    dataTestId="land-ratio"
                  />
                  <PercentageInput
                    label={
                      <div className="flex items-center">
                        株式等保有比率
                        <Tooltip text="総資産に占める株式等の割合です。50%以上で特定会社に該当します。" />
                      </div>
                    }
                    value={data.stockRatio}
                    onChange={(value) => updateData("stockRatio", value)}
                    placeholder="0.0"
                    error={errors.stockRatio}
                    dataTestId="stock-ratio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    設立年月日
                    <Tooltip text="開業後3年未満の会社は特定会社に該当します。" />
                  </label>
            <input
                    type="date"
                    value={data.establishmentDate}
                    onChange={(e) => updateData("establishmentDate", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    data-testid="establishment-date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    事業状況
                    <Tooltip text="開業前または休業中の会社は特定会社に該当します。" />
                  </label>
                  <select
                    value={data.businessStatus}
                    onChange={(e) => updateData("businessStatus", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    data-testid="business-status"
                  >
                    <option value="営業中">営業中</option>
                    <option value="開業前">開業前</option>
                    <option value="休業中">休業中</option>
                  </select>
                </div>

                <label className="flex items-center">
            <input
              type="checkbox"
                    checked={data.isLiquidation}
                    onChange={(e) => updateData("isLiquidation", e.target.checked)}
                    className="mr-2"
                    data-testid="is-liquidation"
                  />
                  <span className="text-sm">清算中である</span>
                  <Tooltip text="清算中の会社は特定会社に該当します。" />
          </label>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title="判定結果">
          <div className="bg-gray-50 p-4 rounded-lg">
            <SpecialCompanyBadge
              isSpecial={isSpecialCompany()}
              types={determineSpecialTypes()}
            />
            
            {isSpecialCompany() && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-900 mb-2">該当する特定会社等の類型</h4>
                <ul className="space-y-1 text-sm text-gray-600">
                  {determineSpecialTypes().map((type, index) => {
                    const typeNames: Record<string, string> = {
                      landHolding: "土地保有特定会社（土地保有比率70%以上）",
                      stockHolding: "株式等保有特定会社（株式等保有比率50%以上）",
                      newCompany: "開業後3年未満",
                      preOpening: "開業前・休業中",
                      liquidation: "清算中",
                    };
                    return (
                      <li key={index} className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        {typeNames[type]}
                      </li>
                    );
                  })}
                </ul>
            </div>
          )}
        </div>
        </FormSection>

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
            次へ（会社規模の判定）
          </button>
        </FormActions>
      </FormCard>
    </div>
  );
}
