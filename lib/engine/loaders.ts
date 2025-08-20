import fs from 'fs'
import path from 'path'
import { Rule, RuleSet } from './types'

export class RuleLoader {
  private rulesPath: string

  constructor(rulesPath: string = './rules') {
    this.rulesPath = rulesPath
  }

  /**
   * 指定されたルールファイルを読み込む
   */
  async loadRule(ruleName: string): Promise<RuleSet> {
    try {
      const filePath = path.join(this.rulesPath, `${ruleName}.json`)
      const fileContent = await fs.promises.readFile(filePath, 'utf-8')
      const ruleData = JSON.parse(fileContent)
      
      return this.validateRule(ruleData)
    } catch (error) {
      throw new Error(`ルールファイルの読み込みに失敗しました: ${ruleName} - ${error}`)
    }
  }

  /**
   * 全てのルールファイルを読み込む
   */
  async loadAllRules(): Promise<Record<string, RuleSet>> {
    const ruleFiles = [
      't1-1_shareholder',
      't1-2_size', 
      't2_special_company',
      't3_valuation'
    ]

    const rules: Record<string, RuleSet> = {}
    
    for (const ruleFile of ruleFiles) {
      try {
        rules[ruleFile] = await this.loadRule(ruleFile)
      } catch (error) {
        console.warn(`ルールファイルの読み込みをスキップ: ${ruleFile} - ${error}`)
      }
    }

    return rules
  }

  /**
   * ルールの妥当性を検証する
   */
  private validateRule(ruleData: any): RuleSet {
    if (!ruleData.name || !ruleData.rules || !Array.isArray(ruleData.rules)) {
      throw new Error('ルールファイルの形式が不正です')
    }

    const validatedRules: Rule[] = ruleData.rules.map((rule: any, index: number) => {
      if (!rule.id || !rule.condition || !rule.action) {
        throw new Error(`ルール ${index} の形式が不正です`)
      }

      return {
        id: rule.id,
        name: rule.name || `Rule ${rule.id}`,
        condition: rule.condition,
        action: rule.action,
        sourceRef: rule.sourceRef || '',
        priority: rule.priority || 0,
        description: rule.description || '',
      }
    })

    return {
      name: ruleData.name,
      version: ruleData.version || '1.0.0',
      description: ruleData.description || '',
      rules: validatedRules,
      metadata: ruleData.metadata || {},
    }
  }

  /**
   * ルールのキャッシュを管理
   */
  private ruleCache: Map<string, RuleSet> = new Map()

  async getCachedRule(ruleName: string): Promise<RuleSet> {
    if (this.ruleCache.has(ruleName)) {
      return this.ruleCache.get(ruleName)!
    }

    const rule = await this.loadRule(ruleName)
    this.ruleCache.set(ruleName, rule)
    return rule
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.ruleCache.clear()
  }
}

// シングルトンインスタンス
export const ruleLoader = new RuleLoader()
