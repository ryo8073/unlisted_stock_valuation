# private-shares-valuation (JP R6)
相続税/贈与税の「取引相場のない株式」評価（R6版）を、株主判定→特定会社等→会社規模(L)→評価式(第3表)の順で実行するNext.jsアプリ。

- ルールは `/rules/*.json`（SOT）
- エンジンは `/lib/engine/*`
- 画面は `/app/wizard/*`（Step1 実装済）

## 開発
pnpm i
pnpm dev

## Vercel
- Edge Runtime対応: `/app/api/evaluate/route.ts`
- 環境変数不要（第4表/第5表DB連携は将来拡張）

## 出典
- 国税庁「第1表の1/第1表の2/第2表/第3表」（令和6年1月1日以降用）
- Rレンジの説明は辻本郷の解説整理に整合（*計算は国税庁PDF優先*）
