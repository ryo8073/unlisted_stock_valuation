// /app/api/export/pdf/route.ts
import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";

export const runtime = "nodejs"; // PDFKitはNodeランタイム

export async function POST(req: NextRequest) {
  const { data, meta } = await req.json();

  const stream = new ReadableStream({
    start(controller) {
      const doc = new PDFDocument({ 
        margin: 30,
        size: 'A4',
        autoFirstPage: true
      });
      
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => {
        const pdf = Buffer.concat(chunks);
        controller.enqueue(pdf);
        controller.close();
      });

      // 日本語フォント設定
      doc.font('Helvetica');
      
      // フォントサイズを調整して日本語表示を改善
      doc.fontSize(10);

      // ヘッダー
      doc.fontSize(16).font('Helvetica-Bold').text(meta?.title || "非上場株式の評価（R6）");
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica').fillColor("#666").text(`作成日：${new Date().toLocaleDateString('ja-JP')}`);
      doc.moveDown();

      // ページ幅を取得（A4サイズに合わせて調整）
      const pageWidth = doc.page.width - 60; // 左右マージンを引く
      const tableWidth = Math.min(pageWidth, 500); // 最大幅を制限
      const labelWidth = tableWidth * 0.4;
      const valueWidth = tableWidth * 0.6;

      sectionTable(doc, "第1表の1｜株主判定", [
        ["区分", data?.shareholder?.gridResult ?? "—"],
        ["5%未満特則", data?.shareholder?.minority ? "適用" : "—"],
        ["(ハ) 自己割合", pct(data?.shareholder?.selfVoteRatio)],
        ["⑤ 同族関係者割合", pct(data?.shareholder?.familyGroupRatio)],
        ["⑥ 筆頭グループ割合", pct(data?.shareholder?.topGroupRatio)],
      ], pageWidth, labelWidth, valueWidth);

      sectionTable(doc, "第2表｜特定会社等", [
        ["特定会社区分（後順位優先）", data?.special?.specialType ?? "該当なし"],
      ], pageWidth, labelWidth, valueWidth);

      sectionTable(doc, "第1表の2｜会社規模・L", [
        ["会社規模", data?.size?.size ?? "—"],
        ["区分", data?.size?.LClass ?? "—"],
        ["L", data?.size?.L != null ? String(data?.size?.L) : "—"],
        ["FTE（非常勤=時間÷1,800）", data?.size?.fte != null ? data.size.fte.toFixed(2) : "—"],
      ], pageWidth, labelWidth, valueWidth);

      sectionTable(doc, "第3表｜評価額", [
        [
          "1株価額",
          data?.valuation?.perShare != null ? `${Number(data.valuation.perShare).toLocaleString()} 円` : "—",
        ],
      ], pageWidth, labelWidth, valueWidth);

      // Decision Trail
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold').fillColor("#000").text("根拠ログ（Decision Trail）");
      doc.moveDown(0.3);
      
      // ページに収まるように調整
      const remainingHeight = doc.page.height - doc.y - 100; // フッター用の余白を確保
      const trailHeight = Math.min(150, Math.max(50, remainingHeight));
      
      // テキストを簡潔に表示
      const trailData = data?.trail ?? [];
      const trailText = trailData.length > 0 
        ? trailData.map((item: any, index: number) => 
            `${index + 1}. ${item.node}: ${item.out} (${item.sourceRef || 'N/A'})`
          ).join('\n')
        : '根拠データなし';
      
      doc.rect(doc.x, doc.y, tableWidth, trailHeight).stroke();
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica').text(trailText, { 
        width: tableWidth - 10, 
        height: trailHeight - 10,
        align: 'left'
      });

      // フッター
      doc.moveDown();
      doc.fontSize(8).font('Helvetica').fillColor("#666").text(
        "※ 根拠は国税庁PDF（第1表の1／第2表／第1表の2／第3表）に準拠。表示は要約です。",
        { width: tableWidth, align: 'left' }
      );

      doc.end();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=valuation.pdf",
    },
  });
}

function sectionTable(
  doc: PDFKit.PDFDocument, 
  title: string, 
  rows: [string, string][], 
  tableWidth: number,
  labelWidth: number,
  valueWidth: number
) {
  doc.moveDown();
  doc.fontSize(12).font('Helvetica-Bold').fillColor("#000").text(title);
  doc.moveDown(0.3);

  const x0 = doc.x;
  const y0 = doc.y;
  const rowHeight = 25; // 行の高さを増加

  // ページに収まるかチェック
  const requiredHeight = rows.length * rowHeight;
  if (doc.y + requiredHeight > doc.page.height - 150) {
    doc.addPage();
  }

  doc.fontSize(9).font('Helvetica').fillColor("#000");
  rows.forEach(([k, v], i) => {
    const y = doc.y + i * rowHeight;
    
    // 背景色（ヘッダー行）
    doc.rect(x0, y, labelWidth, rowHeight).fillAndStroke('#f5f5f5', '#000');
    doc.rect(x0 + labelWidth, y, valueWidth, rowHeight).fillAndStroke('#ffffff', '#000');
    
    // テキスト（位置を調整）
    doc.fillColor("#000").text(k, x0 + 5, y + 8, { 
      width: labelWidth - 10,
      align: 'left'
    });
    doc.text(v, x0 + labelWidth + 5, y + 8, { 
      width: valueWidth - 10,
      align: 'left'
    });
  });

  doc.moveDown(rows.length * 0.4 + 0.5);
}

function pct(v?: number) {
  return v != null ? (v * 100).toFixed(2) + "%" : "—";
}
