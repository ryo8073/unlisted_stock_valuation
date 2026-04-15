// /app/api/export/pdf/route.ts
import { NextRequest } from "next/server";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export const runtime = "nodejs"; // PDFKitはNodeランタイム

export async function POST(req: NextRequest) {
  const { shareholderData, specialCompanyData, companySizeData, valuationData } = await req.json();

  // 日本語フォントパスを解決
  const fontPath = path.join(process.cwd(), "public/fonts/Noto_Sans_JP/static/NotoSansJP-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public/fonts/Noto_Sans_JP/static/NotoSansJP-Bold.ttf");
  const hasJapaneseFont = fs.existsSync(fontPath);

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

      // フォント設定
      const fontRegular = hasJapaneseFont ? fontPath : 'Helvetica';
      const fontBold = hasJapaneseFont && fs.existsSync(fontBoldPath) ? fontBoldPath : (hasJapaneseFont ? fontPath : 'Helvetica-Bold');

      if (hasJapaneseFont) {
        doc.registerFont('NotoSansJP', fontPath);
        if (fs.existsSync(fontBoldPath)) {
          doc.registerFont('NotoSansJP-Bold', fontBoldPath);
        }
      }

      doc.font(fontRegular);
      doc.fontSize(10);

      // ヘッダー
      doc.fontSize(16).font(fontBold).text("非上場株式の評価（R6）");
      doc.moveDown(0.5);
      doc.fontSize(10).font(fontRegular).fillColor("#666").text(`作成日：${new Date().toLocaleDateString('ja-JP')}`);
      doc.moveDown();

      // ページ幅
      const pageWidth = doc.page.width - 60;
      const tableWidth = Math.min(pageWidth, 500);
      const labelWidth = tableWidth * 0.4;
      const valueWidth = tableWidth * 0.6;

      // 第1表の1：株主判定
      sectionTable(doc, "第1表の1｜株主判定", [
        ["同族関係者グループ比率", shareholderData?.familyGroupRatio != null ? pct(shareholderData.familyGroupRatio) : "—"],
        ["筆頭株主グループ比率", shareholderData?.leadingShareholderGroupRatio != null ? pct(shareholderData.leadingShareholderGroupRatio) : "—"],
        ["少数株主特則", shareholderData?.isMinorityShareholder ? "適用" : "非該当"],
      ], tableWidth, labelWidth, valueWidth, fontRegular, fontBold);

      // 第2表：特定会社等
      const specialLabel = specialCompanyData?.isSpecialCompany
        ? specialCompanyData.specialTypes.join(", ")
        : "該当なし";
      sectionTable(doc, "第2表｜特定会社等", [
        ["判定結果", specialLabel],
      ], tableWidth, labelWidth, valueWidth, fontRegular, fontBold);

      // 第1表の2：会社規模
      const sizeLabel = companySizeData?.companySize === 'large' ? '大会社'
        : companySizeData?.companySize === 'medium' ? `中会社${companySizeData.lClass ? `（${companySizeData.lClass}）` : ''}`
        : companySizeData?.companySize === 'small' ? '小会社' : '—';
      sectionTable(doc, "第1表の2｜会社規模", [
        ["会社規模", sizeLabel],
        ["L値", companySizeData?.lRatio != null ? String(companySizeData.lRatio) : "—"],
      ], tableWidth, labelWidth, valueWidth, fontRegular, fontBold);

      // 第3表：評価結果
      const methodNames: Record<string, string> = {
        dividendYield: "配当還元方式",
        similarIndustry: "類似業種比準価額方式",
        netAsset: "純資産価額方式",
        smallCombined: "併用方式（小会社）",
        combined: "併用方式",
      };
      sectionTable(doc, "第3表｜評価結果", [
        ["評価方式", methodNames[valuationData?.method] || valuationData?.method || "—"],
        ["1株当たり評価額", valuationData?.finalValue != null ? `${Number(valuationData.finalValue).toLocaleString()} 円` : "—"],
        ["1株当たり年配当", valuationData?.dividendPerShare != null ? `${Number(valuationData.dividendPerShare).toLocaleString()} 円` : "—"],
        ["1株当たり年利益", valuationData?.profitPerShare != null ? `${Number(valuationData.profitPerShare).toLocaleString()} 円` : "—"],
        ["純資産価額", valuationData?.netAssetValue != null ? `${Number(valuationData.netAssetValue).toLocaleString()} 円` : "—"],
      ], tableWidth, labelWidth, valueWidth, fontRegular, fontBold);

      // フッター
      doc.moveDown();
      doc.fontSize(8).font(fontRegular).fillColor("#666").text(
        "※ 本計算結果は財産評価基本通達に基づく概算値です。正式な税務申告にはご利用いただけません。",
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
  valueWidth: number,
  fontRegular: string,
  fontBold: string,
) {
  doc.moveDown();
  doc.fontSize(12).font(fontBold).fillColor("#000").text(title);
  doc.moveDown(0.3);

  const x0 = doc.x;
  const rowHeight = 25;

  // ページに収まるかチェック
  const requiredHeight = rows.length * rowHeight;
  if (doc.y + requiredHeight > doc.page.height - 150) {
    doc.addPage();
  }

  doc.fontSize(9).font(fontRegular).fillColor("#000");
  rows.forEach(([k, v], i) => {
    const y = doc.y + i * rowHeight;

    doc.rect(x0, y, labelWidth, rowHeight).fillAndStroke('#f5f5f5', '#000');
    doc.rect(x0 + labelWidth, y, valueWidth, rowHeight).fillAndStroke('#ffffff', '#000');

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
