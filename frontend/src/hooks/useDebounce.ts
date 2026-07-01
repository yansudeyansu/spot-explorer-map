'use client';
import { useState, useEffect } from 'react';

// 値の更新が delay ミリ秒止まってから反映する汎用デバウンス。
// 次の更新が来るたび前回のタイマーを破棄するので、連続変化中は確定しない。
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
