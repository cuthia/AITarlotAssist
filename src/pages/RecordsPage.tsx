import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, History, Trash2, ChevronRight, Calendar, Sparkles } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export default function RecordsPage() {
  const navigate = useNavigate();
  const { readings, setReadings, spreads, deleteReading } = useStore();

  useEffect(() => {
    const loadReadings = async () => {
      try {
        const readingsData = await apiClient.readings.getAll();
        setReadings(readingsData);
      } catch (error) {
        console.error('Failed to load readings:', error);
      }
    };
    loadReadings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      await apiClient.readings.delete(id);
      deleteReading(id);
    } catch (error) {
      console.error('Failed to delete reading:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
          <h1 className="text-xl font-serif font-bold gold-gradient">占卜记录</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {readings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <History className="w-10 h-10 text-silver-500" />
            </div>
            <h2 className="text-xl font-serif font-bold text-white mb-2">暂无记录</h2>
            <p className="text-silver-400 mb-8">开始您的第一次占卜，探索命运的奥秘</p>
            <button 
              onClick={() => navigate('/draw')}
              className="btn-gold px-8 py-3 rounded-full flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              开始占卜
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6"
            >
              <h2 className="text-2xl font-serif font-bold text-white">
                共 {readings.length} 条记录
              </h2>
              <button 
                onClick={() => navigate('/draw')}
                className="btn-mystic text-sm px-4 py-2 rounded-full"
              >
                新占卜
              </button>
            </motion.div>

            {readings.map((reading, index) => {
              const spread = spreads.find(s => s.id === reading.spreadId);
              return (
                <motion.div
                  key={reading.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-4 flex items-center justify-between group"
                >
                  <div className="flex-1" onClick={() => navigate(`/reading/${reading.id}`)}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                        <span className="text-white font-bold">{reading.cards.length}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gold-400 font-medium">{spread?.name}</span>
                        <div className="flex items-center gap-2 text-xs text-silver-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(reading.createdAt)}
                        </div>
                      </div>
                    </div>
                    <p className="text-silver-300 text-sm line-clamp-1">
                      {reading.question}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {reading.cards.slice(0, 5).map((rc) => (
                        <div 
                          key={rc.cardId} 
                          className="w-8 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded flex items-center justify-center text-xs text-white"
                        >
                          {rc.isReversed && 'R'}
                        </div>
                      ))}
                      {reading.cards.length > 5 && (
                        <span className="text-xs text-silver-500">+{reading.cards.length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleDelete(reading.id)}
                      className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => navigate(`/reading/${reading.id}`)}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-silver-400 hover:text-gold-400 hover:bg-white/20 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
