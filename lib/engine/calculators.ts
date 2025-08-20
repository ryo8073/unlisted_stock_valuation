export function midFormula(similar: number, L: number, netAsset: number, netAsset80?: number) {
  // 国税庁第3表準拠: 類似業種比準価額×L + 純資産価額×(1-L)
  const combined = similar*L + netAsset*(1-L);
  // 純資産価額との比較で低い方を採用
  return Math.min(combined, netAsset);
}
  
  export function largeFormula(similar: number, netAsset: number) {
    return Math.min(similar, netAsset);
  }
  
  export function smallFormula(netAsset: number) {
    return netAsset;
  }
  
  // 端数規定・配当2円50銭等（必要に応じて拡張）
  export function roundPPS(v: number, unit = 1) {
    return Math.floor(v / unit) * unit;
  }
  