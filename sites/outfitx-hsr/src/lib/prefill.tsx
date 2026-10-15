import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Prefill = { goal: string; nonce: number };
const Ctx = createContext<{ prefill: Prefill | null; setPrefill: (p: Prefill) => void } | null>(null);

export function EnquiryPrefillProvider({ children }: { children: ReactNode }) {
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  return <Ctx.Provider value={{ prefill, setPrefill }}>{children}</Ctx.Provider>;
}

export function usePrefill() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrefill must be used inside EnquiryPrefillProvider');
  return ctx.prefill;
}

/** Returns a function that pre-selects a fitness goal and moves to the enquiry form. */
export function useEnquire() {
  const ctx = useContext(Ctx);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return useCallback(
    (goal?: string) => {
      if (goal) ctx?.setPrefill({ goal, nonce: Date.now() });
      if (pathname !== '/') {
        navigate('/#enquire');
        return;
      }
      const el = document.getElementById('enquire');
      el?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', '#enquire');
    },
    [ctx, navigate, pathname],
  );
}
