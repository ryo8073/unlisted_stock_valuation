"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormActions } from "@/components/FormCard";
import { NumberInput, CurrencyInput } from "@/components/NumberInput";
import { CompanySizeBadge } from "@/components/RatioBadge";
import { useEvalStore } from "@/lib/store/evalStore";
import { validators, getErrorMessage } from "@/lib/utils";
import { Tooltip } from "@/components/Tooltip";

interface CompanySizeData {
  employees: number;
  assets: number;
  sales: number;
  industry: string;
  companySize: 'large' | 'medium' | 'small';
  lClass?: string;
  lRatio: number;
}

export default function Step3SizePage() {
  const router = useRouter();
  const { setCompanySizeData, companySizeData } = useEvalStore();
  const [data, setData] = useState<CompanySizeData>(
    companySizeData || {
      employees: 0,
      assets: 0,
      sales: 0,
      industry: "サービス",
      companySize: "small",
      lRatio: 0,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateData = (field: keyof CompanySizeData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // 会社規模バンドとLの決定（エンジンの閾値に準拠）
  const determineBandAndL = (): { size: 'large'|'medium'|'small'; lClass: '大会社'|'中の大'|'中の中'|'中の小'|'小会社'; l: number } => {
    // FTE換算（第1表の2）
    const fte = data.employees; // Step3画面は簡易入力のためパートタイム時間未対応
    // 大会社即判定
    if (fte >= 70) return { size: 'large', lClass: '大会社', l: 1.0 };

    // 業種の文言をエンジン側に寄せる
    const industry = data.industry === '卸売' ? '卸売業'
                     : data.industry === '小売・サービス' ? '小売・サービス業'
                     : '卸売・小売・サービス以外';

    // 従業員バンド（rules/t1-2_size.json準拠）
    const empBands = [
      { label: '大会社' as const, min: 70 },
      { label: '中の大' as const, min: 36, max: 69 },
      { label: '中の中' as const, min: 21, max: 35 },
      { label: '中の小' as const, min: 6, max: 20 },
      { label: '小会社' as const, max: 5 },
    ];
    const empBand = empBands.find(b => (b.min == null || fte >= b.min) && (b.max == null || fte <= b.max))?.label || '小会社';

    // 資産・売上の業種別しきい値（rules/t1-2_size.json に合わせる）
    const assetThresholds: Record<string, Array<{label: any; min?: number; max?: number}>> = {
      '卸売業': [
        { label: '小会社', max: 70000000 },
        { label: '中の小', min: 70000000,  max: 200000000 },
        { label: '中の中', min: 200000000, max: 400000000 },
        { label: '中の大', min: 400000000, max: 2000000000 },
        { label: '大会社', min: 2000000000 },
      ],
      '小売・サービス業': [
        { label: '小会社', max: 40000000 },
        { label: '中の小', min: 40000000,  max: 250000000 },
        { label: '中の中', min: 250000000, max: 500000000 },
        { label: '中の大', min: 500000000, max: 1500000000 },
        { label: '大会社', min: 1500000000 },
      ],
      '卸売・小売・サービス以外': [
        { label: '小会社', max: 50000000 },
        { label: '中の小', min: 50000000,  max: 250000000 },
        { label: '中の中', min: 250000000, max: 500000000 },
        { label: '中の大', min: 500000000, max: 1500000000 },
        { label: '大会社', min: 1500000000 },
      ],
    };
    const revenueThresholds: Record<string, Array<{label: any; min?: number; max?: number}>> = {
      '卸売業': [
        { label: '小会社', max: 200000000 },
        { label: '中の小', min: 200000000,  max: 350000000 },
        { label: '中の中', min: 350000000,  max: 700000000 },
        { label: '中の大', min: 700000000,  max: 3000000000 },
        { label: '大会社', min: 3000000000 },
      ],
      '小売・サービス業': [
        { label: '小会社', max: 60000000 },
        { label: '中の小', min: 60000000,   max: 250000000 },
        { label: '中の中', min: 250000000,  max: 500000000 },
        { label: '中の大', min: 500000000,  max: 2000000000 },
        { label: '大会社', min: 2000000000 },
      ],
      '卸売・小売・サービス以外': [
        { label: '小会社', max: 80000000 },
        { label: '中の小', min: 80000000,   max: 200000000 },
        { label: '中の中', min: 200000000,  max: 400000000 },
        { label: '中の大', min: 400000000,  max: 1500000000 },
        { label: '大会社', min: 1500000000 },
      ],
    };
    const getBand = (thresholds: Array<{label: any; min?: number; max?: number}>, value: number) => {
      const found = thresholds.find(t => (t.min == null || value >= t.min) && (t.max == null || value < t.max));
      return (found?.label as any) || '小会社';
    };
    const assetBand = getBand(assetThresholds[industry], data.assets);
    const revenueBand = getBand(revenueThresholds[industry], data.sales);
    const order: Record<string, number> = { '大会社': 4, '中の大': 3, '中の中': 2, '中の小': 1, '小会社': 0 };
    const lowerOf = (a: any, b: any) => (order[a] < order[b] ? a : b);
    const upperOf = (a: any, b: any) => (order[a] > order[b] ? a : b);
    const cBand = lowerOf(assetBand, empBand);
    const finalBand = upperOf(cBand, revenueBand) as '大会社'|'中の大'|'中の中'|'中の小'|'小会社';

    const lMap: Record<string, number> = { '大会社': 1.0, '中の大': 0.90, '中の中': 0.75, '中の小': 0.60, '小会社': 0.0 };
    const size: 'large'|'medium'|'small' = finalBand === '大会社' ? 'large' : finalBand === '小会社' ? 'small' : 'medium';
    const l = lMap[finalBand] ?? 0;
    return { size, lClass: finalBand, l };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!validators.required(data.employees)) {
      newErrors.employees = getErrorMessage("従業員数", "required");
    }
    if (!validators.positive(data.employees)) {
      newErrors.employees = getErrorMessage("従業員数", "positive");
    }

    if (!validators.required(data.assets)) {
      newErrors.assets = getErrorMessage("資産", "required");
    }
    if (!validators.positive(data.assets)) {
      newErrors.assets = getErrorMessage("資産", "positive");
    }

    if (!validators.required(data.sales)) {
      newErrors.sales = getErrorMessage("売上", "required");
    }
    if (!validators.positive(data.sales)) {
      newErrors.sales = getErrorMessage("売上", "positive");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const { size, lClass, l } = determineBandAndL();

    const result = {
      ...data,
      companySize: size,
      lClass,
      lRatio: l,
    };

    setCompanySizeData(result);
    router.push("/wizard/step4-valuation");
  };

  const handleBack = () => {
    router.push("/wizard/step2-special");
  };

  const current = determineBandAndL();
  const currentCompanySize = current.size;
  const currentLRatio = current.l;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <FormCard
        title="会社規模の判定（第1表の2）"
        description="従業員数、資産、売上等から会社規模を判定し、中会社の場合はL値を決定します。"
        step={3}
        totalSteps={5}
      >
        <FormSection title="会社基本情報" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label={
                <div className="flex items-center">
                  従業員数
                  <Tooltip text="会社の従業員数（フルタイム換算）を入力します。70人以上の場合は大会社に該当します。" />
                </div>
              }
              value={data.employees}
              onChange={(value) => updateData("employees", value)}
              placeholder="例: 50"
              min={1}
              error={errors.employees}
              dataTestId="employees"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                業種
                <Tooltip text="選択した業種によって、会社規模を判定する際の資産や売上の基準値が異なります。" />
              </label>
          <select
                value={data.industry}
                onChange={(e) => updateData("industry", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                data-testid="industry"
              >
                <option value="卸売">卸売業</option>
                <option value="小売・サービス">小売・サービス業</option>
                <option value="その他">その他</option>
          </select>
          </div>
        </div>
        </FormSection>

        <FormSection title="財務情報" required>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label={
                <div className="flex items-center">
                  資産
                  <Tooltip text="会社の総資産額を入力します。従業員数、売上とともに会社規模の判定に用いられます。" />
                </div>
              }
              value={data.assets}
              onChange={(value) => updateData("assets", value)}
              placeholder="例: 100000000"
              min={0}
              error={errors.assets}
              dataTestId="assets"
            />
            <CurrencyInput
              label={
                <div className="flex items-center">
                  売上
                  <Tooltip text="会社の年間売上高を入力します。従業員数、資産とともに会社規模の判定に用いられます。" />
                </div>
              }
              value={data.sales}
              onChange={(value) => updateData("sales", value)}
              placeholder="例: 50000000"
              min={0}
              error={errors.sales}
              dataTestId="sales"
            />
      </div>
        </FormSection>

        <FormSection title="判定結果">
          <div className="glass rounded-2xl p-6 border border-white/20">
            <CompanySizeBadge
              size={currentCompanySize}
              lClass={current.lClass}
              lRatio={currentLRatio}
            />
            
            <div className="mt-6 space-y-3 text-sm text-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-xl">
                  <p className="font-medium text-gray-700">従業員数: {data.employees}人</p>
                </div>
                <div className="bg-white/50 p-4 rounded-xl">
                  <p className="font-medium text-gray-700">業種: {data.industry}</p>
                </div>
                <div className="bg-white/50 p-4 rounded-xl">
                  <p className="font-medium text-gray-700">資産: {new Intl.NumberFormat('ja-JP').format(data.assets)}円</p>
          </div>
                <div className="bg-white/50 p-4 rounded-xl">
                  <p className="font-medium text-gray-700">売上: {new Intl.NumberFormat('ja-JP').format(data.sales)}円</p>
        </div>
      </div>

              {currentCompanySize === 'large' && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <p className="text-blue-800 font-semibold">
                    大会社（70人以上）に該当します。第3表により評価方式を決定します。
                  </p>
                </div>
              )}
              
              {currentCompanySize === 'medium' && (
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-xl border border-orange-200">
                  <p className="text-orange-800 font-semibold mb-2">
                    中会社{current.lClass ? `（${current.lClass}）` : ''}に該当します。L = {currentLRatio} が適用されます。
                  </p>
                  <p className="text-orange-700 text-sm">
                    評価式: 類似業種比準価額 × {currentLRatio} + 純資産価額 × (1 - {currentLRatio})
                  </p>
          </div>
        )}
              
              {currentCompanySize === 'small' && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                  <p className="text-gray-800 font-semibold">
                    小会社に該当します。純資産価額方式が適用されます。
                  </p>
        </div>
      )}
            </div>
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
            次へ（評価方式・計算）
          </button>
        </FormActions>
      </FormCard>
    </div>
  );
}
