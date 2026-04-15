"use client";
import { useRouter } from "next/navigation";
import { FormCard, FormSection } from "@/components/FormCard";
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

  const { resetAll } = useEvalStore();

  const handleNewEvaluation = () => {
    resetAll();
    router.push("/wizard/step1-shareholder");
  };

  const getMethodDescription = (method: string) => {
    switch (method) {
      case "dividendYield": return { name: "配当還元方式", ref: "通達188-2条", detail: "年配当金額（下限2円50銭）÷ 10%" };
      case "similarIndustry": return { name: "類似業種比準価額方式", ref: "通達180条", detail: "A × ((b/B' + c/C' + d/D') / 3) × しんしゃく率" };
      case "netAsset": return { name: "純資産価額方式", ref: "通達185条", detail: "1株当たり純資産価額（相続税評価額）" };
      case "smallCombined": return { name: "併用方式（小会社任意適用）", ref: "通達179条(3)", detail: "類似業種比準 × 0.5 + 純資産 × 0.5" };
      case "combined": return { name: "併用方式", ref: "通達179条(2)", detail: "類似業種比準 × L + 純資産(80%相当額) × (1-L)" };
      default: return { name: method, ref: "", detail: "" };
    }
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
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
            <div className="text-center">
              <h3 className="text-lg font-medium text-green-900 mb-2">
                1株当たり評価額
              </h3>
              <div className="text-4xl sm:text-5xl font-bold text-green-900 mb-3">
                {formatCurrency(valuationData.finalValue)}
              </div>
              <div className="inline-flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-green-800">
                  {getMethodDescription(valuationData.method).name}
                </span>
                {getMethodDescription(valuationData.method).ref && (
                  <span className="text-xs text-green-600 bg-green-200 px-2 py-0.5 rounded-full">
                    {getMethodDescription(valuationData.method).ref}
                  </span>
                )}
              </div>
              {getMethodDescription(valuationData.method).detail && (
                <p className="text-xs text-green-600 mt-2">
                  {getMethodDescription(valuationData.method).detail}
                </p>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="評価詳細">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {valuationData.selectedIndustryData && (
              <div className="bg-blue-50 p-4 rounded-lg md:col-span-2">
                <h4 className="font-medium text-blue-900 mb-2">類似業種比準価額データ</h4>
                <p className="text-sm text-blue-700">評価年: {valuationData.selectedIndustryData.year}</p>
                <p className="text-sm text-blue-700">大分類: {valuationData.selectedIndustryData.majorCategory}</p>
                <p className="text-sm text-blue-700">中分類: {valuationData.selectedIndustryData.mediumCategory}</p>
                <p className="text-sm text-blue-700">小分類: {valuationData.selectedIndustryData.minorCategory}</p>
                <p className="text-sm text-blue-700">A (株価): {valuationData.selectedIndustryData.A}</p>
                <p className="text-sm text-blue-700">B&apos; (配当): {valuationData.selectedIndustryData.B_prime}</p>
                <p className="text-sm text-blue-700">C&apos; (利益): {valuationData.selectedIndustryData.C_prime}</p>
                <p className="text-sm text-blue-700">D&apos; (純資産): {valuationData.selectedIndustryData.D_prime}</p>
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">類似業種比準価額</h4>
              <div className="text-xl font-bold text-blue-900">
                {formatCurrency(valuationData.similarIndustryValue ?? 0)}
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

            {specialCompanyData ? (
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
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">特定会社等の判定（第2表）</h4>
                <div className="text-sm text-gray-600">
                  特定会社等の判定はスキップされました。
                </div>
              </div>
            )}

            {companySizeData ? (
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
            ) : (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">会社規模の判定（第1表の2）</h4>
                <div className="text-sm text-gray-600">
                  会社規模の判定はスキップされました。
                </div>
              </div>
            )}
          </div>
        </FormSection>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
          <p className="font-semibold text-amber-800 mb-1">免責事項</p>
          <p>本計算結果は財産評価基本通達に基づく概算値です。正式な税務申告にはご利用いただけません。実際の評価には税理士等の専門家にご相談ください。</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8 border-t border-gray-200/50">
          <button
            onClick={handleBack}
            className="btn-secondary w-full sm:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            戻る
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportPDF}
              className="btn-success w-full sm:w-auto justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              PDF出力
            </button>
            <button
              onClick={handleNewEvaluation}
              className="btn-primary w-full sm:w-auto justify-center"
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
