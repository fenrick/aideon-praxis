import * as CommandPrimitive from 'cmdk';
import type { ComponentProps, ComponentPropsWithoutRef, ComponentRef, HTMLAttributes } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utilities';

import { Dialog, DialogContent } from '@/components/ui/dialog';

const Command = forwardRef<
  ComponentRef<typeof CommandPrimitive.Command>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Command>
>(function Command({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.Command
      ref={reference}
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-lg border border-border/60 bg-popover text-popover-foreground',
        className,
      )}
      {...properties}
    />
  );
});

const CommandDialog = ({ children, ...properties }: ComponentProps<typeof Dialog>) => (
  <Dialog {...properties}>
    <DialogContent className="overflow-hidden p-0 shadow-2xl">
      <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
        {children}
      </Command>
    </DialogContent>
  </Dialog>
);

const CommandInput = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandInput>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandInput>
>(function CommandInput({ className, ...properties }, reference) {
  return (
    <div className="flex items-center border-b border-border/60 px-3" data-slot="command-input">
      <CommandPrimitive.CommandInput
        ref={reference}
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...properties}
      />
    </div>
  );
});

const CommandList = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandList>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandList>
>(function CommandList({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.CommandList
      ref={reference}
      className={cn('max-h-72 overflow-y-auto overflow-x-hidden px-1 py-2', className)}
      {...properties}
    />
  );
});

const CommandEmpty = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandEmpty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandEmpty>
>(function CommandEmpty({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.CommandEmpty
      ref={reference}
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...properties}
    />
  );
});

const CommandGroup = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandGroup>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandGroup>
>(function CommandGroup({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.CommandGroup
      ref={reference}
      className={cn(
        'overflow-hidden px-2 py-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...properties}
    />
  );
});

const CommandSeparator = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandSeparator>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandSeparator>
>(function CommandSeparator({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.CommandSeparator
      ref={reference}
      className={cn('mx-2 my-1 h-px bg-border/70', className)}
      {...properties}
    />
  );
});

const CommandItem = forwardRef<
  ComponentRef<typeof CommandPrimitive.CommandItem>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.CommandItem>
>(function CommandItem({ className, ...properties }, reference) {
  return (
    <CommandPrimitive.CommandItem
      ref={reference}
      className={cn(
        'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-muted',
        className,
      )}
      {...properties}
    />
  );
});

const CommandShortcut = ({ className, ...properties }: HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
    {...properties}
  />
);

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};
