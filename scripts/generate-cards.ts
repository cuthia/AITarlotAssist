import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateCardSVG = (cardName: string, cardNumber: number): string => {
  const gradientStart = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981'][cardNumber % 4];
  const gradientEnd = ['#6366F1', '#8B5CF6', '#D97706', '#059669'][cardNumber % 4];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradientStart};stop-opacity:0.9"/>
      <stop offset="100%" style="stop-color:${gradientEnd};stop-opacity:0.7"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="200" height="300" rx="12" fill="url(#card-bg)" stroke="#F59E0B" stroke-width="2"/>
  
  <rect x="10" y="10" width="180" height="280" rx="8" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
  
  <text x="100" y="150" font-family="serif" font-size="18" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" filter="url(#glow)">
    ${cardName}
  </text>
  
  <text x="100" y="175" font-family="serif" font-size="12" fill="#FCD34D" text-anchor="middle" dominant-baseline="middle">
    Card ${cardNumber}
  </text>
  
  <circle cx="100" cy="80" r="30" fill="none" stroke="#F59E0B" stroke-width="1" opacity="0.5"/>
  <circle cx="100" cy="220" r="20" fill="none" stroke="#F59E0B" stroke-width="1" opacity="0.3"/>
  
  <line x1="100" y1="60" x2="100" y2="100" stroke="#F59E0B" stroke-width="1" opacity="0.5"/>
  <line x1="80" y1="80" x2="120" y2="80" stroke="#F59E0B" stroke-width="1" opacity="0.5"/>
</svg>`;
};

const generateBackSVG = (): string => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300" viewBox="0 0 200 300">
  <defs>
    <linearGradient id="back-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1F2937"/>
      <stop offset="50%" style="stop-color:#374151"/>
      <stop offset="100%" style="stop-color:#1F2937"/>
    </linearGradient>
    <filter id="gold-glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  
  <rect width="200" height="300" rx="12" fill="url(#back-bg)" stroke="#F59E0B" stroke-width="3"/>
  
  <rect x="15" y="15" width="170" height="270" rx="8" fill="none" stroke="#F59E0B" stroke-width="1" opacity="0.3"/>
  
  <g filter="url(#gold-glow)">
    <circle cx="100" cy="150" r="60" fill="none" stroke="#F59E0B" stroke-width="2"/>
    <circle cx="100" cy="150" r="45" fill="none" stroke="#FCD34D" stroke-width="1" opacity="0.8"/>
    <circle cx="100" cy="150" r="30" fill="none" stroke="#F59E0B" stroke-width="1" opacity="0.6"/>
  </g>
  
  <g fill="#F59E0B" filter="url(#gold-glow)">
    <polygon points="100,70 108,100 140,100 115,120 125,150 100,135 75,150 85,120 60,100 92,100"/>
  </g>
  
  <text x="100" y="270" font-family="serif" font-size="10" fill="#F59E0B" text-anchor="middle">
    Tarot
  </text>
</svg>`;
};

const main = () => {
  const outputDir = path.join(__dirname, '../public/cards/waite');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const cards = [
    '00-fool', '01-magician', '02-high-priestess', '03-empress', '04-emperor',
    '05-hierophant', '06-lovers', '07-chariot', '08-strength', '09-hermit',
    '10-wheel-of-fortune', '11-justice', '12-hanged-man', '13-death', '14-temperance',
    '15-devil', '16-tower', '17-star', '18-moon', '19-sun', '20-judgement', '21-world',
  ];
  
  const suits = ['wands', 'cups', 'swords', 'pentacles'];
  const numberCards = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const courtCards = ['page', 'knight', 'queen', 'king'];
  
  let cardNumber = 1;
  
  console.log('Generating Major Arcana...');
  cards.forEach((card) => {
    const svg = generateCardSVG(card.replace(/-/g, ' '), cardNumber++);
    fs.writeFileSync(path.join(outputDir, `${card}.svg`), svg);
    console.log(`Generated: ${card}.svg`);
  });
  
  console.log('Generating Minor Arcana...');
  suits.forEach((suit) => {
    numberCards.forEach((number) => {
      const fileName = `${number}-of-${suit}`;
      const svg = generateCardSVG(`${number} of ${suit}`, cardNumber++);
      fs.writeFileSync(path.join(outputDir, `${fileName}.svg`), svg);
      console.log(`Generated: ${fileName}.svg`);
    });
    
    courtCards.forEach((court) => {
      const fileName = `${court}-of-${suit}`;
      const svg = generateCardSVG(`${court} of ${suit}`, cardNumber++);
      fs.writeFileSync(path.join(outputDir, `${fileName}.svg`), svg);
      console.log(`Generated: ${fileName}.svg`);
    });
  });
  
  console.log('Generating card back...');
  const backSVG = generateBackSVG();
  fs.writeFileSync(path.join(outputDir, 'back.svg'), backSVG);
  console.log('Generated: back.svg');
  
  console.log('All cards generated!');
};

main();
