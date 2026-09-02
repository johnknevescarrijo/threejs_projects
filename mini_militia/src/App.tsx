import React, { useEffect, useRef, useState } from 'react';
import { GameEngine, GameState, MatchResults } from './game/core/GameEngine';
import { ControlSettings, PlayerCustomization, WeaponType } from './game/types';
import { MainMenu } from './ui/menu/MainMenu';
import { LoadoutModal } from './ui/menu/LoadoutModal';
import { CharacterModal } from './ui/menu/CharacterModal';
import { SettingsModal } from './ui/menu/SettingsModal';
import { HUD } from './ui/hud/HUD';
import { ResultsModal } from './ui/results/ResultsModal';

const DEFAULT_CUSTOMIZATION: PlayerCustomization = {
  name: 'Soldado',
  skinColor: '#fcd34d',
  headgearColor: '#15803d',
  visorColor: '#00f0ff',
  jetpackColor: '#334155',
  primaryWeapon: 'rifle'
};

const DEFAULT_SETTINGS: ControlSettings = {
  soundVolume: 0.8,
  sfxVolume: 0.8,
  screenShake: true,
  showHitNumbers: true,
  botDifficulty: 'normal'
};

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [activeModal, setActiveModal] = useState<'none' | 'loadout' | 'character' | 'settings'>('none');
  const [results, setResults] = useState<MatchResults | null>(null);
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);

  // Persistence
  const [customization, setCustomization] = useState<PlayerCustomization>(() => {
    try {
      const saved = localStorage.getItem('mm_customization');
      return saved ? JSON.parse(saved) : DEFAULT_CUSTOMIZATION;
    } catch {
      return DEFAULT_CUSTOMIZATION;
    }
  });

  const [settings, setSettings] = useState<ControlSettings>(() => {
    try {
      const saved = localStorage.getItem('mm_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('mm_customization', JSON.stringify(customization));
  }, [customization]);

  useEffect(() => {
    localStorage.setItem('mm_settings', JSON.stringify(settings));
  }, [settings]);

  // Initialize GameEngine Canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    const gameInstance = new GameEngine(canvasRef.current, settings);

    gameInstance.onStateChange = (state) => {
      setGameState(state);
    };

    gameInstance.onMatchEnd = (res) => {
      setResults(res);
    };

    setEngine(gameInstance);

    return () => {
      gameInstance.destroy();
    };
  }, []);

  // Sync countdown numbers
  useEffect(() => {
    if (!engine || gameState !== 'COUNTDOWN') {
      setCountdownNumber(null);
      return;
    }

    const interval = setInterval(() => {
      if (engine.state === 'COUNTDOWN') {
        setCountdownNumber(Math.ceil(engine.countdownTimer));
      } else {
        setCountdownNumber(null);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [engine, gameState]);

  const handleStartGame = () => {
    if (!engine) return;
    setActiveModal('none');
    setResults(null);
    engine.startMatch(customization, settings);
  };

  const handleRematch = () => {
    setResults(null);
    handleStartGame();
  };

  const handleReturnToMenu = () => {
    if (engine) {
      engine.setState('MENU');
    }
    setResults(null);
    setGameState('MENU');
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 2D Canvas Viewport */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full block cursor-crosshair ${
          gameState === 'MENU' ? 'opacity-30 filter blur-xs transition-opacity duration-700' : 'opacity-100'
        }`}
      />

      {/* Main Menu UI */}
      {gameState === 'MENU' && (
        <MainMenu
          customization={customization}
          onStartGame={handleStartGame}
          onOpenLoadout={() => setActiveModal('loadout')}
          onOpenCharacter={() => setActiveModal('character')}
          onOpenSettings={() => setActiveModal('settings')}
        />
      )}

      {/* Pre-Match 3, 2, 1 Countdown Overlay */}
      {gameState === 'COUNTDOWN' && (
        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-30 animate-fadeIn">
          <div className="flex flex-col items-center">
            <span className="font-digital text-sm uppercase tracking-widest text-cyan-400 mb-2">
              PREPARE-SE PARA O COMBATE
            </span>
            <div className="w-28 h-28 rounded-full bg-slate-900/90 border-4 border-cyan-400 flex items-center justify-center font-digital text-6xl font-black text-cyan-300 shadow-[0_0_50px_rgba(6,182,212,0.8)] animate-pulse">
              {countdownNumber && countdownNumber > 0 ? countdownNumber : 'GO!'}
            </div>
          </div>
        </div>
      )}

      {/* Active In-Game HUD */}
      {(gameState === 'PLAYING' || gameState === 'RESPAWNING' || gameState === 'COUNTDOWN') && (
        <HUD engine={engine} />
      )}

      {/* Results / Game Over Modal */}
      {gameState === 'ENDED' && results && (
        <ResultsModal
          results={results}
          onRematch={handleRematch}
          onHome={handleReturnToMenu}
        />
      )}

      {/* Sub-Modals */}
      {activeModal === 'loadout' && (
        <LoadoutModal
          selectedWeapon={customization.primaryWeapon}
          onSelect={(w: WeaponType) => setCustomization({ ...customization, primaryWeapon: w })}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'character' && (
        <CharacterModal
          customization={customization}
          onChange={(c: PlayerCustomization) => setCustomization(c)}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={(s: ControlSettings) => {
            setSettings(s);
            if (engine) engine.settings = s;
          }}
          onClose={() => setActiveModal('none')}
        />
      )}
    </main>
  );
};
