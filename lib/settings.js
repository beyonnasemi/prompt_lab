'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// 전역 UI 설정값을 app_settings 테이블에서 읽고 쓰는 훅.
// 마이그레이션 미적용 시(테이블 없음)에도 fallback 값으로 정상 동작하도록 처리.
export function useAppSetting(key, fallback) {
  const [value, setValue] = useState(fallback);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) setValue(data.value);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  const update = useCallback(
    async (next) => {
      setValue(next); // optimistic
      await supabase
        .from('app_settings')
        .upsert({ key, value: next, updated_at: new Date().toISOString() });
    },
    [key],
  );

  return [value, update, loaded];
}
