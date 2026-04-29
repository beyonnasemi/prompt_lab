'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

/**
 * Logo = mark + wordmark typography.
 * `size`: controls overall scale.
 * `showSubtitle`: show "AICEA" subtitle underneath wordmark.
 * `stacked`: stack mark on top (used for compact/square placements).
 */
export default function Logo({
  size = 'md',
  showSubtitle = true,
  stacked = false,
  className,
}) {
  const sizes = {
    sm: { mark: 22, title: 'text-[15px]', sub: 'text-[9px]' },
    md: { mark: 30, title: 'text-[20px]', sub: 'text-[10px]' },
    lg: { mark: 44, title: 'text-[28px]', sub: 'text-[11px]' },
  }[size];

  return (
    <div
      className={cn(
        'flex items-center gap-2.5 select-none',
        stacked && 'flex-col gap-1.5 text-center',
        className,
      )}
    >
      {/* Mark — light / dark swap */}
      <span className="relative inline-flex">
        <Image
          src="/prompt_lab_logo_white.png"
          alt=""
          width={sizes.mark}
          height={sizes.mark}
          priority
          className="block h-auto w-auto dark:hidden"
          style={{ height: sizes.mark, width: 'auto' }}
        />
        <Image
          src="/prompt_lab_logo_dark.png"
          alt=""
          width={sizes.mark}
          height={sizes.mark}
          priority
          className="hidden h-auto w-auto dark:block"
          style={{ height: sizes.mark, width: 'auto' }}
        />
      </span>

      {/* Wordmark */}
      <div className={cn('flex flex-col leading-none', stacked && 'items-center')}>
        <span
          className={cn(
            'font-display font-bold tracking-tight text-foreground',
            sizes.title,
          )}
        >
          Prompt<span className="text-success-600 dark:text-success-500">.</span>Lab
        </span>
        {showSubtitle && (
          <span
            className={cn(
              'mt-1 font-semibold uppercase tracking-[0.18em] text-muted-foreground',
              sizes.sub,
            )}
          >
            AICEA · AI Education
          </span>
        )}
      </div>
    </div>
  );
}
