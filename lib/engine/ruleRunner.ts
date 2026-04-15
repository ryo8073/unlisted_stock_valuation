import t11 from "@/rules/t1-1_shareholder.json";
import t12 from "@/rules/t1-2_size.json";
import t2  from "@/rules/t2_special_company.json";
import t3  from "@/rules/t3_valuation.json";
import { toFTE, pickEmpBand, pickAssetBand, pickRevenueBand, lowerOf, upperOf, LOf } from "./resolvers";
import { largeFormula, midFormula, smallFormula } from "./calculators";
import type { EvaluateInput } from "./types";

export function evaluateAll(input: EvaluateInput) {
  const trail: Record<string, unknown>[] = [];

  // --- 第1表の1：株主判定（財産評価基本通達188条フローチャート準拠）
  const totalsVotes = input.totals.votes;
  const taxpayer = input.shareholders.find(s => s.isTaxpayer);
  const selfVoteRatio = (taxpayer?.votes ?? 0) / totalsVotes;
  const familyGroupRatio = (input.groups.family.votes)/totalsVotes;
  const topGroupRatio = (input.groups.top.votes)/totalsVotes;

  function evaluateShareholderType() {
    // ステップ1: 同族株主のいる会社かどうか（通達188条）
    // 株主の1人とその同族関係者の議決権合計が30%以上のグループがある場合
    let shareholderType: "同族株主のいる会社" | "同族株主のいない会社";

    if (topGroupRatio >= 0.3) {
      shareholderType = "同族株主のいる会社";
    } else {
      shareholderType = "同族株主のいない会社";
    }

    // ステップ2: 納税義務者の属するグループの判定
    let groupShareholderType: "同族株主" | "同族株主以外の株主" | "同族株主等" | "等外の株主";

    if (shareholderType === "同族株主のいる会社") {
      // 通達188条の50%超例外ルール:
      // 同族株主の1グループの議決権が50%超の場合、そのグループに属する株主のみが「同族株主」
      // 50%超のグループが存在しない場合は、30%以上のグループに属する株主すべてが「同族株主」
      if (topGroupRatio > 0.5) {
        // 50%超グループがある → そのグループに属する場合のみ同族株主
        if (taxpayer?.inTopGroup) {
          groupShareholderType = "同族株主";
        } else {
          groupShareholderType = "同族株主以外の株主";
        }
      } else if (taxpayer?.inFamilyGroup && familyGroupRatio >= 0.3) {
        // 50%超グループなし → 30%以上のグループに属していれば同族株主
        groupShareholderType = "同族株主";
      } else {
        groupShareholderType = "同族株主以外の株主";
      }
    } else {
      // 同族株主のいない会社の場合
      // 議決権15%以上のグループに属する株主は「同族株主等」
      if (topGroupRatio >= 0.15 && taxpayer?.inTopGroup) {
        groupShareholderType = "同族株主等";
      } else {
        groupShareholderType = "等外の株主";
      }
    }

    // ステップ3: 納税義務者の取得後の議決権割合判定
    const isOver5Percent = selfVoteRatio >= 0.05;

    // ステップ4: 中心的な同族株主の判定（通達188条(2)）
    // 同族株主の1人とその配偶者・直系血族・兄弟姉妹・1親等姻族の
    // 議決権合計が25%以上の場合、その者は「中心的な同族株主」
    const isCentralFamilyShareholder = familyGroupRatio >= 0.25;

    // 中心的な株主の判定（同族株主のいない会社の場合）
    // 議決権15%以上のグループに属し、単独で10%以上を有する株主
    const isCentralShareholder = selfVoteRatio >= 0.10;

    // ステップ5: 納税義務者が役員であるか
    const taxpayerIsOfficer = taxpayer?.officer || false;

    // ステップ6: 評価方式の判定（通達188条・188-2条準拠）
    let evaluationMethod: "原則的評価方式" | "特例的評価方式";

    if (shareholderType === "同族株主のいる会社") {
      if (groupShareholderType === "同族株主") {
        // 同族株主の場合
        if (isCentralFamilyShareholder) {
          // 中心的な同族株主がいる場合
          if (isOver5Percent || taxpayerIsOfficer) {
            evaluationMethod = "原則的評価方式";
          } else {
            evaluationMethod = "特例的評価方式";
          }
        } else {
          // 中心的な同族株主がいない場合 → 原則的評価方式
          evaluationMethod = "原則的評価方式";
        }
      } else {
        // 同族株主以外の株主 → 特例的評価方式（配当還元方式）
        evaluationMethod = "特例的評価方式";
      }
    } else {
      // 同族株主のいない会社
      if (groupShareholderType === "同族株主等") {
        // 議決権15%以上グループに属する株主
        if (isCentralShareholder) {
          // 中心的な株主がいる場合
          if (isOver5Percent || taxpayerIsOfficer) {
            evaluationMethod = "原則的評価方式";
          } else {
            evaluationMethod = "特例的評価方式";
          }
        } else {
          evaluationMethod = "原則的評価方式";
        }
      } else {
        // 議決権15%未満のグループ → 特例的評価方式
        evaluationMethod = "特例的評価方式";
      }
    }

    return {
      shareholderType,
      groupShareholderType,
      isOver5Percent,
      isCentralFamilyShareholder,
      isCentralShareholder,
      taxpayerIsOfficer,
      evaluationMethod,
      selfVoteRatio,
      familyGroupRatio,
      topGroupRatio
    };
  }

  const sh = evaluateShareholderType();
  trail.push({ node: "T1-1", out: sh, sourceRef: t11.sourceRef });

  // --- 第2表：特定会社（後順位優先）
  let specialType: string|undefined;
  // 比準要素数1
  const B1C1D1_zeros = [input.table4?.B1||0, input.table4?.C1||0, input.table4?.D1||0].filter(x=>x===0).length;
  const B2C2D2_zeros = [input.table4?.B2||0, input.table4?.C2||0, input.table4?.D2||0].filter(x=>x===0).length;
  if (B1C1D1_zeros >= 2 && B2C2D2_zeros >= 2) specialType = "比準要素数1";

  // 株式等保有特定会社
  const secRatio = (input as any).securitiesTotal && input.company.totalAssetsBook ? (input as any).securitiesTotal/input.company.totalAssetsBook : undefined;
  if (secRatio != null && secRatio >= 0.5) specialType = "株式等保有特定会社";

  // 土地保有特定会社
  const landRatio = (input as any).landEtcTotal && input.company.totalAssetsBook ? (input as any).landEtcTotal/input.company.totalAssetsBook : undefined;
  if (landRatio != null) {
    // 第2表内の「小会社」資産レンジで小会社か判定
    const ai = t2.rules["土地保有特定会社"].smallJudge_byAssetsOnly as any;
    const a = input.company.totalAssetsBook;
    const rSmall = (rng: any) => a >= rng.min && a < rng.max;
    const isSmall = rSmall(ai[input.company.industry]);
    const th = isSmall ? t2.rules["土地保有特定会社"].threshold.small : t2.rules["土地保有特定会社"].threshold.largeOrMiddle;
    if (landRatio >= th) specialType = "土地保有特定会社";
  }

  // 開業後3年未満／開業前・休業中／清算中
  if ((input.company.yearsSinceOpening??99) < 3) specialType = "開業後3年未満の会社等";
  if (input.company.isPreOpeningOrSuspended) specialType = "開業前または休業中の会社";
  if (input.company.isLiquidating) specialType = "清算中の会社";
  trail.push({ node: "T2", out: { specialType }, sourceRef: t2.sourceRef });

  // --- 配当還元方式の判定
  const isDividendYieldMethod = sh.evaluationMethod === "特例的評価方式" && input.valuationInputs?.dividendYield != null;
  
  // --- 第1表の2：会社規模（L）（配当還元方式が適用されない場合のみ）
  let size: "大会社"|"中会社"|"小会社" | undefined;
  let LClass: "大会社"|"中の大"|"中の中"|"中の小"|"小会社" | undefined;
  let L = 0;

  if (!isDividendYieldMethod) {
  const fte = toFTE(input.company.employees.full, input.company.employees.partTimeHours);
  if (fte >= 70) {
    size = "大会社"; LClass = "大会社"; L = 1.0;
  } else {
    const empBand = pickEmpBand(fte);
    const assetBand = pickAssetBand(input.company.industry, input.company.totalAssetsBook);
    const Cband = lowerOf(assetBand, empBand);
    const Rband = pickRevenueBand(input.company.industry, input.company.turnover1y);
      const upperResult = upperOf(Cband, Rband);
      LClass = upperResult as "大会社"|"中の大"|"中の中"|"中の小"|"小会社";
    size = (LClass === "小会社") ? "小会社" : (LClass === "大会社" ? "大会社" : "中会社");
    L = LOf(LClass);
  }
  }
  trail.push({ node: "T1-2", out: { size, LClass, L, fte: size ? toFTE(input.company.employees.full, input.company.employees.partTimeHours) : undefined }, sourceRef: t12.sourceRef });

  // --- 第3表：評価
  const sim = input.valuationInputs?.similarIndustryPPS ?? NaN;
  const na  = input.valuationInputs?.netAssetPPS ?? NaN;
  const na80= input.valuationInputs?.netAssetPPS80;
  let perShare = NaN;
  
  if (isDividendYieldMethod) {
    // 配当還元方式（通達188-2条）
    // (年配当金額（下限2円50銭）÷ 10%) × (1株当たり資本金等の額 ÷ 50円)
    const dividendPerShare = input.valuationInputs?.dividendPerShare ?? 0;
    const capitalPerShare = input.valuationInputs?.capitalPerShare ?? 50;
    const adjustedDividend = Math.max(dividendPerShare, 2.5);
    perShare = (adjustedDividend / 0.10) * (capitalPerShare / 50);
  } else if (specialType === "清算中の会社") {
    perShare = input.valuationInputs?.liquidationExpectedPerShare ?? NaN;
  } else if (size === "大会社") {
    perShare = largeFormula(sim, na);
  } else if (size === "小会社") {
    perShare = smallFormula(na);
  } else if (size === "中会社") {
    perShare = midFormula(sim, L, na, na80);
  }
  trail.push({ node: "T3", out: { perShare, method: isDividendYieldMethod ? "dividendYield" : "standard" }, sourceRef: t3.sourceRef });

  return { shareholder: sh, special: { specialType }, size: { size, LClass, L }, valuation: { perShare, method: isDividendYieldMethod ? "dividendYield" : "standard" }, trail };
}
