"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import React from "react"

interface DataCardTooltipProps {
  children: React.ReactNode
  entities?: string[]
  sentimentScore?: number
  topicTags?: string[]
}

export function DataCardTooltip({ 
  children, 
  entities = ["Warner Bros", "Discovery", "CEO"],
  sentimentScore = -0.65,
  topicTags = ["Entertainment", "Business", "Earnings"]
}: DataCardTooltipProps) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={200}>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="bg-[#1a1a1a] border border-[#333] rounded-sm p-4 shadow-xl max-w-xs z-50"
            sideOffset={5}
          >
            <div className="font-mono text-xs space-y-3">
              <div>
                <div className="text-[#E6FF00] uppercase tracking-wider text-[10px] mb-1.5">Detected Entities</div>
                <div className="text-gray-300 flex flex-wrap gap-1.5">
                  {entities.map((entity, idx) => (
                    <span key={idx} className="bg-[#333] px-2 py-0.5 rounded text-[10px]">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[#E6FF00] uppercase tracking-wider text-[10px] mb-1.5">Sentiment Score</div>
                <div className="text-gray-300 text-sm font-bold">
                  {sentimentScore > 0 ? '+' : ''}{sentimentScore.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-[#E6FF00] uppercase tracking-wider text-[10px] mb-1.5">Topic Tags</div>
                <div className="text-gray-300 flex flex-wrap gap-1.5">
                  {topicTags.map((tag, idx) => (
                    <span key={idx} className="bg-[#333] px-2 py-0.5 rounded text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <TooltipPrimitive.Arrow className="fill-[#1a1a1a]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}

