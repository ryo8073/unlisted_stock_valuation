import { RuleResult, EvaluationResult, DecisionNode } from './types'

export class DecisionTrailExplainer {
  /**
   * 評価結果からDecision Trailを生成
   */
  generateDecisionTrail(result: EvaluationResult): DecisionNode[] {
    const trail: DecisionNode[] = []

    // 株主判定の結果
    if (result.shareholderResult) {
      trail.push({
        id: 'shareholder-determination',
        name: '株主判定（第1表の1）',
        description: this.explainShareholderResult(result.shareholderResult),
        sourceRef: '第1表の1',
        children: result.shareholderResult.appliedRules.map((rule: RuleResult) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          sourceRef: rule.sourceRef,
          result: rule.result,
        })),
      })
    }

    // 特定会社等の判定結果
    if (result.specialCompanyResult) {
      trail.push({
        id: 'special-company-determination',
        name: '特定会社等の判定（第2表）',
        description: this.explainSpecialCompanyResult(result.specialCompanyResult),
        sourceRef: '第2表',
        children: result.specialCompanyResult.appliedRules.map((rule: RuleResult) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          sourceRef: rule.sourceRef,
          result: rule.result,
        })),
      })
    }

    // 会社規模の判定結果
    if (result.companySizeResult) {
      trail.push({
        id: 'company-size-determination',
        name: '会社規模の判定（第1表の2）',
        description: this.explainCompanySizeResult(result.companySizeResult),
        sourceRef: '第1表の2',
        children: result.companySizeResult.appliedRules.map((rule: RuleResult) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          sourceRef: rule.sourceRef,
          result: rule.result,
        })),
      })
    }

    // 評価方式の判定結果
    if (result.valuationResult) {
      trail.push({
        id: 'valuation-method-determination',
        name: '評価方式の判定（第3表）',
        description: this.explainValuationResult(result.valuationResult),
        sourceRef: '第3表',
        children: result.valuationResult.appliedRules.map((rule: RuleResult) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          sourceRef: rule.sourceRef,
          result: rule.result,
        })),
      })
    }

    return trail
  }

  /**
   * 株主判定結果の説明を生成
   */
  private explainShareholderResult(result: any): string {
    const { familyGroupRatio, leadingShareholderGroupRatio, isMinorityShareholder } = result
    
    let explanation = `同族関係者グループ比率: ${(familyGroupRatio * 100).toFixed(1)}%, `
    explanation += `筆頭株主グループ比率: ${(leadingShareholderGroupRatio * 100).toFixed(1)}%`
    
    if (isMinorityShareholder) {
      explanation += '。少数株主（5%未満）のため、配当還元方式が適用されます。'
    }
    
    return explanation
  }

  /**
   * 特定会社等判定結果の説明を生成
   */
  private explainSpecialCompanyResult(result: any): string {
    const { isSpecialCompany, specialTypes } = result
    
    if (!isSpecialCompany) {
      return '特定会社等に該当しません。'
    }
    
    const typeNames = specialTypes.map((type: string) => {
      const typeMap: Record<string, string> = {
        'landHolding': '土地保有特定会社',
        'stockHolding': '株式等保有特定会社',
        'newCompany': '開業後3年未満',
        'preOpening': '開業前・休業中',
        'liquidation': '清算中',
      }
      return typeMap[type] || type
    })
    
    return `特定会社等に該当します。該当類型: ${typeNames.join(', ')}`
  }

  /**
   * 会社規模判定結果の説明を生成
   */
  private explainCompanySizeResult(result: any): string {
    const { companySize, lRatio, industry, employees, assets, sales } = result
    
    let explanation = `従業員数: ${employees}人, 資産: ${this.formatNumber(assets)}円, `
    explanation += `売上: ${this.formatNumber(sales)}円, 業種: ${industry}`
    
    if (companySize === 'large') {
      explanation += '。大会社（70人以上）に該当します。'
    } else if (companySize === 'medium') {
      explanation += `。中会社に該当し、L = ${lRatio} が適用されます。`
    } else {
      explanation += '。小会社に該当します。'
    }
    
    return explanation
  }

  /**
   * 評価方式判定結果の説明を生成
   */
  private explainValuationResult(result: any): string {
    const { method, finalValue, similarIndustryValue, netAssetValue, lRatio } = result
    
    let explanation = `最終評価額: ${this.formatNumber(finalValue)}円。`
    
    switch (method) {
      case 'netAsset':
        explanation += `純資産価額方式（${this.formatNumber(netAssetValue)}円）を採用。`
        break
      case 'similarIndustry':
        explanation += `類似業種比準価額方式（${this.formatNumber(similarIndustryValue)}円）を採用。`
        break
      case 'combined':
        explanation += `併用方式（L = ${lRatio}）を採用。類似業種比準価額: ${this.formatNumber(similarIndustryValue)}円, 純資産価額: ${this.formatNumber(netAssetValue)}円`
        break
      case 'dividendYield':
        explanation += '配当還元方式（少数株主特則）を採用。'
        break
    }
    
    return explanation
  }

  /**
   * 数値を日本語形式でフォーマット
   */
  private formatNumber(value: number): string {
    return new Intl.NumberFormat('ja-JP').format(value)
  }

  /**
   * Decision TrailをMarkdown形式で出力
   */
  generateMarkdownTrail(trail: DecisionNode[]): string {
    let markdown = '# 株式評価 Decision Trail\n\n'
    
    trail.forEach((node, index) => {
      markdown += `## ${index + 1}. ${node.name}\n\n`
      markdown += `**根拠**: ${node.sourceRef}\n\n`
      markdown += `${node.description}\n\n`
      
      if (node.children && node.children.length > 0) {
        markdown += '### 適用ルール\n\n'
        node.children.forEach((child: DecisionNode) => {
          markdown += `- **${child.name}** (${child.sourceRef}): ${child.description}\n`
          if (child.result) {
            markdown += `  - 結果: ${child.result}\n`
          }
        })
        markdown += '\n'
      }
    })
    
    return markdown
  }

  /**
   * Decision TrailをJSON形式で出力
   */
  generateJsonTrail(trail: DecisionNode[]): string {
    return JSON.stringify(trail, null, 2)
  }
}

// シングルトンインスタンス
export const decisionTrailExplainer = new DecisionTrailExplainer()
