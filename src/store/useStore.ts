import { create } from 'zustand';
import { User, Reading, Spread, Card, DeckSkin } from '@/types';

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  
  readings: Reading[];
  currentReading: Reading | null;
  
  spreads: Spread[];
  cards: Card[];
  
  selectedSpread: Spread | null;
  selectedDeckSkin: DeckSkin | null;
  deckSkins: DeckSkin[];
  
  question: string;
  isDrawing: boolean;
  
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (loading: boolean) => void;
  
  setReadings: (readings: Reading[]) => void;
  setCurrentReading: (reading: Reading | null) => void;
  addReading: (reading: Reading) => void;
  updateReading: (reading: Reading) => void;
  deleteReading: (readingId: string) => void;
  
  setSpreads: (spreads: Spread[]) => void;
  setCards: (cards: Card[]) => void;
  
  setSelectedSpread: (spread: Spread | null) => void;
  setSelectedDeckSkin: (skin: DeckSkin | null) => void;
  setDeckSkins: (skins: DeckSkin[]) => void;
  
  setQuestion: (question: string) => void;
  setIsDrawing: (isDrawing: boolean) => void;
  
  clearDrawState: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  
  readings: [],
  currentReading: null,
  
  spreads: [],
  cards: [],
  
  selectedSpread: null,
  selectedDeckSkin: null,
  deckSkins: [],
  
  question: '',
  isDrawing: false,
  
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setLoading: (loading) => set({ loading }),
  
  setReadings: (readings) => set({ readings }),
  setCurrentReading: (reading) => set({ currentReading: reading }),
  addReading: (reading) => set((state) => ({ readings: [reading, ...state.readings] })),
  updateReading: (reading) => set((state) => ({ 
    readings: state.readings.map(r => r.id === reading.id ? reading : r),
    currentReading: state.currentReading?.id === reading.id ? reading : state.currentReading
  })),
  deleteReading: (readingId) => set((state) => ({ 
    readings: state.readings.filter(r => r.id !== readingId),
    currentReading: state.currentReading?.id === readingId ? null : state.currentReading
  })),
  
  setSpreads: (spreads) => set({ spreads }),
  setCards: (cards) => set({ cards }),
  
  setSelectedSpread: (spread) => set({ selectedSpread: spread }),
  setSelectedDeckSkin: (skin) => set({ selectedDeckSkin: skin }),
  setDeckSkins: (skins) => set({ deckSkins: skins }),
  
  setQuestion: (question) => set({ question }),
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  
  clearDrawState: () => set({ 
    selectedSpread: null, 
    question: '', 
    isDrawing: false,
    currentReading: null 
  }),
}));
