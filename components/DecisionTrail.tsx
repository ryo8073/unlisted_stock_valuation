import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDownIcon, ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

interface DecisionNode {
  id: string
  name: string
  description: string
  sourceRef?: string
  children?: DecisionNode[]
  result?: string
}

interface DecisionTrailProps {
  trail: DecisionNode[]
  className?: string
  collapsible?: boolean
  defaultExpanded?: boolean
}

export function DecisionTrail({
  trail,
  className,
  collapsible = true,
  defaultExpanded = true,
}: DecisionTrailProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    defaultExpanded ? new Set(trail.map(node => node.id)) : new Set()
  )

  const toggleNode = (nodeId: string) => {
    if (!collapsible) return
    
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const toggleAll = () => {
    if (expandedNodes.size === trail.length) {
      setExpandedNodes(new Set())
    } else {
      setExpandedNodes(new Set(trail.map(node => node.id)))
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          評価決定経路
        </h3>
        {collapsible && (
          <button
            onClick={toggleAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {expandedNodes.size === trail.length ? '全て折りたたむ' : '全て展開'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {trail.map((node, index) => (
          <DecisionNode
            key={node.id}
            node={node}
            index={index}
            isExpanded={expandedNodes.has(node.id)}
            onToggle={() => toggleNode(node.id)}
            collapsible={collapsible}
          />
        ))}
      </div>
    </div>
  )
}

interface DecisionNodeProps {
  node: DecisionNode
  index: number
  isExpanded: boolean
  onToggle: () => void
  collapsible: boolean
}

function DecisionNode({
  node,
  index,
  isExpanded,
  onToggle,
  collapsible,
}: DecisionNodeProps) {
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className={cn(
          'flex items-center justify-between p-4 cursor-pointer',
          'hover:bg-gray-50 transition-colors',
          hasChildren && collapsible ? 'cursor-pointer' : 'cursor-default'
        )}
        onClick={hasChildren && collapsible ? onToggle : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-semibold">
            {index + 1}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{node.name}</h4>
            <p className="text-sm text-gray-600 mt-1">{node.description}</p>
            {node.sourceRef && (
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  根拠: {node.sourceRef}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && collapsible && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="p-4 space-y-3">
            <h5 className="text-sm font-medium text-gray-700 mb-3">適用ルール</h5>
            {node.children?.map((child: DecisionNode, childIndex: number) => (
              <div key={child.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {childIndex + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900">{child.name}</span>
                    {child.sourceRef && (
                      <span className="text-xs text-gray-500">({child.sourceRef})</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{child.description}</p>
                  {child.result && (
                    <div className="mt-2">
                      <span className="text-xs font-medium text-gray-700">結果: </span>
                      <span className="text-sm text-gray-600">{child.result}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface DecisionTrailSummaryProps {
  trail: DecisionNode[]
  className?: string
}

export function DecisionTrailSummary({
  trail,
  className,
}: DecisionTrailSummaryProps) {
  const appliedRules = trail.reduce((sum, node) => {
    return sum + (node.children?.filter((child: DecisionNode) => child.result !== 'not_applied').length || 0)
  }, 0)

  return (
    <div className={cn('bg-gray-50 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">決定経路サマリー</h4>
          <p className="text-sm text-gray-600 mt-1">
            {trail.length}個の判定ステップで{appliedRules}個のルールが適用されました
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">{appliedRules}</div>
          <div className="text-sm text-gray-500">適用ルール数</div>
        </div>
      </div>
    </div>
  )
}
