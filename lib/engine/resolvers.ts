import t12 from "@/rules/t1-2_size.json";

const ORDER: Record<string, number> = { "大会社":0,"中の大":1,"中の中":2,"中の小":3,"小会社":4 };

export const toFTE = (full: number, partHrs: number) => full + (partHrs||0)/1800;

export function pickEmpBand(fte: number): string {
  const b = t12.employees.bands.find(b =>
    (b.min == null || fte >= b.min) && (b.max == null || fte <= b.max)
  );
  return b?.label || "小会社";
}

export function pickAssetBand(industry: string, assets: number): string {
  const arr = (t12.assets_byIndustry as any)[industry] as Array<any>;
  const b = arr.find(b =>
    (b.min == null || assets >= b.min) && (b.max == null || assets < b.max)
  ) || arr[arr.length-1];
  return b.label;
}

export function pickRevenueBand(industry: string, rev: number): string {
  const arr = (t12.revenue_byIndustry as any)[industry] as Array<any>;
  const b = arr.find(b =>
    (b.min == null || rev >= b.min) && (b.max == null || rev < b.max)
  ) || arr[arr.length-1];
  return b.label;
}

export function lowerOf(a: string, b: string): string {
  return ORDER[a] > ORDER[b] ? a : b; // 序数の「下位」を返す
}
export function upperOf(a: string, b: string): string {
  return ORDER[a] < ORDER[b] ? a : b; // 序数の「上位」を返す
}

export function LOf(band: string): number {
  return (t12.decision.L_map as any)[band] ?? 0;
}
