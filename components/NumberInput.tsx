import React from 'react'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  label?: React.ReactNode
  value: number | string
  onChange: (value: number) => void
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  unit?: string
  className?: string
  error?: string
  disabled?: boolean
  dataTestId?: string
}

export function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  min,
  max,
  step = 1,
  unit,
  className,
  error,
  disabled = false,
  dataTestId,
}: NumberInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    if (inputValue === '') {
      onChange(0)
    } else {
      const numValue = parseFloat(inputValue)
      if (!isNaN(numValue)) {
        onChange(numValue)
      }
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    if (inputValue === '') {
      onChange(0)
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <label className="block text-sm font-semibold text-gray-700">
          {label}
          {required && <span className="text-danger-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative group">
        <input
          type="number"
          value={value === 0 ? '' : value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          data-testid={dataTestId}
          className={cn(
            'input-modern',
            'group-hover:border-primary-300 group-hover:shadow-md',
            'disabled:bg-gray-50/50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-danger-300 focus:ring-danger-500/25 focus:border-danger-500',
            unit && 'pr-16'
          )}
        />
        
        {unit && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-4">
            <span className="text-gray-500 text-sm font-medium bg-gray-100/80 px-2 py-1 rounded-lg">
              {unit}
            </span>
          </div>
        )}
        
        {/* Focus ring effect */}
        <div className="absolute inset-0 rounded-xl pointer-events-none transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-primary-500/25"></div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger-600 animate-pulse">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}

interface CurrencyInputProps extends Omit<NumberInputProps, 'unit'> {
  currency?: string
}

export function CurrencyInput({
  currency = '円',
  ...props
}: CurrencyInputProps) {
  return (
    <NumberInput
      {...props}
      unit={currency}
      step={0.01}
      placeholder="0.00"
    />
  )
}

interface PercentageInputProps extends Omit<NumberInputProps, 'unit'> {}

export function PercentageInput(props: PercentageInputProps) {
  return (
    <NumberInput
      {...props}
      unit="%"
      step={0.1}
      min={0}
      max={100}
      placeholder="0.0"
    />
  )
}
