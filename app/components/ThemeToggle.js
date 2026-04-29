'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-border bg-muted p-1',
          compact ? 'h-8 w-24' : 'h-9 w-28'
        )}
      />
    );
  }

  const options = [
    { value: 'light', icon: Sun, label: '라이트' },
    { value: 'system', icon: Monitor, label: '시스템' },
    { value: 'dark', icon: Moon, label: '다크' },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="테마 선택"
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-muted p-1',
        compact ? 'gap-0.5' : 'gap-1'
      )}
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex items-center justify-center rounded-full transition-all',
              compact ? 'h-6 w-6' : 'h-7 w-7',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={compact ? 13 : 14} />
          </button>
        );
      })}
    </div>
  );
}
