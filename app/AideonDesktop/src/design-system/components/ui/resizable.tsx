import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

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

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  if (isTauriRuntime()) {
    const { children, direction, onLayout, ...rest } = props

    React.useEffect(() => {
      if (!onLayout) {
        return
      }

      const childSizes = React.Children.toArray(children)
        .map((child) => {
          if (!React.isValidElement(child)) {
            return
          }
          const defaultSize = (child.props as { defaultSize?: unknown }).defaultSize
          return typeof defaultSize === "number" ? defaultSize : undefined
        })
        .filter((value): value is number => typeof value === "number")

      if (childSizes.length > 0) {
        onLayout(childSizes)
      }
    }, [children, onLayout])

    return (
      <div
        data-slot="resizable-panel-group"
        data-panel-group-direction={direction}
        className={cn(
          "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
          className
        )}
        {...(rest as React.ComponentProps<"div">)}
      >
        {children}
      </div>
    )
  }

  return (
    <ResizablePrimitive.PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = React.forwardRef<
  ResizablePrimitive.ImperativePanelHandle,
  React.ComponentProps<typeof ResizablePrimitive.Panel>
>((props, forwardedRef) => {
  if (!isTauriRuntime()) {
    return <ResizablePrimitive.Panel ref={forwardedRef} data-slot="resizable-panel" {...props} />
  }

  const {
    children,
    className,
    defaultSize,
    collapsible,
    collapsedSize,
    onCollapse,
    onExpand,
    ...rest
  } = props

  const initialCollapsed = Boolean(collapsible) && (defaultSize ?? 0) === 0
  const [collapsed, setCollapsed] = React.useState(initialCollapsed)

  const collapse = React.useCallback(() => {
    if (!collapsible) {
      return
    }
    setCollapsed((prev) => {
      if (prev) {
        return prev
      }
      onCollapse?.()
      return true
    })
  }, [collapsible, onCollapse])

  const expand = React.useCallback(() => {
    if (!collapsible) {
      return
    }
    setCollapsed((prev) => {
      if (!prev) {
        return prev
      }
      onExpand?.()
      return false
    })
  }, [collapsible, onExpand])

  React.useImperativeHandle(
    forwardedRef,
    () =>
      ({
        collapse,
        expand,
      }) as unknown as ResizablePrimitive.ImperativePanelHandle,
    [collapse, expand]
  )

  const basis = collapsed ? (collapsedSize ?? 0) : (defaultSize ?? 0)

  return (
    <div
      data-slot="resizable-panel"
      data-collapsed={collapsed ? "" : undefined}
      className={className}
      style={{
        flexBasis: `${basis}%`,
        flexGrow: 0,
        flexShrink: 0,
        overflow: "hidden",
      }}
      {...(rest as React.ComponentProps<"div">)}
    >
      {children}
    </div>
  )
})

ResizablePanel.displayName = "ResizablePanel"

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean
}) {
  if (isTauriRuntime()) {
    return (
      <div
        data-slot="resizable-handle"
        className={cn(
          "bg-border relative flex w-px items-center justify-center data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
          className
        )}
        {...(props as React.ComponentProps<"div">)}
      >
        {withHandle && (
          <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
            <GripVerticalIcon className="size-2.5" />
          </div>
        )}
      </div>
    )
  }

  return (
    <ResizablePrimitive.PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizablePrimitive.PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
