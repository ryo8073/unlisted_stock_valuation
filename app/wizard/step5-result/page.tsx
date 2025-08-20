"use client";
import { useRouter } from "next/navigation";
import { FormCard, FormSection } from "@/components/FormCard";
import { DecisionTrail, DecisionTrailSummary } from "@/components/DecisionTrail";
import { useEvalStore } from "@/lib/store/evalStore";
import { formatCurrency } from "@/lib/utils";

export default function Step5ResultPage() {
  const router = useRouter();
  const { 
    shareholderData, 
    specialCompanyData, 
    companySizeData, 
    valuationData 
  } = useEvalStore();

  const handleBack = () => {
    router.push("/wizard/step4-valuation");
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shareholderData,
          specialCompanyData,
          companySizeData,
          valuationData,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "株式評価結果.pdf";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("PDF出力エラー:", error);
    }
  };

  const handleNewEvaluation = () => {
    router.push("/wizard/step1-shareholder");
  };

  if (!valuationData?.finalValue) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            評価データが見つかりません
          </h2>
          <p className="text-gray-600 mb-6">
            先ほどのステップで評価を完了してください。
          </p>
          <button
            onClick={() => router.push("/wizard/step1-shareholder")}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
          >
            評価を開始する
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <FormCard
        title="評価結果"
        description="株式評価の最終結果と決定経路を確認できます。"
        step={5}
        totalSteps={5}
      >
        <FormSection title="最終評価額">
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <div className="text-center">
              <h3 className="text-lg font-medium text-green-900 mb-2">
                1株当たり評価額
              </h3>
              <div className="text-4xl font-bold text-green-900 mb-2">
                {formatCurrency(valuationData.finalValue)}
              </div>
              <p className="text-sm text-green-700">
                評価方式: {
                  valuationData.method === "dividendYield" ? "配当還元方式" :
                  valuationData.method === "similarIndustry" ? "類似業種比準価額方式" :
                  valuationData.method === "netAsset" ? "純資産価額方式" : "併用方式"
                }
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection title="評価詳細">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">類似業種比準価額</h4>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(valuationData.similarIndustryValue)}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">純資産価額</h4>
              <div className="text-xl font-bold text-purple-900">
                {formatCurrency(valuationData.netAssetValue)}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="基本数値">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">1株当たり年配当</h4>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(valuationData.dividendPerShare)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">1株当たり年利益</h4>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(valuationData.profitPerShare)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">1株当たり純資産価額</h4>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(valuationData.netAssetPerShare)}
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="判定結果サマリー">
          <div className="space-y-4">
            {shareholderData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">株主判定（第1表の1）</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">同族関係者グループ比率: </span>
                    <span className="font-semibold">{(shareholderData.familyGroupRatio * 100).toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">筆頭株主グループ比率: </span>
                    <span className="font-semibold">{(shareholderData.leadingShareholderGroupRatio * 100).toFixed(1)}%</span>
                  </div>
                  {shareholderData.isMinorityShareholder && (
                    <div className="md:col-span-2">
                      <span className="text-blue-600 font-medium">少数株主特則が適用されます</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {specialCompanyData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">特定会社等の判定（第2表）</h4>
                <div className="text-sm">
                  {specialCompanyData.isSpecialCompany ? (
                    <div>
                      <span className="text-red-600 font-medium">特定会社等に該当</span>
                      <div className="mt-1 text-gray-600">
                        該当類型: {specialCompanyData.specialTypes.join(", ")}
                      </div>
                    </div>
                  ) : (
                    <span className="text-green-600 font-medium">特定会社等に該当しません</span>
                  )}
                </div>
              </div>
            )}

            {companySizeData && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">会社規模の判定（第1表の2）</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">会社規模: </span>
                    <span className="font-semibold">
                      {companySizeData.companySize === "large" ? "大会社" :
                       companySizeData.companySize === "medium" ? `中会社${companySizeData.lClass ? `（${companySizeData.lClass}）` : ''}` : "小会社"}
                    </span>
                  </div>
                  {companySizeData.lRatio > 0 && (
                    <div>
                      <span className="text-gray-600">L値: </span>
                      <span className="font-semibold">{companySizeData.lRatio}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        <div className="flex items-center justify-between pt-8 border-t border-gray-200/50">
          <button
            onClick={handleBack}
            className="btn-secondary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleExportPDF}
              className="btn-success"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF出力
            </button>
            <button
              onClick={handleNewEvaluation}
              className="btn-primary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              新しい評価を開始
            </button>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
