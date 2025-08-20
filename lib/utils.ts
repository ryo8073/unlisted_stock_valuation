import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 数値を日本語形式でフォーマット
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ja-JP').format(value)
}

/**
 * 通貨形式でフォーマット
 */
export function formatCurrency(value: number, currency = '円'): string {
  return `${formatNumber(value)}${currency}`
}

/**
 * パーセンテージ形式でフォーマット
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * 日付を日本語形式でフォーマット
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/**
 * バリデーション関数
 */
export const validators = {
  required: (value: any): boolean => {
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return !isNaN(value)
    return value !== null && value !== undefined
  },
  
  min: (min: number) => (value: number): boolean => {
    return value >= min
  },
  
  max: (max: number) => (value: number): boolean => {
    return value <= max
  },
  
  range: (min: number, max: number) => (value: number): boolean => {
    return value >= min && value <= max
  },
  
  positive: (value: number): boolean => {
    return value > 0
  },
  
  percentage: (value: number): boolean => {
    return value >= 0 && value <= 100
  },
}

/**
 * エラーメッセージの生成
 */
export function getErrorMessage(field: string, validator: string, params?: any): string {
  const messages: Record<string, string> = {
    required: `${field}は必須項目です`,
    min: `${field}は${params}以上で入力してください`,
    max: `${field}は${params}以下で入力してください`,
    range: `${field}は${params.min}以上${params.max}以下で入力してください`,
    positive: `${field}は正の数で入力してください`,
    percentage: `${field}は0%以上100%以下で入力してください`,
  }
  
  return messages[validator] || `${field}の入力に誤りがあります`
}
