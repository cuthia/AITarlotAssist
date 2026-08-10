import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { allCards } from '../data/cards';
import { spreads } from '../data/spreads';
import { getCardImageUrl } from '../data/cardImages';

const router = express.Router();

interface ReadingCard {
  cardId: string;
  positionIndex: number;
  isReversed: boolean;
  interpretation?: string;
  cardType?: 'tarot' | 'lenormand' | 'oracle';
}

interface Reading {
  id: string;
  userId: string;
  spreadId: string;
  question: string;
  cards: ReadingCard[];
  interpretation: string;
  supplementaryCards?: ReadingCard[];
  feedback?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const readings: Record<string, Reading[]> = {};

const hydrateCard = (cardId: string, skin: string = 'waite') => {
  const baseCard = allCards.find((_, index) => `card-${index + 1}` === cardId);
  if (!baseCard) return undefined;
  return {
    ...baseCard,
    id: cardId,
    imageUrl: getCardImageUrl(baseCard.name, baseCard.type, baseCard.suit, baseCard.number, skin),
  };
};

router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  res.json(readings[userId] || []);
});

router.get('/:id', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  const skin = (req.query.skin as string) || 'waite';
  const reading = (readings[userId] || []).find(r => r.id === req.params.id);
  if (!reading) {
    return res.status(404).json({ error: 'Reading not found' });
  }

  const readingWithCards = {
    ...reading,
    cards: reading.cards.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId, skin),
    })),
    supplementaryCards: reading.supplementaryCards?.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId, skin),
    })),
  };

  res.json(readingWithCards);
});

router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  const { spreadId, question, cards, interpretation } = req.body;
  
  if (!spreadId || !question || !cards || !interpretation) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const spread = spreads.find((_, index) => `spread-${index + 1}` === spreadId);
  if (!spread) {
    return res.status(404).json({ error: 'Spread not found' });
  }
  
  const newReading: Reading = {
    id: uuidv4(),
    userId,
    spreadId,
    question,
    cards,
    interpretation,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  if (!readings[userId]) {
    readings[userId] = [];
  }
  readings[userId].unshift(newReading);
  
  res.status(201).json({
    ...newReading,
    cards: newReading.cards.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
  });
});

router.post('/:id/supplement', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  const { cardId, cardType, positionIndex, isReversed } = req.body;

  const readingIndex = (readings[userId] || []).findIndex(r => r.id === req.params.id);
  if (readingIndex === -1) {
    return res.status(404).json({ error: 'Reading not found' });
  }

  const newSupplementaryCard: ReadingCard = {
    cardId,
    positionIndex,
    isReversed,
    cardType: cardType || 'tarot',
  };

  if (!readings[userId][readingIndex].supplementaryCards) {
    readings[userId][readingIndex].supplementaryCards = [];
  }
  readings[userId][readingIndex].supplementaryCards.push(newSupplementaryCard);
  readings[userId][readingIndex].updatedAt = new Date().toISOString();

  res.json({
    ...readings[userId][readingIndex],
    cards: readings[userId][readingIndex].cards.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
    supplementaryCards: readings[userId][readingIndex].supplementaryCards?.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
  });
});

router.post('/:id/interpret', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  const { interpretation } = req.body;

  const readingIndex = (readings[userId] || []).findIndex(r => r.id === req.params.id);
  if (readingIndex === -1) {
    return res.status(404).json({ error: 'Reading not found' });
  }

  readings[userId][readingIndex].interpretation = interpretation;
  readings[userId][readingIndex].updatedAt = new Date().toISOString();

  res.json({
    ...readings[userId][readingIndex],
    cards: readings[userId][readingIndex].cards.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
    supplementaryCards: readings[userId][readingIndex].supplementaryCards?.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
  });
});

router.post('/:id/feedback', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  const { rating, comment } = req.body;

  const readingIndex = (readings[userId] || []).findIndex(r => r.id === req.params.id);
  if (readingIndex === -1) {
    return res.status(404).json({ error: 'Reading not found' });
  }

  readings[userId][readingIndex].feedback = {
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  readings[userId][readingIndex].updatedAt = new Date().toISOString();

  res.json({
    ...readings[userId][readingIndex],
    cards: readings[userId][readingIndex].cards.map(rc => ({
      ...rc,
      card: hydrateCard(rc.cardId),
    })),
  });
});

router.delete('/:id', (req, res) => {
  const userId = req.headers['x-user-id'] as string || 'guest';
  
  const initialLength = readings[userId]?.length || 0;
  readings[userId] = (readings[userId] || []).filter(r => r.id !== req.params.id);
  
  if (readings[userId]?.length === initialLength) {
    return res.status(404).json({ error: 'Reading not found' });
  }
  
  res.json({ success: true });
});

export default router;
