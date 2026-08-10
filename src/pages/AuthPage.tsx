import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';

type AuthMode = 'login' | 'signup';

export default function AuthPage() {
  const navigate = useNavigate();
  const { setUser, setIsAuthenticated } = useStore();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    
    try {
      let result;
      if (mode === 'login') {
        result = await apiClient.auth.login(email, password);
      } else {
        result = await apiClient.auth.signup(email, password, name);
      }
      
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      
      setUser(result.user);
      setIsAuthenticated(true);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen star-bg bg-gradient-to-br from-mystic-900 via-cosmic-800 to-mystic-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-silver-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          返回首页
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-mystic-900" />
          </div>
          <h1 className="text-3xl font-serif font-bold gold-gradient mb-2">
            {mode === 'login' ? '欢迎回来' : '创建账号'}
          </h1>
          <p className="text-silver-400">
            {mode === 'login' ? '登录您的账号，继续探索' : '注册账号，保存您的占卜记录'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-white font-medium mb-2">用户名</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="请输入用户名"
                    className="w-full input-mystic pl-12"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-white font-medium mb-2">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱"
                  className="w-full input-mystic pl-12"
                />
              </div>
            </div>

            <div>
              <label className="block text-white font-medium mb-2">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-silver-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full input-mystic pl-12 pr-12"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-silver-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleAuth}
            disabled={loading || !email || !password || (mode === 'signup' && !name)}
            className="w-full btn-gold mt-8 py-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>

          <div className="mt-6 text-center">
            <span className="text-silver-400">
              {mode === 'login' ? '还没有账号？' : '已有账号？'}
            </span>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="text-gold-400 hover:text-gold-300 ml-2 font-medium transition-colors"
            >
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center text-silver-600 text-sm mt-6"
        >
          仅供娱乐参考
        </motion.p>
      </motion.div>
    </div>
  );
}
