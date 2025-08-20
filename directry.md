# プロジェクト構造

## アプリケーション構造
```
/app
  /wizard                          # 評価ウィザード（5ステップ）
    /step1-shareholder/page.tsx    # 株主判定（第1表の1）
    /step2-special/page.tsx        # 特定会社等（第2表）
    /step3-size/page.tsx           # 会社規模（第1表の2：L判定）
    /step4-valuation/page.tsx      # 評価方式・計算（第3表）
    /step5-result/page.tsx         # 結果表示
  /api
    /evaluate/route.ts             # エンジン実行（Edge Runtime）
    /export/pdf/route.ts           # PDF出力API
  /layout.tsx                      # アプリレイアウト
  /page.tsx                        # ホームページ

## コンポーネント
```
/components
  BandTable.tsx                    # バンド表表示
  ResultSummary.tsx                # 結果サマリー
  shareholderTable.tsx             # 株主テーブル
  FormCard.tsx                     # フォームカード（未実装）
  NumberInput.tsx                  # 数値入力（未実装）
  RatioBadge.tsx                   # 比率バッジ（未実装）
  DecisionTrail.tsx                # 決定経路表示（未実装）
```

## エンジン・ロジック
```
/lib/engine
  types.ts                         # 型定義
  ruleRunner.ts                    # ルール実行エンジン
  resolvers.ts                     # bandC/R, rounding, 80%相当額など
  calculators.ts                   # 第3表の計算式
  loaders.ts                       # JSONルール読込（未実装）
  explain.ts                       # Decision Trailの整形（未実装）

/lib/store
  evalStore.ts                     # Zustand状態管理
```

## ルール定義
```
/rules
  t1-1_shareholder.json            # 株主判定ルール（第1表の1）
  t1-2_size.json                   # 会社規模ルール（第1表の2）
  t2_special_company.json          # 特定会社等ルール（第2表）
  t3_valuation.json                # 評価方式ルール（第3表）
  agentrules.md                    # AIエージェントルール
  devrules.md                      # 開発ルール
```

## PDF出力
```
/pdf
  ResultPdf.tsx                    # 結果PDFテンプレート
```

## テスト
```
/tests                             # テストディレクトリ（未作成）
  /unit/*.spec.ts                  # ユニットテスト（Vitest）
  /e2e/*.spec.ts                   # E2Eテスト（Playwright）
```

## 設定ファイル
```
package.json                       # 依存関係・スクリプト
tsconfig.json                      # TypeScript設定
next.config.js                     # Next.js設定（未作成）
tailwind.config.js                 # Tailwind CSS設定（未作成）
postcss.config.js                  # PostCSS設定（未作成）
.eslintrc.json                     # ESLint設定（未作成）
.prettierrc                        # Prettier設定（未作成）
```

## ドキュメント
```
PRD.md                             # プロダクト要件定義
README.md                          # プロジェクト概要
directry.md                        # このファイル
```

## 未実装・拡張予定
- フォームコンポーネント（FormCard, NumberInput, RatioBadge）
- Decision Trail表示機能
- ルールローダー（loaders.ts）
- テストスイート
- 設定ファイル（next.config.js, tailwind.config.js等）
- 第4表・第5表の自動計算機能（将来拡張）
- 電子申告様式の自動生成（将来拡張）
- 会計システム連携（将来拡張）
