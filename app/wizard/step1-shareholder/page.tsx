"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormActions } from "@/components/FormCard";
import { NumberInput } from "@/components/NumberInput";
import { useEvalStore } from "@/lib/store/evalStore";
import { validators, getErrorMessage } from "@/lib/utils";
import InputMethodSelector from '@/components/InputMethodSelector';
import SimpleShareholderInput, { SimpleShareholderData } from '@/components/SimpleShareholderInput';

interface Shareholder {
  id: string;
  name: string;
  relation: string;
  officer: boolean;
  votes: number;
  inFamilyGroup: boolean;
  inTopGroup: boolean;
  isTaxpayer: boolean;
}

// evalStoreのShareholderData型に合わせた変換関数
const convertToStoreFormat = (shareholders: Shareholder[], totalVotingRights: number) => {
  const familyGroupVotes = shareholders
    .filter(sh => sh.inFamilyGroup)
    .reduce((sum, sh) => sum + sh.votes, 0);
  
  const topGroupVotes = shareholders
    .filter(sh => sh.inTopGroup)
    .reduce((sum, sh) => sum + sh.votes, 0);
  
  const familyGroupRatio = totalVotingRights > 0 ? familyGroupVotes / totalVotingRights : 0;
  const leadingShareholderGroupRatio = totalVotingRights > 0 ? topGroupVotes / totalVotingRights : 0;
  
  const taxpayer = shareholders.find(sh => sh.isTaxpayer);
  const isMinorityShareholder = taxpayer ? (taxpayer.votes / totalVotingRights) < 0.05 : false;
  
  return {
    shareholders: shareholders.map(sh => ({
      id: sh.id,
      name: sh.name,
      relationship: sh.relation,
      position: sh.officer ? '役員' : '一般',
      shares: sh.votes,
      votingRights: sh.votes,
      votingRatio: totalVotingRights > 0 ? sh.votes / totalVotingRights : 0,
      isFamily: sh.inFamilyGroup,
      isTopShareholder: sh.inTopGroup
    })),
    totalVotingRights,
    familyGroupRatio,
    leadingShareholderGroupRatio,
    isMinorityShareholder,
    familyGroupVotes,
    leadingGroupVotes: topGroupVotes
  };
};

// 続柄の選択肢（分かりやすく整理）
const RELATION_OPTIONS = [
  { value: "納税義務者", label: "納税義務者（評価対象者）", category: "taxpayer" },
  { value: "配偶者", label: "配偶者", category: "family" },
  { value: "子", label: "子（直系卑属）", category: "family" },
  { value: "親", label: "親（直系尊属）", category: "family" },
  { value: "兄弟姉妹", label: "兄弟姉妹", category: "family" },
  { value: "祖父母", label: "祖父母", category: "family" },
  { value: "孫", label: "孫", category: "family" },
  { value: "叔父叔母", label: "叔父・叔母（3親等内）", category: "family" },
  { value: "甥姪", label: "甥・姪（3親等内）", category: "family" },
  { value: "義父母", label: "義父母（姻族1親等）", category: "family" },
  { value: "義兄弟姉妹", label: "義兄弟姉妹（姻族2親等）", category: "family" },
  { value: "義祖父母", label: "義祖父母（姻族2親等）", category: "family" },
  { value: "義叔父叔母", label: "義叔父・義叔母（姻族3親等）", category: "family" },
  { value: "第三者", label: "第三者（血族・姻族以外）", category: "third" },
];

export default function Step1ShareholderPage() {
  const router = useRouter();
  const { setShareholderData, shareholderData } = useEvalStore();
  
  const [shareholders, setShareholders] = useState<Shareholder[]>(() => {
    if (shareholderData?.shareholders) {
      // evalStoreの形式から変換
      return shareholderData.shareholders.map(sh => ({
        id: sh.id,
        name: sh.name,
        relation: sh.relationship,
        officer: sh.position === '役員',
        votes: sh.votingRights,
        inFamilyGroup: sh.isFamily,
        inTopGroup: sh.isTopShareholder,
        isTaxpayer: sh.relationship === '納税義務者'
      }));
    }
    return [
      {
        id: "1",
        name: "",
        relation: "納税義務者",
        officer: false,
        votes: 0,
        inFamilyGroup: true,
        inTopGroup: false,
        isTaxpayer: true,
      },
    ];
  });
  
  const [totalVotingRights, setTotalVotingRights] = useState<number>(
    shareholderData?.totalVotingRights || 0
  );
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inputMethod, setInputMethod] = useState<'detailed' | 'simple'>('detailed');
  const [showSimpleInput, setShowSimpleInput] = useState(false);

  // 同族関係者グループの自動判定
  const updateFamilyGroupStatus = (updatedShareholders: Shareholder[]) => {
    return updatedShareholders.map(sh => {
      const isFamilyRelation = RELATION_OPTIONS.find(opt => opt.value === sh.relation)?.category === "family";
      return {
        ...sh,
        inFamilyGroup: isFamilyRelation
      };
    });
  };

  // 筆頭株主グループの自動判定
  const updateTopGroupStatus = (updatedShareholders: Shareholder[]) => {
    if (updatedShareholders.length === 0) return updatedShareholders;
    
    // 最大議決権を持つ株主を特定
    const maxVotes = Math.max(...updatedShareholders.map(sh => sh.votes));
    const topShareholders = updatedShareholders.filter(sh => sh.votes === maxVotes);
    
    return updatedShareholders.map(sh => ({
      ...sh,
      inTopGroup: sh.votes === maxVotes
    }));
  };

  const addShareholder = () => {
    const newShareholder: Shareholder = {
      id: Date.now().toString(),
      name: "",
      relation: "第三者",
      officer: false,
      votes: 0,
      inFamilyGroup: false,
      inTopGroup: false,
      isTaxpayer: false,
    };
    
    const updatedShareholders = [...shareholders, newShareholder];
    const withFamilyGroup = updateFamilyGroupStatus(updatedShareholders);
    const withTopGroup = updateTopGroupStatus(withFamilyGroup);
    
    setShareholders(withTopGroup);
  };

  const removeShareholder = (id: string) => {
    if (shareholders.length <= 1) return;
    
    const updatedShareholders = shareholders.filter(sh => sh.id !== id);
    const withFamilyGroup = updateFamilyGroupStatus(updatedShareholders);
    const withTopGroup = updateTopGroupStatus(withFamilyGroup);
    
    setShareholders(withTopGroup);
  };

  const updateShareholder = (id: string, field: keyof Shareholder, value: any) => {
    const updatedShareholders = shareholders.map(sh =>
      sh.id === id ? { ...sh, [field]: value } : sh
    );
    
    // 関係性が変更された場合、グループ判定を更新
    if (field === 'relation') {
      const withFamilyGroup = updateFamilyGroupStatus(updatedShareholders);
      const withTopGroup = updateTopGroupStatus(withFamilyGroup);
      setShareholders(withTopGroup);
    } else if (field === 'votes') {
      const withTopGroup = updateTopGroupStatus(updatedShareholders);
      setShareholders(withTopGroup);
    } else {
      setShareholders(updatedShareholders);
    }
  };

  const handleSimpleInputComplete = (data: SimpleShareholderData) => {
    // 簡易入力の結果を詳細入力形式に変換
    const convertedShareholders: Shareholder[] = [
      {
        id: "1",
        name: "納税義務者",
        relation: "納税義務者",
        officer: data.taxpayerIsOfficer,
        votes: data.additionalInfo.taxpayerVotes,
        inFamilyGroup: data.familyGroupRatio !== 'under30',
        inTopGroup: data.topGroupRatio !== 'under30',
        isTaxpayer: true,
      }
    ];

    const convertedData = convertToStoreFormat(convertedShareholders, data.additionalInfo.totalVotingRights);
    setShareholderData(convertedData);
    router.push('/wizard/step2-special');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // 株主の検証
    shareholders.forEach((sh, index) => {
      if (!validators.required(sh.name)) {
        newErrors[`shareholder-${index}-name`] = getErrorMessage("株主名", "required");
      }
      if (!validators.required(sh.votes)) {
        newErrors[`shareholder-${index}-votes`] = getErrorMessage("議決権数", "required");
      }
      if (!validators.positive(sh.votes)) {
        newErrors[`shareholder-${index}-votes`] = getErrorMessage("議決権数", "positive");
      }
    });

    // 総議決権数の検証
    if (!validators.required(totalVotingRights)) {
      newErrors.totalVotingRights = getErrorMessage("総議決権数", "required");
    }
    if (!validators.positive(totalVotingRights)) {
      newErrors.totalVotingRights = getErrorMessage("総議決権数", "positive");
    }

    // 議決権数の合計チェック
    const totalVotes = shareholders.reduce((sum, sh) => sum + sh.votes, 0);
    if (totalVotes > totalVotingRights) {
      newErrors.totalVotingRights = "議決権数の合計が総議決権数を超えています";
    }

    // 納税義務者の存在チェック
    const hasTaxpayer = shareholders.some(sh => sh.isTaxpayer);
    if (!hasTaxpayer) {
      newErrors.taxpayer = "納税義務者を1名指定してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateForm()) return;

    const totalVotes = shareholders.reduce((sum, sh) => sum + sh.votes, 0);
    const familyGroupVotes = shareholders
      .filter(sh => sh.inFamilyGroup)
      .reduce((sum, sh) => sum + sh.votes, 0);
    const topGroupVotes = shareholders
      .filter(sh => sh.inTopGroup)
      .reduce((sum, sh) => sum + sh.votes, 0);

    const data = convertToStoreFormat(shareholders, totalVotingRights);
    setShareholderData(data);
    router.push("/wizard/step2-special");
  };

  const handleBack = () => {
    router.push("/");
  };

  // グループ判定の説明
  const getGroupExplanation = () => {
    const familyGroupVotes = shareholders
      .filter(sh => sh.inFamilyGroup)
      .reduce((sum, sh) => sum + sh.votes, 0);
    const topGroupVotes = shareholders
      .filter(sh => sh.inTopGroup)
      .reduce((sum, sh) => sum + sh.votes, 0);
    
    const familyRatio = totalVotingRights > 0 ? (familyGroupVotes / totalVotingRights) * 100 : 0;
    const topRatio = totalVotingRights > 0 ? (topGroupVotes / totalVotingRights) * 100 : 0;

    return {
      familyRatio: familyRatio.toFixed(1),
      topRatio: topRatio.toFixed(1),
      familyCount: shareholders.filter(sh => sh.inFamilyGroup).length,
      topCount: shareholders.filter(sh => sh.inTopGroup).length,
    };
  };

  const explanation = getGroupExplanation();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <FormCard
        title="株主情報（第1表の1）"
        description="株主の関係性と議決権数を入力し、同族株主等の判定を行います。"
        step={1}
        totalSteps={5}
      >
        <FormSection title="同族関係者・筆頭株主の定義" required>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">判定基準</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div>
                <span className="font-medium">同族関係者：</span>
                配偶者、6親等内の血族、3親等内の姻族
              </div>
              <div>
                <span className="font-medium">筆頭株主：</span>
                最も多くの議決権を持つ株主（同数の場合は複数）
              </div>
              <div>
                <span className="font-medium">同族株主等：</span>
                議決権総数の30%以上を有する同族関係者グループ
              </div>
            </div>
          </div>
        </FormSection>

        <FormSection title="株主情報" required>
      <div className="space-y-4">
            {shareholders.map((shareholder, index) => (
              <div key={shareholder.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">株主 {index + 1}</h4>
                  {shareholders.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeShareholder(shareholder.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      削除
          </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      株主名
                    </label>
                    <input
                      type="text"
                      value={shareholder.name}
                      onChange={(e) => updateShareholder(shareholder.id, "name", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="例: 田中太郎"
                    />
                    {errors[`shareholder-${index}-name`] && (
                      <p className="text-red-600 text-sm mt-1">{errors[`shareholder-${index}-name`]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      続柄
                    </label>
                    <select
                      value={shareholder.relation}
                      onChange={(e) => updateShareholder(shareholder.id, "relation", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {RELATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      議決権数
                    </label>
                    <NumberInput
                      value={shareholder.votes}
                      onChange={(value) => updateShareholder(shareholder.id, "votes", value)}
                      placeholder="例: 1000"
                      min={0}
                      error={errors[`shareholder-${index}-votes`]}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareholder.officer}
                        onChange={(e) => updateShareholder(shareholder.id, "officer", e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">役員</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shareholder.isTaxpayer}
                        onChange={(e) => updateShareholder(shareholder.id, "isTaxpayer", e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">納税義務者</span>
                    </label>
        </div>
          </div>

                {/* 自動判定結果の表示 */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2">
                    {shareholder.inFamilyGroup && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        同族関係者
                      </span>
                    )}
                    {shareholder.inTopGroup && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        筆頭株主
                      </span>
        )}
      </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addShareholder}
              className="w-full py-2 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors"
            >
              + 株主を追加
            </button>
          </div>
        </FormSection>

        <FormSection title="総議決権数" required>
          <NumberInput
            value={totalVotingRights}
            onChange={setTotalVotingRights}
            placeholder="例: 10000"
            min={0}
            error={errors.totalVotingRights}
          />
        </FormSection>

        {/* グループ判定結果の表示 */}
        <FormSection title="グループ判定結果">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">同族関係者グループ</h4>
                <div className="text-sm text-gray-600">
                  <p>人数: {explanation.familyCount}名</p>
                  <p>議決権: {explanation.familyRatio}%</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">筆頭株主グループ</h4>
                <div className="text-sm text-gray-600">
                  <p>人数: {explanation.topCount}名</p>
                  <p>議決権: {explanation.topRatio}%</p>
                </div>
              </div>
            </div>
          </div>
        </FormSection>

        {errors.taxpayer && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600 text-sm">{errors.taxpayer}</p>
          </div>
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
            次へ
          </button>
        </FormActions>
      </FormCard>
    </div>
  );
}
