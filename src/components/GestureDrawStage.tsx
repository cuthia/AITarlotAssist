import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, AlertTriangle, Hand, Eye } from 'lucide-react';
import type { Card, Spread } from '@/types';
import { useHandGesture } from '@/hooks/useHandGesture';

const CARD_BACK_URL = '/cards/waite/back.svg';
const TOTAL_CARDS = 78;
// 环形牌堆参数（响应式用 CSS scale 包裹）
const RING_SIZE_PX = 680;          // 方形容器边长
const RING_RADIUS_PX = 260;        // 环形半径
const CARD_W = 56;
const CARD_H = 84;
const ROTATE_SPEED_DEG_PER_S = 160; // 张开五指时的转速
const REVEAL_MS = 1800;             // 抽中牌后短暂展示时长

type DrawnEntry = { card: Card; positionIndex: number; isReversed: boolean };

interface Props {
  shuffledCards: Card[];
  spread: Spread;
  drawnCards: DrawnEntry[];
  imagesLoaded: Set<string>;
  /**
   * 真正完成抽出一张牌时调用（showReveal 播放完毕、准备入位）
   * 父组件会更新自身 drawnCards 状态，同时返回给我们 prop 更新
   */
  onDrawCard: (entry: DrawnEntry) => void;
  onRequestComplete: () => void;   // 全部牌抽齐 → 外部开启 AI 解牌入口
  onExit: () => void;              // 退出手势模式
  onReset: () => void;             // 重置当前 drawnCards
}

const spreadLayouts: Record<string, string> = {
  '三牌阵': 'flex justify-center gap-6',
  '时间之流': 'flex justify-center gap-4',
  '事业展望': 'flex justify-center gap-4',
  '爱情十字': 'grid grid-cols-3 gap-3',
  '抉择': 'grid grid-cols-3 gap-3',
  '凯尔特十字': 'grid grid-cols-5 gap-2',
};

/** 从 start 起，左右交替查找最近的可用 index，避免选中重复卡 */
const findNearestAvailable = (start: number, used: Set<number>): number | null => {
  if (!used.has(start)) return start;
  for (let off = 1; off < TOTAL_CARDS; off++) {
    const a = (start + off) % TOTAL_CARDS;
    const b = (start - off + TOTAL_CARDS) % TOTAL_CARDS;
    if (!used.has(a)) return a;
    if (!used.has(b)) return b;
  }
  return null;
};

export default function GestureDrawStage({
  shuffledCards,
  spread,
  drawnCards,
  imagesLoaded,
  onDrawCard,
  onRequestComplete,
  onExit,
  onReset,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { state: gestureState, start, stop } = useHandGesture({ videoRef });
  const { gesture, handPresent, liftCount, loading, error, running } = gestureState;

  const [ringRotation, setRingRotation] = useState<number>(0); // 度
  const ringRafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  // 当前选中的 ring 内 index（用于选牌指针的高亮 & 抬手抽牌）
  const selectedRingIndex = useMemo(() => {
    const slot = 360 / TOTAL_CARDS;
    const i = Math.round(-ringRotation / slot);
    return ((i % TOTAL_CARDS) + TOTAL_CARDS) % TOTAL_CARDS;
  }, [ringRotation]);

  // 已抽出牌在 shuffledCards 中的 ring index 集合（防止重复）
  const usedRingIndexes = useMemo(() => {
    const s = new Set<number>();
    drawnCards.forEach(dc => {
      const idx = shuffledCards.findIndex(c => c.id === dc.card.id);
      if (idx >= 0) s.add(idx);
    });
    return s;
  }, [shuffledCards, drawnCards]);

  // 短暂揭示
  const [reveal, setReveal] = useState<{ card: Card; isReversed: boolean } | null>(null);
  const revealBusyRef = useRef(false);
  // 单次抽牌后的"回合锁"：即使手势 hook 继续产生事件（极罕见），也在 2.5s 内拒绝，让用户必须做一次新的完整动作
  const roundLockRef = useRef(false);
  const revealTimeoutRef = useRef<number | null>(null);
  const requestCompleteTimeoutRef = useRef<number | null>(null);

  // 启动/停止摄像头
  useEffect(() => {
    start();
    return () => {
      stop();
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
      if (requestCompleteTimeoutRef.current) window.clearTimeout(requestCompleteTimeoutRef.current);
    };
  }, [start, stop]);

  // 环形牌旋转 rAF：张开手时才转
  useEffect(() => {
    const tick = (ts: number) => {
      if (lastTsRef.current != null) {
        const dt = (ts - lastTsRef.current) / 1000;
        // 更实时：只要 gesture 是 open 且 running，就不等待 reveal 状态（reveal 时会被遮罩遮挡视觉，继续转不影响）
        if (running && gesture === 'open' && !revealBusyRef.current) {
          setRingRotation(prev => prev + ROTATE_SPEED_DEG_PER_S * dt);
        }
      }
      lastTsRef.current = ts;
      ringRafRef.current = requestAnimationFrame(tick);
    };
    ringRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (ringRafRef.current != null) cancelAnimationFrame(ringRafRef.current);
      lastTsRef.current = null;
    };
    // 依赖 gesture/running，但 reveal 用 ref 判断，避免频繁重启动 rAF
  }, [gesture, running]);

  // 抬手 → 抽牌
  useEffect(() => {
    if (liftCount === 0) return;
    if (revealBusyRef.current || roundLockRef.current) return;
    if (drawnCards.length >= spread.cardCount) return;

    // ===== 抢占式锁：同步置位，防止任何并发重入 =====
    revealBusyRef.current = true;
    roundLockRef.current = true;

    // 优先选当前指针所指，若已抽出则左右找最近的
    const ringIdx = findNearestAvailable(selectedRingIndex, usedRingIndexes);
    if (ringIdx == null) {
      revealBusyRef.current = false;
      // 保留 roundLock 300ms，防止用户因为抖动连续撞空
      window.setTimeout(() => { roundLockRef.current = false; }, 300);
      return;
    }
    const card = shuffledCards[ringIdx];
    if (!card) {
      revealBusyRef.current = false;
      window.setTimeout(() => { roundLockRef.current = false; }, 300);
      return;
    }
    const isReversed = Math.random() > 0.5;
    setReveal({ card, isReversed });

    const drawPositionIndex = drawnCards.length;
    const isLast = drawPositionIndex + 1 >= spread.cardCount;

    revealTimeoutRef.current = window.setTimeout(() => {
      onDrawCard({
        card,
        positionIndex: drawPositionIndex,
        isReversed,
      });
      setReveal(null);
      revealBusyRef.current = false;

      // 抽齐 → 通知
      if (isLast) {
        requestCompleteTimeoutRef.current = window.setTimeout(() => onRequestComplete(), 350);
      }
    }, REVEAL_MS);

    // 回合锁时长：覆盖 reveal 展示 + 入位 + 额外 600ms，总计约 2.4s
    window.setTimeout(() => { roundLockRef.current = false; }, REVEAL_MS + 600);
  }, [
    liftCount,
    selectedRingIndex,
    usedRingIndexes,
    shuffledCards,
    drawnCards.length,
    spread.cardCount,
    onDrawCard,
    onRequestComplete,
  ]);

  // ========== 渲染辅助 ==========
  const slotDeg = 360 / TOTAL_CARDS;

  const gestureLabel: Record<string, { text: string; color: string }> = {
    open:    { text: '✋ 张开五指 → 牌堆转动中',  color: 'text-emerald-300' },
    fist:    { text: '✊ 握拳停止 → 上抬手可抽牌', color: 'text-gold-400' },
    unknown: { text: '🖐 保持手势清晰',              color: 'text-silver-400' },
  };
  const statusLabel = handPresent
    ? gestureLabel[gesture] || gestureLabel.unknown
    : { text: '📷 未检测到手，请对着摄像头挥手', color: 'text-slate-300' };

  return (
    <div className="relative w-full min-h-[calc(100vh-12rem)]">
      {/* 顶部 HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-serif font-bold text-white">手势抽牌</h2>
          <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-1 rounded-full">
            已抽取 {drawnCards.length} / {spread.cardCount}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onReset}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="重置抽牌"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={onExit}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            title="退出手势抽牌"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* 左侧：牌堆 + 揭示 */}
        <div className="glass-card p-4 md:p-6 relative overflow-hidden">
          {/* 手势提示横幅 */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className={`font-medium ${statusLabel.color}`}>
              <Hand className="w-4 h-4 inline mr-2" />
              {loading ? '正在初始化手势识别模型（首次下载约 10MB）…' : statusLabel.text}
            </div>
            <div className="flex items-center gap-2 text-xs text-silver-500">
              <Eye className="w-4 h-4" />
              <span>摄像头仅在本地识别，不会上传</span>
            </div>
          </div>

          {/* 环形牌堆容器 */}
          <div className="relative mx-auto select-none" style={{ width: RING_SIZE_PX, maxWidth: '100%', aspectRatio: '1 / 1' }}>
            {/* 用 transform scale 让小屏幕也显示得下 */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `scale(var(--ring-scale, 1))`,
                transformOrigin: 'center center',
              }}
            >
              <div
                className="relative"
                style={{ width: RING_SIZE_PX, height: RING_SIZE_PX }}
              >
                {/* 78 张牌：放在正方形中心坐标系下 */}
                {shuffledCards.map((card, idx) => {
                  const rot = idx * slotDeg + ringRotation;
                  const isSelected = idx === selectedRingIndex;
                  const used = usedRingIndexes.has(idx);
                  return (
                    <div
                      key={card.id}
                      className="absolute left-1/2 top-1/2"
                      style={{
                        width: 0, height: 0,
                        transform: `translate(-50%, -50%) rotate(${rot}deg) translate(0px, -${RING_RADIUS_PX}px)`,
                      }}
                    >
                      <div
                        className={[
                          'rounded-md overflow-hidden border transition-all shadow-card',
                          isSelected
                            ? used
                              ? 'border-silver-500 opacity-60 scale-95'
                              : 'border-gold-400 shadow-[0_0_24px_rgba(251,191,36,0.55)] -translate-y-2 scale-[1.15] z-10'
                            : used
                              ? 'border-silver-700 opacity-30 grayscale'
                              : 'border-silver-600',
                        ].join(' ')}
                        style={{
                          // 抵消 rotate(rot)，让牌始终保持"头朝外"
                          width: CARD_W,
                          height: CARD_H,
                          transform: `translate(-50%, -50%) rotate(${-rot}deg)`,
                        }}
                      >
                        <img
                          src={CARD_BACK_URL}
                          alt=""
                          draggable={false}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* 选牌指针（12点方向朝下） */}
                <div
                  className="absolute left-1/2 pointer-events-none"
                  style={{
                    top: `${RING_SIZE_PX / 2 - RING_RADIUS_PX - CARD_H - 8}px`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] tracking-widest text-gold-300 uppercase">Pick</span>
                    <svg viewBox="0 0 20 28" className="w-5 h-7 text-gold-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
                      <path d="M10 28 L0 6 L10 12 L20 6 Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>

                {/* 中心装饰：当前选中牌名提示（握拳时可见） */}
                <div
                  className="absolute left-1/2 top-1/2 text-center -translate-x-1/2 -translate-y-1/2"
                  style={{ width: 220 }}
                >
                  <div className="text-silver-400 text-xs">
                    {running ? (gesture === 'fist' ? '准备抽牌…' : gesture === 'open' ? '洗牌中…' : '等待清晰手势…') : '初始化…'}
                  </div>
                  {gesture === 'fist' && (
                    <div className="mt-2 text-sm text-gold-400 font-medium">
                      #
                      {selectedRingIndex + 1}
                      <span className="block mt-1 text-xs text-silver-400">
                        上抬手 → 确认抽出
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Ring 自适应缩放：视口小时缩小 */}
            <style>{`
              @media (max-width: 860px) {
                .glass-card > .relative > div { --ring-scale: 0.66; }
              }
              @media (max-width: 620px) {
                .glass-card > .relative > div { --ring-scale: 0.48; }
              }
            `}</style>
          </div>

          {/* 摄像头预览（右下角小窗，镜像） */}
          <div className="absolute bottom-4 right-4 w-44 h-32 md:w-56 md:h-40 rounded-lg overflow-hidden border border-white/20 bg-black/40 backdrop-blur-sm shadow-lg">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-emerald-300">
              {handPresent ? 'HAND ✓' : 'no hand'}
            </div>
            <div className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/80">
              {gesture === 'open' ? '✋' : gesture === 'fist' ? '✊' : '—'}
            </div>
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-2 text-center text-xs text-rose-300">
                <div>
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1" />
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* 揭示弹层：短暂展示抽中的牌 */}
          <AnimatePresence>
            {reveal && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 flex items-center justify-center bg-black/55 backdrop-blur-[3px] rounded-lg z-20"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`relative w-52 h-72 rounded-xl overflow-hidden shadow-[0_10px_60px_rgba(251,191,36,0.5)] ring-2 ring-gold-400`}>
                    <div className={reveal.isReversed ? 'w-full h-full rotate-180' : 'w-full h-full'}>
                      {imagesLoaded.has(reveal.card.imageUrl) ? (
                        <img
                          src={reveal.card.imageUrl}
                          alt={reveal.card.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-semibold">{reveal.card.name}</p>
                    <p className={`text-xs ${reveal.isReversed ? 'text-rose-400' : 'text-emerald-300'}`}>
                      {reveal.isReversed ? '逆位' : '正位'}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 右侧：牌阵槽位（已抽出牌入位） */}
        <div className="glass-card p-4 md:p-5">
          <h3 className="text-sm font-serif font-bold text-white mb-3 flex items-center gap-2">
            <span>牌阵槽位</span>
            <span className="text-xs text-silver-400 font-normal">{spread.name}</span>
          </h3>
          <div className={spreadLayouts[spread.name] || spreadLayouts['三牌阵']}>
            {spread.positions.map((pos, index) => {
              const dc = drawnCards.find(d => d.positionIndex === index);
              return (
                <motion.div
                  key={pos.index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <div className="relative w-14 h-20 md:w-16 md:h-24 rounded overflow-hidden shadow-card">
                    {dc ? (
                      <motion.div
                        initial={{ rotateY: 0, opacity: 0 }}
                        animate={{ rotateY: 360, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="w-full h-full"
                      >
                        <div className={dc.isReversed ? 'w-full h-full rotate-180' : 'w-full h-full'}>
                          {imagesLoaded.has(dc.card.imageUrl) ? (
                            <img src={dc.card.imageUrl} alt={dc.card.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800" />
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-silver-800 to-silver-900 flex items-center justify-center border border-dashed border-silver-600">
                        <span className="text-silver-500 text-xs">{index + 1}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] md:text-xs text-silver-400 text-center">{pos.name}</span>
                </motion.div>
              );
            })}
          </div>

          {/* 手势用法 */}
          <div className="mt-5 space-y-2 text-xs text-silver-400 border-t border-white/10 pt-4">
            <p><span className="inline-block w-5 text-center">✋</span> 张开五指 → 牌堆转动（洗牌）</p>
            <p><span className="inline-block w-5 text-center">✊</span> 握拳 → 停止，选牌指针锁定一张牌</p>
            <p><span className="inline-block w-5 text-center">⬆️</span> 保持握拳后<em className="text-gold-400 not-italic">向上抬手</em> → 确认抽出该牌</p>
            <p className="text-silver-500 pt-1 border-t border-white/5 mt-2">
              如果不想要当前牌，再次张开五指即可继续转动。
            </p>
          </div>

          {drawnCards.length >= spread.cardCount && (
            <button
              onClick={onRequestComplete}
              className="btn-mystic mt-5 w-full py-3 rounded-full text-sm"
            >
              确认牌阵，进入解牌 →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
