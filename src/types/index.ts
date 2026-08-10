export interface Card {
  id: string;
  name: string;
  type: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  meaningUpright: string;
  meaningReversed: string;
  keywords: string[];
  imageUrl: string;
}

export interface Spread {
  id: string;
  name: string;
  description: string;
  positions: SpreadPosition[];
  cardCount: number;
}

export interface SpreadPosition {
  index: number;
  name: string;
  description: string;
}

export interface Reading {
  id: string;
  userId: string;
  spreadId: string;
  question: string;
  cards: ReadingCard[];
  interpretation: string;
  supplementaryCards?: ReadingCard[];
  feedback?: Feedback;
  createdAt: string;
  updatedAt: string;
}

export type SupplementCardType = 'tarot' | 'lenormand' | 'oracle';

export interface ReadingCard {
  cardId: string;
  positionIndex: number;
  isReversed: boolean;
  interpretation?: string;
  card?: Card;
  cardType?: SupplementCardType;
}

export interface Feedback {
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface DeckSkin {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  cardBackUrl: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
}
