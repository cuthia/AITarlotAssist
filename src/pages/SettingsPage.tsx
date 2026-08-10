import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Settings, User, Palette, Bell, Shield, LogOut, Moon, Sun, HelpCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { apiClient } from '@/api/client';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, setIsAuthenticated, isAuthenticated } = useStore();
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleLogout = async () => {
    await apiClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    navigate('/');
  };

  const settingsGroups = [
    {
      title: '账号',
      items: [
        {
          icon: User,
          label: '个人资料',
          description: '编辑您的个人信息',
          onClick: () => {},
        },
      ],
    },
    {
      title: '外观',
      items: [
        {
          icon: Palette,
          label: '牌组皮肤',
          description: '选择您喜欢的卡牌风格',
          onClick: () => {},
          toggle: false,
        },
        {
          icon: darkMode ? Moon : Sun,
          label: '深色模式',
          description: darkMode ? '当前为深色模式' : '当前为浅色模式',
          onClick: () => setDarkMode(!darkMode),
          toggle: true,
          value: darkMode,
        },
      ],
    },
    {
      title: '通知',
      items: [
        {
          icon: Bell,
          label: '推送通知',
          description: '接收新消息和提醒',
          onClick: () => setNotifications(!notifications),
          toggle: true,
          value: notifications,
        },
      ],
    },
    {
      title: '隐私与安全',
      items: [
        {
          icon: Shield,
          label: '隐私设置',
          description: '管理您的数据和隐私',
          onClick: () => {},
        },
      ],
    },
    {
      title: '帮助',
      items: [
        {
          icon: HelpCircle,
          label: '帮助中心',
          description: '获取使用帮助和常见问题解答',
          onClick: () => {},
        },
      ],
    },
  ];

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
          <h1 className="text-xl font-serif font-bold gold-gradient">设置</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {isAuthenticated && user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 mb-8 flex items-center gap-4"
          >
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-16 h-16 rounded-full"
            />
            <div className="flex-1">
              <h2 className="text-xl font-serif font-bold text-white">{user.name}</h2>
              <p className="text-silver-400">{user.email}</p>
            </div>
            <button className="btn-mystic px-4 py-2 rounded-full text-sm">
              编辑资料
            </button>
          </motion.div>
        )}

        {settingsGroups.map((group, groupIndex) => (
          <motion.div
            key={group.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
            className="mb-8"
          >
            <h3 className="text-sm font-medium text-silver-500 mb-3 px-2">
              {group.title}
            </h3>
            <div className="glass-card overflow-hidden">
              {group.items.map((item, itemIndex) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors ${
                    itemIndex !== group.items.length - 1 ? 'border-b border-white/5' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-silver-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-silver-500 text-sm">{item.description}</p>
                  </div>
                  {item.toggle && (
                    <div className={`w-12 h-6 rounded-full transition-colors ${
                      item.value ? 'bg-gold-500' : 'bg-silver-700'
                    }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        item.value ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        ))}

        {isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <button 
              onClick={handleLogout}
              className="w-full glass-card p-4 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              退出登录
            </button>
          </motion.div>
        )}

        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center"
          >
            <p className="text-silver-400 mb-4">登录后可以保存您的占卜记录</p>
            <button 
              onClick={() => navigate('/auth/login')}
              className="btn-gold px-8 py-3 rounded-full"
            >
              立即登录
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center text-silver-600 text-sm"
        >
          <p>AI塔罗师 v1.0.0</p>
          <p className="mt-1">仅供娱乐参考</p>
        </motion.div>
      </main>
    </div>
  );
}
