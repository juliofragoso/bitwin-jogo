import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GuessResult, GameState, PowerUpType, PassiveType, SocketMessage } from '../types';
import { Button } from './Button';
import { socketService } from '../services/socketService';

interface GameProps {
  config: GameConfig;
  onFinish: (attempts: number) => void;
  gameState: GameState;
  myPlayerName: string;
  myAvatar: string;
}

const NEED_HIGHER_MESSAGES = ["SOBE!", "MAIS!", "BAIXO!", "PRA CIMA!"];
const NEED_LOWER_MESSAGES = ["DESCE!", "MENOS!", "ALTO!", "PRA BAIXO!"];

// Power-up Definitions
const ACTIVE_POWERUPS = [
    { id: PowerUpType.BINARY_SCAN, icon: '📡', name: 'Binary Scan', desc: '-25% busca' },
    { id: PowerUpType.GLITCH_BOMB, icon: '👾', name: 'Glitch Bomb', desc: 'Embaralha tela' },
    { id: PowerUpType.DOUBLE_THREAD, icon: '🎲', name: 'Double Thread', desc: 'Chute duplo' },
    { id: PowerUpType.FREEZE_FRAME, icon: '❄️', name: 'Freeze Frame', desc: 'Congela 5s' },
];

const PASSIVE_POWERUPS = [
    { id: PassiveType.FIREWALL, icon: '🛡️', name: 'Firewall', desc: 'Imune a hacks' },
    { id: PassiveType.THERMAL_SENSOR, icon: '🌡️', name: 'Thermal Sensor', desc: 'Borda colorida' },
    { id: PassiveType.OVERCLOCK, icon: '⚡', name: 'Overclock', desc: '4º chute grátis' },
];

export const Game: React.FC<GameProps> = ({ config, onFinish, gameState, myPlayerName, myAvatar }) => {
  const [guess, setGuess] = useState<string>('');
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [lastDirection, setLastDirection] = useState<'HIGHER' | 'LOWER' | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  // Power-up States
  const [loadoutConfirmed, setLoadoutConfirmed] = useState(config.gameMode === 'CLASSIC');
  const [selectedActive, setSelectedActive] = useState<PowerUpType | null>(null);
  const [selectedPassive, setSelectedPassive] = useState<PassiveType | null>(null);
  const [activeUsed, setActiveUsed] = useState(false);
  
  // Effects on ME
  const [isGlitched, setIsGlitched] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  
  // Visual Range (for Binary Scan)
  const [visualMin, setVisualMin] = useState(config.minRange);
  const [visualMax, setVisualMax] = useState(config.maxRange);

  const historyEndRef = useRef<HTMLDivElement>(null);

  const isMeHost = myPlayerName === config.hostName;
  const opponentName = isMeHost ? config.joinerName : config.hostName;
  const opponentAvatar = isMeHost ? config.joinerAvatar : config.hostAvatar;
  const maxDigits = config.maxRange.toString().length;

  useEffect(() => {
    if (config.gameMode === 'CLASSIC') return;
    const handleEffect = (msg: SocketMessage) => {
        if (msg.type === 'POWER_UP_EFFECT' && msg.payload.roomId === config.roomId) {
            if (selectedPassive === PassiveType.FIREWALL) {
                setFeedbackText("BLOCKED!");
                return;
            }
            if (msg.payload.effect === 'GLITCH') {
                setIsGlitched(true);
                setFeedbackText("HACKED!");
                setTimeout(() => setIsGlitched(false), msg.payload.duration || 5000);
            }
            if (msg.payload.effect === 'FREEZE') {
                setIsFrozen(true);
                setFeedbackText("FROZEN!");
                setTimeout(() => setIsFrozen(false), msg.payload.duration || 5000);
            }
        }
    };
    const unsubscribe = socketService.subscribe(handleEffect);
    return unsubscribe;
  }, [config.roomId, config.gameMode, selectedPassive]);

  // Scroll to end of history (right side)
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth", inline: "end" });
    }
  }, [history]);

  const handleNumClick = (num: number) => {
      if (isFrozen) return;
      if (guess.replace(',', '').length >= (guess.includes(',') ? maxDigits * 2 : maxDigits)) return; 
      setGuess(prev => prev + num.toString());
  };

  const handleDelete = () => {
      if (isFrozen) return;
      setGuess(prev => prev.slice(0, -1));
  };

  const handleComma = () => {
      if (isFrozen) return;
      if (!guess.includes(',')) {
          setGuess(prev => prev + ',');
      }
  };

  const activatePowerUp = () => {
      if (activeUsed || !selectedActive || isFrozen) return;
      setActiveUsed(true);
      switch (selectedActive) {
          case PowerUpType.BINARY_SCAN:
              const range = visualMax - visualMin;
              const cutSize = Math.floor(range * 0.25);
              const distToMin = config.targetNumber - visualMin;
              const distToMax = visualMax - config.targetNumber;
              if (distToMin > distToMax) {
                  setVisualMin(prev => prev + cutSize);
                  setFeedbackText(`SCAN: > ${visualMin + cutSize}`);
              } else {
                  setVisualMax(prev => prev - cutSize);
                  setFeedbackText(`SCAN: < ${visualMax - cutSize}`);
              }
              break;
          case PowerUpType.GLITCH_BOMB:
              socketService.sendPowerUpEffect(config.roomId, 'GLITCH', 5000);
              setFeedbackText("SENT!");
              break;
          case PowerUpType.FREEZE_FRAME:
              socketService.sendPowerUpEffect(config.roomId, 'FREEZE', 5000);
              setFeedbackText("SENT!");
              break;
          case PowerUpType.DOUBLE_THREAD:
              setFeedbackText("DOUBLE ON");
              break;
      }
  };

  const processGuessValue = (val: number): 'HIGHER' | 'LOWER' | 'CORRECT' => {
      if (val === config.targetNumber) return 'CORRECT';
      return val < config.targetNumber ? 'HIGHER' : 'LOWER';
  }

  const handleGuessSubmit = () => {
    if (isFrozen) return;
    if (gameState !== GameState.PLAYING) return;
    if (!guess) return;

    let valuesToProcess: number[] = [];
    if (selectedActive === PowerUpType.DOUBLE_THREAD && activeUsed && guess.includes(',')) {
        const parts = guess.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        valuesToProcess = parts.slice(0, 2);
    } else {
        const val = parseInt(guess);
        if (isNaN(val)) return;
        valuesToProcess = [val];
    }

    let finished = false;
    let newHistory = [...history];

    valuesToProcess.forEach(val => {
        if (finished) return; 
        if (newHistory.some(h => h.value === val)) {
            setFeedbackText("REPETIDO!");
            return;
        }
        const direction = processGuessValue(val);
        const isFreeAttempt = selectedPassive === PassiveType.OVERCLOCK && ((newHistory.length + 1) % 4 === 0);
        newHistory.push({ value: val, direction, freeAttempt: isFreeAttempt });
        setLastDirection(direction !== 'CORRECT' ? direction : null);
        if (direction === 'CORRECT') finished = true;
        if (direction === 'HIGHER') setFeedbackText(NEED_HIGHER_MESSAGES[Math.floor(Math.random() * NEED_HIGHER_MESSAGES.length)]);
        else if (direction === 'LOWER') setFeedbackText(NEED_LOWER_MESSAGES[Math.floor(Math.random() * NEED_LOWER_MESSAGES.length)]);
    });

    setHistory(newHistory);
    setGuess('');
    if (finished) {
        const realAttempts = newHistory.filter(h => !h.freeAttempt).length;
        onFinish(realAttempts);
    }
  };

  // LOADOUT SCREEN
  if (!loadoutConfirmed) {
      return (
          <div className="bg-cosmic min-h-[100dvh] flex flex-col items-center justify-center p-6">
              <div className="glass-panel w-full max-w-md p-6 animate-pop-in">
                  <h2 className="text-2xl font-black text-white text-center mb-6 font-brand">LOADOUT</h2>
                  <div className="mb-6">
                      <h3 className="text-bitwin-primary font-bold mb-2 uppercase text-xs">Ativo</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {ACTIVE_POWERUPS.map(p => (
                              <button key={p.id} onClick={() => setSelectedActive(p.id)} className={`p-3 rounded-xl border-2 transition-all ${selectedActive === p.id ? 'bg-bitwin-primary text-black border-white' : 'bg-black/20 border-white/10'}`}>
                                  <div className="text-2xl">{p.icon}</div>
                                  <div className="font-bold text-xs">{p.name}</div>
                              </button>
                          ))}
                      </div>
                  </div>
                  <div className="mb-6">
                      <h3 className="text-bitwin-cta font-bold mb-2 uppercase text-xs">Passivo</h3>
                      <div className="grid grid-cols-2 gap-2">
                          {PASSIVE_POWERUPS.map(p => (
                              <button key={p.id} onClick={() => setSelectedPassive(p.id)} className={`p-3 rounded-xl border-2 transition-all ${selectedPassive === p.id ? 'bg-bitwin-cta text-white border-white' : 'bg-black/20 border-white/10'}`}>
                                  <div className="text-2xl">{p.icon}</div>
                                  <div className="font-bold text-xs">{p.name}</div>
                              </button>
                          ))}
                      </div>
                  </div>
                  <Button variant="primary" className="w-full" disabled={!selectedActive || !selectedPassive} onClick={() => setLoadoutConfirmed(true)}>CONFIRMAR</Button>
              </div>
          </div>
      )
  }

  // GAME UI
  return (
    <div className={`bg-cosmic h-[100dvh] w-full flex flex-col items-center overflow-hidden ${isGlitched ? 'glitch-effect' : ''}`}>
      
      {/* 1. HEADER */}
      <div className="flex-none w-full max-w-3xl pt-4 px-4 pb-2 z-20">
         <div className="glass-panel px-4 py-2 flex justify-between items-center h-14 relative">
            {/* Me */}
            <div className="flex items-center gap-2 flex-1">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4cc9f0] to-[#4361ee] flex items-center justify-center text-base shadow-md border border-white/20">
                   {myAvatar}
               </div>
               <span className="font-bold text-white uppercase text-xs truncate max-w-[80px]">{myPlayerName}</span>
            </div>

            {/* VS Badge */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#240046] border border-white/20 rounded-full px-2 py-0.5 z-10">
                <span className="font-brand text-white/40 italic text-sm">VS</span>
            </div>

            {/* Opponent */}
            <div className="flex items-center justify-end gap-2 flex-1">
               <span className="font-bold text-white uppercase text-xs truncate max-w-[80px] text-right">{opponentName}</span>
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f72585] to-[#7209b7] flex items-center justify-center text-base shadow-md border border-white/20">
                   {opponentAvatar}
               </div>
            </div>
         </div>
      </div>

      {/* 2. GAME AREA */}
      <div className="flex-1 w-full max-w-lg px-4 flex flex-col justify-start items-center relative z-10">
           
           {/* Waiting Screen */}
           {gameState === GameState.WAITING_RESULT ? (
               <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
                   <h2 className="text-3xl font-brand text-bitwin-primary mb-2 drop-shadow-md">ACERTOU!</h2>
                   <p className="text-white/60">Aguardando oponente...</p>
               </div>
           ) : (
             <>
               {/* RANGE & TARGET */}
               <div className="flex-none pt-2 pb-2 w-full">
                    <div className="flex justify-center items-end gap-6 text-center mb-1 font-brand">
                        <span className="text-4xl text-bitwin-primary drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{visualMin}</span>
                        <div className="flex flex-col justify-end pb-1">
                             <span className="text-4xl text-white drop-shadow-glow-gold">?</span>
                        </div>
                        <span className="text-4xl text-bitwin-cta drop-shadow-[0_2px_0_rgba(0,0,0,0.3)]">{visualMax}</span>
                    </div>
                    
                    {/* FEEDBACK PILL */}
                    <div className="h-6 flex items-center justify-center mb-2">
                        {feedbackText && (
                            <div className="bg-black/40 px-3 py-0.5 rounded-full border border-white/10 animate-pop-in">
                                <span className={`font-black uppercase text-xs tracking-widest ${lastDirection === 'HIGHER' ? 'text-green-400' : 'text-red-400'}`}>
                                    {feedbackText}
                                </span>
                            </div>
                        )}
                    </div>
               </div>

               {/* INPUT SECTION (Centered Small Box with Colored Arrows) */}
               <div className="w-full mb-4 flex items-center justify-center gap-4 relative">
                   {/* Left Arrow (Up/Green) */}
                   <div className={`transition-all duration-300 transform ${lastDirection === 'HIGHER' ? 'opacity-100 scale-125' : 'opacity-20 grayscale'}`}>
                        <div className={`text-6xl lg:text-7xl font-black text-green-500 drop-shadow-[0_0_10px_rgba(34,197,94,0.6)] ${lastDirection === 'HIGHER' ? 'animate-bounce' : ''}`}>▲</div>
                   </div>

                   {/* The Box */}
                   <div className={`w-36 h-20 bg-[#150029]/60 rounded-2xl border-2 border-[#3c096c] flex items-center justify-center shadow-inner-highlight relative overflow-hidden ${isFrozen ? 'freeze-effect' : ''}`}>
                       <div className="text-4xl font-black text-white tracking-widest drop-shadow-lg z-10">
                           {guess || <span className="text-white/10">...</span>}
                       </div>
                   </div>

                   {/* Right Arrow (Down/Red) */}
                   <div className={`transition-all duration-300 transform ${lastDirection === 'LOWER' ? 'opacity-100 scale-125' : 'opacity-20 grayscale'}`}>
                        <div className={`text-6xl lg:text-7xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)] ${lastDirection === 'LOWER' ? 'animate-bounce' : ''}`}>▼</div>
                   </div>
               </div>

               {/* Hacker Button */}
               {config.gameMode === 'HACKER' && !activeUsed && (
                  <div className="w-full flex justify-center mb-2">
                    <button onClick={activatePowerUp} className="bg-bitwin-primary text-black font-black text-xs px-4 py-1 rounded-full uppercase border-b-2 border-black/20 shadow-lg active:scale-95">
                        USAR {ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.name}
                    </button>
                  </div>
               )}

               {/* HISTORY (Horizontal Scrollable Strip) */}
               <div className="w-full h-20 bg-black/20 border border-white/10 rounded-xl mb-3 flex items-center px-2 gap-2 overflow-x-auto custom-scrollbar relative">
                   {history.length === 0 && (
                       <div className="w-full text-center text-white/20 text-xs italic">Palpites...</div>
                   )}
                   {history.map((h, idx) => (
                       <div key={idx} className={`flex-none w-14 h-14 rounded-lg flex flex-col items-center justify-center border shadow-sm animate-pop-in ${
                           h.direction === 'CORRECT' ? 'bg-green-500/20 border-green-500 text-green-400' :
                           h.direction === 'HIGHER' ? 'bg-white/5 border-white/10 text-white' : 'bg-red-500/10 border-red-500/30 text-red-400'
                       }`}>
                           <span className="text-lg font-black">{h.value}</span>
                           <span className="text-[8px] opacity-70">{h.direction === 'HIGHER' ? '▲' : h.direction === 'LOWER' ? '▼' : '★'}</span>
                       </div>
                   ))}
                   <div ref={historyEndRef} className="w-1 flex-none"></div>
               </div>

               {/* KEYPAD */}
               <div className="grid grid-cols-3 gap-2 w-full max-w-[320px] mb-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <Button key={num} variant="purple" onClick={() => handleNumClick(num)} disabled={isFrozen} className="text-3xl h-14 rounded-2xl shadow-lg">
                          {num}
                      </Button>
                  ))}
                  <Button variant="danger" onClick={handleDelete} disabled={isFrozen} className="text-xl h-14 rounded-2xl shadow-lg">⌫</Button>
                  <Button variant="purple" onClick={() => handleNumClick(0)} disabled={isFrozen} className="text-3xl h-14 rounded-2xl shadow-lg">0</Button>
                  <Button variant="success" onClick={handleGuessSubmit} disabled={!guess || isFrozen} className="text-xl h-14 rounded-2xl shadow-lg bg-gradient-to-b from-green-400 to-green-700 border-green-400">✓</Button>
               </div>

             </>
           )}
      </div>
      
      {/* 3. MOBILE AD BANNER (Bottom) */}
      <div className="flex-none w-full h-[60px] bg-black/40 flex items-center justify-center border-t border-white/5 z-20 mt-auto">
          <span className="text-white/20 text-[10px] uppercase font-bold">Ad Banner</span>
      </div>
    </div>
  );
};