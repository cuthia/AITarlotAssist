import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, MessageSquare, RefreshCw, Trash2, Share2, Heart, Plus, X, Sparkles, Layers } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, SupplementCardType, Reading } from '@/types';
import Markdown from '@/components/Markdown';

// 追加卡牌类型选项配置
const SUPPLEMENT_CARD_TYPES: {
  type: SupplementCardType;
  name: string;
  description: string;
  available: boolean;
}[] = [
  { type: 'tarot', name: '塔罗牌', description: '追加抽取经典韦特塔罗牌', available: true },
  { type: 'lenormand', name: '雷诺曼卡', description: '追加抽取雷诺曼卡牌（即将上线）', available: false },
  { type: 'oracle', name: '神谕字卡', description: '追加抽取神谕字卡（即将上线）', available: false },
];

export default function ReadingPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { spreads, currentReading, setCurrentReading, updateReading, deleteReading, cards } = useStore();

  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupplementModal, setShowSupplementModal] = useState(false);
  const [supplementaryCards, setSupplementaryCards] = useState<{ card: Card; isReversed: boolean }[]>([]);
  const [selectedSupplementType, setSelectedSupplementType] = useState<SupplementCardType>('tarot');
  const [isAddingSupplement, setIsAddingSupplement] = useState(false);
  const [isReinterpreting, setIsReinterpreting] = useState(false);

  useEffect(() => {
    const loadReading = async () => {
      if (id) {
        try {
          const readingData = await apiClient.readings.getById(id);
          setCurrentReading(readingData);
          if (readingData.feedback) {
            setRating(readingData.feedback.rating);
            setFeedback(readingData.feedback.comment || '');
          }
        } catch (error) {
          console.error('Failed to load reading:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadReading();
  }, [id]);

  const handleFeedback = async () => {
    if (!id || rating === 0) return;

    setIsSubmitting(true);
    try {
      const updatedReading = await apiClient.readings.addFeedback(id, {
        rating,
        comment: feedback,
      });
      updateReading(updatedReading);
      setShowFeedback(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!confirm('确定要删除这条记录吗？')) return;

    try {
      await apiClient.readings.delete(id);
      deleteReading(id);
      navigate('/records');
    } catch (error) {
      console.error('Failed to delete reading:', error);
    }
  };

  // 基于指定的reading数据重新生成解读（避免React状态异步问题）
  const reinterpretReading = async (readingData: Reading) => {
    if (!id) return;

    const allCardsData = readingData.cards.map(c => ({
      cardId: c.cardId,
      positionIndex: c.positionIndex,
      isReversed: c.isReversed,
      card: c.card,
    }));

    const supplementCardsData = (readingData.supplementaryCards || []).map((c, index) => ({
      cardId: c.cardId,
      positionIndex: readingData.cards.length + index,
      isReversed: c.isReversed,
      card: c.card,
    }));

    const interpretationData = await apiClient.interpret.interpret({
      spreadId: readingData.spreadId,
      question: readingData.question,
      cards: allCardsData,
      supplementaryCards: supplementCardsData,
    });

    const updatedReading = await apiClient.readings.updateInterpretation(id, interpretationData.interpretation);
    updateReading(updatedReading);
    setCurrentReading(updatedReading);
  };

  const handleReinterpret = async () => {
    if (!id || !currentReading) return;

    setIsReinterpreting(true);
    try {
      await reinterpretReading(currentReading);
    } catch (error) {
      console.error('Failed to reinterpret:', error);
      alert('重新解读失败，请稍后再试');
    } finally {
      setIsReinterpreting(false);
    }
  };

  const handleAddSupplement = async () => {
    if (!id || !currentReading || supplementaryCards.length === 0) return;

    setIsAddingSupplement(true);
    try {
      // 计算起始位置索引，确保每张追加卡都有唯一的positionIndex
      const startIndex = (currentReading.supplementaryCards?.length || 0);

      // 依次添加每张追加卡牌，positionIndex递增
      for (let i = 0; i < supplementaryCards.length; i++) {
        const supCard = supplementaryCards[i];
        await apiClient.readings.addSupplement(id, {
          cardId: supCard.card.id,
          cardType: selectedSupplementType,
          positionIndex: startIndex + i,
          isReversed: supCard.isReversed,
        });
      }

      // 重新获取最新的reading数据
      const readingData = await apiClient.readings.getById(id);

      // 关闭弹窗并清空临时状态
      setShowSupplementModal(false);
      setSupplementaryCards([]);

      // 先更新当前reading状态
      setCurrentReading(readingData);

      // 基于最新的readingData重新生成解读（不依赖currentReading，避免异步问题）
      setIsReinterpreting(true);
      try {
        await reinterpretReading(readingData);
      } catch (error) {
        console.error('Failed to reinterpret after supplement:', error);
        alert('追加卡牌已添加，但重新解读失败，请点击"重新解读"按钮重试');
      } finally {
        setIsReinterpreting(false);
      }
    } catch (error) {
      console.error('Failed to add supplement:', error);
      alert('添加追加卡牌失败，请稍后再试');
    } finally {
      setIsAddingSupplement(false);
    }
  };

  const drawSupplementCard = () => {
    if (!cards.length || supplementaryCards.length >= 3) return;

    // 根据选择的卡牌类型处理
    if (selectedSupplementType === 'tarot') {
      // 塔罗牌：从78张牌中随机抽取
      const availableCards = cards.filter(c =>
        !currentReading?.cards.some(rc => rc.cardId === c.id) &&
        !supplementaryCards.some(sc => sc.card.id === c.id)
      );

      if (availableCards.length === 0) return;

      const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      const isReversed = Math.random() > 0.5;

      setSupplementaryCards(prev => [...prev, { card: randomCard, isReversed }]);
    } else {
      // 雷诺曼卡和神谕字卡：接口预留，暂未实现
      alert('该卡牌类型即将上线，敬请期待！');
    }
  };

  const removeSupplementCard = (index: number) => {
    setSupplementaryCards(prev => prev.filter((_, i) => i !== index));
  };

  // 获取追加卡牌类型的显示名称
  const getSupplementTypeName = (cardType?: string) => {
    const typeMap: Record<string, string> = {
      tarot: '塔罗牌',
      lenormand: '雷诺曼卡',
      oracle: '神谕字卡',
    };
    return typeMap[cardType || 'tarot'] || '塔罗牌';
  };

  if (loading) {
    return (
      <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!currentReading) {
    return (
      <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950 flex items-center justify-center">
        <p className="text-silver-400">记录不存在</p>
      </div>
    );
  }

  const spread = spreads.find(s => s.id === currentReading.spreadId);

  return (
    <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950">
      <header className="py-6 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-serif font-bold gold-gradient">解牌结果</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gold-400 font-medium">{spread?.name}</span>
            <span className="text-silver-500 text-sm">
              {new Date(currentReading.createdAt).toLocaleString('zh-CN')}
              {currentReading.createdAt !== currentReading.updatedAt && (
                <span className="ml-2 text-gold-500">（已更新）</span>
              )}
            </span>
          </div>
          <h2 className="text-2xl font-serif font-bold text-white mb-2">您的问题</h2>
          <p className="text-silver-300">{currentReading.question}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-gold-400" />
            抽牌结果
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {currentReading.cards.map((rc, index) => {
              const position = spread?.positions.find(p => p.index === rc.positionIndex);
              return (
                <motion.div
                  key={rc.cardId}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className={`relative w-28 h-40 md:w-32 md:h-44 rounded-lg overflow-hidden shadow-card ${rc.isReversed ? 'rotate-180' : ''}`}>
                    <img
                      src={rc.card?.imageUrl}
                      alt={rc.card?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-white font-medium">{rc.card?.name}</p>
                    <p className="text-xs text-silver-500">{position?.name}</p>
                    {rc.isReversed && (
                      <span className="text-xs text-red-400">逆位</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {(currentReading.supplementaryCards && currentReading.supplementaryCards.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-gold-400" />
              追加卡牌
              <span className="text-sm font-normal text-silver-500">（{currentReading.supplementaryCards.map(c => getSupplementTypeName(c.cardType)).filter((v, i, a) => a.indexOf(v) === i).join('、')}）</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {currentReading.supplementaryCards.map((rc, index) => (
                <motion.div
                  key={`${rc.cardId}-${index}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex flex-col items-center"
                >
                  <div className={`relative w-28 h-40 md:w-32 md:h-44 rounded-lg overflow-hidden shadow-card border-2 border-gold-500/50 ${rc.isReversed ? 'rotate-180' : ''}`}>
                    <img
                      src={rc.card?.imageUrl}
                      alt={rc.card?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-white font-medium">{rc.card?.name}</p>
                    <p className="text-xs text-gold-500">追加卡 {index + 1} · {getSupplementTypeName(rc.cardType)}</p>
                    {rc.isReversed && (
                      <span className="text-xs text-red-400">逆位</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-8 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gold-400" />
              AI解牌分析
            </h3>
            <button
              onClick={handleReinterpret}
              disabled={isReinterpreting}
              className="btn-gold text-sm px-4 py-2 rounded-full flex items-center gap-2 disabled:opacity-50"
            >
              {isReinterpreting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-mystic-900 border-t-transparent rounded-full"
                />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isReinterpreting ? '解读中...' : '重新解读'}
            </button>
          </div>
          <div className="prose prose-invert max-w-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Markdown content={currentReading.interpretation} />
            </motion.div>
          </div>
        </motion.div>

        {!currentReading.feedback ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 mb-6"
          >
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-gold-400" />
              您的反馈
            </h3>

            {!showFeedback ? (
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setRating(star);
                      setShowFeedback(true);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      star <= rating
                        ? 'bg-gold-500 text-mystic-900'
                        : 'bg-white/10 text-silver-400 hover:bg-white/20'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        star <= rating
                          ? 'bg-gold-500 text-mystic-900'
                          : 'bg-white/10 text-silver-400 hover:bg-white/20'
                      }`}
                    >
                      <Star className={`w-5 h-5 ${star <= rating ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="请输入您的反馈意见（可选）..."
                  className="w-full h-24 input-mystic resize-none"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowFeedback(false)}
                    className="text-silver-400 hover:text-white transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleFeedback}
                    disabled={isSubmitting || rating === 0}
                    className="btn-gold px-6 py-2 rounded-full disabled:opacity-50"
                  >
                    {isSubmitting ? '提交中...' : '提交反馈'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 mb-6"
          >
            <h3 className="text-xl font-serif font-bold text-white mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5 text-gold-400" />
              感谢您的反馈
            </h3>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= currentReading.feedback?.rating ? 'text-gold-400 fill-current' : 'text-silver-600'}`}
                />
              ))}
            </div>
            {currentReading.feedback?.comment && (
              <p className="text-silver-400">{currentReading.feedback.comment}</p>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-4"
        >
          <button
            onClick={() => setShowSupplementModal(true)}
            className="btn-gold px-8 py-3 rounded-full flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            追加抽牌
          </button>
          <button
            onClick={() => navigate('/draw')}
            className="btn-mystic px-8 py-3 rounded-full flex items-center gap-2"
          >
            <RefreshCw className="w-5 h-5" />
            再次占卜
          </button>
        </motion.div>
      </main>

      <AnimatePresence>
        {showSupplementModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-gold-400" />
                  追加抽牌
                </h3>
                <button
                  onClick={() => {
                    setShowSupplementModal(false);
                    setSupplementaryCards([]);
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 卡牌类型选择器 */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm text-silver-300 mb-3">
                  <Layers className="w-4 h-4 text-gold-400" />
                  选择追加卡牌类型
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {SUPPLEMENT_CARD_TYPES.map((cardType) => {
                    const isSelected = selectedSupplementType === cardType.type;
                    const isDisabled = !cardType.available;
                    return (
                      <button
                        key={cardType.type}
                        onClick={() => !isDisabled && setSelectedSupplementType(cardType.type)}
                        disabled={isDisabled}
                        className={`relative flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                          isSelected
                            ? 'border-gold-400 bg-gold-500/10 text-white'
                            : isDisabled
                              ? 'border-silver-700 bg-mystic-900/30 text-silver-600 cursor-not-allowed'
                              : 'border-silver-700 bg-white/5 text-silver-300 hover:border-gold-400/50 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{cardType.name}</span>
                            {isDisabled && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-silver-700/50 text-silver-500">
                                即将上线
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-silver-500 mt-0.5">{cardType.description}</p>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-gold-400 flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-mystic-900" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-silver-400 mb-6">
                您可以追加最多3张{getSupplementTypeName(selectedSupplementType)}来获得更深入的解读。点击下方按钮抽取卡牌。
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-6">
                {supplementaryCards.map((sc, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative"
                  >
                    <div className={`w-24 h-36 rounded-lg overflow-hidden shadow-card ${sc.isReversed ? 'rotate-180' : ''}`}>
                      <img
                        src={sc.card.imageUrl}
                        alt={sc.card.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      onClick={() => removeSupplementCard(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

                {supplementaryCards.length < 3 && (
                  <button
                    onClick={drawSupplementCard}
                    disabled={isAddingSupplement}
                    className="w-24 h-36 rounded-lg border-2 border-dashed border-silver-600 flex flex-col items-center justify-center text-silver-400 hover:border-gold-400 hover:text-gold-400 transition-colors"
                  >
                    <Sparkles className="w-8 h-8 mb-2" />
                    <span className="text-xs">抽一张</span>
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowSupplementModal(false);
                    setSupplementaryCards([]);
                  }}
                  className="text-silver-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddSupplement}
                  disabled={isAddingSupplement || supplementaryCards.length === 0}
                  className="btn-gold px-6 py-2 rounded-full disabled:opacity-50"
                >
                  {isAddingSupplement ? '添加中...' : '确认添加并重新解读'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 重新解读的全屏加载遮罩 */}
      <AnimatePresence>
        {isReinterpreting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="glass-card p-8 flex flex-col items-center gap-4"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 border-4 border-gold-400 border-t-transparent rounded-full"
              />
              <p className="text-gold-400 font-serif">AI正在为您重新解读...</p>
              <p className="text-silver-500 text-sm">请稍候，这可能需要几秒钟</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
