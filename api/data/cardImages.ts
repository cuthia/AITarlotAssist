export const cardFileNameMap: Record<string, string> = {
  'The Fool': '00-fool',
  'The Magician': '01-magician',
  'The High Priestess': '02-high-priestess',
  'The Empress': '03-empress',
  'The Emperor': '04-emperor',
  'The Hierophant': '05-hierophant',
  'The Lovers': '06-lovers',
  'The Chariot': '07-chariot',
  'Strength': '08-strength',
  'The Hermit': '09-hermit',
  'Wheel of Fortune': '10-wheel-of-fortune',
  'Justice': '11-justice',
  'The Hanged Man': '12-hanged-man',
  'Death': '13-death',
  'Temperance': '14-temperance',
  'The Devil': '15-devil',
  'The Tower': '16-tower',
  'The Star': '17-star',
  'The Moon': '18-moon',
  'The Sun': '19-sun',
  'Judgement': '20-judgement',
  'The World': '21-world',
};

export const suitNameMap: Record<string, string> = {
  wands: 'wands',
  cups: 'cups',
  swords: 'swords',
  pentacles: 'pentacles',
};

export const courtCardMap: Record<string, string> = {
  Page: 'page',
  Knight: 'knight',
  Queen: 'queen',
  King: 'king',
};

export const getCardFileName = (cardName: string, type: string, suit?: string, number?: number): string => {
  if (type === 'major') {
    return cardFileNameMap[cardName] || `major-${cardName.toLowerCase().replace(/\s+/g, '-')}`;
  }
  
  if (type === 'minor' && suit && number) {
    return `${number}-of-${suitNameMap[suit]}`;
  }
  
  if (type === 'minor' && suit) {
    const courtMatch = cardName.match(/(Page|Knight|Queen|King)/);
    if (courtMatch) {
      return `${courtCardMap[courtMatch[1]]}-of-${suitNameMap[suit]}`;
    }
  }
  
  return cardName.toLowerCase().replace(/\s+/g, '-');
};

export const getCardImageUrl = (cardName: string, type: string, suit?: string, number?: number, skin: string = 'waite'): string => {
  const fileName = getCardFileName(cardName, type, suit, number);
  return `/cards/${skin}/${fileName}.jpg`;
};

export const deckSkins = [
  {
    id: 'waite',
    name: '经典韦特',
    description: '经典的韦特塔罗牌，最流行的塔罗牌设计',
    previewUrl: '/cards/waite/00-fool.jpg',
    cardBackUrl: '/cards/waite/back.svg',
    basePath: '/cards/waite/',
  },
];
