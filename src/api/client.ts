import { Reading, Spread, Card, Feedback, DeckSkin, SupplementCardType } from '@/types';

const API_BASE = '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiClient = {
  spreads: {
    getAll: async (): Promise<Spread[]> => {
      const response = await fetch(`${API_BASE}/spreads`);
      return response.json();
    },
  },
  
  cards: {
    getAll: async (): Promise<Card[]> => {
      const response = await fetch(`${API_BASE}/cards`);
      return response.json();
    },
  },
  
  readings: {
    getAll: async (): Promise<Reading[]> => {
      const response = await fetch(`${API_BASE}/readings`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },
    
    getById: async (id: string): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading/${id}`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },
    
    create: async (data: {
      spreadId: string;
      question: string;
      cards: { cardId: string; positionIndex: number; isReversed: boolean }[];
      interpretation: string;
    }): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    
    update: async (id: string, data: Partial<Reading>): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    
    delete: async (id: string): Promise<void> => {
      await fetch(`${API_BASE}/reading/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
    },
    
    addSupplement: async (id: string, data: {
      cardId: string;
      cardType: SupplementCardType;
      positionIndex: number;
      isReversed: boolean;
    }): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading/${id}/supplement`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    
    addFeedback: async (id: string, feedback: Omit<Feedback, 'createdAt'>): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading/${id}/feedback`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedback),
      });
      return response.json();
    },
    
    updateInterpretation: async (id: string, interpretation: string): Promise<Reading> => {
      const response = await fetch(`${API_BASE}/reading/${id}/interpret`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interpretation }),
      });
      return response.json();
    },
  },
  
  interpret: {
    interpret: async (data: {
      spreadId: string;
      question: string;
      cards: { cardId: string; positionIndex: number; isReversed: boolean; card: Card }[];
      supplementaryCards?: { cardId: string; positionIndex: number; isReversed: boolean; card: Card }[];
    }): Promise<{ interpretation: string }> => {
      const response = await fetch(`${API_BASE}/interpret`, {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },
  
  skins: {
    getAll: async (): Promise<DeckSkin[]> => {
      const response = await fetch(`${API_BASE}/skins`);
      return response.json();
    },
    
    getById: async (id: string): Promise<DeckSkin> => {
      const response = await fetch(`${API_BASE}/skins/${id}`);
      return response.json();
    },
  },
  
  auth: {
    login: async (email: string, password: string): Promise<{ token: string; user: any }> => {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return response.json();
    },
    
    signup: async (email: string, password: string, name: string): Promise<{ token: string; user: any }> => {
      const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      return response.json();
    },
    
    logout: async (): Promise<void> => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    
    getCurrentUser: async (): Promise<any> => {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeader(),
      });
      return response.json();
    },
  },
};
