'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FormCard, FormSection, FormActions } from '@/components/FormCard'
import { CurrencyInput } from '@/components/NumberInput'
import { useEvalStore } from '@/lib/store/evalStore'
import { validators, getErrorMessage } from '@/lib/utils'
import { Tooltip } from '@/components/Tooltip'
import {
  similarIndustryDatabase,
  SimilarIndustryDataRow,
  SimilarIndustryDatabase,
} from '@/lib/database/similarIndustryData'

interface ValuationData {
  dividendPerShare: number
  profitPerShare: number
  netAssetPerShare: number
  netAssetValue: number
  dividendYield: number
  capitalPerShare: number // 1株当たりの資本金等の額（通達188-2条）
  finalValue: number
  method: string
  similarIndustryValue?: number
  selectedIndustryData?: SimilarIndustryDataRow
}

/**
 * 通達180条による株価A の5候補と採用値（最低値）
 * ①課税時期の属する月の月平均株価
 * ②前月の月平均株価
 * ③前々月の月平均株価
 * ④前年の年平均株価（A フィールド）
 * ⑤課税時期の属する月以前2年間の平均株価
 */
interface AValueBreakdown {
  currentMonth: number | null
  prevMonth: number | null
  prevPrevMonth: number | null
  prevYearAverage: number | null
  prev2YearsAverage: number | null
  selected: number
}

interface NetAssetCalcData {
  totalAssetsInheritance: number // 相続税評価額による総資産合計
  totalLiabilities: number // 負債合計
  netAssetsBook: number // 帳簿価額による純資産（第5表）
  totalShares: number // 発行済株式数
}

export default function Step4ValuationPage() {
  const router = useRouter()
  const { setValuationData, valuationData, shareholderData, companySizeData } =
    useEvalStore()

  const [data, setData] = useState<ValuationData>(
    valuationData || {
      dividendPerShare: 0,
      profitPerShare: 0,
      netAssetPerShare: 0,
      netAssetValue: 0,
      dividendYield: 0.05,
      capitalPerShare: 50, // デフォルト50円（額面50円）
      finalValue: 0,
      method: '',
    }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [selectedYear, setSelectedYear] = useState<string>('令和7年')
  const [selectedMajorCategory, setSelectedMajorCategory] = useState<string>('')
  const [selectedMediumCategory, setSelectedMediumCategory] =
    useState<string>('')
  const [selectedMinorCategory, setSelectedMinorCategory] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('1月')
  const [selectedIndustryData, setSelectedIndustryData] = useState<
    SimilarIndustryDataRow | undefined
  >(undefined)
  const [aValueBreakdown, setAValueBreakdown] =
    useState<AValueBreakdown | null>(null)

  // 純資産価額 計算補助ツール
  const [showNetAssetCalc, setShowNetAssetCalc] = useState(false)
  const [netAssetCalc, setNetAssetCalc] = useState<NetAssetCalcData>({
    totalAssetsInheritance: 0,
    totalLiabilities: 0,
    netAssetsBook: 0,
    totalShares: 0,
  })

  // リアルタイム計算結果
  const [calculationResult, setCalculationResult] = useState<{
    finalValue: number
    method: string
    isValid: boolean
  }>({
    finalValue: 0,
    method: '',
    isValid: false,
  })
  const [showCalcDetail, setShowCalcDetail] = useState(false)

  const updateData = (field: keyof ValuationData, value: number) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  // Effect to update selectedIndustryData based on selections
  useEffect(() => {
    if (
      selectedYear &&
      selectedMajorCategory &&
      selectedMediumCategory &&
      selectedMinorCategory
    ) {
      const foundData = similarIndustryDatabase[selectedYear]?.find(
        (row) =>
          row.majorCategory === selectedMajorCategory &&
          row.mediumCategory === selectedMediumCategory &&
          row.minorCategory === selectedMinorCategory
      )
      setSelectedIndustryData(foundData)
    } else {
      setSelectedIndustryData(undefined)
    }
  }, [
    selectedYear,
    selectedMajorCategory,
    selectedMediumCategory,
    selectedMinorCategory,
  ])

  // Derived state for dropdown options
  const years = Object.keys(similarIndustryDatabase)
  const majorCategories = selectedYear
    ? [
        ...new Set(
          similarIndustryDatabase[selectedYear]?.map((row) => row.majorCategory)
        ),
      ]
    : []
  const mediumCategories =
    selectedYear && selectedMajorCategory
      ? [
          ...new Set(
            similarIndustryDatabase[selectedYear]
              ?.filter((row) => row.majorCategory === selectedMajorCategory)
              .map((row) => row.mediumCategory)
          ),
        ]
      : []
  const minorCategories =
    selectedYear && selectedMajorCategory && selectedMediumCategory
      ? [
          ...new Set(
            similarIndustryDatabase[selectedYear]
              ?.filter(
                (row) =>
                  row.majorCategory === selectedMajorCategory &&
                  row.mediumCategory === selectedMediumCategory
              )
              .map((row) => row.minorCategory)
          ),
        ]
      : []

  /**
   * 通達180条: 類似業種の株価Aの5候補を全て算出し、最低値を採用値として返す
   *
   * ①課税時期の属する月の月平均株価
   * ②前月の月平均株価
   * ③前々月の月平均株価
   * ④前年の年平均株価（= 当年データのA フィールド）
   * ⑤課税時期の属する月以前2年間の平均株価（= ④と前々年均の平均）
   *
   * ユーザーによる選択は不要。全候補のうち最低値を自動採用する。
   */
  const computeAllAValues = (
    year: string,
    month: string,
    industryData: SimilarIndustryDataRow,
    database: SimilarIndustryDatabase
  ): AValueBreakdown => {
    const currentYearNumber = parseInt(
      year.replace('令和', '').replace('年', '')
    )
    const monthNum = parseInt(month.replace('月', ''))

    const findData = (targetYear: string) =>
      database[targetYear]?.find(
        (row) =>
          row.majorCategory === industryData.majorCategory &&
          row.mediumCategory === industryData.mediumCategory &&
          row.minorCategory === industryData.minorCategory
      )

    // 指定した年・月番号の月次株価を取得（年跨ぎ対応）
    const getMonthlyValue = (
      targetYear: string,
      targetMonth: number
    ): number | null => {
      let y = targetYear
      let m = targetMonth
      if (m <= 0) {
        const prevYearNum =
          parseInt(y.replace('令和', '').replace('年', '')) - 1
        y = `令和${prevYearNum}年`
        m = 12 + m // m=0 → 12月, m=-1 → 11月
      }
      const d = findData(y)
      return d?.monthlyA?.[`${m}月`] ?? null
    }

    const currentMonth = getMonthlyValue(year, monthNum) // ①
    const prevMonth = getMonthlyValue(year, monthNum - 1) // ②
    const prevPrevMonth = getMonthlyValue(year, monthNum - 2) // ③
    const prevYearAverage = industryData.A > 0 ? industryData.A : null // ④

    // ⑤ 直前2年平均: 当年A（=前年年均）と前年データのA（=前々年年均）の平均
    let prev2YearsAverage: number | null = null
    const prevYearData = findData(`令和${currentYearNumber - 1}年`)
    if (prevYearAverage && prevYearData?.A) {
      prev2YearsAverage = (prevYearAverage + prevYearData.A) / 2
    } else if (prevYearAverage) {
      prev2YearsAverage = prevYearAverage
    }

    const available = [
      currentMonth,
      prevMonth,
      prevPrevMonth,
      prevYearAverage,
      prev2YearsAverage,
    ].filter((v): v is number => v !== null && v > 0)
    const selected = available.length > 0 ? Math.min(...available) : 0

    return {
      currentMonth,
      prevMonth,
      prevPrevMonth,
      prevYearAverage,
      prev2YearsAverage,
      selected,
    }
  }

  /**
   * 類似業種比準価額を計算する（しんしゃく率適用済み）
   * 通達180条: A × { (b/B' + c/C' + d/D') / 3 } × しんしゃく率
   * A は computeAllAValues で5候補の最低値を自動採用
   * しんしゃく率: 大会社0.7、中会社0.6、小会社0.5
   */
  const calcSimilarIndustryValue = (
    sizeLabel: 'large' | 'medium' | 'small'
  ): number => {
    if (!selectedIndustryData || data.netAssetPerShare <= 0) return 0
    const breakdown = computeAllAValues(
      selectedYear,
      selectedMonth,
      selectedIndustryData,
      similarIndustryDatabase
    )
    const A = breakdown.selected
    if (A <= 0) return 0

    const bRatio = data.dividendPerShare / selectedIndustryData.B_prime
    const cRatio = data.profitPerShare / selectedIndustryData.C_prime
    const dRatio = data.netAssetPerShare / selectedIndustryData.D_prime
    const discountRate =
      sizeLabel === 'large' ? 0.7 : sizeLabel === 'medium' ? 0.6 : 0.5
    return A * ((bRatio + cRatio + dRatio) / 3) * discountRate
  }

  // 業種データ・評価年月が変わったら A 値の内訳を再計算して表示
  useEffect(() => {
    if (selectedIndustryData) {
      const breakdown = computeAllAValues(
        selectedYear,
        selectedMonth,
        selectedIndustryData,
        similarIndustryDatabase
      )
      setAValueBreakdown(breakdown)
    } else {
      setAValueBreakdown(null)
    }
  }, [selectedIndustryData, selectedYear, selectedMonth])

  /**
   * 純資産価額 計算補助ツール（通達185条）
   *
   * 算式:
   *   相続税評価額による純資産 = 総資産（相続評価） − 負債合計
   *   法人税等相当額           = max(0, (相続評価純資産 − 帳簿価額純資産) × 37%)
   *   純資産価額（1株当たり） = (総資産（相続評価） − 負債合計 − 法人税等相当額) ÷ 発行済株式数
   *   d（類似業種比準式用）   = 帳簿価額純資産 ÷ 発行済株式数
   */
  const computeNetAssetCalc = () => {
    const {
      totalAssetsInheritance,
      totalLiabilities,
      netAssetsBook,
      totalShares,
    } = netAssetCalc
    if (totalShares <= 0 || totalAssetsInheritance <= 0) return null
    const netAssetsInheritance = totalAssetsInheritance - totalLiabilities
    const corpTaxEquiv = Math.max(
      0,
      (netAssetsInheritance - netAssetsBook) * 0.37
    )
    const netAssetValuePerShare = Math.max(
      0,
      (totalAssetsInheritance - totalLiabilities - corpTaxEquiv) / totalShares
    )
    const netAssetPerShareBook =
      netAssetsBook > 0 ? netAssetsBook / totalShares : 0
    return {
      netAssetsInheritance,
      corpTaxEquiv,
      netAssetValuePerShare,
      netAssetPerShareBook,
    }
  }

  const netAssetCalcResult = computeNetAssetCalc()

  const applyNetAssetCalc = () => {
    if (!netAssetCalcResult) return
    updateData(
      'netAssetValue',
      Math.round(netAssetCalcResult.netAssetValuePerShare)
    )
    if (netAssetCalcResult.netAssetPerShareBook > 0) {
      updateData(
        'netAssetPerShare',
        Math.round(netAssetCalcResult.netAssetPerShareBook)
      )
    }
  }

  const performRealTimeCalculation = () => {
    const { companySize, lRatio } = companySizeData || {}
    const { isMinorityShareholder } = shareholderData || {}

    // 少数株主特則の適用（配当還元方式）通達188-2条
    if (isMinorityShareholder && data.dividendPerShare > 0) {
      const adjustedDividend = Math.max(data.dividendPerShare, 2.5)
      const capitalFactor = (data.capitalPerShare || 50) / 50
      const dividendYieldValue = (adjustedDividend / 0.1) * capitalFactor
      setCalculationResult({
        finalValue: dividendYieldValue,
        method: 'dividendYield',
        isValid: true,
      })
      return
    }

    const similarValue = calcSimilarIndustryValue(companySize || 'small')
    const hasRequiredValues =
      selectedIndustryData !== undefined && data.netAssetValue > 0

    if (!hasRequiredValues || !companySize) {
      setCalculationResult({ finalValue: 0, method: '', isValid: false })
      return
    }

    switch (companySize) {
      case 'large': {
        const lowerValue = Math.min(similarValue, data.netAssetValue)
        setCalculationResult({
          finalValue: lowerValue,
          method:
            similarValue <= data.netAssetValue ? 'similarIndustry' : 'netAsset',
          isValid: true,
        })
        break
      }
      case 'medium': {
        const na80 = data.netAssetValue * 0.8
        const combinedValue =
          similarValue * (lRatio || 0) + na80 * (1 - (lRatio || 0))
        const finalValue = Math.min(combinedValue, data.netAssetValue)
        setCalculationResult({ finalValue, method: 'combined', isValid: true })
        break
      }
      case 'small':
      default: {
        const combinedSmall = similarValue * 0.5 + data.netAssetValue * 0.5
        const smallFinal = Math.min(combinedSmall, data.netAssetValue)
        setCalculationResult({
          finalValue: Math.min(data.netAssetValue, smallFinal),
          method:
            smallFinal < data.netAssetValue ? 'smallCombined' : 'netAsset',
          isValid: true,
        })
        break
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (data.dividendPerShare < 0) {
      newErrors.dividendPerShare =
        '1株当たり年配当は0以上の値を入力してください'
    }
    if (data.profitPerShare < 0) {
      newErrors.profitPerShare = '1株当たり年利益は0以上の値を入力してください'
    }
    if (!validators.required(data.netAssetPerShare)) {
      newErrors.netAssetPerShare = getErrorMessage(
        '1株当たり純資産価額',
        'required'
      )
    }
    if (!validators.positive(data.netAssetPerShare)) {
      newErrors.netAssetPerShare = getErrorMessage(
        '1株当たり純資産価額',
        'positive'
      )
    }
    if (!selectedIndustryData) {
      newErrors.similarIndustryValue = getErrorMessage(
        '類似業種比準価額のデータ',
        'required'
      )
    }
    if (!validators.required(data.netAssetValue)) {
      newErrors.netAssetValue = getErrorMessage('純資産価額', 'required')
    }
    if (!validators.positive(data.netAssetValue)) {
      newErrors.netAssetValue = getErrorMessage('純資産価額', 'positive')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (!validateForm()) return

    const similarValue = calcSimilarIndustryValue(
      companySizeData?.companySize || 'small'
    )
    const finalData = {
      ...data,
      similarIndustryValue: similarValue,
      finalValue: calculationResult.finalValue,
      method: calculationResult.method,
      selectedIndustryData: selectedIndustryData
        ? { ...selectedIndustryData, year: selectedYear }
        : undefined,
    }
    setValuationData(finalData)
    router.push('/wizard/step5-result')
  }

  const handleBack = () => {
    router.push('/wizard/step3-size')
  }

  const { companySize, lRatio } = companySizeData || {}
  const { isMinorityShareholder } = shareholderData || {}

  useEffect(() => {
    performRealTimeCalculation()
  }, [
    data,
    companySize,
    lRatio,
    isMinorityShareholder,
    selectedIndustryData,
    selectedYear,
    selectedMonth,
  ])

  const fmt = (n: number) =>
    new Intl.NumberFormat('ja-JP').format(Math.round(n))

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <FormCard
        title="評価方式・計算（第3表）"
        description="会社規模に応じた評価方式を選択し、最終的な株式価額を計算します。"
        step={4}
        totalSteps={5}
      >
        {/* ── 基本数値（第4表・第5表） ── */}
        <FormSection title="基本数値（第4表・第5表）" required>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり年配当
                  <Tooltip text="会社の年間配当金 ÷ 発行済株式数。第4表で計算します。無配当の場合は0を入力してください。" />
                </div>
              }
              value={data.dividendPerShare}
              onChange={(value) => updateData('dividendPerShare', value)}
              placeholder="例: 50（無配当の場合は0）"
              min={0}
              error={errors.dividendPerShare}
              dataTestId="dividend-per-share"
            />
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり年利益
                  <Tooltip text="会社の年間利益 ÷ 発行済株式数。第4表で計算します。赤字・無利益の場合は0を入力してください。" />
                </div>
              }
              value={data.profitPerShare}
              onChange={(value) => updateData('profitPerShare', value)}
              placeholder="例: 100（赤字の場合は0）"
              min={0}
              error={errors.profitPerShare}
              dataTestId="profit-per-share"
            />
            <CurrencyInput
              label={
                <div className="flex items-center">
                  1株当たり純資産価額（帳簿）
                  <Tooltip text="帳簿価額による純資産 ÷ 発行済株式数（第5表）。類似業種比準式のd/D'に使います。下の計算補助ツールからも自動入力できます。" />
                </div>
              }
              value={data.netAssetPerShare}
              onChange={(value) => updateData('netAssetPerShare', value)}
              placeholder="例: 800"
              min={0}
              error={errors.netAssetPerShare}
              dataTestId="net-asset-per-share"
            />
          </div>
        </FormSection>

        {/* ── 類似業種比準価額データ選択 ── */}
        <FormSection title="評価価額" required>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                評価年
              </label>
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value)
                  setSelectedMajorCategory('')
                  setSelectedMediumCategory('')
                  setSelectedMinorCategory('')
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                評価月（課税時期の月）
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {Array.from({ length: 12 }, (_, i) => `${i + 1}月`).map(
                  (month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                大分類
              </label>
              <select
                value={selectedMajorCategory}
                onChange={(e) => {
                  setSelectedMajorCategory(e.target.value)
                  setSelectedMediumCategory('')
                  setSelectedMinorCategory('')
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {majorCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                中分類
              </label>
              <select
                value={selectedMediumCategory}
                onChange={(e) => {
                  setSelectedMediumCategory(e.target.value)
                  setSelectedMinorCategory('')
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {mediumCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                小分類
              </label>
              <select
                value={selectedMinorCategory}
                onChange={(e) => setSelectedMinorCategory(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {minorCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* 業種データ表示 + A 値内訳（通達180条 自動最低値選択） */}
            {selectedIndustryData && (
              <div className="rounded-lg bg-gray-100 p-4 md:col-span-2">
                <h4 className="mb-2 font-medium text-gray-900">
                  選択された業種データ
                </h4>
                <div className="grid grid-cols-2 gap-x-4 text-sm text-gray-700 md:grid-cols-4">
                  <p>B&apos; (配当): {selectedIndustryData.B_prime}</p>
                  <p>C&apos; (利益): {selectedIndustryData.C_prime}</p>
                  <p>D&apos; (純資産): {selectedIndustryData.D_prime}</p>
                </div>

                {/* 通達180条: A 値の5候補と採用値 */}
                {aValueBreakdown && (
                  <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-blue-800">
                      株価 A の選定（通達180条）—
                      下記5候補のうち最低値を自動採用
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-3">
                      {[
                        {
                          label: `①${selectedYear.replace('年', '')}年${selectedMonth}（課税時期の月）`,
                          val: aValueBreakdown.currentMonth,
                        },
                        { label: `②前月`, val: aValueBreakdown.prevMonth },
                        {
                          label: `③前々月`,
                          val: aValueBreakdown.prevPrevMonth,
                        },
                        {
                          label: `④前年年均（A）`,
                          val: aValueBreakdown.prevYearAverage,
                        },
                        {
                          label: `⑤直前2年平均`,
                          val: aValueBreakdown.prev2YearsAverage,
                        },
                      ].map(({ label, val }) => {
                        const isSelected =
                          val !== null && val === aValueBreakdown.selected
                        return (
                          <span
                            key={label}
                            className={
                              isSelected
                                ? 'font-bold text-blue-900'
                                : 'text-gray-600'
                            }
                          >
                            {label}: {val !== null ? val : '―'}
                            {isSelected && ' ★採用'}
                          </span>
                        )
                      })}
                    </div>
                    <p className="mt-2 text-xs font-bold text-blue-900">
                      採用A値: {aValueBreakdown.selected}
                      {aValueBreakdown.selected === 0 && (
                        <span className="ml-1 text-red-600">
                          （月次データなし・前年平均に自動フォールバック）
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
            {errors.similarIndustryValue && (
              <p className="text-sm text-red-600 md:col-span-2">
                {errors.similarIndustryValue}
              </p>
            )}
          </div>
        </FormSection>

        {/* ── 純資産価額（相続税評価額ベース） ── */}
        <FormSection title="純資産価額（第5表・通達185条）" required>
          <div className="space-y-4">
            {/* 計算補助ツール（トグル） */}
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <button
                type="button"
                onClick={() => setShowNetAssetCalc((v) => !v)}
                className="flex w-full items-center justify-between text-left text-sm font-medium text-indigo-800"
              >
                <span>
                  純資産価額 自動計算補助ツール（決算書の数字から算出）
                </span>
                <span className="ml-2">
                  {showNetAssetCalc ? '▲ 閉じる' : '▼ 開く'}
                </span>
              </button>

              {showNetAssetCalc && (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-indigo-700">
                    相続税申告用の決算書（直前期末）の数字を入力すると、純資産価額（1株当たり）を自動計算します。
                    <br />※
                    相続税評価額による総資産は、土地・有価証券等を相続税評価額に置き換えた後の金額です。
                  </p>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        相続税評価額による総資産合計（円）
                        <Tooltip text="土地・有価証券等を相続税評価額に置き換えた貸借対照表の資産合計額" />
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={netAssetCalc.totalAssetsInheritance || ''}
                        onChange={(e) =>
                          setNetAssetCalc((prev) => ({
                            ...prev,
                            totalAssetsInheritance:
                              parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="例: 500000000"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        負債合計（円）
                        <Tooltip text="貸借対照表の負債合計（流動負債＋固定負債）" />
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={netAssetCalc.totalLiabilities || ''}
                        onChange={(e) =>
                          setNetAssetCalc((prev) => ({
                            ...prev,
                            totalLiabilities: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="例: 200000000"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        帳簿価額による純資産（円）
                        <Tooltip text="帳簿価額ベースの純資産（資本金＋資本剰余金＋利益剰余金等）。法人税等相当額（37%）の計算に使用します。" />
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={netAssetCalc.netAssetsBook || ''}
                        onChange={(e) =>
                          setNetAssetCalc((prev) => ({
                            ...prev,
                            netAssetsBook: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="例: 100000000"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-700">
                        発行済株式数（株）
                        <Tooltip text="自己株式を除く発行済株式の総数" />
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={netAssetCalc.totalShares || ''}
                        onChange={(e) =>
                          setNetAssetCalc((prev) => ({
                            ...prev,
                            totalShares: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="例: 10000"
                      />
                    </div>
                  </div>

                  {netAssetCalcResult && netAssetCalc.totalShares > 0 && (
                    <div className="rounded-md border border-indigo-300 bg-white p-3 text-xs">
                      <p className="mb-2 font-semibold text-gray-800">
                        計算結果（通達185条）
                      </p>
                      <div className="space-y-1 text-gray-700">
                        <p>
                          相続税評価額による純資産:{' '}
                          <strong>
                            {fmt(netAssetCalcResult.netAssetsInheritance)} 円
                          </strong>
                          <span className="ml-1 text-gray-500">
                            （総資産 − 負債合計）
                          </span>
                        </p>
                        <p>
                          法人税等相当額（37%）:{' '}
                          <strong>
                            {fmt(netAssetCalcResult.corpTaxEquiv)} 円
                          </strong>
                          <span className="ml-1 text-gray-500">
                            （相続評価純資産 − 帳簿純資産）× 37%、負の場合は0
                          </span>
                        </p>
                        <p className="border-t border-indigo-200 pt-1 font-bold text-indigo-900">
                          純資産価額（1株当たり）:{' '}
                          {fmt(netAssetCalcResult.netAssetValuePerShare)} 円
                        </p>
                        {netAssetCalcResult.netAssetPerShareBook > 0 && (
                          <p className="font-bold text-indigo-900">
                            帳簿ベース1株当たり純資産（d）:{' '}
                            {fmt(netAssetCalcResult.netAssetPerShareBook)} 円
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={applyNetAssetCalc}
                        className="mt-3 rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        この値を下のフォームに反映する
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 純資産価額 直接入力 */}
            <CurrencyInput
              label={
                <div className="flex items-center">
                  純資産価額（1株当たり、相続税評価額ベース）
                  <Tooltip text="通達185条: (相続税評価額による総資産 − 負債合計 − 法人税等相当額) ÷ 発行済株式数。上の計算補助ツールで自動計算できます。" />
                </div>
              }
              value={data.netAssetValue}
              onChange={(value) => updateData('netAssetValue', value)}
              placeholder="例: 800"
              min={0}
              error={errors.netAssetValue}
              dataTestId="net-asset-value"
            />
            <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              <p className="mb-1 font-medium text-gray-700">
                純資産価額の算定について（通達185条）
              </p>
              <p>
                法人税等相当額 = (相続税評価額による純資産 −
                帳簿価額による純資産) × 37%
              </p>
              <p>
                1株当たり純資産価額 = (相続税評価額による総資産 − 負債合計 −
                法人税等相当額) ÷ 発行済株式数
              </p>
              <p className="mt-1 text-gray-400">
                ※
                「1株当たり純資産価額（帳簿）」（上段・第4表）は類似業種比準式のdに使用する帳簿ベースの値で、これとは別の数字です。
              </p>
            </div>
          </div>
        </FormSection>

        {/* ── 少数株主特則（配当還元方式） ── */}
        {isMinorityShareholder && (
          <FormSection title="少数株主特則（配当還元方式）">
            <div className="space-y-3 rounded-lg bg-blue-50 p-4">
              <p className="text-sm text-blue-800">
                少数株主（5%未満）のため、配当還元方式が適用されます。
              </p>
              <p className="text-xs text-blue-700">
                計算式: (年配当金額（下限2円50銭）÷ 10%) ×
                (1株当たり資本金等の額 ÷ 50円)
              </p>
              <div className="mt-2">
                <CurrencyInput
                  label={
                    <div className="flex items-center">
                      1株当たりの資本金等の額
                      <Tooltip text="直前期末の資本金等の額 ÷ 発行済株式数で計算します。額面50円の場合は50円です。" />
                    </div>
                  }
                  value={data.capitalPerShare}
                  onChange={(value) => updateData('capitalPerShare', value)}
                  placeholder="例: 50"
                  min={0}
                  dataTestId="capital-per-share"
                />
              </div>
              <p className="text-xs text-blue-600">
                ※
                通達188-2条により還元率は10%（固定）です。資本金等の額が50円でない場合は調整が行われます。
              </p>
            </div>
          </FormSection>
        )}

        {/* ── 評価方式の説明 ── */}
        <FormSection title="評価方式">
          <div className="rounded-lg bg-gray-50 p-4">
            <div className="space-y-2 text-sm">
              {companySize === 'large' && (
                <div>
                  <p className="font-medium">
                    大会社:
                    類似業種比準価額と純資産価額の低い方を採用（しんしゃく率0.7）
                  </p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;)
                    / 3) × 0.7
                  </p>
                  <p className="text-xs text-gray-600">
                    最終評価額: min(類似業種比準価額, 純資産価額)
                  </p>
                </div>
              )}
              {companySize === 'medium' && (
                <div>
                  <p className="font-medium">
                    中会社
                    {companySizeData?.lClass
                      ? `（${companySizeData.lClass}）`
                      : ''}
                    : 併用方式（L = {lRatio}、しんしゃく率0.6）
                  </p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;)
                    / 3) × 0.6
                  </p>
                  <p className="text-xs text-gray-600">
                    最終評価額: min(類似業種比準 × {lRatio} +
                    純資産価額(80%相当) × {1 - (lRatio || 0)}, 純資産価額)
                  </p>
                </div>
              )}
              {companySize === 'small' && (
                <div>
                  <p className="font-medium">
                    小会社:
                    純資産価額方式（任意で併用方式も可、しんしゃく率0.5）
                  </p>
                  <p className="text-xs text-gray-600">
                    類似業種比準価額 = A × ((b/B&apos; + c/C&apos; + d/D&apos;)
                    / 3) × 0.5
                  </p>
                  <p className="text-xs text-gray-600">
                    原則: 純資産価額 / 任意併用: min(類似業種比準 × 0.5 + 純資産
                    × 0.5, 純資産価額)
                  </p>
                </div>
              )}
              {isMinorityShareholder && (
                <div>
                  <p className="font-medium text-blue-600">
                    少数株主特則: 配当還元方式
                  </p>
                  <p className="text-xs text-gray-600">
                    最終評価額: (年配当金額（下限2円50銭）÷ 10%) ×
                    (1株当たり資本金等の額 ÷ 50円)
                  </p>
                </div>
              )}
            </div>
          </div>
        </FormSection>

        {/* ── 計算結果 ── */}
        {calculationResult.isValid && calculationResult.finalValue > 0 ? (
          <FormSection title="計算結果">
            {/* 最終評価額 サマリー */}
            <div className="rounded-lg border-2 border-green-400 bg-green-50 p-5">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    適用評価方式
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {calculationResult.method === 'dividendYield'
                      ? '配当還元方式（少数株主）'
                      : calculationResult.method === 'similarIndustry'
                        ? '類似業種比準価額方式'
                        : calculationResult.method === 'netAsset'
                          ? '純資産価額方式'
                          : calculationResult.method === 'smallCombined'
                            ? '併用方式（小会社）'
                            : '併用方式（中会社）'}
                  </p>
                  <p className="mt-1 text-xs text-green-600">
                    ※ 入力値を変更すると自動再計算されます
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-900">
                    {fmt(calculationResult.finalValue)} 円
                  </div>
                  <div className="text-sm text-green-700">1株当たり評価額</div>
                </div>
              </div>
            </div>

            {/* 計算の詳細 トグル */}
            <button
              type="button"
              onClick={() => setShowCalcDetail((v) => !v)}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <span>
                計算の根拠を{showCalcDetail ? '閉じる' : '見る'}
                （素人の方もご確認ください）
              </span>
              <span>{showCalcDetail ? '▲' : '▼'}</span>
            </button>

            {showCalcDetail && selectedIndustryData && aValueBreakdown && (
              <div className="mt-2 space-y-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
                {/* STEP 1: 類似業種比準価額 */}
                {calculationResult.method !== 'dividendYield' && (
                  <div>
                    <p className="mb-2 border-b pb-1 font-bold text-gray-900">
                      STEP 1 ｜ 類似業種比準価額の計算（財産評価基本通達180条）
                    </p>
                    <p className="mb-2 text-xs text-gray-500">
                      国税庁が公表している「類似業種」の株価・財務データと、評価会社の数字を比べて算出します。
                    </p>

                    {/* 株価 A */}
                    <div className="mb-3 rounded-md bg-blue-50 p-3">
                      <p className="mb-1 font-semibold text-blue-900">
                        株価 A = {aValueBreakdown.selected}{' '}
                        円（5つの候補の中の最低値を自動採用）
                      </p>
                      <p className="mb-2 text-xs text-blue-700">
                        通達180条:
                        課税時期の月・前月・前々月・前年平均・直前2年平均のうち最も低い値を使います。
                      </p>
                      <div className="grid grid-cols-1 gap-0.5 text-xs md:grid-cols-2">
                        {[
                          {
                            no: '①',
                            label: `課税時期の月（${selectedMonth}）`,
                            val: aValueBreakdown.currentMonth,
                          },
                          {
                            no: '②',
                            label: '前月',
                            val: aValueBreakdown.prevMonth,
                          },
                          {
                            no: '③',
                            label: '前々月',
                            val: aValueBreakdown.prevPrevMonth,
                          },
                          {
                            no: '④',
                            label: '前年年均（A）',
                            val: aValueBreakdown.prevYearAverage,
                          },
                          {
                            no: '⑤',
                            label: '直前2年平均',
                            val: aValueBreakdown.prev2YearsAverage,
                          },
                        ].map(({ no, label, val }) => {
                          const isAdopted =
                            val !== null && val === aValueBreakdown.selected
                          return (
                            <div
                              key={no}
                              className={`flex justify-between rounded px-2 py-0.5 ${isAdopted ? 'bg-blue-200 font-bold text-blue-900' : 'text-gray-600'}`}
                            >
                              <span>
                                {no} {label}
                              </span>
                              <span>
                                {val !== null ? `${val} 円` : 'データなし'}
                                {isAdopted ? ' ← 採用' : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* b/B', c/C', d/D' */}
                    <div className="mb-3 rounded-md bg-gray-50 p-3">
                      <p className="mb-1 font-semibold text-gray-800">
                        比準割合の計算
                      </p>
                      <p className="mb-2 text-xs text-gray-500">
                        評価会社の配当・利益・純資産を、国税庁の類似業種の値と比べます。
                      </p>
                      {(() => {
                        const bRatio =
                          selectedIndustryData.B_prime > 0
                            ? data.dividendPerShare /
                              selectedIndustryData.B_prime
                            : 0
                        const cRatio =
                          selectedIndustryData.C_prime > 0
                            ? data.profitPerShare / selectedIndustryData.C_prime
                            : 0
                        const dRatio =
                          selectedIndustryData.D_prime > 0
                            ? data.netAssetPerShare /
                              selectedIndustryData.D_prime
                            : 0
                        const comparativeRatio = (bRatio + cRatio + dRatio) / 3
                        const discountRate =
                          companySize === 'large'
                            ? 0.7
                            : companySize === 'medium'
                              ? 0.6
                              : 0.5
                        const simValue =
                          aValueBreakdown.selected *
                          comparativeRatio *
                          discountRate
                        return (
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between border-b border-gray-200 py-1">
                              <span className="text-gray-600">
                                b ÷ B&apos;（配当の比率）
                              </span>
                              <span>
                                {data.dividendPerShare}円 ÷{' '}
                                {selectedIndustryData.B_prime} ={' '}
                                <strong>{bRatio.toFixed(2)}</strong>
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 py-1">
                              <span className="text-gray-600">
                                c ÷ C&apos;（利益の比率）
                              </span>
                              <span>
                                {data.profitPerShare}円 ÷{' '}
                                {selectedIndustryData.C_prime} ={' '}
                                <strong>{cRatio.toFixed(2)}</strong>
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 py-1">
                              <span className="text-gray-600">
                                d ÷ D&apos;（純資産の比率）
                              </span>
                              <span>
                                {data.netAssetPerShare}円 ÷{' '}
                                {selectedIndustryData.D_prime} ={' '}
                                <strong>{dRatio.toFixed(2)}</strong>
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 py-1">
                              <span className="text-gray-600">
                                比準割合（3つの平均）
                              </span>
                              <span>
                                ({bRatio.toFixed(2)} + {cRatio.toFixed(2)} +{' '}
                                {dRatio.toFixed(2)}) ÷ 3 ={' '}
                                <strong>{comparativeRatio.toFixed(3)}</strong>
                              </span>
                            </div>
                            <div className="flex justify-between py-1">
                              <span className="text-gray-600">
                                しんしゃく率（会社規模による割引）
                              </span>
                              <span>
                                {companySize === 'large'
                                  ? '大会社'
                                  : companySize === 'medium'
                                    ? '中会社'
                                    : '小会社'}
                                : <strong>{discountRate}</strong>
                                <span className="ml-1 text-gray-400">
                                  （大0.7・中0.6・小0.5）
                                </span>
                              </span>
                            </div>
                            <div className="mt-1 rounded bg-blue-100 px-3 py-2 font-bold text-blue-900">
                              類似業種比準価額 = {aValueBreakdown.selected} ×{' '}
                              {comparativeRatio.toFixed(3)} × {discountRate} ={' '}
                              <strong>{fmt(simValue)} 円</strong>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {/* STEP 2: 純資産価額 */}
                {calculationResult.method !== 'dividendYield' && (
                  <div>
                    <p className="mb-2 border-b pb-1 font-bold text-gray-900">
                      STEP 2 ｜ 純資産価額（財産評価基本通達185条）
                    </p>
                    <div className="rounded-md bg-orange-50 p-3 text-xs">
                      <p className="mb-1 font-semibold text-orange-900">
                        純資産価額（相続税評価額ベース）={' '}
                        {fmt(data.netAssetValue)} 円
                      </p>
                      <p className="text-orange-700">
                        算式: (相続税評価額による総資産 − 負債合計 −
                        法人税等相当額) ÷ 発行済株式数
                      </p>
                      <p className="mt-1 text-gray-500">
                        ※ 上の「純資産価額 自動計算補助ツール」で計算できます
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 3: 最終評価額の決定 */}
                <div>
                  <p className="mb-2 border-b pb-1 font-bold text-gray-900">
                    {calculationResult.method === 'dividendYield'
                      ? ''
                      : 'STEP 3 ｜ '}
                    最終評価額の決定（財産評価基本通達178〜179条）
                  </p>

                  {calculationResult.method === 'dividendYield' &&
                    (() => {
                      const adjustedDiv = Math.max(data.dividendPerShare, 2.5)
                      const capFactor = (data.capitalPerShare || 50) / 50
                      return (
                        <div className="space-y-1 rounded-md bg-blue-50 p-3 text-xs">
                          <p className="font-semibold text-blue-900">
                            配当還元方式（少数株主 通達188-2条）
                          </p>
                          <p className="text-blue-700">
                            少数株主（議決権5%未満）は、配当をもとに評価します。
                          </p>
                          <div className="mt-2 space-y-0.5">
                            <div className="flex justify-between">
                              <span>年配当（下限2円50銭）</span>
                              <span>{adjustedDiv} 円</span>
                            </div>
                            <div className="flex justify-between">
                              <span>資本金等の額 ÷ 50円（補正係数）</span>
                              <span>
                                {data.capitalPerShare}円 ÷ 50 ={' '}
                                {capFactor.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between font-bold text-blue-900">
                              <span>配当還元価額</span>
                              <span>
                                {adjustedDiv} ÷ 10% × {capFactor.toFixed(2)} ={' '}
                                {fmt(calculationResult.finalValue)} 円
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                  {companySize === 'large' &&
                    calculationResult.method !== 'dividendYield' &&
                    (() => {
                      const bRatio =
                        selectedIndustryData.B_prime > 0
                          ? data.dividendPerShare / selectedIndustryData.B_prime
                          : 0
                      const cRatio =
                        selectedIndustryData.C_prime > 0
                          ? data.profitPerShare / selectedIndustryData.C_prime
                          : 0
                      const dRatio =
                        selectedIndustryData.D_prime > 0
                          ? data.netAssetPerShare / selectedIndustryData.D_prime
                          : 0
                      const simValue =
                        aValueBreakdown.selected *
                        ((bRatio + cRatio + dRatio) / 3) *
                        0.7
                      const adopted =
                        simValue <= data.netAssetValue
                          ? '類似業種比準価額'
                          : '純資産価額'
                      return (
                        <div className="space-y-1 rounded-md bg-gray-50 p-3 text-xs">
                          <p className="font-semibold">
                            大会社: 類似業種比準価額と純資産価額の低い方を採用
                          </p>
                          <div className="flex justify-between">
                            <span>類似業種比準価額</span>
                            <span>{fmt(simValue)} 円</span>
                          </div>
                          <div className="flex justify-between">
                            <span>純資産価額</span>
                            <span>{fmt(data.netAssetValue)} 円</span>
                          </div>
                          <div className="mt-1 rounded bg-green-100 px-2 py-1 font-bold text-green-900">
                            → {adopted}が低い → 採用:{' '}
                            {fmt(calculationResult.finalValue)} 円
                          </div>
                        </div>
                      )
                    })()}

                  {companySize === 'medium' &&
                    calculationResult.method !== 'dividendYield' &&
                    (() => {
                      const bRatio =
                        selectedIndustryData.B_prime > 0
                          ? data.dividendPerShare / selectedIndustryData.B_prime
                          : 0
                      const cRatio =
                        selectedIndustryData.C_prime > 0
                          ? data.profitPerShare / selectedIndustryData.C_prime
                          : 0
                      const dRatio =
                        selectedIndustryData.D_prime > 0
                          ? data.netAssetPerShare / selectedIndustryData.D_prime
                          : 0
                      const simValue =
                        aValueBreakdown.selected *
                        ((bRatio + cRatio + dRatio) / 3) *
                        0.6
                      const na80 = data.netAssetValue * 0.8
                      const L = lRatio || 0
                      const combined = simValue * L + na80 * (1 - L)
                      return (
                        <div className="space-y-1 rounded-md bg-gray-50 p-3 text-xs">
                          <p className="font-semibold">
                            中会社（L = {L}）:
                            類似業種比準価額と純資産価額(80%)の加重平均
                          </p>
                          <div className="flex justify-between">
                            <span>類似業種比準価額 × L</span>
                            <span>
                              {fmt(simValue)} × {L} = {fmt(simValue * L)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>純資産価額(80%) × (1−L)</span>
                            <span>
                              {fmt(na80)} × {1 - L} = {fmt(na80 * (1 - L))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>加重平均</span>
                            <span>{fmt(combined)} 円</span>
                          </div>
                          <div className="flex justify-between">
                            <span>純資産価額（上限）</span>
                            <span>{fmt(data.netAssetValue)} 円</span>
                          </div>
                          <div className="mt-1 rounded bg-green-100 px-2 py-1 font-bold text-green-900">
                            → min({fmt(combined)}, {fmt(data.netAssetValue)}) ={' '}
                            {fmt(calculationResult.finalValue)} 円
                          </div>
                        </div>
                      )
                    })()}

                  {companySize === 'small' &&
                    calculationResult.method !== 'dividendYield' &&
                    (() => {
                      const bRatio =
                        selectedIndustryData.B_prime > 0
                          ? data.dividendPerShare / selectedIndustryData.B_prime
                          : 0
                      const cRatio =
                        selectedIndustryData.C_prime > 0
                          ? data.profitPerShare / selectedIndustryData.C_prime
                          : 0
                      const dRatio =
                        selectedIndustryData.D_prime > 0
                          ? data.netAssetPerShare / selectedIndustryData.D_prime
                          : 0
                      const simValue =
                        aValueBreakdown.selected *
                        ((bRatio + cRatio + dRatio) / 3) *
                        0.5
                      const combined = simValue * 0.5 + data.netAssetValue * 0.5
                      return (
                        <div className="space-y-1 rounded-md bg-gray-50 p-3 text-xs">
                          <p className="font-semibold">
                            小会社:
                            原則は純資産価額、任意で類似業種比準と50%ずつ併用可
                          </p>
                          <div className="flex justify-between">
                            <span>純資産価額（原則）</span>
                            <span>{fmt(data.netAssetValue)} 円</span>
                          </div>
                          <div className="flex justify-between">
                            <span>
                              類似業種比準 × 0.5 + 純資産 × 0.5（任意）
                            </span>
                            <span>{fmt(combined)} 円</span>
                          </div>
                          <div className="mt-1 rounded bg-green-100 px-2 py-1 font-bold text-green-900">
                            → 低い方を採用: {fmt(calculationResult.finalValue)}{' '}
                            円
                          </div>
                        </div>
                      )
                    })()}
                </div>
              </div>
            )}
          </FormSection>
        ) : (
          (data.dividendPerShare > 0 ||
            data.profitPerShare > 0 ||
            data.netAssetPerShare > 0 ||
            data.netAssetValue > 0) && (
            <FormSection title="計算結果">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-center">
                  <svg
                    className="mr-2 h-5 w-5 text-yellow-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <p className="text-sm text-yellow-800">
                    業種データの選択と純資産価額（相続税評価額ベース）を入力すると計算結果が表示されます。
                  </p>
                </div>
              </div>
            </FormSection>
          )
        )}

        <FormActions>
          <button onClick={handleBack} className="btn-secondary">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            戻る
          </button>
          <button
            onClick={handleNext}
            className="btn-primary"
            data-testid="next-step"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
            次へ（結果確認）
          </button>
        </FormActions>
      </FormCard>
    </div>
  )
}
