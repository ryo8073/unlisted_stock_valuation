"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass card-shadow rounded-3xl p-12 max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            非上場株式評価システム
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            国税庁の第1表の1・第1表の2・第2表・第3表に基づく<br />
            令和6年以降の株式評価を自動計算
          </p>
        </div>

        <div className="space-y-6 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-2xl border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">株主判定</h3>
              <p className="text-sm text-blue-700">同族関係者グループの判定</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-2xl border border-green-200">
              <h3 className="font-semibold text-green-900 mb-2">特定会社等</h3>
              <p className="text-sm text-green-700">土地保有・株式等保有の判定</p>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-2xl border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-2">会社規模</h3>
              <p className="text-sm text-purple-700">大会社・中会社・小会社の判定</p>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-2xl border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-2">評価方式</h3>
              <p className="text-sm text-orange-700">適切な評価方式の選択</p>
            </div>
          </div>
        </div>

        <Link
          href="/wizard/step1-shareholder"
          className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          評価を開始する
        </Link>

        <div className="mt-8 text-sm text-gray-500">
          <p>※ 本システムは国税庁の基準に基づいて計算を行います</p>
          <p>※ 実際の申告には専門家の確認をお勧めします</p>
        </div>
      </div>
    </div>
  );
}
  