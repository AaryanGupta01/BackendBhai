import { useState, useCallback, useRef } from 'react';
import type { ToastState } from '@/types';

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ visible: false, message: '' });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, 2200);
  }, []);

  return { toast, showToast };
}
