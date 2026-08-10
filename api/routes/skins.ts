import express from 'express';
import { deckSkins } from '../data/cardImages';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(deckSkins);
});

router.get('/:id', (req, res) => {
  const skin = deckSkins.find(s => s.id === req.params.id);
  if (!skin) {
    return res.status(404).json({ error: 'Skin not found' });
  }
  res.json(skin);
});

export default router;
