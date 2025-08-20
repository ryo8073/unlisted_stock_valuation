import React from 'react';
import { cn } from '@/lib/utils';

interface InputMethodSelectorProps {
  selectedMethod: 'detailed' | 'simple';
  onMethodChange: (method: 'detailed' | 'simple') => void;
}

export default function InputMethodSelector({ selectedMethod, onMethodChange }: InputMethodSelectorProps) {
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">入力方式を選択してください</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => onMethodChange('detailed')}
          className={cn(
            'p-6 rounded-xl border-2 transition-all duration-200 text-left',
            'hover:shadow-lg hover:scale-105',
            selectedMethod === 'detailed'
              ? 'border-primary-500 bg-primary-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-primary-300'
          )}
        >
          <div className="flex items-center mb-3">
            <div className={cn(
              'w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center',
              selectedMethod === 'detailed'
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'
            )}>
              {selectedMethod === 'detailed' && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
            <h4 className="text-lg font-semibold text-gray-800">詳細入力</h4>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            株主の詳細情報（氏名、続柄、議決権数、役員の有無など）を個別に入力します。
            より正確な判定が可能です。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            ✓ 株主情報の詳細入力<br/>
            ✓ チェックボックスによる選択<br/>
            ✓ 自動計算機能
          </div>
        </button>

        <button
          onClick={() => onMethodChange('simple')}
          className={cn(
            'p-6 rounded-xl border-2 transition-all duration-200 text-left',
            'hover:shadow-lg hover:scale-105',
            selectedMethod === 'simple'
              ? 'border-primary-500 bg-primary-50 shadow-lg'
              : 'border-gray-200 bg-white hover:border-primary-300'
          )}
        >
          <div className="flex items-center mb-3">
            <div className={cn(
              'w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center',
              selectedMethod === 'simple'
                ? 'border-primary-500 bg-primary-500'
                : 'border-gray-300'
            )}>
              {selectedMethod === 'simple' && (
                <div className="w-2 h-2 bg-white rounded-full"></div>
              )}
            </div>
            <h4 className="text-lg font-semibold text-gray-800">簡易入力</h4>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            フローチャートに基づくドロップダウン選択で、段階的に判定を行います。
            必要な情報のみを入力します。
          </p>
          <div className="mt-3 text-xs text-gray-500">
            ✓ ドロップダウン選択<br/>
            ✓ 段階的判定<br/>
            ✓ 必要に応じて追加質問
          </div>
        </button>
      </div>
    </div>
  );
}
