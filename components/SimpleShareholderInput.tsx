import React, { useState } from 'react';

interface SimpleShareholderInputProps {
  onComplete: (data: SimpleShareholderData) => void;
}

export interface SimpleShareholderData {
  // ステップ1: 筆頭株主グループの議決権割合
  topGroupRatio: 'over50' | '30to50' | 'under30';
  
  // ステップ2: 同族株主グループ内の株主タイプ
  familyGroupRatio: 'over50' | '30to50' | 'under30';
  
  // ステップ3: 納税義務者の取得後の議決権割合
  taxpayerVoteRatio: 'over5' | 'under5';
  
  // ステップ4: 中心的な株主の有無
  hasCentralShareholder: boolean;
  
  // ステップ5: 納税義務者が中心的な株主に該当するか
  taxpayerIsCentral: boolean;
  
  // ステップ6: 納税義務者が役員であるか
  taxpayerIsOfficer: boolean;
  
  // 計算結果
  evaluationMethod: '原則的評価方式' | '特例的評価方式';
  
  // 追加で必要な情報
  additionalInfo: {
    totalVotingRights: number;
    taxpayerVotes: number;
    familyGroupVotes: number;
    topGroupVotes: number;
  };
}

const STEPS = [
  {
    id: 1,
    title: '筆頭株主グループの議決権割合',
    description: '筆頭株主グループ（配偶者及び6親等内の血族、3親等内の姻族）の議決権割合を選択してください',
    options: [
      { value: 'over50', label: '50%超（同族株主のいる会社）' },
      { value: '30to50', label: '30%以上50%以下（同族株主のいる会社）' },
      { value: 'under30', label: '30%未満（同族株主のいない会社）' }
    ]
  },
  {
    id: 2,
    title: '同族株主グループ内の株主タイプ',
    description: '同族株主グループ内の株主タイプを選択してください',
    options: [
      { value: 'over50', label: '50%超（同族株主）' },
      { value: '30to50', label: '30%以上（同族株主）' },
      { value: 'under30', label: '30%未満（同族株主以外の株主）' }
    ]
  },
  {
    id: 3,
    title: '納税義務者の取得後の議決権割合',
    description: '納税義務者の取得後の議決権割合を選択してください',
    options: [
      { value: 'over5', label: '5%以上' },
      { value: 'under5', label: '5%未満' }
    ]
  },
  {
    id: 4,
    title: '中心的な株主の有無',
    description: '同族株主の中に中心的な同族株主がいますか？',
    options: [
      { value: true, label: 'いる' },
      { value: false, label: 'いない' }
    ]
  },
  {
    id: 5,
    title: '納税義務者が中心的な株主に該当するか',
    description: '納税義務者が中心的な株主に該当しますか？',
    options: [
      { value: true, label: 'する' },
      { value: false, label: 'しない' }
    ]
  },
  {
    id: 6,
    title: '納税義務者が役員であるか',
    description: '納税義務者が役員ですか？',
    options: [
      { value: true, label: 'である' },
      { value: false, label: 'でない' }
    ]
  }
];

export default function SimpleShareholderInput({ onComplete }: SimpleShareholderInputProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<Partial<SimpleShareholderData>>({});
  const [showAdditionalInput, setShowAdditionalInput] = useState(false);
  const [additionalData, setAdditionalData] = useState({
    totalVotingRights: 0,
    taxpayerVotes: 0,
    familyGroupVotes: 0,
    topGroupVotes: 0
  });

  const currentStepData = STEPS.find(step => step.id === currentStep);

  const handleAnswer = (value: any) => {
    const newAnswers = { ...answers };
    
    switch (currentStep) {
      case 1:
        newAnswers.topGroupRatio = value;
        break;
      case 2:
        newAnswers.familyGroupRatio = value;
        break;
      case 3:
        newAnswers.taxpayerVoteRatio = value;
        break;
      case 4:
        newAnswers.hasCentralShareholder = value;
        break;
      case 5:
        newAnswers.taxpayerIsCentral = value;
        break;
      case 6:
        newAnswers.taxpayerIsOfficer = value;
        // 最終ステップなので判定を実行
        const evaluationMethod = determineEvaluationMethod({ ...newAnswers, taxpayerIsOfficer: value });
        newAnswers.evaluationMethod = evaluationMethod;
        setAnswers(newAnswers);
        
        // 特例的評価方式の場合は追加情報が必要
        if (evaluationMethod === '特例的評価方式') {
          setShowAdditionalInput(true);
        } else {
          onComplete(newAnswers as SimpleShareholderData);
        }
        return;
    }
    
    setAnswers(newAnswers);
    setCurrentStep(currentStep + 1);
  };

  const determineEvaluationMethod = (data: any): '原則的評価方式' | '特例的評価方式' => {
    // フローチャートに基づく判定ロジック
    if (data.topGroupRatio === 'over50' || data.topGroupRatio === '30to50') {
      // 同族株主のいる会社
      if (data.familyGroupRatio === 'over50' || data.familyGroupRatio === '30to50') {
        // 同族株主
        return data.taxpayerVoteRatio === 'over5' ? '原則的評価方式' : '特例的評価方式';
      } else {
        // 同族株主以外の株主
        return data.taxpayerVoteRatio === 'over5' ? '原則的評価方式' : '特例的評価方式';
      }
    } else {
      // 同族株主のいない会社
      if (data.familyGroupRatio === 'over50' || data.familyGroupRatio === '30to50') {
        // 同族株主等
        return data.taxpayerVoteRatio === 'over5' ? '原則的評価方式' : '特例的評価方式';
      } else {
        // 等外の株主
        return data.taxpayerVoteRatio === 'over5' ? '原則的評価方式' : '特例的評価方式';
      }
    }
  };

  const handleAdditionalSubmit = () => {
    const completeData: SimpleShareholderData = {
      ...answers as SimpleShareholderData,
      additionalInfo: additionalData
    };
    onComplete(completeData);
  };

  if (showAdditionalInput) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">
            特例的評価方式が適用されます
          </h3>
          <p className="text-blue-700 text-sm">
            配当還元方式の計算に必要な追加情報を入力してください。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              議決権総数
            </label>
            <input
              type="number"
              value={additionalData.totalVotingRights}
              onChange={(e) => setAdditionalData({
                ...additionalData,
                totalVotingRights: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 1000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              納税義務者の議決権数
            </label>
            <input
              type="number"
              value={additionalData.taxpayerVotes}
              onChange={(e) => setAdditionalData({
                ...additionalData,
                taxpayerVotes: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同族株主グループの議決権数
            </label>
            <input
              type="number"
              value={additionalData.familyGroupVotes}
              onChange={(e) => setAdditionalData({
                ...additionalData,
                familyGroupVotes: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              筆頭株主グループの議決権数
            </label>
            <input
              type="number"
              value={additionalData.topGroupVotes}
              onChange={(e) => setAdditionalData({
                ...additionalData,
                topGroupVotes: Number(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="例: 300"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowAdditionalInput(false)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            戻る
          </button>
          <button
            onClick={handleAdditionalSubmit}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            完了
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* プログレスバー */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>ステップ {currentStep} / {STEPS.length}</span>
          <span>{Math.round((currentStep / STEPS.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 現在のステップ */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {currentStepData?.title}
        </h3>
        <p className="text-gray-600 mb-6">
          {currentStepData?.description}
        </p>

        <div className="space-y-3">
          {currentStepData?.options.map((option) => (
            <button
              key={String(option.value)}
              onClick={() => handleAnswer(option.value)}
              className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all duration-200"
            >
              <span className="font-medium text-gray-800">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 戻るボタン */}
      {currentStep > 1 && (
        <div className="flex justify-start">
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            前のステップに戻る
          </button>
        </div>
      )}
    </div>
  );
}
