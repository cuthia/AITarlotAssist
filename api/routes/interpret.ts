import express from 'express';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { allCards } from '../data/cards';
import { spreads } from '../data/spreads';

const router = express.Router();

// 显式加载.env文件，确保环境变量可用
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// api/routes/interpret.ts -> 向上两级到项目根目录
const envPath = path.resolve(__dirname, '../../.env');
const dotenvResult = dotenv.config({ path: envPath });

console.log(`[AI] interpret.ts模块已加载`);
console.log(`[AI] .env路径: ${envPath}`);
console.log(`[AI] dotenv加载结果: ${dotenvResult.error ? `错误: ${dotenvResult.error.message}` : '成功'}`);
console.log(`[AI] AI_PROVIDER: ${process.env.AI_PROVIDER || '未设置(默认openai)'}`);

interface Card {
  name: string;
  type: string;
  meaningUpright: string;
  meaningReversed: string;
  keywords: string[];
}

interface Position {
  index: number;
  name: string;
  description: string;
}

interface CardData {
  cardId: string;
  positionIndex: number;
  isReversed: boolean;
  card?: Card;
}

interface CardDetail extends CardData {
  position?: Position;
}

let openaiInstance: OpenAI | null = null;
let openaiInitialized = false;

// 懒加载OpenAI客户端，确保在dotenv.config()执行后才读取环境变量
const getOpenAIClient = (): OpenAI | null => {
  if (openaiInitialized) return openaiInstance;
  openaiInitialized = true;

  const aiProvider = process.env.AI_PROVIDER || 'openai';
  console.log(`[AI] === 初始化AI客户端 ===`);
  console.log(`[AI] Provider: ${aiProvider}`);
  console.log(`[AI] .env路径: ${envPath}`);

  if (aiProvider === 'aliyun') {
    const apiKey = process.env.ALIYUN_API_KEY;
    const baseUrl = process.env.ALIYUN_BASE_URL;
    console.log(`[AI] ALIYUN_API_KEY: ${apiKey ? `已设置(${apiKey.substring(0, 10)}...)` : '未设置'}`);
    console.log(`[AI] ALIYUN_BASE_URL: ${baseUrl || '未设置'}`);
    console.log(`[AI] ALIYUN_MODEL: ${process.env.ALIYUN_MODEL || 'qwen-max(默认)'}`);

    if (apiKey && baseUrl && apiKey !== 'your_aliyun_api_key') {
      openaiInstance = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
      });
      console.log(`[AI] ✓ 阿里云百炼大模型客户端初始化成功`);
    } else {
      console.warn(`[AI] ✗ 阿里云API_KEY或BASE_URL未正确配置，将使用模拟解牌`);
      if (!apiKey) console.warn('[AI]   - ALIYUN_API_KEY 为空');
      if (!baseUrl) console.warn('[AI]   - ALIYUN_BASE_URL 为空');
      if (apiKey === 'your_aliyun_api_key') console.warn('[AI]   - ALIYUN_API_KEY 仍为占位符');
    }
  } else if (aiProvider === 'deepseek') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
    console.log(`[AI] DEEPSEEK_API_KEY: ${apiKey ? `已设置(${apiKey.substring(0, 10)}...)` : '未设置'}`);
    console.log(`[AI] DEEPSEEK_BASE_URL: ${baseUrl}`);
    console.log(`[AI] DEEPSEEK_MODEL: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat(默认)'}`);

    if (apiKey && apiKey !== 'your_deepseek_api_key') {
      openaiInstance = new OpenAI({
        apiKey: apiKey,
        baseURL: baseUrl,
      });
      console.log(`[AI] ✓ DeepSeek客户端初始化成功，模型: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`);
    } else {
      console.warn(`[AI] ✗ DeepSeek API_KEY未正确配置，将使用模拟解牌`);
      if (!apiKey) console.warn('[AI]   - DEEPSEEK_API_KEY 为空');
      if (apiKey === 'your_deepseek_api_key') console.warn('[AI]   - DEEPSEEK_API_KEY 仍为占位符');
    }
  } else {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`[AI] OPENAI_API_KEY: ${apiKey ? `已设置(${apiKey.substring(0, 10)}...)` : '未设置'}`);

    if (apiKey && apiKey !== 'your_openai_api_key') {
      openaiInstance = new OpenAI({
        apiKey: apiKey,
      });
      console.log(`[AI] ✓ OpenAI客户端初始化成功，模型: ${process.env.OPENAI_MODEL || 'gpt-4o'}`);
    } else {
      console.warn(`[AI] ✗ OpenAI API_KEY未正确配置，将使用模拟解牌`);
    }
  }

  return openaiInstance;
};

const getAIProvider = (): string => process.env.AI_PROVIDER || 'openai';

const tarotKnowledgeBase = `
【塔罗牌解牌知识体系】

一、大阿卡那牌核心含义：
- 愚人(0)：新开始、冒险、纯真、无限潜能、信任宇宙
- 魔术师(1)：创造力、意志、自信、资源运用、行动力量
- 女祭司(2)：直觉、神秘、潜意识、内在智慧、倾听内心
- 皇后(3)：丰饶、母性、滋养、美、创造力、自然之力
- 皇帝(4)：权威、结构、父性、稳定、领导力、责任
- 教皇(5)：传统、信仰、导师、学习、精神指引、团体意识
- 恋人(6)：爱、关系、选择、和谐、吸引力、价值观
- 战车(7)：意志、胜利、决心、控制、前进、克服障碍
- 力量(8)：勇气、耐心、内在力量、控制、善良、接纳
- 隐士(9)：内省、孤独、智慧、指引、独处、自我反思
- 命运之轮(10)：命运、转变、周期、好运、机会、因果律
- 正义(11)：公平、真相、法律、因果、平衡、决策
- 倒吊人(12)：牺牲、等待、新视角、放手、顺应、蜕变
- 死神(13)：结束、转变、重生、放手、新开始、蜕变
- 节制(14)：平衡、耐心、调和、中庸、治愈、整合
- 恶魔(15)：束缚、阴影、诱惑、物质主义、依赖、释放
- 塔(16)：突变、崩溃、觉醒、释放、破坏、真相揭露
- 星星(17)：希望、灵感、宁静、疗愈、指引、信念
- 月亮(18)：幻觉、直觉、潜意识、情绪、幻象、恐惧
- 太阳(19)：快乐、成功、活力、温暖、真相、自信
- 审判(20)：重生、觉醒、召唤、原谅、自我反思、新机会
- 世界(21)：完成、整合、成就、旅行、终结、圆满

二、小阿卡那四元素含义：
- 权杖(火元素)：行动、热情、创意、冒险、能量、野心
- 圣杯(水元素)：情感、爱、关系、直觉、感受、疗愈
- 宝剑(风元素)：思想、沟通、真相、逻辑、冲突、清晰
- 星币(土元素)：物质、财富、身体、稳定、实践、安全

三、宫廷牌含义：
- 侍从：新消息、好奇心、学习、潜力、开始阶段
- 骑士：行动、热情、勇气、追求、快速进展
- 皇后：力量、直觉、母性、滋养、稳定支持
- 国王：权威、领导力、稳定、智慧、成熟掌控

四、解牌技巧：
1. 位置解读法：每张牌的含义取决于其在牌阵中的位置
2. 元素分析法：分析牌面中的元素组合（火水土风）
3. 数字含义法：结合数字的象征意义进行解读
4. 牌面互动法：分析牌与牌之间的相互关系和呼应
5. 时间流分析法：对于时间相关牌阵，按时间顺序解读
6. 问题导向法：紧密围绕用户问题进行针对性解读

五、逆位牌解读原则：
1. 能量阻塞或倒置
2. 内在化或隐藏的能量
3. 延迟、阻碍或挑战
4. 需要正视的阴影面
5. 与正位相反或减弱的含义

六、解牌结构：
1. 整体印象：牌面整体传达的能量和氛围
2. 逐张解析：结合位置对每张牌进行详细解读
3. 综合分析：分析牌面之间的关联和相互作用
4. 问题回应：针对用户问题给出明确回应
5. 行动建议：提供具体可行的行动指引
6. 注意事项：提醒需要注意的潜在问题
`;

const mockInterpretation = (spreadId: string, question: string, cards: CardData[], supplementaryCards: CardData[] = []): string => {
  const spread = spreads.find((_, index) => `spread-${index + 1}` === spreadId);
  if (!spread) return '抱歉，无法生成解牌分析。';

  const cardDetails: CardDetail[] = cards.map((cardData) => {
    const card = allCards.find((_, index) => `card-${index + 1}` === cardData.cardId);
    const position = spread.positions.find(p => p.index === cardData.positionIndex);
    return {
      ...cardData,
      card,
      position,
    };
  });

  // 处理追加卡牌：确保card数据完整
  const supplementDetails = supplementaryCards.map((cardData, index) => {
    const cardType = (cardData as any).cardType || 'tarot';
    let card = cardData.card;
    if ((!card || !card.name) && cardType === 'tarot') {
      card = allCards.find((_, i) => `card-${i + 1}` === cardData.cardId);
    }
    return { ...cardData, card, cardType, supplementIndex: index };
  });

  // 获取追加卡牌类型名称
  const getSupplementTypeName = (type: string) => {
    const map: Record<string, string> = { tarot: '塔罗牌', lenormand: '雷诺曼卡', oracle: '神谕字卡' };
    return map[type] || '未知类型';
  };

  const positionNames = cardDetails.map(cd => cd.position?.name).filter(Boolean).join('、');
  
  let interpretation = `# AI塔罗师解牌分析

**用户问题**：${question}

**牌阵**：${spread.name || '未知'}
**位置**：${positionNames}

---

## 整体印象

根据您的牌面组合，整体能量${cardDetails.some(c => c.isReversed) ? '略显复杂，存在一些挑战和需要克服的障碍' : '积极向上，充满希望和机会'}。

---

## 逐张解析

${cardDetails.map((cd, i) => `
### ${i + 1}. ${cd.position?.name || `位置${i + 1}`}（${cd.card?.name}${cd.isReversed ? ' · 逆位' : ' · 正位'}）

**核心含义**：${cd.isReversed ? cd.card?.meaningReversed : cd.card?.meaningUpright}

**关键词**：${cd.card?.keywords.join('、') || '暂无'}

${cd.position?.description ? `**位置解读**：在"${cd.position.name}"这个位置上，${cd.card?.name}代表${cd.isReversed ? '需要特别注意的问题或阻碍' : '积极的助力或指引'}。` : ''}

${cd.isReversed ? `> **逆位提示**：这张牌的逆位暗示着${cd.card?.meaningReversed}，建议您审视相关方面，寻找突破的方法。` : ''}
`).join('\n')}

---

## 综合分析

${cardDetails.length >= 3 ? `将这些牌综合来看，**${question}**这个问题的答案是${cardDetails.filter(c => c.isReversed).length > cardDetails.length / 2 ? '需要谨慎对待' : '积极乐观'}的。牌面显示${cardDetails[0]?.card?.name || ''}代表当前状况，${cardDetails[1]?.card?.name || ''}代表挑战或阻碍，${cardDetails[cardDetails.length - 1]?.card?.name || ''}代表最终结果或建议。` : ''}

---

## 问题回应

针对您的问题"${question}"，牌面给出的答案是：${cardDetails.some(c => c.isReversed) ? '虽然存在一些挑战，但只要您保持积极心态并采取正确行动，最终会得到满意的结果。' : '整体趋势向好，您可以充满信心地前进。'}

---

## 行动建议

${cardDetails.map((cd, i) => `${i + 1}. **${cd.card?.keywords[0] || '保持'}**：${cd.isReversed ? '注意避免' : '努力培养'}与${cd.card?.name}相关的品质`).join('\n')}

---

## 注意事项

${cardDetails.filter(c => c.isReversed).map(c => `- ${c.card?.name}逆位提醒您：${c.card?.meaningReversed}`).join('\n') || '- 暂无特别注意事项'}

${supplementDetails.length > 0 ? `
---

## 追加卡牌解读

本次追加了${supplementDetails.length}张${[...new Set(supplementDetails.map(c => getSupplementTypeName(c.cardType || 'tarot')))].join('、')}，用于对主牌解读进行补充和深入分析。

${supplementDetails.map((cd, i) => `
### 追加卡${i + 1}：${cd.card?.name || '未知卡牌'}（${getSupplementTypeName(cd.cardType || 'tarot')}${cd.isReversed ? ' · 逆位' : ' · 正位'}）

**核心含义**：${cd.isReversed ? cd.card?.meaningReversed : cd.card?.meaningUpright}

**关键词**：${cd.card?.keywords?.join('、') || '暂无'}

**补充解读**：这张追加卡牌为您的问题提供了额外的视角。${cd.card?.name}${cd.isReversed ? '逆位' : '正位'}提示您需要关注${cd.card?.keywords?.[0] || '相关方面'}，这可能是您之前忽略的重要信息。
`).join('\n')}

> **综合提示**：结合追加卡牌的信息，您的解读更加完整。${supplementDetails.some(c => c.isReversed) ? '追加卡牌中存在逆位，提示您需要更加谨慎地对待当前情况。' : '追加卡牌均为正位，整体趋势更加积极有利。'}

` : ''}

---

💡 提示：这是模拟解牌结果。要获得真实的AI解牌分析，请配置AI相关环境变量。

仅供娱乐参考，祝您一切顺利！`;

  return interpretation;
};

// 诊断端点：检查AI配置状态
router.get('/diagnostic', (req, res) => {
  const aiProvider = process.env.AI_PROVIDER || 'openai';
  let config: Record<string, unknown> = {};
  if (aiProvider === 'aliyun') {
    config = {
      ALIYUN_API_KEY: process.env.ALIYUN_API_KEY
        ? `已设置(${process.env.ALIYUN_API_KEY.substring(0, 10)}...)`
        : '未设置',
      ALIYUN_BASE_URL: process.env.ALIYUN_BASE_URL || '未设置',
      ALIYUN_MODEL: process.env.ALIYUN_MODEL || 'qwen-max(默认)',
      isPlaceholder: process.env.ALIYUN_API_KEY === 'your_aliyun_api_key',
    };
  } else if (aiProvider === 'deepseek') {
    config = {
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY
        ? `已设置(${process.env.DEEPSEEK_API_KEY.substring(0, 10)}...)`
        : '未设置',
      DEEPSEEK_BASE_URL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1(默认)',
      DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL || 'deepseek-chat(默认)',
      isPlaceholder: process.env.DEEPSEEK_API_KEY === 'your_deepseek_api_key',
    };
  } else {
    config = {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
        ? `已设置(${process.env.OPENAI_API_KEY.substring(0, 10)}...)`
        : '未设置',
      OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o(默认)',
      isPlaceholder: process.env.OPENAI_API_KEY === 'your_openai_api_key',
    };
  }
  const diagnostic = {
    provider: aiProvider,
    envPath,
    config,
    clientInitialized: openaiInstance !== null,
    message: openaiInstance
      ? 'AI客户端已就绪，可以使用真实AI解牌'
      : 'AI客户端未初始化，将使用模拟解牌。请检查环境变量配置。',
  };
  res.json(diagnostic);
});

router.post('/', async (req, res) => {
  try {
    const { spreadId, question, cards, supplementaryCards } = req.body as {
      spreadId: string;
      question: string;
      cards: CardData[];
      supplementaryCards?: CardData[];
    };

    console.log(`[AI] 收到解牌请求 - 问题: "${question}" | 主牌数: ${cards.length} | 追加卡数: ${supplementaryCards?.length || 0}`);

    // 懒加载获取OpenAI客户端
    const openai = getOpenAIClient();
    const aiProvider = getAIProvider();

    if (!openai) {
      console.warn('[AI] OpenAI客户端未初始化，使用模拟解牌');
      const interpretation = mockInterpretation(spreadId, question, cards, supplementaryCards || []);
      return res.json({ interpretation, source: 'mock' });
    }

    const spread = spreads.find((_, index) => `spread-${index + 1}` === spreadId);
    if (!spread) {
      return res.status(404).json({ error: 'Spread not found' });
    }

    const cardDetails: CardDetail[] = cards.map((cardData) => {
      const card = allCards.find((_, index) => `card-${index + 1}` === cardData.cardId);
      return {
        ...cardData,
        card,
        position: spread.positions.find(p => p.index === cardData.positionIndex),
      };
    });

    // 处理追加卡牌：从allCards中查找卡牌详情，确保数据完整
    // 同时支持不同类型的追加卡牌（塔罗牌、雷诺曼、字卡等）
    const supplementCardDetails = (supplementaryCards || []).map((cardData, index) => {
      const cardType = (cardData as any).cardType || 'tarot';
      let card = cardData.card;

      // 如果card数据不完整，从allCards中查找（仅塔罗牌）
      if ((!card || !card.name) && cardType === 'tarot') {
        card = allCards.find((_, i) => `card-${i + 1}` === cardData.cardId);
      }

      return {
        ...cardData,
        card,
        cardType,
        supplementIndex: index,
      };
    });

    // 追加卡牌类型描述，用于AI理解不同类型卡牌的用途
    const cardTypeDescriptions: Record<string, string> = {
      tarot: '塔罗牌 - 深度心理分析与趋势预测，提供全面的洞察',
      lenormand: '雷诺曼卡 - 简洁直接的事件预测，关注具体事情发展',
      oracle: '神谕字卡 - 灵感指引与心灵启示，提供直觉性的讯息',
    };

    const supplementTypeSummary = supplementCardDetails.length > 0
      ? [...new Set(supplementCardDetails.map(c => c.cardType || 'tarot'))]
          .map(type => cardTypeDescriptions[type] || `未知类型(${type})`)
          .join('、')
      : '';

    const prompt = `你是一位专业的塔罗牌解读师，拥有丰富的解牌经验和深厚的塔罗知识。请根据以下信息为用户提供准确、详细的解牌分析：

${tarotKnowledgeBase}

【用户问题】
${question}

【牌阵信息】
牌阵名称：${spread.name}
牌阵描述：${spread.description}
位置说明：${spread.positions.map(p => `${p.index + 1}. ${p.name}：${p.description}`).join('\n')}

【抽牌结果 - 主牌】
${cardDetails.map((cd) => `
位置${cd.positionIndex + 1} - ${cd.position?.name}：${cd.card?.name}（${cd.isReversed ? '逆位' : '正位'}）
牌意：${cd.isReversed ? cd.card?.meaningReversed : cd.card?.meaningUpright}
关键词：${cd.card?.keywords.join('、')}
`).join('\n')}

${supplementCardDetails.length > 0 ? `【追加卡牌】
追加卡牌类型：${supplementTypeSummary}
共${supplementCardDetails.length}张追加卡牌，用于对主牌解读进行补充、修正和深入分析。

${supplementCardDetails.map((cd) => `
追加卡${cd.supplementIndex + 1}（${cd.cardType === 'tarot' ? '塔罗牌' : cd.cardType === 'lenormand' ? '雷诺曼卡' : cd.cardType === 'oracle' ? '神谕字卡' : cd.cardType}）：${cd.card?.name || '未知卡牌'}（${cd.isReversed ? '逆位' : '正位'}）
牌意：${cd.isReversed ? cd.card?.meaningReversed : cd.card?.meaningUpright || '暂无牌意'}
关键词：${cd.card?.keywords?.join('、') || '暂无'}
`).join('\n')}` : ''}

【解牌要求】
1. 使用上面提供的塔罗知识体系进行专业解读
2. 严格按照以下结构输出：
   ## 整体印象
   ## 逐张解析
   ## 综合分析
   ## 问题回应
   ## 行动建议
   ## 注意事项
${supplementCardDetails.length > 0 ? `   ## 追加卡牌解读
3. 必须包含"追加卡牌解读"部分，对每张追加卡牌进行单独解读
4. 在综合分析中，必须将追加卡牌的含义融入整体解读，说明追加卡牌如何补充或修正主牌的解读
5. 如果有多种类型的追加卡牌，分别说明不同类型卡牌提供的独特视角` : `3. 每张牌的解读必须结合其在牌阵中的位置含义`}
6. 分析要准确、符合牌意、贴合用户实际问题
7. 结合专业解牌经验和实际生活经验给出建议
8. 如果有逆位牌，必须详细解释逆位的特殊含义和影响
9. 最后给出具体、可行的行动指引
10. 语言要通俗易懂，同时保持专业性和神秘感

请用中文输出详细的解牌分析。`;

    const model = aiProvider === 'aliyun'
      ? (process.env.ALIYUN_MODEL || 'qwen-max')
      : aiProvider === 'deepseek'
        ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat')
        : (process.env.OPENAI_MODEL || 'gpt-4o');

    console.log(`[AI] 开始调用大模型: ${model} (provider: ${aiProvider})`);

    const response = await openai.chat.completions.create({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    // 记录API返回的原始响应结构，便于调试
    console.log(`[AI] API响应类型: ${typeof response}`);
    console.log(`[AI] API响应keys: ${response ? Object.keys(response).join(', ') : 'null'}`);

    // 兼容多种API响应格式提取解读内容
    let interpretation = '抱歉，无法生成解牌分析。';
    const resp = response as any;

    if (resp) {
      // 格式1：标准OpenAI格式 (choices[0].message.content)
      if (resp.choices && resp.choices.length > 0 && resp.choices[0]?.message?.content) {
        interpretation = resp.choices[0].message.content;
        console.log(`[AI] 使用标准OpenAI格式提取内容`);
      }
      // 格式2：阿里云简化格式 (text字段直接包含内容)
      else if (resp.text && typeof resp.text === 'string') {
        interpretation = resp.text;
        console.log(`[AI] 使用阿里云text字段格式提取内容`);
      }
      // 格式3：直接返回content字段
      else if (resp.content && typeof resp.content === 'string') {
        interpretation = resp.content;
        console.log(`[AI] 使用content字段格式提取内容`);
      }
      // 格式4：OpenAI SDK可能解析后的output字段
      else if (resp.output && resp.output.text) {
        interpretation = resp.output.text;
        console.log(`[AI] 使用output.text字段格式提取内容`);
      }
      else {
        // 无法识别的格式，打印完整响应以便调试
        console.error('[AI] 无法识别的响应格式 - 完整响应:', JSON.stringify(resp, null, 2));
        throw new Error(`AI返回的响应格式无法识别`);
      }
    } else {
      throw new Error('AI返回空响应');
    }

    console.log(`[AI] 解牌完成，响应长度: ${interpretation.length} 字符`);

    res.json({ interpretation, source: 'ai' });
  } catch (error: any) {
    console.error('[AI] 解牌错误:', error?.message || error);
    console.error('[AI] 错误详情:', error?.response?.data || error?.code || '');
    console.error('[AI] 错误堆栈:', error?.stack || '');

    const { spreadId, question, cards, supplementaryCards } = req.body as {
      spreadId: string;
      question: string;
      cards: CardData[];
      supplementaryCards?: CardData[];
    };
    console.warn('[AI] 回退到模拟解牌');
    const interpretation = mockInterpretation(spreadId, question, cards, supplementaryCards || []);
    res.json({ interpretation, source: 'mock_fallback' });
  }
});

export default router;
