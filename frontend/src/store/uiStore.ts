import { create } from 'zustand';

type ViewMode = 'cards' | 'table';

interface UIState {
  viewMode: ViewMode;
  toggleViewMode: () => void;
}

const getDefault = (): ViewMode => {
  const stored = localStorage.getItem('viewMode') as ViewMode | null;
  if (stored === 'cards' || stored === 'table') return stored;
  return window.innerWidth < 768 ? 'cards' : 'table';
};

export const useUIStore = create<UIState>((set) => ({
  viewMode: getDefault(),
  toggleViewMode: () =>
    set((state) => {
      const next: ViewMode = state.viewMode === 'cards' ? 'table' : 'cards';
      localStorage.setItem('viewMode', next);
      return { viewMode: next };
    }),
}));
