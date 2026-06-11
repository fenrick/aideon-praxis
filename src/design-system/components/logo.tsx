import Image from 'next/image';

import { cn } from 'design-system/lib/utils';

const LOGO_SOURCES = {
  horizontal: { src: '/brand/logo-horizontal.png', width: 1536, height: 1024 },
  vertical: { src: '/brand/logo-vertical.png', width: 1024, height: 1024 },
} as const;

export type LogoVariant = keyof typeof LOGO_SOURCES;

type LogoProps = {
  /** Lockup orientation: `horizontal` (mark beside wordmark) or `vertical` (mark above). */
  readonly variant?: LogoVariant;
  /** Render on a light "plate" so the logo reads cleanly on dark surfaces too. */
  readonly plate?: boolean;
  readonly priority?: boolean;
  readonly alt?: string;
  readonly className?: string;
  /** Wrapper class when `plate` is set (e.g. padding, radius, shadow). */
  readonly plateClassName?: string;
};

/**
 * The Aideon brand lockup. Sizing is controlled by the caller via `className`
 * (e.g. `h-10 w-auto`); intrinsic dimensions preserve the aspect ratio.
 * @param props - Logo props.
 * @returns The brand logo image, optionally on a light plate.
 */
export function Logo({
  variant = 'horizontal',
  plate = false,
  priority = false,
  alt = 'Aideon',
  className,
  plateClassName,
}: LogoProps) {
  const { src, width, height } = LOGO_SOURCES[variant];
  const image = (
    <Image
      src={src}
      width={width}
      height={height}
      alt={alt}
      priority={priority}
      className={cn('h-auto w-auto select-none', className)}
    />
  );

  if (!plate) {
    return image;
  }

  return (
    <div className={cn('inline-flex items-center justify-center rounded-xl bg-white p-4', plateClassName)}>
      {image}
    </div>
  );
}
