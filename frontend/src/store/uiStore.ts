import { create } from 'zustand';

interface UIState {
  mobileView: boolean;
  toggleMobileView: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  mobileView: typeof window !== 'undefined' && localStorage.getItem('mobileView') === 'true',

  toggleMobileView: () =>
    set((state) => {
      const next = !state.mobileView;
      localStorage.setItem('mobileView', String(next));
      return { mobileView: next };
    }),
}));
