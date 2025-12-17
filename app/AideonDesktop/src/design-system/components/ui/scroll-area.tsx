"use client"

import * as React from "react"

import { cn } from "design-system/lib/utilities"

interface ScrollAreaProps extends React.ComponentProps<"div"> {
  children?: React.ReactNode
}

function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface ScrollBarProps {
  className?: string
  orientation?: "vertical" | "horizontal"
}

function ScrollBar({ className, orientation = "vertical" }: ScrollBarProps) {
  return null
}

export { ScrollArea, ScrollBar }
