"use client";
import t12 from "@/rules/t1-2_size.json";

export default function BandTable({
  industry, assets, fte, revenue
}: { industry: "卸売業"|"小売・サービス業"|"卸売・小売・サービス以外"; assets: number; fte: number; revenue: number; }) {

  const empBand = pickBandEmp(fte);
  const assetBand = pickBandGeneric((t12 as any).assets_byIndustry[industry], assets);
  const revBand = pickBandGeneric((t12 as any).revenue_byIndustry[industry], revenue);

  return (
    <div className="grid md:grid-cols-2 gap-4 text-sm">
      <div className="border rounded bg-white">
        <div className="px-3 py-2 font-semibold">チ欄：総資産 × 従業員（下位を採用）</div>
        <div className="px-3 pb-3 text-xs text-gray-600">従業員帯：{empBand} ／ 総資産帯：{assetBand}</div>
        <ul className="px-3 pb-3 space-y-1">
          {((t12 as any).assets_byIndustry[industry] as any[]).map((b, i)=>(
            <li key={i} className={`px-2 py-1 rounded ${assetBand===b.label?"bg-blue-50 border border-blue-200": "bg-gray-50"}`}>
              {b.label}：{fmt(b.min)}〜{fmtLt(b.max)}
            </li>
          ))}
        </ul>
      </div>
      <div className="border rounded bg-white">
        <div className="px-3 py-2 font-semibold">リ欄：取引金額（売上等）</div>
        <ul className="px-3 pb-3 space-y-1">
          {((t12 as any).revenue_byIndustry[industry] as any[]).map((b, i)=>(
            <li key={i} className={`px-2 py-1 rounded ${revBand===b.label?"bg-green-50 border border-green-200": "bg-gray-50"}`}>
              {b.label}：{fmt(b.min)}〜{fmtLt(b.max)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function pickBandGeneric(arr: any[], v: number) {
  const b = arr.find(b => (b.min==null || v>=b.min) && (b.max==null || v<b.max)) || arr[arr.length-1];
  return b.label;
}
function pickBandEmp(v: number) {
  const b = (t12.employees.bands as any[]).find(b => (b.min==null || v>=b.min) && (b.max==null || v<=b.max));
  return b?.label ?? "小会社";
}
function fmt(n?: number) { if (n==null) return "—"; return n.toLocaleString()+"円以上"; }
function fmtLt(n?: number) { if (n==null) return "—"; return (n-1).toLocaleString()+"円以下"; }
