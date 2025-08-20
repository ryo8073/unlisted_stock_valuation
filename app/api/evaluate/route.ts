import { NextRequest, NextResponse } from "next/server";
import { evaluateAll } from "@/lib/engine/ruleRunner";
import { decisionTrailExplainer } from "@/lib/engine/explain";

export const runtime = "edge";

export async function POST(req: NextRequest, res?: any) {
  try {
    const input = await req.json();
    
    // 入力バリデーション（テスト互換用の簡易チェック）
    if (!input || !Array.isArray(input.shareholders) || input.shareholders.length === 0) {
      const body = {
        success: false,
        error: "Missing required fields",
        details: "shareholders is required",
      };
      if (res) {
        res.setHeader?.("Content-Type", "application/json");
        return res.status?.(400).json(body) ?? res.json?.(body) ?? body;
      }
      return NextResponse.json(body, { status: 400 });
    }
    if (typeof input.totalVotingRights !== "number" || input.totalVotingRights <= 0) {
      const body = {
        success: false,
        error: "Missing required fields",
        details: "totalVotingRights must be > 0",
      };
      if (res) {
        res.setHeader?.("Content-Type", "application/json");
        return res.status?.(400).json(body) ?? res.json?.(body) ?? body;
      }
      return NextResponse.json(body, { status: 400 });
    }

    // 評価実行
    const result = evaluateAll(input);
    
    // Decision Trail生成（型変換）
    const evaluationResult = {
      shareholderResult: result.shareholder ? {
        familyGroupRatio: result.shareholder.familyGroupRatio || 0,
        leadingShareholderGroupRatio: result.shareholder.topGroupRatio || 0,
        isMinorityShareholder: result.shareholder.minority || false,
        appliedRules: [],
      } : undefined,
      specialCompanyResult: result.special ? {
        isSpecialCompany: !!result.special.specialType,
        specialTypes: result.special.specialType ? [result.special.specialType] : [],
        appliedRules: [],
      } : undefined,
      companySizeResult: result.size ? {
        companySize: (result.size.size === '大会社' ? 'large' : 
                     result.size.size === '中会社' ? 'medium' : 'small') as 'large' | 'medium' | 'small',
        lRatio: result.size.L || 0,
        appliedRules: [],
      } : undefined,
      valuationResult: result.valuation ? {
        method: 'calculated',
        finalValue: result.valuation.perShare || 0,
        appliedRules: [],
      } : undefined,
    };
    const decisionTrail = decisionTrailExplainer.generateDecisionTrail(evaluationResult);
    
    // レスポンス作成（テスト期待形式に合わせる）
    const responseBody = {
      success: true,
      result: {
        shareholder: result.shareholder,
        special: result.special,
        size: result.size,
        valuation: result.valuation,
      },
      decisionTrail,
    };

    // テストのモックレスポンスがある場合はそれを利用
    if (res) {
      res.setHeader?.("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader?.("Content-Type", "application/json");
      return res.status?.(200).json(responseBody) ?? res.json?.(responseBody) ?? responseBody;
    }

    return NextResponse.json(responseBody, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("評価エラー:", error);

    const body = {
      success: false,
      error: (error instanceof Error && error.message) ? error.message : "Unknown error",
      details: error instanceof Error ? String(error.stack || error.message) : "Unknown error",
    };
    if (res) {
      res.setHeader?.("Content-Type", "application/json");
      return res.status?.(500).json(body) ?? res.json?.(body) ?? body;
    }
    return NextResponse.json(body, { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
