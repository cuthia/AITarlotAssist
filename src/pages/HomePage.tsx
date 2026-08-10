import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, BookOpen, History, Settings, ChevronRight, Star } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const { spreads, setSpreads, readings, setReadings, user, setUser, setIsAuthenticated, setLoading } = useStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [spreadsData, readingsData] = await Promise.all([
          apiClient.spreads.getAll(),
          apiClient.readings.getAll(),
        ]);
        setSpreads(spreadsData);
        setReadings(readingsData);
        
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const userData = await apiClient.auth.getCurrentUser();
            setUser(userData);
            setIsAuthenticated(true);
          } catch {
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-6 px-4"
      >
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-mystic-900" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold gold-gradient">AI塔罗师</h1>
              <p className="text-xs text-silver-400">神秘智慧的指引</p>
            </div>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/records" className="flex items-center gap-2 text-silver-300 hover:text-gold-400 transition-colors">
              <History className="w-5 h-5" />
              <span className="hidden md:inline">记录</span>
            </Link>
            <Link to="/settings" className="flex items-center gap-2 text-silver-300 hover:text-gold-400 transition-colors">
              <Settings className="w-5 h-5" />
              <span className="hidden md:inline">设置</span>
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full" />
                <span className="text-sm text-silver-300">{user.name}</span>
              </div>
            ) : (
              <Link to="/auth/login" className="btn-mystic text-sm px-4 py-2">
                登录
              </Link>
            )}
          </nav>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-8">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-12"
        >
          <div className="relative inline-block mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-gold-400 via-purple-500 to-gold-400 rounded-full blur-xl opacity-30"
            />
            <h2 className="relative text-4xl md:text-6xl font-serif font-bold gold-gradient mb-4">
              探索命运的奥秘
            </h2>
          </div>
          <p className="text-lg text-silver-400 max-w-2xl mx-auto mb-8">
            通过古老的塔罗智慧，结合人工智能的深度分析，为您揭示问题的答案，指引前行的方向
          </p>
          <Link to="/draw">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-gold text-lg px-8 py-4 rounded-full flex items-center gap-2 mx-auto"
            >
              <BookOpen className="w-6 h-6" />
              开始占卜
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
              <Star className="w-6 h-6 text-gold-400" />
              推荐牌阵
            </h3>
            <Link to="/draw" className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1">
              查看全部 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spreads.slice(0, 6).map((spread, index) => (
              <motion.div
                key={spread.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileHover={{ y: -5 }}
                className="glass-card p-6 cursor-pointer group"
              >
                <Link to="/draw" onClick={() => useStore.getState().setSelectedSpread(spread)}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-serif font-semibold text-white group-hover:text-gold-400 transition-colors">
                      {spread.name}
                    </h4>
                    <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded-full">
                      {spread.cardCount}张牌
                    </span>
                  </div>
                  <p className="text-silver-400 text-sm mb-4 line-clamp-2">
                    {spread.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {spread.positions.slice(0, 3).map((pos) => (
                      <span key={pos.index} className="text-xs bg-silver-800/50 text-silver-300 px-2 py-1 rounded">
                        {pos.name}
                      </span>
                    ))}
                    {spread.positions.length > 3 && (
                      <span className="text-xs text-silver-500 px-2 py-1">
                        +{spread.positions.length - 3}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {readings.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
                <History className="w-6 h-6 text-gold-400" />
                最近记录
              </h3>
              <Link to="/records" className="text-gold-400 hover:text-gold-300 text-sm flex items-center gap-1">
                查看全部 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {readings.slice(0, 3).map((reading, index) => {
                const spread = spreads.find(s => s.id === reading.spreadId);
                return (
                  <motion.div
                    key={reading.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="glass-card p-4 flex items-center justify-between group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gold-400 font-medium">{spread?.name}</span>
                        <span className="text-xs text-silver-500">
                          {new Date(reading.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-silver-300 text-sm line-clamp-1">{reading.question}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {reading.cards.slice(0, 3).map((rc) => (
                          <div key={rc.cardId} className="w-8 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded flex items-center justify-center text-xs text-white">
                            {rc.isReversed && 'R'}
                          </div>
                        ))}
                        {reading.cards.length > 3 && (
                          <span className="text-xs text-silver-500">+{reading.cards.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <Link to={`/reading/${reading.id}`} className="text-gold-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-6 h-6" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.section>
        )}
      </main>

      <footer className="py-8 text-center text-silver-500 text-sm">
        <p>AI塔罗师 - 神秘智慧的指引</p>
        <p className="mt-2">仅供娱乐参考</p>
      </footer>
    </div>
  );
}
