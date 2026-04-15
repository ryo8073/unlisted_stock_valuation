/**
 * 類似業種比準価額のしんしゃく率を適用する（通達180条）
 * 大会社: 0.7、中会社: 0.6、小会社: 0.5
 */
export function applyDiscountRate(
  A: number,
  bRatio: number,
  cRatio: number,
  dRatio: number,
  companySize: "大会社" | "中会社" | "小会社"
): number {
  const discountRates: Record<string, number> = {
    "大会社": 0.7,
    "中会社": 0.6,
    "小会社": 0.5,
  };
  const rate = discountRates[companySize] ?? 0.7;
  // 類似業種比準価額 = A × { (b/B' + c/C' + d/D') / 3 } × しんしゃく率
  return A * ((bRatio + cRatio + dRatio) / 3) * rate;
}

export function midFormula(similar: number, L: number, netAsset: number, netAsset80?: number) {
  // 国税庁第3表準拠: 類似業種比準価額×L + 1株当たり純資産価額(80%相当額)×(1-L)
  // 80%相当額が未入力なら純資産×0.8を採用
  const na80 = netAsset80 ?? netAsset * 0.8;
  const combined = similar * L + na80 * (1 - L);
  // 純資産価額（100%）との比較で低い方を採用
  return Math.min(combined, netAsset);
}

export function largeFormula(similar: number, netAsset: number) {
  return Math.min(similar, netAsset);
}

export function smallFormula(netAsset: number) {
  return netAsset;
}

/**
 * 小会社の併用方式（任意適用）
 * 類似業種比準価額×0.5 + 純資産価額×0.5
 * 結果が純資産価額より低い場合に採用可能
 */
export function smallCombinedFormula(similar: number, netAsset: number) {
  const combined = similar * 0.5 + netAsset * 0.5;
  return Math.min(combined, netAsset);
}

/**
 * 配当還元方式（通達188-2条）
 * 年配当金額 / (10/100) × (資本金等の額 / 発行済株式数 / 50円)
 * 簡易版: (年配当金額 ÷ 10%) = 年配当金額 × 10
 * ただし年配当金額が2円50銭未満の場合は2円50銭とする
 */
export function dividendYieldFormula(annualDividendPerShare: number, parValuePerShare: number = 50): number {
  // 1株当たりの年配当金額（2円50銭が下限）
  const adjustedDividend = Math.max(annualDividendPerShare, 2.5);
  // 配当還元価額 = 年配当金額 / 10% = 年配当金額 × 10
  // ただし1株の資本金等が50円でない場合は調整が必要
  return (adjustedDividend / 0.10) * (parValuePerShare / 50);
}

// 端数規定・配当2円50銭等（必要に応じて拡張）
export function roundPPS(v: number, unit = 1) {
  return Math.floor(v / unit) * unit;
}
  