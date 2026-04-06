import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import Toast, { ToastType } from '../components/Toast';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function useToast(): ToastContextType {
  return useContext(ToastContext);
}

export function ToastProvider({
  children,
  fonts,
}: {
  children: React.ReactNode;
  fonts?: { medium: string; semibold: string };
}) {
  const [current, setCurrent] = useState<ToastItem | null>(null);
  const queue = useRef<ToastItem[]>([]);
  const idCounter = useRef(0);
  const showing = useRef(false);

  const showNext = useCallback(() => {
    if (queue.current.length === 0) {
      showing.current = false;
      return;
    }
    const next = queue.current.shift()!;
    showing.current = true;
    setCurrent(next);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const item: ToastItem = { id: ++idCounter.current, message, type };
      queue.current.push(item);
      if (!showing.current) {
        showNext();
      }
    },
    [showNext],
  );

  const handleDismiss = useCallback(() => {
    setCurrent(null);
    // Small delay before showing next toast in queue
    setTimeout(() => {
      showNext();
    }, 150);
  }, [showNext]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <Toast
          key={current.id}
          message={current.message}
          type={current.type}
          visible={true}
          onDismiss={handleDismiss}
          fonts={fonts}
        />
      )}
    </ToastContext.Provider>
  );
}
