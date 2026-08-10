import express from 'express';
import { allCards } from '../data/cards';
import { getCardImageUrl } from '../data/cardImages';

const router = express.Router();

router.get('/', (req, res) => {
  const skin = req.query.skin as string || 'waite';

  res.json(allCards.map((card, index) => ({
    id: `card-${index + 1}`,
    ...card,
    imageUrl: getCardImageUrl(card.name, card.type, card.suit, card.number, skin),
  })));
});

router.get('/:id', (req, res) => {
  const card = allCards.find((_, index) => `card-${index + 1}` === req.params.id);
  const skin = req.query.skin as string || 'waite';

  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  res.json({
    id: `card-${allCards.indexOf(card) + 1}`,
    ...card,
    imageUrl: getCardImageUrl(card.name, card.type, card.suit, card.number, skin),
  });
});

export default router;
