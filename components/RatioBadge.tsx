import React from 'react'
import { cn } from '@/lib/utils'

interface RatioBadgeProps {
  ratio: number
  label?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showPercentage?: boolean
  className?: string
}

export function RatioBadge({
  ratio,
  label,
  size = 'md',
  variant = 'default',
  showPercentage = true,
  className,
}: RatioBadgeProps) {
  const percentage = ratio * 100
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const variantClasses = {
    default: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
    success: 'bg-gradient-to-r from-success-100 to-success-200 text-success-800 border border-success-300',
    warning: 'bg-gradient-to-r from-warning-100 to-warning-200 text-warning-800 border border-warning-300',
    danger: 'bg-gradient-to-r from-danger-100 to-danger-200 text-danger-800 border border-danger-300',
  }

  const getVariantByRatio = (ratio: number) => {
    if (ratio >= 0.5) return 'success'
    if (ratio >= 0.25) return 'warning'
    return 'danger'
  }

  const effectiveVariant = variant === 'default' ? getVariantByRatio(ratio) : variant

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'inline-flex items-center font-semibold rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md hover:scale-105',
          sizeClasses[size],
          variantClasses[effectiveVariant]
        )}
      >
        {showPercentage ? `${percentage.toFixed(1)}%` : ratio.toFixed(3)}
      </span>
      {label && (
        <span className="text-sm text-gray-600 font-medium">{label}</span>
      )}
    </div>
  )
}

interface MinorityShareholderBadgeProps {
  isMinority: boolean
  className?: string
}

export function MinorityShareholderBadge({
  isMinority,
  className,
}: MinorityShareholderBadgeProps) {
  if (!isMinority) return null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300 shadow-sm hover:shadow-md transition-all duration-300">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        少数株主特則適用
      </span>
    </div>
  )
}

interface CompanySizeBadgeProps {
  size: 'large' | 'medium' | 'small'
  lRatio?: number
  lClass?: '大会社' | '中の大' | '中の中' | '中の小' | '小会社'
  className?: string
}

export function CompanySizeBadge({
  size,
  lRatio,
  lClass,
  className,
}: CompanySizeBadgeProps) {
  const sizeConfig = {
    large: {
      label: '大会社',
      color: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
    },
    medium: {
      label: '中会社',
      color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300',
    },
    small: {
      label: '小会社',
      color: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300',
    },
  }

  const config = sizeConfig[size]

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold border shadow-sm hover:shadow-md transition-all duration-300',
          config.color
        )}
      >
        {config.label}{size === 'medium' && lClass ? `（${lClass}）` : ''}
      </span>
      {size === 'medium' && typeof lRatio === 'number' && (
        <span className="text-sm text-gray-600 font-medium bg-gray-100/80 px-3 py-1 rounded-lg">
          L = {lRatio}
        </span>
      )}
    </div>
  )
}

interface SpecialCompanyBadgeProps {
  isSpecial: boolean
  types?: string[]
  className?: string
}

export function SpecialCompanyBadge({
  isSpecial,
  types = [],
  className,
}: SpecialCompanyBadgeProps) {
  if (!isSpecial) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-success-100 to-success-200 text-success-800 border border-success-300 shadow-sm hover:shadow-md transition-all duration-300">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          通常会社
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-danger-100 to-danger-200 text-danger-800 border border-danger-300 shadow-sm hover:shadow-md transition-all duration-300">
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        特定会社等
      </span>
      {types.length > 0 && (
        <span className="text-sm text-gray-600 font-medium bg-gray-100/80 px-3 py-1 rounded-lg">
          ({types.join(', ')})
        </span>
      )}
    </div>
  )
}
