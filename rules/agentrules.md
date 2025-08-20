Agent rules（エンジンごとのエージェント化）

各エージェントはステートレスにJSON I/Oで動作。LLMではなく規則エンジンが一次判定。LLM補助は将来（説明生成のみ）。

A. ShareholderJudgeAgent（第1表の1）

Input：株主一覧（氏名/続柄/役員/議決権数）、④総議決権、自己株式有無。

Compute：

(ハ) 納税義務者の議決権割合、⑤ 同族関係者グループ比率、⑥ 筆頭株主グループ比率。

株主区分グリッド（⑤：50%超 / 30〜50%未満 / 30%未満 × ⑥：15%以上 / 15%未満）で判定。5%未満特則で少数へ分岐。

Output：{ shareholderClass, ratios: {self, group, top}, minorityOverride }

B. SpecialCompanyAgent（第2表）

Input：B1/C1/D1・B2/C2/D2、株式等保有割合、土地保有割合、開業/休業/清算。

Logic（後順位優先）：
1→2→3→4→5→6 の順で評価し最後に該当した型を採用。閾値：株式等50％以上、土地保有大70％／中小90％。

Output：{ specialType, reasons[] }

C. CompanySizeAgent（第1表の2）

Input：総資産（帳簿）、従業員（常勤 + 非常勤=時間/1800）、直前1年の取引金額、業種。

Logic：

70人以上→大会社。

70人未満→チ（資産×従業員）＝下位 と リ（取引金額） を比較し上位採用、L＝0.90/0.75/0.60決定。

Output：{ size: '大/中/小', LClass: '中の大|中の中|中の小|小会社', L }

D. ValuationAgent（第3表）

Input：類似業種比準価額（①）、1株当たり純資産価額（②）、（ある場合）80%相当額（③）、L、特定会社等。

Logic：

特定会社（清算中など）を優先ディスパッチ。

大会社：min(①,②)。中会社：min(②, ①×L + (③ or ②×0.8)×(1−L))。小会社：②（任意で ①×0.5+②×0.5 を許容）。

Output：{ perShare, formulaTrace[] }