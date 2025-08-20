// /components/ResultSummary.tsx
"use client";

import React from "react";
import { useEvalStore } from "@/lib/store/evalStore";

interface EvalResult {
  shareholder?: {
    gridResult?: string;
    minority?: boolean;
    selfVoteRatio?: number;
    familyGroupRatio?: number;
    topGroupRatio?: number;
  };
  special?: { specialType?: string };
  size?: {
    size: "大会社" | "中会社" | "小会社";
    LClass: string;
    L: number;
    fte?: number;
  };
  valuation?: { perShare?: number };
  trail?: Array<{ node: string; out: any; sourceRef?: string }>;
}

export default function ResultSummary({ data }: { data: EvalResult }) {
  return (
    <div className="space-y-4">
      <section className="grid md:grid-cols-3 gap-4">
        <Card title="株主判定（第1表の1）">
          <DL
            items={[
              ["区分", data.shareholder?.gridResult || "—"],
              ["5%未満特則", data.shareholder?.minority ? "適用" : "—"],
              ["(ハ) 自己割合", fmtPct(data.shareholder?.selfVoteRatio)],
              ["⑤ 同族関係者", fmtPct(data.shareholder?.familyGroupRatio)],
              ["⑥ 筆頭グループ", fmtPct(data.shareholder?.topGroupRatio)],
            ]}
          />
        </Card>
        <Card title="特定会社等（第2表）">
          <DL items={[["特定会社の判定", data.special?.specialType || "該当なし"]]} />
        </Card>
        <Card title="会社規模（第1表の2）">
          <DL
            items={[
              ["会社規模", data.size?.size || "—"],
              ["区分", data.size?.LClass || "—"],
              ["L", data.size?.L != null ? String(data.size?.L) : "—"],
              ["FTE", data.size?.fte != null ? data.size?.fte.toFixed(2) : "—"],
            ]}
          />
        </Card>
      </section>

      <section className="border rounded bg-white p-4">
        <div className="font-semibold mb-2">評価額（第3表）</div>
        <div className="text-2xl font-bold">
          {data.valuation?.perShare != null
            ? `${Number(data.valuation.perShare).toLocaleString()} 円 / 1株`
            : "—"}
        </div>
      </section>

      <section className="border rounded bg-white p-4">
        <div className="font-semibold mb-2">Decision Trail（根拠ログ）</div>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(data.trail ?? [], null, 2)}
        </pre>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded bg-white p-4">
      <div className="font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}
function DL({ items }: { items: [string, string][] }) {
  return (
    <dl className="text-sm space-y-1">
      {items.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3">
          <dt className="text-gray-600">{k}</dt>
          <dd className="font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
function fmtPct(v?: number) {
  return v != null ? (v * 100).toFixed(2) + "%" : "—";
}
