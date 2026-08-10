import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Play, RotateCcw, ChevronRight, MousePointer2, Hand } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import type { Spread, Card } from '@/types';
import { useNavigate } from 'react-router-dom';
import GestureDrawStage from '@/components/GestureDrawStage';

type DrawMode = 'click' | 'gesture';
type DrawPhase = 'spread' | 'question' | 'select-mode' | 'draw' | 'result';

const cardBackUrl = '/cards/waite/back.svg';
type DrawnEntry = { card: Card; positionIndex: number; isReversed: boolean };

export default function DrawPage() {
  const navigate = useNavigate();
  const { spreads, selectedSpread, setSelectedSpread, cards, setCards, question, setQuestion, setCurrentReading, addReading } = useStore();

  const [phase, setPhase] = useState<DrawPhase>('spread');
  const [drawMode, setDrawMode] = useState<DrawMode>('click');
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnEntry[]>([]);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
  const [isInterpreting, setIsInterpreting] = useState(false);
  
  const loadedImagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadCards = async () => {
      const cardsData = await apiClient.cards.getAll();
      setCards(cardsData);
      
      cardsData.forEach(card => {
        const img = new Image();
        img.onload = () => {
          loadedImagesRef.current.add(card.imageUrl);
          setImagesLoaded(new Set(loadedImagesRef.current));
        };
        img.src = card.imageUrl;
      });
      
      const backImg = new Image();
      backImg.src = cardBackUrl;
    };
    loadCards();
  }, []);

  useEffect(() => {
    if (selectedSpread && phase === 'draw') {
      const shuffled = [...cards].sort(() => Math.random() - 0.5);
      setShuffledCards(shuffled);
    }
  }, [selectedSpread, cards, phase]);

  const handleDrawCard = useCallback(() => {
    if (drawnCards.length >= (selectedSpread?.cardCount || 0)) {
      setIsDrawing(false);
      setShowResult(true);
      return;
    }

    setIsDrawing(true);
    setTimeout(() => {
      const availableCards = shuffledCards.filter(sc => 
        !drawnCards.some(dc => dc.card.id === sc.id)
      );
      
      if (availableCards.length === 0) {
        setIsDrawing(false);
        setShowResult(true);
        return;
      }

      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      const isReversed = Math.random() > 0.5;
      const newDrawnCards = [...drawnCards, { 
        card: randomCard, 
        positionIndex: drawnCards.length,
        isReversed 
      }];
      
      setDrawnCards(newDrawnCards);
      setIsDrawing(false);
      
      if (newDrawnCards.length >= (selectedSpread?.cardCount || 0)) {
        setShowResult(true);
      }
    }, 800);
  }, [shuffledCards, drawnCards, selectedSpread]);

  // 从问题页 → 先弹出方式选择
  const handleStartDraw = () => setPhase('select-mode');

  // 选定方式后真正进入抽牌阶段
  const commitStartDrawWithMode = useCallback((mode: DrawMode) => {
    setDrawMode(mode);
    setDrawnCards([]);
    setShowResult(false);
    setPhase('draw');
  }, []);

  // 手势抽牌：加入一张牌
  const handleGestureDrawCard = useCallback((entry: DrawnEntry) => {
    setDrawnCards(prev => {
      if (prev.some(d => d.positionIndex === entry.positionIndex)) return prev;
      return [...prev, entry];
    });
  }, []);

  // 手势抽牌：全部抽齐 → 显示结果按钮（与点击抽牌同路径）
  const handleGestureRequestComplete = useCallback(() => {
    setShowResult(true);
  }, []);

  // 退出手势模式 → 返回方式选择
  const handleGestureExit = useCallback(() => {
    setPhase('select-mode');
  }, []);

  // 手势抽牌内部重置
  const handleGestureReset = useCallback(() => {
    setDrawnCards([]);
    setShowResult(false);
  }, []);

  const handleCompleteReading = async () => {
    if (!selectedSpread || drawnCards.length === 0) return;

    setIsInterpreting(true);
    try {
      const interpretationData = await apiClient.interpret.interpret({
        spreadId: selectedSpread.id,
        question,
        cards: drawnCards.map(dc => ({
          cardId: dc.card.id,
          positionIndex: dc.positionIndex,
          isReversed: dc.isReversed,
          card: dc.card,
        })),
      });

      const newReading = await apiClient.readings.create({
        spreadId: selectedSpread.id,
        question,
        cards: drawnCards.map(dc => ({
          cardId: dc.card.id,
          positionIndex: dc.positionIndex,
          isReversed: dc.isReversed,
        })),
        interpretation: interpretationData.interpretation,
      });

      const readingWithInterpretation = {
        ...newReading,
        interpretation: interpretationData.interpretation,
        cards: drawnCards.map(dc => ({
          cardId: dc.card.id,
          positionIndex: dc.positionIndex,
          isReversed: dc.isReversed,
          card: dc.card,
        })),
      };

      addReading(readingWithInterpretation);
      setCurrentReading(readingWithInterpretation);
      navigate(`/reading/${newReading.id}`);
    } catch (error) {
      console.error('Failed to complete reading:', error);
      alert('解牌服务暂时不可用，请稍后再试');
    } finally {
      setIsInterpreting(false);
    }
  };

  const handleReset = () => {
    setPhase('spread');
    setSelectedSpread(null);
    setQuestion('');
    setDrawnCards([]);
    setShowResult(false);
  };

  const spreadLayouts: Record<string, string> = {
    '三牌阵': 'flex justify-center gap-8',
    '时间之流': 'flex justify-center gap-6',
    '事业展望': 'flex justify-center gap-6',
    '爱情十字': 'grid grid-cols-3 gap-4',
    '抉择': 'grid grid-cols-3 gap-4',
    '凯尔特十字': 'grid grid-cols-5 gap-3',
  };

  return (
    <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950">
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-serif font-bold gold-gradient">抽牌占卜</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {phase === 'spread' && (
            <motion.div
              key="spread"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2 className="text-2xl font-serif font-bold text-white text-center mb-8">选择牌阵</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {spreads.map((spread) => (
                  <motion.div
                    key={spread.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedSpread(spread)}
                    className={`glass-card p-6 cursor-pointer transition-all ${
                      selectedSpread?.id === spread.id 
                        ? 'ring-2 ring-gold-400 shadow-glow' 
                        : 'hover:shadow-card-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-serif font-semibold text-white">
                        {spread.name}
                      </h3>
                      <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded-full">
                        {spread.cardCount}张牌
                      </span>
                    </div>
                    <p className="text-silver-400 text-sm mb-4">{spread.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {spread.positions.slice(0, 4).map((pos) => (
                        <span key={pos.index} className="text-xs bg-silver-800/50 text-silver-300 px-2 py-1 rounded">
                          {pos.name}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {selectedSpread && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center"
                >
                  <button 
                    onClick={() => setPhase('question')}
                    className="btn-gold px-8 py-3 rounded-full flex items-center gap-2 mx-auto"
                  >
                    <Sparkles className="w-5 h-5" />
                    下一步
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {phase === 'question' && (
            <motion.div
              key="question"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="max-w-2xl mx-auto">
                <div className="glass-card p-8 mb-6">
                  <h2 className="text-2xl font-serif font-bold text-white text-center mb-6">
                    {selectedSpread?.name}
                  </h2>
                  <p className="text-silver-400 text-center mb-6">
                    {selectedSpread?.description}
                  </p>
                  <div className="space-y-3 mb-8">
                    {selectedSpread?.positions.map((pos) => (
                      <div key={pos.index} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-gold-500/20 text-gold-400 text-xs flex items-center justify-center flex-shrink-0">
                          {pos.index + 1}
                        </span>
                        <div>
                          <span className="text-white font-medium">{pos.name}</span>
                          <p className="text-silver-500 text-sm">{pos.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <label className="block text-white font-medium mb-3">您的问题</label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="请输入您想要占卜的问题..."
                    className="w-full h-32 input-mystic resize-none"
                  />
                </div>

                <div className="flex justify-between mt-6">
                  <button 
                    onClick={() => setPhase('spread')}
                    className="text-silver-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    返回选择牌阵
                  </button>
                  <button 
                    onClick={handleStartDraw}
                    disabled={!question.trim()}
                    className="btn-gold px-8 py-3 rounded-full flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-5 h-5" />
                    开始抽牌
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'select-mode' && (
            <motion.div
              key="select-mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-serif font-bold text-white text-center mb-2">
                  选择抽牌方式
                </h2>
                <p className="text-silver-400 text-center mb-8">
                  牌阵：<span className="text-gold-400">{selectedSpread?.name}</span>
                  · 共 {selectedSpread?.cardCount} 张牌
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <motion.button
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => commitStartDrawWithMode('click')}
                    className="glass-card p-8 text-left group focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-mystic-900 transition-colors">
                        <MousePointer2 className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-white">点击抽牌</h3>
                        <p className="text-xs text-silver-400">经典网页模式</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm text-silver-300">
                      <li>· 点击按钮逐张抽取</li>
                      <li>· 自动正逆位、动画翻牌</li>
                      <li>· 无需摄像头，稳定快速</li>
                    </ul>
                  </motion.button>

                  <motion.button
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => commitStartDrawWithMode('gesture')}
                    className="glass-card p-8 text-left group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-gold-400"
                  >
                    <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gold-500/10 blur-2xl group-hover:bg-gold-500/20 transition-colors" />
                    <div className="flex items-center gap-4 mb-4 relative">
                      <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-400 group-hover:bg-gold-500 group-hover:text-mystic-900 transition-colors">
                        <Hand className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                          真实手势抽牌
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-400 align-middle">
                            NEW
                          </span>
                        </h3>
                        <p className="text-xs text-silver-400">摄像头 · 手势识别</p>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-sm text-silver-300 relative">
                      <li>· 环形 78 张牌背，真实洗牌</li>
                      <li>· ✋ 张开五指 → 牌堆转动</li>
                      <li>· ✊ 握拳停止 · ⬆️ 上抬手确认抽牌</li>
                    </ul>
                    <p className="text-[11px] text-silver-500 mt-4 relative">
                      初次开启会请求摄像头权限，识别仅运行在本地浏览器
                    </p>
                  </motion.button>
                </div>

                <div className="flex justify-start mt-8">
                  <button
                    onClick={() => setPhase('question')}
                    className="text-silver-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    返回修改问题
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {phase === 'draw' && (
            <motion.div
              key={`draw-${drawMode}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={drawMode === 'gesture' ? 'w-full max-w-none mx-auto' : 'max-w-4xl mx-auto'}
            >
              {drawMode === 'click' ? (
                <>
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-serif font-bold text-white mb-2">抽牌</h2>
                    <p className="text-silver-400">
                      已抽取 {drawnCards.length} / {selectedSpread?.cardCount} 张牌
                    </p>
                  </div>

                  <div className={`${spreadLayouts[selectedSpread?.name || '三牌阵']} mb-12`}>
                    {selectedSpread?.positions.map((pos, index) => {
                      const drawnCard = drawnCards.find(dc => dc.positionIndex === index);
                      const isImageLoaded = drawnCard ? imagesLoaded.has(drawnCard.card.imageUrl) : false;

                      return (
                        <motion.div
                          key={pos.index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center gap-3"
                        >
                          <div className="relative w-32 h-48 md:w-40 md:h-56 preserve-3d">
                            {drawnCard ? (
                              <motion.div
                                initial={{ rotateY: 0, opacity: 0 }}
                                animate={{ rotateY: 360, opacity: 1 }}
                                transition={{ duration: 0.5 }}
                                className="w-full h-full rounded-lg overflow-hidden shadow-card"
                              >
                                <div className={drawnCard.isReversed ? 'w-full h-full rotate-180' : 'w-full h-full'}>
                                  {isImageLoaded ? (
                                    <img
                                      src={drawnCard.card.imageUrl}
                                      alt={drawnCard.card.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ) : (
                              <div className="w-full h-full rounded-lg bg-gradient-to-br from-silver-800 to-silver-900 flex items-center justify-center border-2 border-dashed border-silver-600">
                                <span className="text-silver-500 text-sm">{index + 1}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-sm text-silver-400">{pos.name}</span>
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center gap-4">
                    {!showResult && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDrawCard}
                        disabled={isDrawing || drawnCards.length >= (selectedSpread?.cardCount || 0)}
                        className="btn-gold px-8 py-4 rounded-full flex items-center gap-2 disabled:opacity-50"
                      >
                        {isDrawing ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-mystic-900 border-t-transparent rounded-full"
                          />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                        {drawnCards.length >= (selectedSpread?.cardCount || 0) ? '完成' : '抽取下一张'}
                      </motion.button>
                    )}

                    <button
                      onClick={handleReset}
                      className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : selectedSpread && shuffledCards.length > 0 ? (
                <GestureDrawStage
                  shuffledCards={shuffledCards}
                  spread={selectedSpread}
                  drawnCards={drawnCards}
                  imagesLoaded={imagesLoaded}
                  onDrawCard={handleGestureDrawCard}
                  onRequestComplete={handleGestureRequestComplete}
                  onExit={handleGestureExit}
                  onReset={handleGestureReset}
                />
              ) : null}

              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center"
                >
                  <button
                    onClick={handleCompleteReading}
                    disabled={isInterpreting}
                    className="btn-mystic px-8 py-4 rounded-full flex items-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isInterpreting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-gold-400 border-t-transparent rounded-full"
                      />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                    {isInterpreting ? 'AI正在解牌中...' : '获取AI解牌'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isInterpreting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-10 flex flex-col items-center gap-6 max-w-md mx-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-gold-400 border-t-transparent rounded-full"
              />
              <div className="text-center">
                <h3 className="text-2xl font-serif font-bold gold-gradient mb-2">AI正在为您解牌</h3>
                <p className="text-silver-400">神秘的塔罗智慧正在降临...</p>
                <p className="text-silver-500 text-sm mt-2">请稍候，这可能需要几秒钟</p>
              </div>
              <div className="flex justify-center gap-1 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-gold-400"
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
