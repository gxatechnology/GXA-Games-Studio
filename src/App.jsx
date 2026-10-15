import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Trophy, Play, RotateCcw, Volume2, VolumeX, Sun, Moon, Sunset,
  Award, Shield, Zap, Target, Flame, HelpCircle, FileText,
  ChevronRight, CheckCircle2, Lock, Sparkles, Video, Sliders,
  Smartphone, Monitor, Crosshair, Star, Coins, ArrowUpRight
} from 'lucide-react';

// ============================================================================
// 1. PLATFORM SDK & MONETIZATION ABSTRACTION LAYER (Lagged / GamePix / GXA)
// ============================================================================
class PlatformBridge {
  constructor() {
    this.platformName = 'GXA_STANDALONE';
    this.isMuted = false;
    this.onPauseCallback = null;
    this.onResumeCallback = null;
  }

  init(onPause, onResume) {
    this.onPauseCallback = onPause;
    this.onResumeCallback = onResume;
    // Ready for window.LaggedAPI or window.GamePix integration
    if (typeof window !== 'undefined') {
      window.GXAPlatformBridge = this;
    }
  }

  // The host portal MAY inject window.GXAAdAdapter once its real SDK is installed.
  // Expected adapter: { showInterstitial: async () => boolean,
  //                     showRewarded: async () => boolean }.
  // The rewarded method must only resolve true AFTER a verified completed view.
  getAdapter() {
    return typeof window === 'undefined' ? null : (window.GXAAdAdapter || null);
  }

  hasRewardedAds() {
    const adapter = this.getAdapter();
    return Boolean(adapter && typeof adapter.showRewarded === 'function');
  }

  async requestInterstitialAd(onComplete) {
    const adapter = this.getAdapter();
    if (!adapter || typeof adapter.showInterstitial !== 'function') {
      // No SDK is configured. Continue gameplay WITHOUT displaying or simulating an ad.
      if (onComplete) onComplete(false);
      return;
    }
    if (this.onPauseCallback) this.onPauseCallback();
    try {
      const shown = await adapter.showInterstitial();
      if (onComplete) onComplete(Boolean(shown));
    } catch (error) {
      console.warn('Interstitial unavailable:', error);
      if (onComplete) onComplete(false);
    } finally {
      if (this.onResumeCallback) this.onResumeCallback();
    }
  }

  async requestRewardedAd(onRewardGranted) {
    const adapter = this.getAdapter();
    if (!adapter || typeof adapter.showRewarded !== 'function') {
      // Absolutely no reward without a verified external SDK result.
      if (onRewardGranted) onRewardGranted(false);
      return;
    }
    if (this.onPauseCallback) this.onPauseCallback();
    try {
      const verifiedCompletedView = await adapter.showRewarded();
      if (onRewardGranted) onRewardGranted(verifiedCompletedView === true);
    } catch (error) {
      console.warn('Rewarded ad unavailable:', error);
      if (onRewardGranted) onRewardGranted(false);
    } finally {
      if (this.onResumeCallback) this.onResumeCallback();
    }
  }

  submitScore(mode, score) {
    // Hook for portal leaderboards
    try {
      const key = `gxa_cricket_hs_${mode}`;
      const prev = parseInt(localStorage.getItem(key) || '0', 10);
      if (score > prev) localStorage.setItem(key, String(score));
    } catch (e) {
      // Ignore storage errors in restricted iframes
    }
  }
}

const platformSDK = new PlatformBridge();

// ============================================================================
// 2. PROCEDURAL WEB AUDIO ENGINE (Zero external audio files required)
// ============================================================================
class CricketSoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(mute) {
    this.muted = mute;
  }

  playBatHit(power = 0.8, isSweetSpot = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Woody crack impulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isSweetSpot ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isSweetSpot ? 290 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.11);

    gain.gain.setValueAtTime(Math.min(1, power * 0.9), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);

    // High-frequency leather snap
    const bufferSize = this.ctx.sampleRate * 0.06;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isSweetSpot ? 1850 : 1100;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(power * 0.65, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    whiteNoise.start(now);
  }

  playBallBounce() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.07);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  playStumpHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    // Ash wood clatter (3 staggered clicks)
    [0, 0.045, 0.095].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(520 - idx * 90, now + offset);
      osc.frequency.exponentialRampToValueAtTime(110, now + offset + 0.09);
      gain.gain.setValueAtTime(0.35, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  playCrowdRoar(intensity = 1.0, duration = 1.8) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.35 * intensity;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(650, now);
    filter.Q.setValueAtTime(1.4, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.45 * intensity, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.005, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);

    // Celebratory fanfare chord on 6s
    if (intensity > 1.1) {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const oGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        oGain.gain.setValueAtTime(0.12, now + idx * 0.06);
        oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(oGain);
        oGain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + 0.95);
      });
    }
  }
}

const soundFX = new CricketSoundEngine();

// ============================================================================
// 3. GAME CONFIGURATION, BATS, STADIUMS, MODES & ACHIEVEMENTS
// ============================================================================
const BATS_CATALOG = [
  {
    id: 'classic_willow',
    name: 'English Willow Pro',
    powerBoost: 1.0,
    timingWindowBonus: 1.0,
    price: 0,
    bladeColor: '#d6b27c',
    gripColor: '#f8fafc',
    stickerColor: '#dc2626',
    desc: 'Balanced traditional grade-1 English willow blade.'
  },
  {
    id: 'gxa_carbon',
    name: 'GXA Carbon Stealth',
    powerBoost: 1.07,
    timingWindowBonus: 1.05,
    price: 150,
    bladeColor: '#1e293b',
    gripColor: '#10b981',
    stickerColor: '#10b981',
    desc: 'Graphite-reinforced spine for crisp cover drives.'
  },
  {
    id: 'neon_striker',
    name: 'Cyber Neon Striker',
    powerBoost: 1.12,
    timingWindowBonus: 1.08,
    price: 350,
    bladeColor: '#0f172a',
    gripColor: '#06b6d4',
    stickerColor: '#ec4899',
    desc: 'High sweet-spot profile engineered for T20 six hitting.'
  },
  {
    id: 'royal_gold',
    name: 'GXA Sovereign Gold',
    powerBoost: 1.18,
    timingWindowBonus: 1.12,
    price: 700,
    bladeColor: '#f59e0b',
    gripColor: '#7c2d12',
    stickerColor: '#fef08a',
    desc: 'Championship edition blade with maximum launch velocity.'
  },
  {
    id: 'plasma_titan',
    name: 'Plasma Titan X',
    powerBoost: 1.24,
    timingWindowBonus: 1.16,
    price: 1200,
    bladeColor: '#311042',
    gripColor: '#a855f7',
    stickerColor: '#38bdf8',
    desc: 'Ultimate GXA studio prototype with massive sweet spot.'
  }
];

const STADIUM_THEMES = {
  day: {
    id: 'day',
    name: 'Sunny Day Test',
    skyTop: '#1d4ed8',
    skyBottom: '#93c5fd',
    ambientColor: 0xffffff,
    ambientIntensity: 0.78,
    sunColor: 0xfffbeb,
    sunIntensity: 1.15,
    floodlightGlow: false,
    ballColor: 0xb91c1c, // Classic Red Leather
    UnlockPrice: 0
  },
  dusk: {
    id: 'dusk',
    name: 'Golden Sunset Arena',
    skyTop: '#311042',
    skyBottom: '#f97316',
    ambientColor: 0xfed7aa,
    ambientIntensity: 0.68,
    sunColor: 0xfb923c,
    sunIntensity: 1.05,
    floodlightGlow: true,
    ballColor: 0xf8fafc, // White limited-overs ball
    UnlockPrice: 200
  },
  night: {
    id: 'night',
    name: 'Floodlit Prime Stadium',
    skyTop: '#020617',
    skyBottom: '#0f172a',
    ambientColor: 0x94a3b8,
    ambientIntensity: 0.55,
    sunColor: 0xe2e8f0,
    sunIntensity: 1.25,
    floodlightGlow: true,
    ballColor: 0xf8fafc, // White ball under lights
    UnlockPrice: 400
  }
};

const GAME_MODES = [
  {
    id: 'quick_2',
    title: 'Quick Match (2 Overs)',
    subtitle: '12 Balls • 3 Wickets • Fast Arcade Blitz',
    overs: 2,
    wickets: 3,
    target: null,
    badge: 'POPULAR',
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'quick_5',
    title: 'Quick Match (5 Overs)',
    subtitle: '30 Balls • 5 Wickets • Build an Innings',
    overs: 5,
    wickets: 5,
    target: null,
    badge: 'CLASSIC',
    color: 'from-blue-500 to-indigo-600'
  },
  {
    id: 'six_challenge',
    title: 'Super Sixes Challenge',
    subtitle: '12 Balls • Hit Maximum 6s for Combo Bonus',
    overs: 2,
    wickets: 3,
    target: null,
    onlySixesCountBonus: true,
    badge: 'ARCADE',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'target_chase',
    title: 'Last Over Target Chase',
    subtitle: 'Chase 38 Runs in 12 Balls (3 Wickets)',
    overs: 2,
    wickets: 3,
    target: 38,
    badge: 'PRESSURE',
    color: 'from-rose-500 to-red-600'
  },
  {
    id: 'endless',
    title: 'Sudden Death Survival',
    subtitle: '1 Wicket • Unlimited Overs • Rising Pace',
    overs: 99,
    wickets: 1,
    target: null,
    badge: 'HARDCORE',
    color: 'from-purple-500 to-fuchsia-600'
  },
  {
    id: 'tournament',
    title: 'GXA World Cup Knockout',
    subtitle: 'QF (24 Runs) → SF (36 Runs) → Final (48 Runs)',
    overs: 2,
    wickets: 3,
    target: 24,
    isTournament: true,
    badge: 'TROPHY',
    color: 'from-yellow-500 to-amber-600'
  }
];

const BOWLING_VARIATIONS = [
  {
    id: 'fast_good',
    name: 'Express Good Length',
    type: 'FAST',
    speedKmh: [142, 151],
    bounceZ: 2.2, // Pitching coordinate (stumps at z = 9.0)
    swingX: 0.14,
    seamDeviation: 0.05,
    bounceFactor: 0.76,
    color: '#ef4444'
  },
  {
    id: 'yorker',
    name: 'Toe-Crushing Yorker',
    type: 'FAST',
    speedKmh: [144, 153],
    bounceZ: 7.4, // Right on popping crease
    swingX: -0.18,
    seamDeviation: 0.02,
    bounceFactor: 0.42,
    color: '#dc2626'
  },
  {
    id: 'bouncer',
    name: 'Short Bumper',
    type: 'FAST',
    speedKmh: [139, 148],
    bounceZ: -0.8, // Pitches short, rises high
    swingX: 0.05,
    seamDeviation: 0.08,
    bounceFactor: 1.15,
    color: '#f97316'
  },
  {
    id: 'inswinger',
    name: 'Full Inswinger',
    type: 'MEDIUM',
    speedKmh: [126, 135],
    bounceZ: 5.1,
    swingX: -0.34,
    seamDeviation: -0.12,
    bounceFactor: 0.68,
    color: '#3b82f6'
  },
  {
    id: 'outswinger',
    name: 'Away Outswinger',
    type: 'MEDIUM',
    speedKmh: [124, 133],
    bounceZ: 4.2,
    swingX: 0.36,
    seamDeviation: 0.16,
    bounceFactor: 0.72,
    color: '#06b6d4'
  },
  {
    id: 'leg_spin',
    name: 'Flighted Leg Break',
    type: 'SPIN',
    speedKmh: [84, 94],
    bounceZ: 3.8,
    swingX: -0.12,
    seamDeviation: 0.52, // Sharp spin after bounce
    bounceFactor: 0.82,
    color: '#a855f7'
  },
  {
    id: 'doosra',
    name: 'arm-Ball / Googly',
    type: 'SPIN',
    speedKmh: [88, 97],
    bounceZ: 4.6,
    swingX: 0.1,
    seamDeviation: -0.45,
    bounceFactor: 0.74,
    color: '#ec4899'
  }
];

const ACHIEVEMENTS_LIST = [
  { id: 'first_six', title: 'Maximum Launch!', desc: 'Hit your first 6 into the stands', reward: 50 },
  { id: 'hattrick_4s', title: 'Boundary Machine', desc: 'Hit 3 boundaries (4 or 6) in a row', reward: 100 },
  { id: 'fifty_club', title: 'Half-Century Hero', desc: 'Score 50+ runs in a single innings', reward: 200 },
  { id: 'perfect_3', title: 'Sweet Spot Master', desc: 'Achieve 3 PERFECT timed shots in a match', reward: 150 },
  { id: 'tournament_champ', title: 'GXA World Champion', desc: 'Win the 3-round GXA World Cup Final', reward: 500 }
];

// ============================================================================
// 4. MAIN REACT APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // Persistent Player Profile State
  const [profile, setProfile] = useState(() => {
    const fallback = {
      coins: 200,
      xp: 0,
      selectedBat: 'classic_willow',
      unlockedBats: ['classic_willow'],
      selectedTheme: 'day',
      unlockedThemes: ['day', 'dusk', 'night'],
      highScores: { quick_2: 0, quick_5: 0, six_challenge: 0, target_chase: 0, endless: 0, tournament: 0 },
      totalSixes: 0,
      totalRuns: 0,
      achievements: [],
      tournamentStage: 0 // 0: QF, 1: SF, 2: Final
    };
    try {
      const saved = localStorage.getItem('gxa_cricket_profile_v1');
      return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
    } catch (e) {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('gxa_cricket_profile_v1', JSON.stringify(profile));
    } catch (e) {
      // Ignore storage quota issues
    }
  }, [profile]);

  // UI & Navigation State
  const [screen, setScreen] = useState('MENU'); // 'MENU' | 'PLAYING' | 'GAMEOVER'
  const [activeModal, setActiveModal] = useState(null); // 'GARAGE' | 'DOCS' | 'ACHIEVEMENTS' | null
  const [muted, setMuted] = useState(false);
  const [cameraPreset, setCameraPreset] = useState('BROADCAST'); // 'BROADCAST' | 'PRO_CLOSE' | 'HELICOPTER'

  // Active Match State
  const [selectedMode, setSelectedMode] = useState(GAME_MODES[0]);
  const [matchState, setMatchState] = useState({
    runs: 0,
    wickets: 0,
    maxWickets: 3,
    ballsBowled: 0,
    totalBalls: 12,
    sixesCount: 0,
    foursCount: 0,
    streakBoundaries: 0,
    perfectCount: 0,
    target: null,
    thisOver: [],
    lastOutcomeText: 'READY TO BAT',
    lastOutcomeSub: 'Swipe or press Direction + Shot when the ball bounces!',
    lastTimingBadge: null, // 'PERFECT' | 'GOOD' | 'EARLY' | 'LATE' | 'MISSED'
    deliverySpeed: 0,
    deliveryName: 'Waiting for Bowler...',
    deliveryType: 'FAST',
    isBallActive: false,
    canReplay: false,
    tournamentRoundName: ''
  });

  // Batting Input Controls State
  const [shotType, setShotType] = useState('GROUND'); // 'GROUND' | 'LOFT' | 'DEFENSE'
  const [aimDirection, setAimDirection] = useState({ x: 0, label: 'STRAIGHT DRIVE' }); // x in [-1 (Off-side Left), 0 (Straight), +1 (Leg-side Right)]
  const [toastNotification, setToastNotification] = useState(null);

  // Refs for Three.js & Real-time Game Loop
  const mountRef = useRef(null);
  const engineRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    ballMesh: null,
    ballTrail: null,
    trailPositions: [],
    pitchMarker: null,
    timingRing: null,
    batsmanGroup: null,
    batPivot: null,
    batBladeMesh: null,
    bowlerGroup: null,
    bowlerArmPivot: null,
    stumpsBatter: [],
    bailsBatter: [],
    fielders: [],
    phase: 'IDLE', // 'IDLE' | 'RUNUP' | 'BOWLED' | 'HIT_FLIGHT' | 'WICKET_ANIM' | 'RESETTING'
    phaseTimer: 0,
    ballPos: new THREE.Vector3(0, 1.5, -10),
    ballVel: new THREE.Vector3(0, 0, 0),
    currentDelivery: null,
    hasBounced: false,
    hasSwung: false,
    swingTime: 0,
    swingAnimProgress: 0,
    swingStyle: 'GROUND',
    swingDirX: 0,
    replayTrajectory: [],
    isReplaying: false,
    replayIndex: 0,
    pointerDownPos: null
  });

  // Sync latest React state into refs accessible by requestAnimationFrame loop
  const shotTypeRef = useRef(shotType);
  useEffect(() => { shotTypeRef.current = shotType; }, [shotType]);

  const aimDirRef = useRef(aimDirection);
  useEffect(() => { aimDirRef.current = aimDirection; }, [aimDirection]);

  const matchStateRef = useRef(matchState);
  useEffect(() => { matchStateRef.current = matchState; }, [matchState]);

  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const cameraPresetRef = useRef(cameraPreset);
  useEffect(() => { cameraPresetRef.current = cameraPreset; }, [cameraPreset]);

  const screenRef = useRef(screen);
  useEffect(() => { screenRef.current = screen; }, [screen]);

  // Show achievement or reward toast
  const triggerToast = useCallback((title, subtitle) => {
    setToastNotification({ title, subtitle });
    setTimeout(() => setToastNotification(null), 3400);
  }, []);

  // Unlock Achievement Helper
  const unlockAchievement = useCallback((achId) => {
    setProfile((prev) => {
      if (prev.achievements.includes(achId)) return prev;
      const achObj = ACHIEVEMENTS_LIST.find((a) => a.id === achId);
      if (!achObj) return prev;
      triggerToast(`🏆 Achievement Unlocked: ${achObj.title}`, `+${achObj.reward} GXA Coins added!`);
      return {
        ...prev,
        coins: prev.coins + achObj.reward,
        achievements: [...prev.achievements, achId]
      };
    });
  }, [triggerToast]);

  // Initialize Platform Bridge
  useEffect(() => {
    platformSDK.init(
      () => soundFX.setMuted(true),
      () => soundFX.setMuted(muted)
    );
  }, [muted]);

  // Toggle Audio Mute
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
  };

  // ============================================================================
  // 5. THREE.JS 3D STADIUM, CHARACTERS & PHYSICS INITIALIZATION
  // ============================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const theme = STADIUM_THEMES[profileRef.current.selectedTheme] || STADIUM_THEMES.day;
    scene.fog = new THREE.FogExp2(theme.skyBottom, 0.0045);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 350);
    camera.position.set(0, 3.7, 14.8);
    camera.lookAt(0, 1.0, -4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // --- LIGHTING ---
    const ambientLight = new THREE.AmbientLight(theme.ambientColor, theme.ambientIntensity);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(theme.sunColor, theme.sunIntensity);
    sunLight.position.set(28, 52, 24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 140;
    const d = 25;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // --- LUSH STRIPED OUTFIELD TURF ---
    const outfieldGroup = new THREE.Group();
    const baseGrassGeo = new THREE.CircleGeometry(78, 64);
    const baseGrassMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const baseGrass = new THREE.Mesh(baseGrassGeo, baseGrassMat);
    baseGrass.rotation.x = -Math.PI / 2;
    baseGrass.receiveShadow = true;
    outfieldGroup.add(baseGrass);

    // Concentric mowed grass stripes
    for (let r = 12; r < 72; r += 8) {
      const ringGeo = new THREE.RingGeometry(r, r + 4, 64);
      const ringMat = new THREE.MeshLambertMaterial({ color: 0x16a34a, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      ring.receiveShadow = true;
      outfieldGroup.add(ring);
    }

    // 30-Yard Inner Fielding Circle (White dotted/solid line)
    const innerCircleGeo = new THREE.RingGeometry(32.8, 33.15, 64);
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const innerCircle = new THREE.Mesh(innerCircleGeo, whiteLineMat);
    innerCircle.rotation.x = -Math.PI / 2;
    innerCircle.position.y = 0.02;
    outfieldGroup.add(innerCircle);

    // Boundary Cushion Rope (Radius = 64m)
    const boundaryGeo = new THREE.TorusGeometry(64, 0.35, 12, 96);
    const boundaryMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x0ea5e9, emissiveIntensity: 0.25 });
    const boundaryRope = new THREE.Mesh(boundaryGeo, boundaryMat);
    boundaryRope.rotation.x = Math.PI / 2;
    boundaryRope.position.y = 0.32;
    outfieldGroup.add(boundaryRope);

    // Perimeter LED Advertising Boards
    const adBoardGeo = new THREE.CylinderGeometry(66.5, 66.5, 1.3, 64, 1, true);
    const adBoardMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });
    const adBoard = new THREE.Mesh(adBoardGeo, adBoardMat);
    adBoard.position.y = 0.65;
    outfieldGroup.add(adBoard);

    scene.add(outfieldGroup);

    // --- 22-YARD CLAY CRICKET PITCH (z from -10 to +10) ---
    const pitchGroup = new THREE.Group();
    const pitchGeo = new THREE.PlaneGeometry(3.2, 22.5);
    const pitchMat = new THREE.MeshLambertMaterial({ color: 0xd6b88a });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.rotation.x = -Math.PI / 2;
    pitchMesh.position.y = 0.025;
    pitchMesh.receiveShadow = true;
    pitchGroup.add(pitchMesh);

    // Popping & Bowling Crease White Lines
    const createCreaseLine = (w, h, x, z) => {
      const g = new THREE.PlaneGeometry(w, h);
      const m = new THREE.Mesh(g, whiteLineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.032, z);
      pitchGroup.add(m);
    };
    // Batter end (z = +9.0 stumps, z = +7.8 popping crease)
    createCreaseLine(2.6, 0.08, 0, 7.8);
    createCreaseLine(3.0, 0.08, 0, 9.0);
    createCreaseLine(0.08, 2.4, -1.3, 8.4);
    createCreaseLine(0.08, 2.4, 1.3, 8.4);
    // Bowler end (z = -9.0 stumps, z = -7.8 popping crease)
    createCreaseLine(2.6, 0.08, 0, -7.8);
    createCreaseLine(3.0, 0.08, 0, -9.0);
    createCreaseLine(0.08, 2.4, -1.3, -8.4);
    createCreaseLine(0.08, 2.4, 1.3, -8.4);

    scene.add(pitchGroup);

    // --- STADIUM GRANDSTANDS, CROWD & 4 FLOODLIGHT TOWERS ---
    const stadiumGroup = new THREE.Group();
    const tier1Geo = new THREE.CylinderGeometry(82, 70, 12, 48, 1, true);
    const tier1Mat = new THREE.MeshLambertMaterial({ color: 0x1e293b, side: THREE.DoubleSide });
    const tier1 = new THREE.Mesh(tier1Geo, tier1Mat);
    tier1.position.y = 6;
    stadiumGroup.add(tier1);

    const tier2Geo = new THREE.CylinderGeometry(95, 82, 15, 48, 1, true);
    const tier2Mat = new THREE.MeshLambertMaterial({ color: 0x334155, side: THREE.DoubleSide });
    const tier2 = new THREE.Mesh(tier2Geo, tier2Mat);
    tier2.position.y = 18;
    stadiumGroup.add(tier2);

    // Stadium Roof Canopy
    const roofGeo = new THREE.RingGeometry(77, 97, 48);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = 25.5;
    stadiumGroup.add(roof);

    // Procedural Crowd Spectators (Instanced colorful dots around the bowl)
    const crowdCount = 900;
    const crowdGeo = new THREE.BoxGeometry(0.65, 0.9, 0.65);
    const crowdMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const crowdInstanced = new THREE.InstancedMesh(crowdGeo, crowdMat, crowdCount);
    const dummy = new THREE.Object3D();
    const palette = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xf97316, 0xffffff, 0xa855f7];

    for (let i = 0; i < crowdCount; i++) {
      const angle = (i / crowdCount) * Math.PI * 2 + (Math.random() * 0.08);
      // Leave sightscreen gap directly behind bowler (angle around -PI/2)
      const isSightScreen = Math.abs(Math.sin(angle) + 1) < 0.04;
      const tierPick = i % 2 === 0;
      const radius = tierPick ? 72 + Math.random() * 8 : 83 + Math.random() * 9;
      const yPos = tierPick ? 2.5 + ((radius - 72) * 0.9) : 13 + ((radius - 83) * 1.0);
      dummy.position.set(
        Math.cos(angle) * radius,
        isSightScreen ? -20 : yPos,
        Math.sin(angle) * radius
      );
      dummy.lookAt(0, 1, 0);
      dummy.updateMatrix();
      crowdInstanced.setMatrixAt(i, dummy.matrix);
      crowdInstanced.setColorAt(i, new THREE.Color(palette[i % palette.length]));
    }
    stadiumGroup.add(crowdInstanced);

    // Bowler Sightscreen (White backdrop behind bowler)
    const sightScreenGeo = new THREE.BoxGeometry(14, 9, 1);
    const sightScreenMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    const sightScreen = new THREE.Mesh(sightScreenGeo, sightScreenMat);
    sightScreen.position.set(0, 4.5, -68);
    stadiumGroup.add(sightScreen);

    // 4 Giant Floodlight Towers
    const towerAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    towerAngles.forEach((ang) => {
      const tx = Math.cos(ang) * 88;
      const tz = Math.sin(ang) * 88;
      const poleGeo = new THREE.CylinderGeometry(0.8, 1.5, 48, 8);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0x64748b });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(tx, 24, tz);
      stadiumGroup.add(pole);

      const headGeo = new THREE.BoxGeometry(9, 5, 1.5);
      const headMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(tx, 48, tz);
      head.lookAt(0, 0, 0);
      stadiumGroup.add(head);
    });

    scene.add(stadiumGroup);

    // --- 3D STUMPS & BAILS (Batter End z = +9.0 & Bowler End z = -9.0) ---
    const stumpGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.78, 10);
    const stumpMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const bailGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.12, 8);

    const stumpsBatter = [];
    const bailsBatter = [];

    [-0.12, 0, 0.12].forEach((xOffset) => {
      // Batter Stump
      const sBat = new THREE.Mesh(stumpGeo, stumpMat);
      sBat.position.set(xOffset, 0.39, 9.0);
      sBat.castShadow = true;
      sBat.userData = { homePos: sBat.position.clone(), vel: new THREE.Vector3(), rotVel: new THREE.Vector3() };
      scene.add(sBat);
      stumpsBatter.push(sBat);

      // Bowler Stump
      const sBowl = new THREE.Mesh(stumpGeo, stumpMat);
      sBowl.position.set(xOffset, 0.39, -9.0);
      scene.add(sBowl);
    });

    [-0.06, 0.06].forEach((xBail) => {
      const bBat = new THREE.Mesh(bailGeo, stumpMat);
      bBat.rotation.z = Math.PI / 2;
      bBat.position.set(xBail, 0.79, 9.0);
      bBat.userData = { homePos: bBat.position.clone(), vel: new THREE.Vector3(), rotVel: new THREE.Vector3() };
      scene.add(bBat);
      bailsBatter.push(bBat);
    });

    // --- PITCHING BOUNCE MARKER & BATTER TIMING RING ---
    const markerGeo = new THREE.RingGeometry(0.22, 0.42, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
    const pitchMarker = new THREE.Mesh(markerGeo, markerMat);
    pitchMarker.rotation.x = -Math.PI / 2;
    pitchMarker.position.set(0, 0.04, 3.5);
    pitchMarker.visible = false;
    scene.add(pitchMarker);

    const timingRingGeo = new THREE.RingGeometry(0.65, 0.82, 32);
    const timingRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const timingRing = new THREE.Mesh(timingRingGeo, timingRingMat);
    timingRing.rotation.x = -Math.PI / 2;
    timingRing.position.set(0, 0.045, 7.6);
    scene.add(timingRing);

    // --- ARTICULATED 3D BATSMAN & CUSTOMIZABLE CRICKET BAT ---
    const batsmanGroup = new THREE.Group();
    batsmanGroup.position.set(-0.42, 0, 7.85); // Standing just to leg-side of stumps

    const kitMat = new THREE.MeshLambertMaterial({ color: 0x0284c7 }); // GXA Blue Jersey
    const padMat = new THREE.MeshLambertMaterial({ color: 0xf8fafc });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3 });

    // Legs & Batting Pads
    [-0.14, 0.14].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.2), padMat);
      leg.position.set(lx, 0.39, 0);
      leg.castShadow = true;
      batsmanGroup.add(leg);
    });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.68, 0.26), kitMat);
    torso.position.set(0, 1.12, 0);
    torso.castShadow = true;
    batsmanGroup.add(torso);

    // Head & Helmet + Grille
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 16), skinMat);
    head.position.set(0, 1.65, 0);
    batsmanGroup.add(head);

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), helmetMat);
    helmet.position.set(0, 1.67, 0);
    batsmanGroup.add(helmet);

    // Articulated Bat Pivot (Shoulder/Hands hinge)
    const batPivot = new THREE.Group();
    batPivot.position.set(0.22, 1.28, -0.05);

    // Arms holding handle
    const armMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.48, 8), kitMat);
    armMesh.position.set(0, -0.2, -0.1);
    armMesh.rotation.x = 0.4;
    batPivot.add(armMesh);

    // Cricket Bat Handle
    const batHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.36, 8),
      new THREE.MeshLambertMaterial({ color: 0xf8fafc })
    );
    batHandle.position.set(0, -0.42, -0.18);
    batPivot.add(batHandle);

    // Cricket Bat Blade
    const activeBatSpec = BATS_CATALOG.find((b) => b.id === profileRef.current.selectedBat) || BATS_CATALOG[0];
    const batBladeMat = new THREE.MeshStandardMaterial({
      color: activeBatSpec.bladeColor,
      roughness: 0.45
    });
    const batBladeMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.68, 0.045), batBladeMat);
    batBladeMesh.position.set(0, -0.85, -0.18);
    batBladeMesh.castShadow = true;
    batPivot.add(batBladeMesh);

    // Initial ready stance angle
    batPivot.rotation.set(0.35, 0.15, -0.18);
    batsmanGroup.add(batPivot);
    scene.add(batsmanGroup);

    // --- ARTICULATED 3D BOWLER ---
    const bowlerGroup = new THREE.Group();
    bowlerGroup.position.set(0.35, 0, -13.5);
    const bowlerJerseyMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 }); // Red Rival Kit

    [-0.14, 0.14].forEach((lx) => {
      const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.78, 0.18), bowlerJerseyMat);
      bLeg.position.set(lx, 0.39, 0);
      bowlerGroup.add(bLeg);
    });
    const bTorso = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.68, 0.24), bowlerJerseyMat);
    bTorso.position.set(0, 1.12, 0);
    bowlerGroup.add(bTorso);
    const bHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), skinMat);
    bHead.position.set(0, 1.64, 0);
    bowlerGroup.add(bHead);

    const bowlerArmPivot = new THREE.Group();
    bowlerArmPivot.position.set(-0.26, 1.38, 0);
    const bArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.62, 8), skinMat);
    bArm.position.set(0, 0.3, 0);
    bowlerArmPivot.add(bArm);
    bowlerGroup.add(bowlerArmPivot);
    scene.add(bowlerGroup);

    // --- 9 AI FIELDERS IN RING & OUTFIELD ---
    const fielderCoords = [
      { x: -12, z: 3, name: 'Cover Point' },
      { x: -24, z: -14, name: 'Extra Cover' },
      { x: -16, z: -38, name: 'Long Off' },
      { x: 16, z: -38, name: 'Long On' },
      { x: 24, z: -10, name: 'Mid Wicket' },
      { x: 42, z: 4, name: 'Deep Square Leg' },
      { x: -42, z: -4, name: 'Deep Point' },
      { x: 10, z: 16, name: 'Fine Leg' },
      { x: -9, z: 15, name: 'Third Man' }
    ];
    const fielders = [];
    fielderCoords.forEach((fc) => {
      const fg = new THREE.Group();
      const fBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 1.35, 8), bowlerJerseyMat);
      fBody.position.y = 0.68;
      fBody.castShadow = true;
      fg.add(fBody);
      const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), skinMat);
      fHead.position.y = 1.5;
      fg.add(fHead);
      fg.position.set(fc.x, 0, fc.z);
      fg.userData = { homeX: fc.x, homeZ: fc.z, name: fc.name };
      scene.add(fg);
      fielders.push(fg);
    });

    // --- CRICKET BALL & RIBBON TRAIL ---
    const ballGeo = new THREE.SphereGeometry(0.11, 20, 20);
    const ballMat = new THREE.MeshStandardMaterial({
      color: theme.ballColor,
      roughness: 0.25,
      metalness: 0.1
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.castShadow = true;
    ballMesh.visible = false;
    scene.add(ballMesh);

    const maxTrailPts = 28;
    const trailPositions = new Float32Array(maxTrailPts * 3);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75 });
    const ballTrail = new THREE.Line(trailGeo, trailMat);
    ballTrail.frustumCulled = false;
    scene.add(ballTrail);

    // Save references
    Object.assign(engineRef.current, {
      scene,
      camera,
      renderer,
      ambientLight,
      sunLight,
      ballMesh,
      ballTrail,
      pitchMarker,
      timingRing,
      batsmanGroup,
      batPivot,
      batBladeMesh,
      bowlerGroup,
      bowlerArmPivot,
      stumpsBatter,
      bailsBatter,
      fielders
    });

    // Responsive Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !engineRef.current.renderer) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      engineRef.current.camera.aspect = w / h;
      engineRef.current.camera.updateProjectionMatrix();
      engineRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // --- MAIN 60FPS GAME & PHYSICS LOOP ---
    let animationFrameId;
    let lastTime = performance.now();

    const updateTrail = (pos) => {
      const arr = engineRef.current.trailPositions;
      arr.unshift(pos.clone());
      if (arr.length > maxTrailPts) arr.pop();
      const attr = trailGeo.attributes.position;
      for (let i = 0; i < maxTrailPts; i++) {
        const pt = arr[i] || pos;
        attr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      attr.needsUpdate = true;
    };

    const setCameraDefault = (dt) => {
      const preset = cameraPresetRef.current;
      let targetCamPos = new THREE.Vector3(0, 3.65, 14.6);
      let lookTarget = new THREE.Vector3(0, 1.0, -3.5);

      if (preset === 'PRO_CLOSE') {
        targetCamPos.set(-0.18, 2.35, 11.4);
        lookTarget.set(0, 1.1, -6.0);
      } else if (preset === 'HELICOPTER') {
        targetCamPos.set(0, 11.5, 21.0);
        lookTarget.set(0, 0.5, 0);
      } else if (screenRef.current === 'MENU') {
        // Cinematic stadium orbit in Menu
        const t = performance.now() * 0.00025;
        targetCamPos.set(Math.sin(t) * 26, 8.5, Math.cos(t) * 26);
        lookTarget.set(0, 1.2, 0);
      }

      camera.position.lerp(targetCamPos, Math.min(1, dt * 5));
      camera.lookAt(lookTarget);
    };

    const animate = (now) => {
      animationFrameId = requestAnimationFrame(animate);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const eng = engineRef.current;

      // Instant Action Replay Playback
      if (eng.isReplaying && eng.replayTrajectory.length > 0) {
        const frame = eng.replayTrajectory[Math.floor(eng.replayIndex)];
        if (frame) {
          eng.ballMesh.visible = true;
          eng.ballMesh.position.copy(frame.pos);
          updateTrail(frame.pos);
          const camOffset = new THREE.Vector3(frame.pos.x * 0.5 + 4, Math.max(2.5, frame.pos.y + 2), frame.pos.z + 9);
          camera.position.lerp(camOffset, 0.12);
          camera.lookAt(frame.pos);
        }
        eng.replayIndex += dt * 38; // Slow-mo replay
        if (eng.replayIndex >= eng.replayTrajectory.length) {
          eng.isReplaying = false;
        }
        renderer.render(scene, camera);
        return;
      }

      // Batsman Swing Animation Interpolation
      if (eng.swingAnimProgress > 0) {
        eng.swingAnimProgress = Math.max(0, eng.swingAnimProgress - dt * 2.8);
        const s = Math.sin((1 - eng.swingAnimProgress) * Math.PI);
        const dirX = eng.swingDirX;
        if (eng.swingStyle === 'DEFENSE') {
          eng.batPivot.rotation.x = 0.35 - s * 0.55;
          eng.batPivot.rotation.y = dirX * 0.3;
        } else if (eng.swingStyle === 'LOFT') {
          eng.batPivot.rotation.x = 0.35 - s * 2.25;
          eng.batPivot.rotation.y = -dirX * 0.85;
          eng.batPivot.rotation.z = -0.18 + dirX * s * 0.65;
        } else {
          // Ground Drive / Pull
          eng.batPivot.rotation.x = 0.35 - s * 1.65;
          eng.batPivot.rotation.y = -dirX * 0.75;
          eng.batPivot.rotation.z = -0.18 + dirX * s * 0.45;
        }
      } else {
        // Gentle idle breathing backlift
        const idleWave = Math.sin(now * 0.004) * 0.06;
        eng.batPivot.rotation.set(0.35 + idleWave, 0.12, -0.18);
      }

      // Phase State Machine
      if (eng.phase === 'IDLE') {
        setCameraDefault(dt);
      } else if (eng.phase === 'RUNUP') {
        setCameraDefault(dt);
        eng.phaseTimer += dt;
        // Bowler runs from z = -14.0 to z = -8.0 over 1.15 seconds
        const runProgress = Math.min(1, eng.phaseTimer / 1.15);
        eng.bowlerGroup.position.z = -14.0 + runProgress * 6.0;
        eng.bowlerGroup.position.y = Math.abs(Math.sin(runProgress * Math.PI * 6)) * 0.14;
        // Windmill bowling arm rotation in final 0.35s
        if (runProgress > 0.65) {
          const armProg = (runProgress - 0.65) / 0.35;
          eng.bowlerArmPivot.rotation.x = -armProg * Math.PI * 2;
        } else {
          eng.bowlerArmPivot.rotation.x = 0;
        }

        // Release the ball at crease!
        if (runProgress >= 1) {
          eng.phase = 'BOWLED';
          eng.phaseTimer = 0;
          eng.hasBounced = false;
          eng.ballMesh.visible = true;
          eng.trailPositions = [];
          eng.replayTrajectory = [];

          const deliv = eng.currentDelivery;
          // Release point from bowler's hand
          eng.ballPos.set(0.28, 2.08, -7.8);

          // Calculate velocity to hit exact bounceZ marker
          const speedMps = (deliv.actualSpeedKmh / 3.6) * 0.72; // Scaled for enjoyable browser reaction time
          const distZToBounce = deliv.bounceZ - (-7.8);
          const timeToBounce = distZToBounce / speedMps;
          const gravity = 9.8;
          // y(t) = y0 + vy*t - 0.5*g*t^2 = 0.11 at t = timeToBounce
          const vy = (0.11 - 2.08 + 0.5 * gravity * timeToBounce * timeToBounce) / timeToBounce;
          const vx = (deliv.targetLineX - 0.28) / timeToBounce;

          eng.ballVel.set(vx, vy, speedMps);

          // Show Pitching Marker on turf
          eng.pitchMarker.position.set(deliv.targetLineX, 0.04, deliv.bounceZ);
          eng.pitchMarker.material.color.set(deliv.color);
          eng.pitchMarker.visible = true;
        }
      } else if (eng.phase === 'BOWLED') {
        setCameraDefault(dt);
        const deliv = eng.currentDelivery;
        const gravity = 9.8;

        // Apply air swing before bounce
        if (!eng.hasBounced) {
          eng.ballVel.x += deliv.swingX * dt * 2.2;
        }

        eng.ballVel.y -= gravity * dt;
        eng.ballPos.addScaledVector(eng.ballVel, dt);

        // Check turf bounce
        if (eng.ballPos.y <= 0.11 && eng.ballVel.y < 0) {
          eng.ballPos.y = 0.11;
          eng.ballVel.y = Math.abs(eng.ballVel.y) * deliv.bounceFactor;
          if (!eng.hasBounced) {
            eng.hasBounced = true;
            // Apply spin / seam movement off the pitch
            eng.ballVel.x += deliv.seamDeviation * 4.2;
            soundFX.playBallBounce();
          }
        }

        eng.ballMesh.position.copy(eng.ballPos);
        eng.ballMesh.rotation.x += 18 * dt;
        updateTrail(eng.ballPos);
        eng.replayTrajectory.push({ pos: eng.ballPos.clone() });

        // Update dynamic Timing Ring scale around batter crease (z = 7.65)
        const distToBatter = Math.abs(7.65 - eng.ballPos.z);
        const ringScale = Math.max(0.35, Math.min(1.6, distToBatter / 5.5));
        eng.timingRing.scale.set(ringScale, ringScale, 1);
        if (distToBatter < 1.1) {
          eng.timingRing.material.color.setHex(0x10b981); // Sweet-spot green
        } else if (distToBatter < 2.4) {
          eng.timingRing.material.color.setHex(0xfacc15); // Good yellow
        } else {
          eng.timingRing.material.color.setHex(0x38bdf8);
        }

        // Check if ball hits Batter Stumps (z >= 8.95, |x| <= 0.22, y <= 0.82)
        if (eng.ballPos.z >= 8.92 && eng.ballPos.z <= 9.35) {
          if (Math.abs(eng.ballPos.x) <= 0.23 && eng.ballPos.y <= 0.83) {
            triggerBowledWicket();
            return;
          }
        }

        // Ball passed safely to Wicketkeeper (Dot Ball / Missed)
        if (eng.ballPos.z > 11.2) {
          completeDeliveryOutcome(0, false, eng.hasSwung ? 'MISSED' : 'DOT BALL', 'Through to the keeper — 0 Runs');
        }
      } else if (eng.phase === 'HIT_FLIGHT') {
        const gravity = 9.8;
        eng.ballVel.y -= gravity * dt;
        // Air drag and grass friction
        if (eng.ballPos.y <= 0.12) {
          eng.ballPos.y = 0.11;
          if (eng.ballVel.y < 0) {
            eng.ballVel.y = -eng.ballVel.y * 0.42;
            if (eng.ballVel.y > 0.8) soundFX.playBallBounce();
          }
          // Outfield grass rolling friction
          eng.ballVel.x *= (1 - 1.35 * dt);
          eng.ballVel.z *= (1 - 1.35 * dt);
        }

        eng.ballPos.addScaledVector(eng.ballVel, dt);
        eng.ballMesh.position.copy(eng.ballPos);
        updateTrail(eng.ballPos);
        eng.replayTrajectory.push({ pos: eng.ballPos.clone() });

        // Move nearest AI fielders toward the ball
        let interceptedByFielder = null;
        eng.fielders.forEach((f) => {
          const dx = eng.ballPos.x - f.position.x;
          const dz = eng.ballPos.z - f.position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 28) {
            const runSpeed = 6.8 * dt;
            f.position.x += (dx / (dist || 1)) * runSpeed;
            f.position.z += (dz / (dist || 1)) * runSpeed;
          }
          if (dist < 1.35 && eng.ballPos.y < 2.3) {
            interceptedByFielder = f;
          }
        });

        // Dynamic Broadcast Action Camera tracking ball flight
        const camTarget = new THREE.Vector3(
          eng.ballPos.x * 0.42,
          Math.max(3.5, eng.ballPos.y * 0.55 + 3.2),
          Math.min(18, Math.max(-18, eng.ballPos.z + 14))
        );
        camera.position.lerp(camTarget, Math.min(1, dt * 4.5));
        camera.lookAt(eng.ballPos);

        const radialDist = Math.hypot(eng.ballPos.x, eng.ballPos.z);
        const speedTotal = eng.ballVel.length();

        // 1. Check if caught on the full by an outfielder
        if (interceptedByFielder && !eng.hitBouncedInOutfield && eng.ballPos.y > 0.22) {
          soundFX.playCrowdRoar(0.8, 1.4);
          completeDeliveryOutcome(
            0,
            true,
            'CAUGHT OUT!',
            `Caught by ${interceptedByFielder.userData.name} in the deep!`
          );
          return;
        }

        if (eng.ballPos.y <= 0.14) {
          eng.hitBouncedInOutfield = true;
        }

        // 2. Check Boundary Rope (Radius >= 64m)
        if (radialDist >= 64.0) {
          if (!eng.hitBouncedInOutfield) {
            soundFX.playCrowdRoar(1.4, 2.4);
            completeDeliveryOutcome(6, false, 'MAXIMUM SIX!', `${Math.round(radialDist + 18)}m Monster Hit into the Stands!`);
          } else {
            soundFX.playCrowdRoar(1.1, 1.8);
            completeDeliveryOutcome(4, false, 'FOUR RUNS!', 'Cracking shot races across the boundary rope!');
          }
          return;
        }

        // 3. Check Fielder Ground Stop or Ball Stopped in Outfield
        if (interceptedByFielder || speedTotal < 1.6 || eng.phaseTimer > 4.5) {
          let runsAwarded = 0;
          if (radialDist > 44) runsAwarded = 3;
          else if (radialDist > 25) runsAwarded = 2;
          else if (radialDist > 9.5) runsAwarded = 1;
          else runsAwarded = 0;

          const msg =
            runsAwarded === 0
              ? `Fielded cleanly by ${interceptedByFielder ? interceptedByFielder.userData.name : 'the bowler'}`
              : `Quick running between the wickets — ${runsAwarded} ${runsAwarded === 1 ? 'Run' : 'Runs'}!`;
          completeDeliveryOutcome(
            runsAwarded,
            false,
            runsAwarded > 0 ? `${runsAwarded} ${runsAwarded === 1 ? 'RUN' : 'RUNS'}` : 'DOT BALL',
            msg
          );
          return;
        }

        eng.phaseTimer += dt;
      } else if (eng.phase === 'WICKET_ANIM') {
        eng.phaseTimer += dt;
        // Animate flying stumps and bails
        eng.stumpsBatter.forEach((s) => {
          s.position.addScaledVector(s.userData.vel, dt);
          s.rotation.x += s.userData.rotVel.x * dt;
          s.rotation.z += s.userData.rotVel.z * dt;
        });
        eng.bailsBatter.forEach((b) => {
          b.userData.vel.y -= 9.8 * dt;
          b.position.addScaledVector(b.userData.vel, dt);
          b.rotation.x += b.userData.rotVel.x * dt;
          b.rotation.y += b.userData.rotVel.y * dt;
        });

        if (eng.phaseTimer > 1.8) {
          completeDeliveryOutcome(0, true, 'BOWLED HIM!', 'Timber! The stumps go cartwheeling!');
        }
      }

      renderer.render(scene, camera);
    };

    // Helper when stumps are shattered
    const triggerBowledWicket = () => {
      const eng = engineRef.current;
      eng.phase = 'WICKET_ANIM';
      eng.phaseTimer = 0;
      soundFX.playStumpHit();
      soundFX.playCrowdRoar(0.9, 1.5);

      eng.stumpsBatter.forEach((s, idx) => {
        s.userData.vel.set((idx - 1) * 1.8 + (Math.random() - 0.5), 2.2, 4.5 + Math.random() * 2);
        s.userData.rotVel.set(8 + Math.random() * 6, 0, (idx - 1) * 6);
      });
      eng.bailsBatter.forEach((b, idx) => {
        b.userData.vel.set((idx === 0 ? -2.2 : 2.2), 4.8, 5.5);
        b.userData.rotVel.set(14, 12, 9);
      });
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // ============================================================================
  // 6. DYNAMIC STADIUM THEME & BAT SKIN UPDATER
  // ============================================================================
  useEffect(() => {
    const eng = engineRef.current;
    if (!eng.scene) return;
    const theme = STADIUM_THEMES[profile.selectedTheme] || STADIUM_THEMES.day;
    eng.scene.fog = new THREE.FogExp2(theme.skyBottom, 0.0045);
    if (eng.ambientLight) {
      eng.ambientLight.color.setHex(theme.ambientColor);
      eng.ambientLight.intensity = theme.ambientIntensity;
    }
    if (eng.sunLight) {
      eng.sunLight.color.setHex(theme.sunColor);
      eng.sunLight.intensity = theme.sunIntensity;
    }
    if (eng.ballMesh) {
      eng.ballMesh.material.color.setHex(theme.ballColor);
    }
    const batSpec = BATS_CATALOG.find((b) => b.id === profile.selectedBat) || BATS_CATALOG[0];
    if (eng.batBladeMesh) {
      eng.batBladeMesh.material.color.set(batSpec.bladeColor);
    }
  }, [profile.selectedTheme, profile.selectedBat]);

  // ============================================================================
  // 7. MATCH FLOW, BOWLING AI & BATTING SHOT EXECUTION
  // ============================================================================
  const resetFieldPositions = useCallback(() => {
    const eng = engineRef.current;
    if (!eng.stumpsBatter) return;
    eng.stumpsBatter.forEach((s) => {
      s.position.copy(s.userData.homePos);
      s.rotation.set(0, 0, 0);
      s.userData.vel.set(0, 0, 0);
    });
    eng.bailsBatter.forEach((b) => {
      b.position.copy(b.userData.homePos);
      b.rotation.set(0, 0, Math.PI / 2);
      b.userData.vel.set(0, 0, 0);
    });
    eng.fielders.forEach((f) => {
      f.position.set(f.userData.homeX, 0, f.userData.homeZ);
    });
    eng.bowlerGroup.position.set(0.35, 0, -14.0);
    eng.pitchMarker.visible = false;
    eng.ballMesh.visible = false;
    eng.timingRing.scale.set(1, 1, 1);
    eng.timingRing.material.color.setHex(0x38bdf8);
  }, []);

  const triggerNextDelivery = useCallback(() => {
    const eng = engineRef.current;
    if (screenRef.current !== 'PLAYING') return;
    if (eng.phase !== 'IDLE' && eng.phase !== 'RESETTING') return;

    resetFieldPositions();

    // Progressive AI Difficulty based on balls bowled
    const balls = matchStateRef.current.ballsBowled;
    const diffMultiplier = 1 + Math.min(0.22, balls * 0.008);

    const template = BOWLING_VARIATIONS[Math.floor(Math.random() * BOWLING_VARIATIONS.length)];
    const rawSpeed =
      template.speedKmh[0] + Math.random() * (template.speedKmh[1] - template.speedKmh[0]);
    const actualSpeedKmh = Math.round(rawSpeed * diffMultiplier);

    // Randomize line around off/middle/leg stump (-0.42 to +0.35)
    const targetLineX = (Math.random() - 0.52) * 0.72;

    eng.currentDelivery = {
      ...template,
      actualSpeedKmh,
      targetLineX
    };
    eng.hasSwung = false;
    eng.isReplaying = false;
    eng.phase = 'RUNUP';
    eng.phaseTimer = 0;

    setMatchState((prev) => ({
      ...prev,
      deliverySpeed: actualSpeedKmh,
      deliveryName: template.name,
      deliveryType: template.type,
      isBallActive: true,
      lastTimingBadge: null
    }));
  }, [resetFieldPositions]);

  // Complete a delivery, update scoreboard, check achievements & match end
  const completeDeliveryOutcome = (runs, isWicket, headline, subtitle) => {
    const eng = engineRef.current;
    eng.phase = 'RESETTING';

    setMatchState((prev) => {
      // In Six Hitting Challenge mode, 6s grant a +4 bonus points multiplier
      const effectiveRuns =
        selectedMode.onlySixesCountBonus && runs === 6 ? 10 : runs;

      const newRuns = prev.runs + effectiveRuns;
      const newWickets = prev.wickets + (isWicket ? 1 : 0);
      const newBalls = prev.ballsBowled + 1;
      const newSixes = prev.sixesCount + (runs === 6 ? 1 : 0);
      const newFours = prev.foursCount + (runs === 4 ? 1 : 0);
      const newStreak = runs >= 4 ? prev.streakBoundaries + 1 : 0;

      const ballBadge = isWicket ? 'W' : String(runs);
      const nextOverArr = newBalls % 6 === 1 ? [ballBadge] : [...prev.thisOver, ballBadge];

      // Check Achievements
      if (runs === 6) unlockAchievement('first_six');
      if (newStreak >= 3) unlockAchievement('hattrick_4s');
      if (newRuns >= 50) unlockAchievement('fifty_club');

      // Award Coins & XP for runs
      if (runs > 0) {
        const coinGain = runs === 6 ? 15 : runs === 4 ? 8 : runs * 2;
        setProfile((p) => ({
          ...p,
          coins: p.coins + coinGain,
          xp: p.xp + runs * 10,
          totalRuns: p.totalRuns + runs,
          totalSixes: p.totalSixes + (runs === 6 ? 1 : 0)
        }));
      }

      // Check Match End Conditions
      const chasedTarget = prev.target !== null && newRuns >= prev.target;
      const allOut = newWickets >= prev.maxWickets;
      const oversFinished = newBalls >= prev.totalBalls;

      if (chasedTarget || allOut || oversFinished) {
        setTimeout(() => {
          platformSDK.submitScore(selectedMode.id, newRuns);
          setProfile((p) => {
            const prevBest = p.highScores[selectedMode.id] || 0;
            const nextStage =
              selectedMode.isTournament && chasedTarget
                ? Math.min(2, p.tournamentStage + 1)
                : p.tournamentStage;
            if (selectedMode.isTournament && chasedTarget && p.tournamentStage === 2) {
              unlockAchievement('tournament_champ');
            }
            return {
              ...p,
              tournamentStage: nextStage,
              highScores: {
                ...p.highScores,
                [selectedMode.id]: Math.max(prevBest, newRuns)
              }
            };
          });
          setScreen('GAMEOVER');
          eng.phase = 'IDLE';
        }, 1600);
      } else {
        setTimeout(() => {
          eng.phase = 'IDLE';
          triggerNextDelivery();
        }, 1900);
      }

      return {
        ...prev,
        runs: newRuns,
        wickets: newWickets,
        ballsBowled: newBalls,
        sixesCount: newSixes,
        foursCount: newFours,
        streakBoundaries: newStreak,
        thisOver: nextOverArr,
        lastOutcomeText: headline,
        lastOutcomeSub: subtitle,
        isBallActive: false,
        canReplay: runs >= 4 || isWicket
      };
    });
  };

  // Core Batting Swing Execution & Timing Calculation
  const executeBatSwing = useCallback((overrideDirX = null, overrideStyle = null) => {
    const eng = engineRef.current;
    if (eng.phase !== 'BOWLED' || eng.hasSwung) return;

    const chosenStyle = overrideStyle || shotTypeRef.current;
    const chosenDirX = overrideDirX !== null ? overrideDirX : aimDirRef.current.x;

    eng.hasSwung = true;
    eng.swingAnimProgress = 1.0;
    eng.swingStyle = chosenStyle;
    eng.swingDirX = chosenDirX;

    // Ideal contact zone is around z = 7.45 in front of popping crease
    const ballZ = eng.ballPos.z;
    const deltaZ = 7.45 - ballZ; // Positive = swung early, Negative = swung late

    const activeBat = BATS_CATALOG.find((b) => b.id === profileRef.current.selectedBat) || BATS_CATALOG[0];
    const windowMult = activeBat.timingWindowBonus;

    const absDelta = Math.abs(deltaZ);
    let timingGrade = 'MISSED';

    if (absDelta <= 0.72 * windowMult) {
      timingGrade = 'PERFECT';
    } else if (absDelta <= 1.55 * windowMult) {
      timingGrade = 'GOOD';
    } else if (absDelta <= 2.55 * windowMult) {
      timingGrade = deltaZ > 0 ? 'EARLY' : 'LATE';
    } else {
      timingGrade = 'MISSED';
    }

    // Check line compatibility (Ensure ball isn't wildly out of reach)
    if (Math.abs(eng.ballPos.x) > 1.35) {
      timingGrade = 'MISSED';
    }

    setMatchState((prev) => {
      const nextPerfect = timingGrade === 'PERFECT' ? prev.perfectCount + 1 : prev.perfectCount;
      if (nextPerfect >= 3) unlockAchievement('perfect_3');
      return {
        ...prev,
        perfectCount: nextPerfect,
        lastTimingBadge: timingGrade
      };
    });

    if (timingGrade === 'MISSED') {
      // Play whoosh sound (low bat hit) and let ball continue toward stumps/keeper
      soundFX.playBallBounce();
      return;
    }

    // Transition Ball into Hit Flight Physics!
    eng.phase = 'HIT_FLIGHT';
    eng.phaseTimer = 0;
    eng.hitBouncedInOutfield = false;
    eng.pitchMarker.visible = false;

    const batPower = activeBat.powerBoost;
    let exitSpeed = 22;
    let elevationDeg = 10;

    if (chosenStyle === 'DEFENSE') {
      exitSpeed = 7.5;
      elevationDeg = 3;
      soundFX.playBatHit(0.45, false);
    } else if (chosenStyle === 'LOFT') {
      if (timingGrade === 'PERFECT') {
        exitSpeed = 35.5 * batPower;
        elevationDeg = 34; // Clears the 64m rope for a 6!
        soundFX.playBatHit(1.0, true);
      } else if (timingGrade === 'GOOD') {
        exitSpeed = 29.5 * batPower;
        elevationDeg = 28;
        soundFX.playBatHit(0.85, false);
      } else {
        // Early or Late lofted shot skies up into the air (catch risk!)
        exitSpeed = 20.5;
        elevationDeg = 52;
        soundFX.playBatHit(0.6, false);
      }
    } else {
      // GROUND SHOT
      if (timingGrade === 'PERFECT') {
        exitSpeed = 32.5 * batPower;
        elevationDeg = 9; // Rockets along the turf for 4!
        soundFX.playBatHit(0.95, true);
      } else if (timingGrade === 'GOOD') {
        exitSpeed = 24.5 * batPower;
        elevationDeg = 7;
        soundFX.playBatHit(0.78, false);
      } else {
        exitSpeed = 15.5;
        elevationDeg = 12;
        soundFX.playBatHit(0.55, false);
      }
    }

    // Calculate horizontal shot azimuth from chosenDirX + timing offset
    //Timing offset pulls early shots slightly leg-side (+x) and late shots off-side (-x)
    const timingAngleOffset = deltaZ * 0.18;
    const shotAzimuth = chosenDirX * 0.95 + timingAngleOffset;
    const elevRad = THREE.MathUtils.degToRad(elevationDeg);

    const horizSpeed = exitSpeed * Math.cos(elevRad);
    const vy = exitSpeed * Math.sin(elevRad);
    const vx = Math.sin(shotAzimuth) * horizSpeed;
    const vz = -Math.cos(shotAzimuth) * horizSpeed; // Negative Z is back toward bowler/outfield

    eng.ballPos.z = Math.min(7.7, eng.ballPos.z);
    eng.ballPos.y = Math.max(0.35, eng.ballPos.y);
    eng.ballVel.set(vx, vy, vz);
  }, [unlockAchievement]);

  // ============================================================================
  // 8. KEYBOARD & TOUCH SWIPE CONTROLS
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (screen !== 'PLAYING' || activeModal) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        setAimDirection({ x: -0.78, label: 'OFF-SIDE COVER DRIVE' });
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        setAimDirection({ x: 0.78, label: 'LEG-SIDE PULL / FLICK' });
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        setAimDirection({ x: 0, label: 'STRAIGHT DRIVE' });
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        setAimDirection({ x: -1.15, label: 'LATE CUT / GLANCE' });
      } else if (e.code === 'Space') {
        e.preventDefault();
        executeBatSwing(null, shotTypeRef.current);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyZ') {
        setShotType('LOFT');
        executeBatSwing(null, 'LOFT');
      } else if (e.code === 'KeyX' || e.code === 'KeyC') {
        setShotType('DEFENSE');
        executeBatSwing(null, 'DEFENSE');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, activeModal, executeBatSwing]);

  // Canvas Touch / Mouse Swipe Handler
  const handleCanvasPointerDown = (e) => {
    if (screen !== 'PLAYING') return;
    soundFX.init();
    engineRef.current.pointerDownPos = { x: e.clientX, y: e.clientY };
  };

  const handleCanvasPointerUp = (e) => {
    if (screen !== 'PLAYING' || !engineRef.current.pointerDownPos) return;
    const start = engineRef.current.pointerDownPos;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);
    engineRef.current.pointerDownPos = null;

    let dirX = aimDirRef.current.x;
    if (dist > 18) {
      // Map horizontal swipe to batting shot angle (-1.1 to +1.1)
      dirX = Math.max(-1.1, Math.min(1.1, dx / 110));
      const label =
        dirX < -0.35
          ? 'OFF-SIDE COVER DRIVE'
          : dirX > 0.35
          ? 'LEG-SIDE PULL SHOT'
          : 'STRAIGHT DRIVE';
      setAimDirection({ x: dirX, label });
    }

    executeBatSwing(dirX, shotTypeRef.current);
  };

  // Start a Selected Game Mode
  const startMatch = (modeObj) => {
    soundFX.init();
    setSelectedMode(modeObj);

    let customTarget = modeObj.target;
    let roundLabel = '';
    if (modeObj.isTournament) {
      const stage = profile.tournamentStage || 0;
      const stages = [
        { name: 'QUARTERFINAL', target: 24 },
        { name: 'SEMIFINAL', target: 36 },
        { name: 'GRAND FINAL', target: 48 }
      ];
      customTarget = stages[stage].target;
      roundLabel = stages[stage].name;
    }

    const initialState = {
      runs: 0,
      wickets: 0,
      maxWickets: modeObj.wickets,
      ballsBowled: 0,
      totalBalls: modeObj.overs * 6,
      sixesCount: 0,
      foursCount: 0,
      streakBoundaries: 0,
      perfectCount: 0,
      target: customTarget,
      thisOver: [],
      lastOutcomeText: modeObj.isTournament ? `${roundLabel}: CHASE ${customTarget}` : 'BATSMAN READY',
      lastOutcomeSub: 'Watch the green bounce marker and time your shot!',
      lastTimingBadge: null,
      deliverySpeed: 0,
      deliveryName: 'Bowler running in...',
      deliveryType: 'FAST',
      isBallActive: false,
      canReplay: false,
      tournamentRoundName: roundLabel
    };

    setMatchState(initialState);
    matchStateRef.current = initialState;
    setScreen('PLAYING');
    screenRef.current = 'PLAYING';
    engineRef.current.phase = 'IDLE';

    setTimeout(() => {
      triggerNextDelivery();
    }, 650);
  };

  // Trigger Instant Action Replay
  const triggerActionReplay = () => {
    const eng = engineRef.current;
    if (!eng.replayTrajectory || eng.replayTrajectory.length === 0) return;
    eng.isReplaying = true;
    eng.replayIndex = 0;
  };

  // Format Overs (e.g. 8 balls -> "1.2")
  const formatOvers = (balls) => {
    const completedOvers = Math.floor(balls / 6);
    const remBalls = balls % 6;
    return `${completedOvers}.${remBalls}`;
  };

  const currentThemeObj = STADIUM_THEMES[profile.selectedTheme] || STADIUM_THEMES.day;

  // ============================================================================
  // 9. RENDER UI & OVERLAYS
  // ============================================================================
  return (
    <div
      className="relative w-full h-screen overflow-hidden select-none font-sans text-white"
      style={{
        background: `linear-gradient(to bottom, ${currentThemeObj.skyTop}, ${currentThemeObj.skyBottom})`
      }}
    >
      {/* 3D WebGL Stadium Canvas */}
      <div
        ref={mountRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {/* TOP STUDIO NAVIGATION BAR */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-2.5 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 font-black text-slate-950 text-sm tracking-tighter">
            GXA
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                GXA CRICKET <span className="text-emerald-400">CHALLENGE</span>
              </h1>
              <span className="hidden md:inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                3D Pro Edition
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              GXA Games Studio • Commercial HTML5 WebGL Engine
            </p>
          </div>
        </div>

        {/* Player Coins, Theme Switcher, Garage, Docs & Audio Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Coins Pill */}
          <button
            onClick={() => setActiveModal('GARAGE')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/30 hover:bg-amber-500/25 transition text-xs font-bold text-amber-300"
            title="Unlock Pro Cricket Bats"
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{profile.coins}</span>
          </button>

          {/* Quick Day/Dusk/Night Lighting Switcher */}
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-white/10">
            {[
              { id: 'day', icon: Sun, label: 'Day' },
              { id: 'dusk', icon: Sunset, label: 'Dusk' },
              { id: 'night', icon: Moon, label: 'Night' }
            ].map((t) => {
              const IconComp = t.icon;
              const active = profile.selectedTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setProfile((p) => ({ ...p, selectedTheme: t.id }))}
                  className={`p-1.5 rounded-md transition ${
                    active ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                  }`}
                  title={`${t.label} Stadium Lighting`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Camera Angle Toggle */}
          {screen === 'PLAYING' && (
            <button
              onClick={() => {
                const order = ['BROADCAST', 'PRO_CLOSE', 'HELICOPTER'];
                const next = order[(order.indexOf(cameraPreset) + 1) % order.length];
                setCameraPreset(next);
              }}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200"
              title="Switch Camera Angle"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>{cameraPreset === 'BROADCAST' ? 'TV Cam' : cameraPreset === 'PRO_CLOSE' ? 'Pro Cam' : 'Aerial'}</span>
            </button>
          )}

          {/* Bat Shop / Locker */}
          <button
            onClick={() => setActiveModal('GARAGE')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-xs font-semibold text-slate-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Bat Armory</span>
          </button>

          {/* Achievements */}
          <button
            onClick={() => setActiveModal('ACHIEVEMENTS')}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-200"
            title="Achievements & Milestones"
          >
            <Award className="w-4 h-4 text-amber-400" />
          </button>

          {/* Studio Documentation & QA Hub */}
          <button
            onClick={() => setActiveModal('DOCS')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-xs font-semibold text-sky-300"
            title="Controls, Architecture & Platform Docs"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Docs & QA</span>
          </button>

          {/* Mute Toggle */}
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-slate-200"
            title={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {screen === 'PLAYING' && (
            <button
              onClick={() => {
                engineRef.current.phase = 'IDLE';
                setScreen('MENU');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-bold text-rose-300"
            >
              Menu
            </button>
          )}
        </div>
      </header>

      {/* TOAST NOTIFICATION BANNER */}
      {toastNotification && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-amber-400/50 shadow-2xl animate-bounce">
          <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div className="text-xs font-extrabold text-amber-300">{toastNotification.title}</div>
            <div className="text-[11px] text-slate-300">{toastNotification.subtitle}</div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 1: MAIN STADIUM LOBBY & MODE SELECTOR                         */}
      {/* ==================================================================== */}
      {screen === 'MENU' && (
        <div className="relative z-10 flex flex-col justify-between h-[calc(100vh-54px)] p-4 sm:p-6 overflow-y-auto">
          {/* Hero Centerpiece */}
          <div className="max-w-5xl mx-auto w-full my-auto space-y-5">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/75 border border-emerald-500/40 text-emerald-300 text-xs font-bold shadow-lg">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>GXA GAMES STUDIO • COMMERCIAL 3D STADIUM EDITION</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
                STEP ONTO THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300">PITCH</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto drop-shadow">
                Read the bowler’s speed, line, and bounce marker. Swipe or time your directional drive for massive sixes into the upper tier!
              </p>
            </div>

            {/* Player Career Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-3xl mx-auto">
              <div className="bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Career Runs</div>
                <div className="text-xl font-black text-emerald-400">{profile.totalRuns}</div>
              </div>
              <div className="bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Towering Sixes</div>
                <div className="text-xl font-black text-amber-400">{profile.totalSixes}</div>
              </div>
              <div className="bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Equipped Bat</div>
                <div className="text-xs font-bold text-sky-300 truncate mt-1">
                  {(BATS_CATALOG.find((b) => b.id === profile.selectedBat) || BATS_CATALOG[0]).name}
                </div>
              </div>
              <div className="bg-slate-950/75 backdrop-blur-md border border-white/10 rounded-xl p-3 text-center">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">World Cup Stage</div>
                <div className="text-xs font-bold text-purple-300 mt-1">
                  {profile.tournamentStage === 0 ? 'Quarterfinal' : profile.tournamentStage === 1 ? 'Semifinal' : 'Grand Final'}
                </div>
              </div>
            </div>

            {/* 6 Playable Game Modes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {GAME_MODES.map((mode) => {
                const best = profile.highScores[mode.id] || 0;
                return (
                  <button
                    key={mode.id}
                    onClick={() => startMatch(mode)}
                    className="group relative text-left rounded-2xl p-4 bg-slate-950/80 hover:bg-slate-900/95 backdrop-blur-md border border-white/15 hover:border-emerald-400/60 transition-all duration-200 shadow-xl flex flex-col justify-between overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl text-[10px] font-black text-white bg-gradient-to-r ${mode.color}`}>
                      {mode.badge}
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-white group-hover:text-emerald-300 transition pr-14">
                        {mode.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">{mode.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/10">
                      <span className="text-[11px] font-semibold text-slate-400">
                        Best Score: <strong className="text-amber-300">{best}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-400 group-hover:translate-x-1 transition-transform">
                        PLAY NOW <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls Summary Footer */}
          <div className="max-w-4xl mx-auto w-full bg-slate-950/80 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span><strong>Mobile / Mouse:</strong> Swipe stadium in shot direction or tap Left / Straight / Right buttons</span>
            </div>
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-sky-400" />
              <span><strong>Keyboard:</strong> Arrows / WASD to Aim • <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Space</kbd> Ground • <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Shift</kbd> Loft 6</span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 2: IN-GAME LIVE BROADCAST SCOREBOARD & BATTING CONTROLS HUD   */}
      {/* ==================================================================== */}
      {screen === 'PLAYING' && (
        <div className="relative z-10 pointer-events-none flex flex-col justify-between h-[calc(100vh-54px)] p-2.5 sm:p-5">
          {/* TOP ROW: TV Broadcast Scorebug + Bowler Speedometer */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            {/* Broadcast Scoreboard Card */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl px-4 py-2.5 shadow-2xl min-w-[260px] sm:min-w-[320px]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    {selectedMode.title} {matchState.tournamentRoundName && `• ${matchState.tournamentRoundName}`}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                      {matchState.runs}/{matchState.wickets}
                    </span>
                    <span className="text-xs font-bold text-slate-300">
                      ({formatOvers(matchState.ballsBowled)} / {selectedMode.overs === 99 ? '∞' : `${selectedMode.overs}.0`} Ov)
                    </span>
                  </div>
                </div>

                {/* Target or Boundaries Pill */}
                {matchState.target ? (
                  <div className="text-right bg-rose-500/20 border border-rose-400/30 rounded-xl px-2.5 py-1">
                    <div className="text-[10px] font-bold text-rose-300 uppercase">Target: {matchState.target}</div>
                    <div className="text-xs font-extrabold text-white">
                      Need {Math.max(0, matchState.target - matchState.runs)} in {Math.max(0, matchState.totalBalls - matchState.ballsBowled)}b
                    </div>
                  </div>
                ) : (
                  <div className="text-right bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1">
                    <div className="text-[10px] text-slate-400 font-semibold">4s / 6s</div>
                    <div className="text-xs font-black text-amber-400">
                      {matchState.foursCount} / {matchState.sixesCount}
                    </div>
                  </div>
                )}
              </div>

              {/* This Over Ball-by-Ball Bubbles */}
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">THIS OVER:</span>
                {matchState.thisOver.length === 0 && (
                  <span className="text-[11px] text-slate-500 italic">New over starting...</span>
                )}
                {matchState.thisOver.map((b, idx) => (
                  <span
                    key={idx}
                    className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                      b === '6'
                        ? 'bg-amber-400 text-slate-950'
                        : b === '4'
                        ? 'bg-emerald-500 text-slate-950'
                        : b === 'W'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-800 text-slate-200 border border-white/15'
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Bowler Speedometer & Delivery Telemetry */}
            <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-3">
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    {matchState.deliveryType}
                  </span>
                  <span className="text-xs font-bold text-white">{matchState.deliveryName}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Watch the colored pitch ring for length
                </div>
              </div>
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl px-2.5 py-1 text-center min-w-[68px]">
                <div className="text-lg font-black text-emerald-400 leading-none">
                  {matchState.deliverySpeed || '--'}
                </div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">KM/H</div>
              </div>
            </div>
          </div>

          {/* CENTER JUMBOTRON: Shot Outcome Popup & Timing Meter Badge */}
          <div className="my-auto flex flex-col items-center text-center pointer-events-none">
            {matchState.lastTimingBadge && (
              <div
                className={`mb-2 px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase shadow-lg border ${
                  matchState.lastTimingBadge === 'PERFECT'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-200 scale-110'
                    : matchState.lastTimingBadge === 'GOOD'
                    ? 'bg-sky-500 text-slate-950 border-sky-200'
                    : matchState.lastTimingBadge === 'MISSED'
                    ? 'bg-rose-600/90 text-white border-rose-300'
                    : 'bg-amber-500 text-slate-950 border-amber-200'
                }`}
              >
                TIMING: {matchState.lastTimingBadge}
              </div>
            )}

            {!matchState.isBallActive && (
              <div className="bg-slate-950/80 backdrop-blur-md border border-white/15 px-6 py-3 rounded-2xl shadow-2xl max-w-md">
                <div className="text-2xl sm:text-3xl font-black tracking-tight text-amber-300 drop-shadow">
                  {matchState.lastOutcomeText}
                </div>
                <div className="text-xs text-slate-200 mt-0.5">{matchState.lastOutcomeSub}</div>

                {matchState.canReplay && (
                  <button
                    onClick={triggerActionReplay}
                    className="pointer-events-auto mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-bold transition"
                  >
                    <Video className="w-3.5 h-3.5" /> Instant Action Replay
                  </button>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM ROW: Shot Type Selector + Arcade Direction Tap & Swipe Deck */}
          <div className="pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-2xl p-2.5 sm:px-4 shadow-2xl max-w-4xl w-full mx-auto">
            {/* Shot Posture Selector (Ground / Loft / Defense) */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
              {[
                { id: 'DEFENSE', label: 'Block', icon: Shield, activeCls: 'bg-sky-500 text-slate-950 border-sky-300' },
                { id: 'GROUND', label: 'Ground Drive', icon: Target, activeCls: 'bg-emerald-500 text-slate-950 border-emerald-300' },
                { id: 'LOFT', label: 'Power Loft (6s)', icon: Zap, activeCls: 'bg-amber-400 text-slate-950 border-amber-200' }
              ].map((st) => {
                const IconComp = st.icon;
                const isSelected = shotType === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setShotType(st.id)}
                    className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-extrabold border transition ${
                      isSelected
                        ? `${st.activeCls} shadow-lg`
                        : 'bg-slate-900/90 text-slate-300 border-white/10 hover:bg-slate-800'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{st.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Aim Indicator */}
            <div className="hidden md:flex flex-col items-center text-center px-2">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                Selected Shot Angle
              </span>
              <span className="text-xs font-extrabold text-emerald-300">{aimDirection.label}</span>
            </div>

            {/* Instant Directional Swing Buttons (Ideal for Mobile Thumb & Quick Desktop Play) */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-center">
              <button
                onClick={() => {
                  setAimDirection({ x: -0.78, label: 'OFF-SIDE COVER DRIVE' });
                  executeBatSwing(-0.78, shotType);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 border border-white/15 text-xs font-black text-white shadow transition"
              >
                ⬅ COVER (OFF)
              </button>

              <button
                onClick={() => {
                  setAimDirection({ x: 0, label: 'STRAIGHT DRIVE' });
                  executeBatSwing(0, shotType);
                }}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-b from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-95 border border-emerald-300 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 transition"
              >
                ⬆ STRAIGHT
              </button>

              <button
                onClick={() => {
                  setAimDirection({ x: 0.78, label: 'LEG-SIDE PULL SHOT' });
                  executeBatSwing(0.78, shotType);
                }}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-gradient-to-b from-slate-800 to-slate-900 hover:from-emerald-600 hover:to-emerald-700 active:scale-95 border border-white/15 text-xs font-black text-white shadow transition"
              >
                PULL (LEG) ➡
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* SCREEN 3: POST-MATCH SCORECARD, REWARDS & REPLAY SCREEN              */}
      {/* ==================================================================== */}
      {screen === 'GAMEOVER' && (
        <div className="relative z-20 flex items-center justify-center h-[calc(100vh-54px)] p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-center">
            {(() => {
              const wonChase =
                matchState.target !== null ? matchState.runs >= matchState.target : true;
              return (
                <>
                  <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-xl">
                    <Trophy className="w-9 h-9" />
                  </div>

                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-emerald-400">
                      {selectedMode.title} • INNINGS COMPLETE
                    </div>
                    <h2 className="text-3xl font-black text-white mt-1">
                      {matchState.target !== null
                        ? wonChase
                          ? 'TARGET CHASED! VICTORY!'
                          : 'SHORT OF TARGET'
                        : 'GREAT INNINGS!'}
                    </h2>
                  </div>

                  {/* Summary Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2.5 bg-slate-950/80 p-4 rounded-2xl border border-white/10">
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">TOTAL SCORE</div>
                      <div className="text-2xl font-black text-white">
                        {matchState.runs}/{matchState.wickets}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">STRIKE RATE</div>
                      <div className="text-2xl font-black text-emerald-400">
                        {matchState.ballsBowled > 0
                          ? Math.round((matchState.runs / matchState.ballsBowled) * 100)
                          : 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold">4s / 6s</div>
                      <div className="text-2xl font-black text-amber-400">
                        {matchState.foursCount} / {matchState.sixesCount}
                      </div>
                    </div>
                  </div>

                  {/* Optional SDK Rewarded Bonus Button */}
                  <div className="flex items-center justify-between bg-amber-500/10 border border-amber-400/30 rounded-xl px-4 py-2.5">
                    <div className="text-left">
                      <div className="text-xs font-bold text-amber-300">Optional Ad Bonus</div>
                      <div className="text-[11px] text-slate-300">{platformSDK.hasRewardedAds() ? "Watch a rewarded ad for +50 coins" : "Unavailable until a verified ad SDK is connected"}</div>
                    </div>
                    <button
                      disabled={!platformSDK.hasRewardedAds()}
                      title={platformSDK.hasRewardedAds() ? 'Watch ad to claim bonus' : 'Requires official partner SDK'}
                      onClick={() => {
                        platformSDK.requestRewardedAd((granted) => {
                          if (granted) {
                            setProfile((p) => ({ ...p, coins: p.coins + 50 }));
                            triggerToast('🪙 +50 Bonus Coins Claimed!', 'Saved to your GXA profile');
                          }
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black transition"
                    >
                      {platformSDK.hasRewardedAds() ? '+50 Coins' : 'Ad SDK Pending'}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => setScreen('MENU')}
                      className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-slate-200 transition"
                    >
                      Main Stadium Menu
                    </button>
                    <button
                      onClick={() => {
                        platformSDK.requestInterstitialAd(() => {
                          startMatch(selectedMode);
                        });
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-sm font-black shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{selectedMode.isTournament && wonChase ? 'Next Knockout Round' : 'Play Again'}</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: PRO BAT ARMORY (CUSTOMIZATION & UNLOCKS)                    */}
      {/* ==================================================================== */}
      {activeModal === 'GARAGE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" /> GXA Pro Bat Armory
                </h3>
                <p className="text-xs text-slate-400">
                  Upgrade your cricket bat for higher exit velocity and a wider sweet-spot timing window.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-extrabold">
                  🪙 {profile.coins} Coins
                </span>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 overflow-y-auto pr-1">
              {BATS_CATALOG.map((bat) => {
                const isUnlocked = profile.unlockedBats.includes(bat.id);
                const isSelected = profile.selectedBat === bat.id;
                return (
                  <div
                    key={bat.id}
                    className={`p-4 rounded-2xl border flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-400'
                        : 'bg-slate-950/70 border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-white">{bat.name}</span>
                        <span
                          className="w-5 h-5 rounded-full border border-white/30"
                          style={{ backgroundColor: bat.bladeColor }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{bat.desc}</p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] font-bold">
                        <span className="text-emerald-400">
                          Power: +{Math.round((bat.powerBoost - 1) * 100)}%
                        </span>
                        <span className="text-sky-400">
                          Sweet Spot: +{Math.round((bat.timingWindowBonus - 1) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> EQUIPPED IN 3D STADIUM
                        </span>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => setProfile((p) => ({ ...p, selectedBat: bat.id }))}
                          className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold transition"
                        >
                          Equip Bat
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (profile.coins >= bat.price) {
                              setProfile((p) => ({
                                ...p,
                                coins: p.coins - bat.price,
                                unlockedBats: [...p.unlockedBats, bat.id],
                                selectedBat: bat.id
                              }));
                              triggerToast(`🏏 Unlocked ${bat.name}!`, 'Equipped for your next innings');
                            } else {
                              triggerToast('Not enough GXA Coins', `Score more runs & 6s to earn ${bat.price} coins!`);
                            }
                          }}
                          className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1 transition"
                        >
                          <Lock className="w-3.5 h-3.5" /> Unlock ({bat.price} Coins)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: ACHIEVEMENTS & MILESTONES                                   */}
      {/* ==================================================================== */}
      {activeModal === 'ACHIEVEMENTS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" /> GXA Batting Achievements
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
            <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
              {ACHIEVEMENTS_LIST.map((ach) => {
                const done = profile.achievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between ${
                      done ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-950/60 border-white/10 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-extrabold text-white flex items-center gap-2">
                        {ach.title}
                        {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-xs text-slate-400">{ach.desc}</div>
                    </div>
                    <span className="text-xs font-black text-amber-300 shrink-0">+{ach.reward} 🪙</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: STUDIO DOCUMENTATION, CONTROLS, QA & PLATFORM EXPORT HUB    */}
      {/* ==================================================================== */}
      {activeModal === 'DOCS' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/15 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black text-white">
                  GXA Cricket Batting Challenge — Master Deliverables & QA Report
                </h3>
                <p className="text-xs text-slate-400">
                  Controls Guide • Architecture • Lagged / GamePix SDK Integration • QA Testing Checklist
                </p>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold"
              >
                Close Docs
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 my-4 pr-2 text-xs text-slate-300 leading-relaxed">
              {/* 1. Controls Guide */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <h4 className="text-sm font-extrabold text-emerald-400">1. Game Controls & Batting Timing Guide</h4>
                <p>
                  <strong>Visual Pitching Ring:</strong> As soon as the AI bowler releases the ball, a colored ring appears on the clay pitch indicating exact line and length (Red = Yorker/Fast, Orange = Short Bouncer, Blue/Cyan = Swing, Purple = Sharp Spin).
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Touch / Mouse Swipe:</strong> Drag/swipe on the 3D stadium in your desired shot direction when the ball enters the batter timing ring.</li>
                  <li><strong>Quick Arcade Buttons:</strong> Tap <em>Cover (Off)</em>, <em>Straight</em>, or <em>Pull (Leg)</em> at the bottom of the screen.</li>
                  <li><strong>Desktop Keyboard:</strong> Aim with <kbd className="px-1 bg-slate-800 rounded">Arrow Keys</kbd> or <kbd className="px-1 bg-slate-800 rounded">WASD</kbd>. Press <kbd className="px-1 bg-slate-800 rounded">Space</kbd> for Ground Drive, <kbd className="px-1 bg-slate-800 rounded">Shift</kbd> / <kbd className="px-1 bg-slate-800 rounded">Z</kbd> for Power Lofted Six, or <kbd className="px-1 bg-slate-800 rounded">X</kbd> for Defensive Block.</li>
                </ul>
              </div>

              {/* 2. Platform SDK Integration */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <h4 className="text-sm font-extrabold text-sky-400">2. HTML5 Portal Integration (Lagged / GamePix / GXA)</h4>
                <p>
                  All ad and leaderboard calls are cleanly isolated inside the <code className="text-amber-300">PlatformBridge</code> service class at the top of <code className="text-amber-300">App.jsx</code>:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><code className="text-emerald-300">platformSDK.requestInterstitialAd(cb)</code> — Pauses Web Audio, invokes portal interstitial at natural post-match breaks, and resumes audio on completion.</li>
                  <li><code className="text-emerald-300">platformSDK.requestRewardedAd(cb)</code> — Reward button stays disabled unless a verified partner ad adapter exists; no fake rewards.</li>
                  <li><code className="text-emerald-300">platformSDK.submitScore(mode, score)</code> — Persists to <code className="text-emerald-300">localStorage</code> and exposes a clean hook for portal high-score APIs.</li>
                </ul>
              </div>

              {/* 3. QA Verification Report */}
              <div className="bg-slate-950/70 p-4 rounded-2xl border border-white/10 space-y-2">
                <h4 className="text-sm font-extrabold text-amber-400">3. Studio Quality Assurance (QA) Report</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20">
                    <strong className="text-emerald-300">⚠ 3D Ball & Stump Physics:</strong> Implemented in source; gameplay requires browser testing on target devices.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20">
                    <strong className="text-emerald-300">⚠ 6 Game Modes Implemented:</strong> Quick Match (2 & 5 Overs), Super Sixes, Target Chase, Sudden Death, and World Cup: validate each mode before launch.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20">
                    <strong className="text-emerald-300">ℹ Procedural 3D & Audio:</strong> Procedural meshes and sound are used; external JavaScript packages are still required at build time.
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/20">
                    <strong className="text-emerald-300">⚠ Mobile & Desktop Layout:</strong> Responsive handlers and input code exist; test on real touch devices.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}