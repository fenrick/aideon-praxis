'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Button } from 'design-system/components/ui/button';
import { cn } from 'design-system/lib/utils';
import { type LucideIcon, XIcon } from 'lucide-react';
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  type MouseEventHandler,
  useContext,
} from 'react';

interface BannerContextProperties {
  show: boolean;
  setShow: (show: boolean) => void;
}

export const BannerContext = createContext<BannerContextProperties>({
  show: true,
  setShow: () => {},
});

export type BannerProps = HTMLAttributes<HTMLDivElement> & {
  visible?: boolean;
  defaultVisible?: boolean;
  onClose?: () => void;
  inset?: boolean;
};

export const Banner = ({
  children,
  visible,
  defaultVisible = true,
  onClose,
  className,
  inset = false,
  ...properties
}: BannerProps) => {
  const [show, setShow] = useControllableState({
    defaultProp: defaultVisible,
    prop: visible,
    onChange: onClose,
  });

  if (!show) {
    return null;
  }

  return (
    <BannerContext.Provider value={{ show, setShow }}>
      <div
        className={cn(
          'bg-primary text-primary-foreground flex w-full items-center justify-between gap-2 px-4 py-2',
          inset && 'rounded-lg',
          className,
        )}
        {...properties}
      >
        {children}
      </div>
    </BannerContext.Provider>
  );
};

export type BannerIconProps = HTMLAttributes<HTMLDivElement> & {
  icon: LucideIcon;
};

export const BannerIcon = ({ icon: Icon, className, ...properties }: BannerIconProps) => (
  <div
    className={cn(
      'border-background/20 bg-background/10 rounded-full border p-1 shadow-sm',
      className,
    )}
    {...properties}
  >
    <Icon size={16} />
  </div>
);

export type BannerTitleProps = HTMLAttributes<HTMLParagraphElement>;

export const BannerTitle = ({ className, ...properties }: BannerTitleProps) => (
  <p className={cn('flex-1 text-sm', className)} {...properties} />
);

export type BannerActionProps = ComponentProps<typeof Button>;

export const BannerAction = ({
  variant = 'outline',
  size = 'sm',
  className,
  ...properties
}: BannerActionProps) => (
  <Button
    className={cn(
      'hover:bg-background/10 hover:text-background shrink-0 bg-transparent',
      className,
    )}
    size={size}
    variant={variant}
    {...properties}
  />
);

export type BannerCloseProps = ComponentProps<typeof Button>;

export const BannerClose = ({
  variant = 'ghost',
  size = 'icon',
  onClick,
  className,
  ...properties
}: BannerCloseProps) => {
  const { setShow } = useContext(BannerContext);

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    setShow(false);
    onClick?.(e);
  };

  return (
    <Button
      className={cn(
        'hover:bg-background/10 hover:text-background shrink-0 bg-transparent',
        className,
      )}
      onClick={handleClick}
      size={size}
      variant={variant}
      {...properties}
    >
      <XIcon size={18} />
    </Button>
  );
};
