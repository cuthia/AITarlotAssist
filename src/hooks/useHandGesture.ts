import { useEffect, useRef, useState, useCallback } from 'react';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export type HandGesture = 'open' | 'fist' | 'unknown';

export interface HandGestureState {
  loading: boolean;
  error: string | null;
  running: boolean;
  handPresent: boolean;
  gesture: HandGesture;
  /** 每次识别到一次「上抬」动作，+1，便于消费端监听变化 */
  liftCount: number;
  debug: {
    extended: number;
    wristRel: number | null;      // 手腕相对中指 MCP 的归一化 y（>0 → 手腕在下方，握拳自然位置）
    liftBaseline: number | null;  // 刚握拳时的 wristRel 基线
    liftDelta: number | null;     // 与基线的差值（向上移动 → 手腕更靠近 MCP 或更高 → wristRel↓ → delta=baseline-current 正数）
    rawGesture: HandGesture;
    consecutiveLiftHits: number;  // 连续超阈值帧数
    armed: boolean;
  };
}

interface UseHandGestureOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  /** 滑动窗口帧数（默认 3：更实时，过半切换） */
  smoothFrames?: number;
  /** 抬手阈值（wristRel 相对基线减少量，越大越不敏感；默认 0.06） */
  liftThreshold?: number;
  /** 抬手连续超阈值的最少帧数（默认 2：降低帧噪） */
  liftMinFrames?: number;
  /** 手指伸展判定宽松度（默认 1.08 更易判为伸展 → 提高张开手识别灵敏度） */
  extendFactor?: number;
}

type LM = { x: number; y: number; z?: number };

const dist = (a: LM, b: LM) => Math.hypot(a.x - b.x, a.y - b.y);

const isFingerExtended = (tip: LM, pip: LM, mcp: LM, factor = 1.1) =>
  dist(tip, mcp) > dist(pip, mcp) * factor;

const isThumbExtended = (tip: LM, mcp: LM, wrist: LM, factor = 1.18) =>
  dist(tip, wrist) > dist(mcp, wrist) * factor;

const classifyHand = (lms: LM[], extendFactor: number): HandGesture => {
  if (!lms || lms.length < 21) return 'unknown';
  const wrist = lms[0];
  const middleMcp = lms[9];

  const indexE = isFingerExtended(lms[8], lms[6], middleMcp, extendFactor);
  const middleE = isFingerExtended(lms[12], lms[10], middleMcp, extendFactor);
  const ringE = isFingerExtended(lms[16], lms[14], middleMcp, extendFactor);
  const pinkyE = isFingerExtended(lms[20], lms[18], middleMcp, extendFactor);
  const thumbE = isThumbExtended(lms[4], lms[2], wrist, 1.18);

  const extended = [indexE, middleE, ringE, pinkyE, thumbE].filter(Boolean).length;
  // 放宽：≥4 指伸展 → open；≤2 指伸展 → fist（允许 1-2 指微张也算握拳）
  if (extended >= 4) return 'open';
  if (extended <= 2) return 'fist';
  return 'unknown';
};

const countExtended = (lms: LM[], extendFactor: number): number => {
  if (!lms || lms.length < 21) return 0;
  const wrist = lms[0];
  const middleMcp = lms[9];
  return [
    isFingerExtended(lms[8], lms[6], middleMcp, extendFactor),
    isFingerExtended(lms[12], lms[10], middleMcp, extendFactor),
    isFingerExtended(lms[16], lms[14], middleMcp, extendFactor),
    isFingerExtended(lms[20], lms[18], middleMcp, extendFactor),
    isThumbExtended(lms[4], lms[2], wrist, 1.18),
  ].filter(Boolean).length;
};

export function useHandGesture(options: UseHandGestureOptions) {
  const {
    videoRef,
    smoothFrames = 3,
    liftThreshold = 0.06,
    liftMinFrames = 2,
    extendFactor = 1.08,
  } = options;

  const [state, setState] = useState<HandGestureState>({
    loading: false,
    error: null,
    running: false,
    handPresent: false,
    gesture: 'unknown',
    liftCount: 0,
    debug: {
      extended: 0,
      wristRel: null,
      liftBaseline: null,
      liftDelta: null,
      rawGesture: 'unknown',
      consecutiveLiftHits: 0,
      armed: false,
    },
  });

  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  // ====== 手势稳定状态机 ======
  const gestureWindowRef = useRef<HandGesture[]>([]);
  const stableGestureRef = useRef<HandGesture>('unknown');
  // 防抖：切换稳定手势后，至少 N 帧不允许切回（防乒乓）
  const minStayFrames = 2;
  const stayCounterRef = useRef<number>(0);

  // ====== 抬手检测（严格"握手协议"） ======
  // wristRel = wrist.y - middleMcp.y ；正常握拳时手腕在下方，>0；上抬手时，手整体靠近镜头上方→相对减小
  const liftBaselineRef = useRef<number | null>(null);
  const armedRef = useRef<boolean>(false);          // 基线已就绪 + 预热完
  const armWarmupRef = useRef<number>(0);           // 握拳后立即采样基线，但预热 N 帧才 armed（防止抓错）
  const consecutiveLiftHitsRef = useRef<number>(0); // 连续超阈值计数
  const firedInThisFistRef = useRef<boolean>(false);// **本拳周期只触发一次**，直到张开手后重置
  const liftDebounceRef = useRef<number>(0);        // 触发后冷却 90 帧

  const onResults = useCallback(
    (results: any) => {
      const lmsArr: LM[] | undefined = results?.multiHandLandmarks?.[0];

      if (!lmsArr) {
        gestureWindowRef.current = [];
        stableGestureRef.current = 'unknown';
        stayCounterRef.current = 0;
        // 手离开画面 → 才清空抬手上下文
        liftBaselineRef.current = null;
        armedRef.current = false;
        armWarmupRef.current = 0;
        consecutiveLiftHitsRef.current = 0;
        firedInThisFistRef.current = false;
        setState(prev => ({
          ...prev,
          handPresent: false,
          gesture: 'unknown',
          debug: { ...prev.debug, wristRel: null, liftBaseline: null, liftDelta: null, rawGesture: 'unknown', extended: 0, consecutiveLiftHits: 0, armed: false },
        }));
        return;
      }

      const lms = lmsArr as LM[];
      const wrist = lms[0];
      const middleMcp = lms[9];
      // 用相对 y 作为上抬判定指标，降低手靠近/远离镜头对绝对 y 的影响
      const wristRel = wrist.y - middleMcp.y;
      const rawGesture = classifyHand(lms, extendFactor);
      const extended = countExtended(lms, extendFactor);

      // 冷却衰减
      if (liftDebounceRef.current > 0) liftDebounceRef.current -= 1;

      // ===== 1) 滑动窗口稳定 + 关键容错：unknown 不打断当前 fist/open =====
      // 当稳定状态已为 fist 时，出现 1-2 帧 unknown 不把它推入窗口（直接忽略），防止丢失 fist 稳定
      const currentlyStable = stableGestureRef.current;
      const shouldSkipUnknown =
        (currentlyStable === 'fist' && rawGesture === 'unknown') ||
        (currentlyStable === 'open' && rawGesture === 'unknown');
      if (!shouldSkipUnknown) {
        gestureWindowRef.current.push(rawGesture);
        if (gestureWindowRef.current.length > smoothFrames) gestureWindowRef.current.shift();
      }

      let stable: HandGesture = currentlyStable;
      const win = gestureWindowRef.current;
      const half = Math.floor(smoothFrames / 2) + 1;
      const voteOpen = win.filter(g => g === 'open').length;
      const voteFist = win.filter(g => g === 'fist').length;

      if (stayCounterRef.current > 0) {
        stayCounterRef.current -= 1;
      } else {
        let next: HandGesture = stable;
        if (voteOpen >= half) next = 'open';
        else if (voteFist >= half) next = 'fist';
        // 切换了：锁定 stay 帧
        if (next !== stable) {
          stable = next;
          stableGestureRef.current = stable;
          stayCounterRef.current = minStayFrames;
        }
      }
      const gestureNow = stableGestureRef.current;

      // ===== 2) 抬手判定 =====
      let liftTriggered = false;
      let debugDelta: number | null = null;

      if (gestureNow === 'fist') {
        // --- fist 状态：维持基线、warmup、armed，并做超阈值判定 ---
        if (liftBaselineRef.current == null) {
          // 立即采样（刚稳定 fist）
          liftBaselineRef.current = wristRel;
          armWarmupRef.current = 0;
          armedRef.current = false;
          consecutiveLiftHitsRef.current = 0;
        } else {
          // 预热 2 帧后才允许抬手（避免刚采样就抖）
          if (!armedRef.current) {
            armWarmupRef.current += 1;
            if (armWarmupRef.current >= 2) armedRef.current = true;
          }
          const delta = liftBaselineRef.current - wristRel; // 正数 = 手相对上抬
          debugDelta = delta;
          if (armedRef.current && !firedInThisFistRef.current && liftDebounceRef.current === 0) {
            if (delta >= liftThreshold) {
              consecutiveLiftHitsRef.current += 1;
              if (consecutiveLiftHitsRef.current >= liftMinFrames) {
                liftTriggered = true;
                firedInThisFistRef.current = true; // 本拳周期只触发一次
                liftDebounceRef.current = 90;      // ≈1.5s 冷却
                consecutiveLiftHitsRef.current = 0;
                liftBaselineRef.current = null;
                armedRef.current = false;
                armWarmupRef.current = 0;
              }
            } else {
              // 没超阈值：轻微衰减而不是直接归零，容忍 1 帧回落
              consecutiveLiftHitsRef.current = Math.max(0, consecutiveLiftHitsRef.current - 1);
            }
          }
        }
      } else if (gestureNow === 'open') {
        // --- open 状态：重置闭锁 fired 与抬手上下文，允许下一个 fist 再次抽 ---
        firedInThisFistRef.current = false;
        liftBaselineRef.current = null;
        armedRef.current = false;
        armWarmupRef.current = 0;
        consecutiveLiftHitsRef.current = 0;
      } else {
        // --- unknown：关键！**冻结所有抬手上下文**，保持 baseline/armed/hits 原样不动 ---
        // 这一帧即使识别成 unknown（例如抬手时手倾斜），也不打断 warmup/armed/hits 累积
      }

      setState(prev => ({
        ...prev,
        handPresent: true,
        gesture: gestureNow,
        liftCount: liftTriggered ? prev.liftCount + 1 : prev.liftCount,
        debug: {
          extended,
          wristRel,
          liftBaseline: liftBaselineRef.current,
          liftDelta: debugDelta,
          rawGesture,
          consecutiveLiftHits: consecutiveLiftHitsRef.current,
          armed: armedRef.current,
        },
      }));
    },
    [smoothFrames, extendFactor, liftThreshold, liftMinFrames]
  );

  const start = useCallback(async () => {
    if (!videoRef.current) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      if (!handsRef.current) {
        const hands = new Hands({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });
        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });
        hands.onResults(onResults);
        handsRef.current = hands;
      }
      if (!cameraRef.current) {
        const cam = new Camera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });
        cameraRef.current = cam;
      }
      await cameraRef.current.start();
      setState(prev => ({ ...prev, loading: false, running: true }));
    } catch (err: any) {
      const msg =
        (err?.message as string) ||
        '摄像头开启失败。请确认已授予权限，或改用点击抽牌。';
      setState(prev => ({ ...prev, loading: false, error: msg, running: false }));
    }
  }, [videoRef, onResults]);

  const stop = useCallback(() => {
    try { cameraRef.current?.stop?.(); } catch {}
    try { handsRef.current?.close?.(); } catch {}
    cameraRef.current = null;
    handsRef.current = null;
    gestureWindowRef.current = [];
    stableGestureRef.current = 'unknown';
    stayCounterRef.current = 0;
    liftBaselineRef.current = null;
    armedRef.current = false;
    armWarmupRef.current = 0;
    consecutiveLiftHitsRef.current = 0;
    firedInThisFistRef.current = false;
    setState(prev => ({ ...prev, running: false, handPresent: false, gesture: 'unknown' }));
  }, []);

  useEffect(() => () => {
    try { cameraRef.current?.stop?.(); handsRef.current?.close?.(); } catch {}
  }, []);

  return { state, start, stop };
}

export default useHandGesture;
