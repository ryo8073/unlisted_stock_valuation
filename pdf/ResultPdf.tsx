// /pdf/ResultPdf.tsx
"use client";
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// 日本語フォントを登録（確実な方法）
Font.register({
  family: 'NotoSansJP',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/notosansjp/v52/-F62fjtqLzI2JPCgQBnw7HFowAIO2lZ9hgFvQ.woff2',
      fontWeight: 'normal' 
    },
    { 
      src: 'https://fonts.gstatic.com/s/notosansjp/v52/-F6pfjtqLzI2JPCgQBnw7HFoOaHq4lY9sA.woff2',
      fontWeight: 'bold' 
    },
  ]
});

// フォールバック用の英数字フォント
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmEU9fBBc9.ttf', fontWeight: 'bold' },
  ]
});

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

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 20, // パディングを縮小
    fontFamily: 'NotoSansJP', // 日本語フォントに変更
  },
  h1: {
    fontSize: 14, // フォントサイズを縮小
    marginBottom: 6,
    fontFamily: 'NotoSansJP',
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 10, // フォントサイズを縮小
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'NotoSansJP',
    fontWeight: 'bold',
  },
  table: {
    display: "flex",
    width: "100%",
    borderStyle: "solid",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 12, // マージンを縮小
  },
  tableRow: {
    margin: "auto",
    flexDirection: "row",
    minHeight: 20, // 高さを縮小
  },
  tableCol: {
    width: "25%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: "auto",
    marginTop: 3,
    fontSize: 8, // フォントサイズを縮小
    padding: 3,
  },
  row: {
    flexDirection: "row",
    minHeight: 20, // 高さを縮小
  },
  cellHead: {
    width: "40%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4, // パディングを縮小
    backgroundColor: "#f5f5f5",
    fontFamily: 'NotoSansJP',
    fontWeight: 'bold',
    fontSize: 8, // フォントサイズを縮小
  },
  cell: {
    width: "60%",
    borderStyle: "solid",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 4, // パディングを縮小
    fontSize: 8, // フォントサイズを縮小
  },
  mono: {
    fontSize: 7, // フォントサイズを縮小
    fontFamily: "NotoSansJP",
  },
  footer: {
    marginTop: 12, // マージンを縮小
    fontSize: 7, // フォントサイズを縮小
    color: "#666",
    fontFamily: 'NotoSansJP',
  },
  trailContainer: {
    border: 1,
    padding: 6, // パディングを縮小
    marginTop: 6, // マージンを縮小
    maxHeight: 100, // 高さをさらに制限
  },
  date: {
    fontSize: 9, // フォントサイズを縮小
    color: "#666",
    marginBottom: 6, // マージンを縮小
    fontFamily: 'NotoSansJP',
  },
});

export default function ResultPdf({
  data,
  meta,
}: {
  data: EvalResult;
  meta?: { title?: string; date?: string };
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>{meta?.title ?? "非上場株式の評価（R6）"}</Text>
        <Text style={styles.date}>
          作成日：{meta?.date ?? new Date().toLocaleDateString('ja-JP')}
        </Text>

        <Text style={styles.h2}>第1表の1｜株主判定</Text>
        <Table
          rows={[
            ["区分", data.shareholder?.gridResult ?? "—"],
            ["5%未満特則", data.shareholder?.minority ? "適用" : "—"],
            ["(ハ) 自己割合", pct(data.shareholder?.selfVoteRatio)],
            ["⑤ 同族関係者割合", pct(data.shareholder?.familyGroupRatio)],
            ["⑥ 筆頭グループ割合", pct(data.shareholder?.topGroupRatio)],
          ]}
        />

        <Text style={styles.h2}>第2表｜特定会社等</Text>
        <Table rows={[["特定会社区分（後順位優先）", data.special?.specialType ?? "該当なし"]]} />

        <Text style={styles.h2}>第1表の2｜会社規模・L</Text>
        <Table
          rows={[
            ["会社規模", data.size?.size ?? "—"],
            ["区分", data.size?.LClass ?? "—"],
            ["L", data.size?.L != null ? String(data.size?.L) : "—"],
            [
              "FTE（非常勤=時間÷1,800）",
              data.size?.fte != null ? data.size.fte.toFixed(2) : "—",
            ],
          ]}
        />

        <Text style={styles.h2}>第3表｜評価額</Text>
        <Table
          rows={[
            [
              "1株価額",
              data.valuation?.perShare != null
                ? `${Number(data.valuation.perShare).toLocaleString()} 円`
                : "—",
            ],
          ]}
        />

        <Text style={styles.h2}>根拠ログ（Decision Trail）</Text>
        <View style={styles.trailContainer}>
          <Text style={styles.mono} wrap>
            {data.trail && data.trail.length > 0 
              ? data.trail.map((item, index) => {
                  const summary = typeof item.out === 'object' 
                    ? Object.entries(item.out)
                        .filter(([key, value]) => value !== undefined && value !== null)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ')
                    : String(item.out);
                  return `${index + 1}. ${item.node}: ${summary}`;
                }).join('\n')
              : '根拠データなし'
            }
          </Text>
        </View>

        <Text style={styles.footer}>
          ※ 根拠は国税庁PDF（第1表の1／第2表／第1表の2／第3表）に準拠。表示は要約です。
        </Text>
      </Page>
    </Document>
  );
}

function Table({ rows }: { rows: [string, string][] }) {
  return (
    <View style={styles.table}>
      {rows.map(([k, v], i) => (
        <View key={i} style={styles.row}>
          <View style={styles.cellHead}>
            <Text>{k}</Text>
          </View>
          <View style={styles.cell}>
            <Text>{v}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function pct(v?: number) {
  return v != null ? (v * 100).toFixed(2) + "%" : "—";
}
