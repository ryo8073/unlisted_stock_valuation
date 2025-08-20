"use client";
import { useState } from "react";
import { v4 as uuid } from "uuid";

type Row = { id: string; name: string; votes: number; inFamily: boolean; inTop: boolean; isTaxpayer: boolean; };

export default function ShareholderTable({ onChange }:{ onChange:(rows:Row[])=>void }) {
  const [rows, setRows] = useState<Row[]>([
    { id: uuid(), name: "納税義務者", votes: 0, inFamily: true, inTop: true, isTaxpayer: true }
  ]);
  const totalVotes = rows.reduce((s,r)=>s+(Number(r.votes)||0),0);
  const familyVotes = rows.filter(r=>r.inFamily).reduce((s,r)=>s+(Number(r.votes)||0),0);
  const topVotes    = rows.filter(r=>r.inTop).reduce((s,r)=>s+(Number(r.votes)||0),0);
  const taxpayer    = rows.find(r=>r.isTaxpayer);
  const selfRatio = totalVotes ? (Number(taxpayer?.votes)||0)/totalVotes : 0;

  const pushChange = (next: Row[]) => { setRows(next); onChange(next); };
  const set = (id: string, k: keyof Row, v: any) => pushChange(rows.map(r=>r.id===id?{...r,[k]:v}:r));

  return (
    <div className="space-y-3">
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2">氏名/名称</th>
            <th className="p-2 text-right">議決権数</th>
            <th className="p-2">同族関係者</th>
            <th className="p-2">筆頭グループ</th>
            <th className="p-2">納税義務者</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="p-2"><input className="w-full border px-2 py-1" value={r.name} onChange={e=>set(r.id,"name",e.target.value)} /></td>
              <td className="p-2 text-right"><input type="number" className="w-full border px-2 py-1 text-right" value={r.votes} onChange={e=>set(r.id,"votes",Number(e.target.value))} /></td>
              <td className="p-2 text-center"><input type="checkbox" checked={r.inFamily} onChange={e=>set(r.id,"inFamily",e.target.checked)} /></td>
              <td className="p-2 text-center"><input type="checkbox" checked={r.inTop} onChange={e=>set(r.id,"inTop",e.target.checked)} /></td>
              <td className="p-2 text-center"><input type="radio" name="taxpayer" checked={r.isTaxpayer} onChange={()=>pushChange(rows.map(x=>({...x,isTaxpayer:x.id===r.id})))} /></td>
              <td className="p-2 text-center">
                {rows.length>1 && <button className="text-red-600" onClick={()=>pushChange(rows.filter(x=>x.id!==r.id))}>削除</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex gap-2">
        <button className="border px-3 py-1 rounded" onClick={()=>pushChange([...rows,{ id:uuid(), name:"", votes:0, inFamily:false, inTop:false, isTaxpayer:false }])}>＋ 行を追加</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="④ 総議決権数" value={totalVotes.toLocaleString()} />
        <Stat label="(ハ) 納税義務者の議決権割合" value={totalVotes?((selfRatio*100).toFixed(2)+"%"):"-"} />
        <Stat label="⑤ 同族関係者グループ割合" value={totalVotes?((familyVotes/totalVotes*100).toFixed(2)+"%"):"-"} />
        <Stat label="⑥ 筆頭株主グループ割合" value={totalVotes?((topVotes/totalVotes*100).toFixed(2)+"%"):"-"} />
      </div>

      {(selfRatio < 0.05) && <div className="text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
        注：同族株主等に該当しても(ハ)が5%未満の場合は「少数株式所有者の評価方式の判定」へ（第1表の1 注記）。
      </div>}
    </div>
  );
}

function Stat({label,value}:{label:string;value:string}) {
  return <div className="border rounded p-3 bg-white"><div className="text-xs text-gray-500">{label}</div><div className="text-lg font-bold">{value}</div></div>;
}
