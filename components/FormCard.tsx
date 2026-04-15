import React from 'react'
import { cn } from '@/lib/utils'

interface FormCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  step?: number
  totalSteps?: number
}

export function FormCard({ 
  title, 
  description, 
  children, 
  className,
  step,
  totalSteps 
}: FormCardProps) {
  return (
    <div className={cn(
      'glass card-shadow rounded-2xl p-8 max-w-4xl mx-auto',
      'backdrop-blur-lg border border-white/20',
      'transform transition-all duration-200 hover:card-shadow-hover',
      className
    )}>
      {/* ステップ表示 */}
      {step && totalSteps && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
            <span className="font-medium">ステップ {step} / {totalSteps}</span>
            <span className="text-primary-600 font-semibold">
              {Math.round((step / totalSteps) * 100)}% 完了
            </span>
          </div>
          <div className="w-full bg-gray-200/50 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-300 ease-out shadow-lg"
              style={{ 
                width: `${(step / totalSteps) * 100}%`
              }}
            />
          </div>
        </div>
      )}

      {/* タイトル */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
          {title}
        </h2>
        {description && (
          <p className="text-gray-600 text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* コンテンツ */}
      <div className="space-y-8">
        {children}
      </div>
    </div>
  )
}

interface FormSectionProps {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
  required?: boolean
}

export function FormSection({ 
  title, 
  children, 
  className,
  required = false 
}: FormSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center gap-3">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        {required && (
          <span className="badge-modern bg-danger-100 text-danger-700 border-danger-200">
            必須
          </span>
        )}
      </div>
      <div className="pl-6 border-l-4 border-primary-200 bg-gradient-to-r from-primary-50/50 to-transparent rounded-r-xl p-4">
        {children}
      </div>
    </div>
  )
}

interface FormActionsProps {
  children: React.ReactNode
  className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn(
      'flex items-center justify-between pt-8 border-t border-gray-200/50',
      className
    )}>
      {children}
    </div>
  )
}
