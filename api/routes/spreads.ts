import express from 'express';
import { spreads } from '../data/spreads';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(spreads.map((spread, index) => ({
    id: `spread-${index + 1}`,
    ...spread,
  })));
});

router.get('/:id', (req, res) => {
  const spread = spreads.find((_, index) => `spread-${index + 1}` === req.params.id);
  if (!spread) {
    return res.status(404).json({ error: 'Spread not found' });
  }
  res.json({
    id: `spread-${spreads.indexOf(spread) + 1}`,
    ...spread,
  });
});

export default router;
