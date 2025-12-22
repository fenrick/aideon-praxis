"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "design-system/lib/utilities"

function isTauriRuntime() {
  const metaEnvironment = (import.meta as { env?: { TAURI_PLATFORM?: string } }).env
  if (metaEnvironment?.TAURI_PLATFORM) {
    return true
  }

  const global = globalThis as {
    __TAURI__?: unknown
    __TAURI_INTERNALS__?: unknown
    window?: Window
  }
  return Boolean(
    global.__TAURI__ ??
      global.__TAURI_INTERNALS__ ??
      global.window?.__TAURI_INTERNALS__ ??
      global.window?.__TAURI_METADATA__
  )
}

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  if (isTauriRuntime()) {
    return (
      <div
        data-slot="scroll-area"
        className={cn("relative overflow-auto", className)}
        {...(props as React.ComponentProps<"div">)}
      >
        <div data-slot="scroll-area-viewport" className="size-full">
          {children}
        </div>
      </div>
    )
  }

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  if (isTauriRuntime()) {
    return null
  }

  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

export { ScrollArea, ScrollBar }
