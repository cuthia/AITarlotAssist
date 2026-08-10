import * as fs from 'fs';
import * as path from 'path';
import { cardFileNameMap, suitNameMap, courtCardMap } from '../api/data/cardImages';

const baseUrl = 'https://raw.githubusercontent.com/ekelen/tarot-api/master/public/images/';

const majorArcana = [
  '00-fool',
  '01-magician',
  '02-high-priestess',
  '03-empress',
  '04-emperor',
  '05-hierophant',
  '06-lovers',
  '07-chariot',
  '08-strength',
  '09-hermit',
  '10-wheel-of-fortune',
  '11-justice',
  '12-hanged-man',
  '13-death',
  '14-temperance',
  '15-devil',
  '16-tower',
  '17-star',
  '18-moon',
  '19-sun',
  '20-judgement',
  '21-world',
];

const suits = ['wands', 'cups', 'swords', 'pentacles'];
const numberCards = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const courtCards = ['page', 'knight', 'queen', 'king'];

const downloadCard = async (fileName: string): Promise<void> => {
  const url = `${baseUrl}${fileName}.jpg`;
  const filePath = path.join(__dirname, '../public/cards/waite', `${fileName}.jpg`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.log(`Failed to download ${fileName}: ${response.status}`);
      return;
    }
    
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    console.log(`Downloaded: ${fileName}`);
  } catch (error) {
    console.log(`Error downloading ${fileName}: ${error}`);
  }
};

const main = async () => {
  const outputDir = path.join(__dirname, '../public/cards/waite');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('Downloading Major Arcana...');
  for (const card of majorArcana) {
    await downloadCard(card);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('Downloading Minor Arcana...');
  for (const suit of suits) {
    for (const number of numberCards) {
      const fileName = `${number}-of-${suit}`;
      await downloadCard(fileName);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    for (const court of courtCards) {
      const fileName = `${court}-of-${suit}`;
      await downloadCard(fileName);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('Downloading card back...');
  await downloadCard('back');
  
  console.log('All downloads completed!');
};

main().catch(console.error);
