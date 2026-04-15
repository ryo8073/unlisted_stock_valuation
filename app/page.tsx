"use client";
import Link from "next/link";
import { useEvalStore } from "@/lib/store/evalStore";

export default function HomePage() {
  const { resetAll, valuationData } = useEvalStore();
  const hasExistingData = !!valuationData;

  const handleNewEvaluation = () => {
    resetAll();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
      <div className="glass card-shadow rounded-3xl p-8 sm:p-12 max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            非上場株式評価システム
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            財産評価基本通��178〜189条に基づく<br />
            取引相場のない株式の評価方式診断
          </p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200 text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-200 text-blue-800 font-bold text-sm">1</span>
                <h3 className="font-semibold text-blue-900">株主判定</h3>
              </div>
              <p className="text-sm text-blue-700 ml-11">同族株主・少数株主の判定</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-2xl border border-green-200 text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-green-200 text-green-800 font-bold text-sm">2</span>
                <h3 className="font-semibold text-green-900">特定会社等</h3>
              </div>
              <p className="text-sm text-green-700 ml-11">土地保有・株式等保有の判定</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-2xl border border-purple-200 text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-200 text-purple-800 font-bold text-sm">3</span>
                <h3 className="font-semibold text-purple-900">会社規模</h3>
              </div>
              <p className="text-sm text-purple-700 ml-11">大会社・中会社・小会社の判定</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-5 rounded-2xl border border-orange-200 text-left">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-200 text-orange-800 font-bold text-sm">4</span>
                <h3 className="font-semibold text-orange-900">評価計算</h3>
              </div>
              <p className="text-sm text-orange-700 ml-11">類似業種比準・純資産価額</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {hasExistingData ? (
            <>
              <Link
                href="/wizard/step5-result"
                className="btn-success text-lg px-8 py-4 w-full sm:w-auto justify-center"
              >
                前回の結果を見る
              </Link>
              <Link
                href="/wizard/step1-shareholder"
                onClick={handleNewEvaluation}
                className="btn-primary text-lg px-8 py-4 w-full sm:w-auto justify-center"
              >
                新しい評価を開始
              </Link>
            </>
          ) : (
            <Link
              href="/wizard/step1-shareholder"
              className="btn-primary text-lg px-8 py-4 w-full sm:w-auto justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              評価を開始する
            </Link>
          )}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <h4 className="text-sm font-semibold text-amber-800 mb-2">ご利用��の注意</h4>
          <ul className="text-xs text-amber-700 space-y-1">
            <li>- 本システムは財産評価基本通達に基づく概算評価ツールです</li>
            <li>- 計算結果は参考値であり、正式な税務申告には使用で���ません</li>
            <li>- 実際の申告には税理士等の専門家にご相談ください</li>
            <li>- 入力データはブラウザのロー���ルストレージにのみ保存されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
  