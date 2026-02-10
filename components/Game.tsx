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

const NEED_HIGHER_MESSAGES = [
  "SOBE!", "MAIS ALTO!", "TÁ BAIXO!", "PRA CIMA!", "SUBINDO!", "MAIS!"
];

const NEED_LOWER_MESSAGES = [
  "DESCE!", "MENOS!", "TÁ ALTO!", "PRA BAIXO!", "DESCENDO!", "MENOS!"
];

// Power-up Definitions
const ACTIVE_POWERUPS = [
    { id: PowerUpType.BINARY_SCAN, icon: '📡', name: 'Binary Scan', desc: 'Reduz a área de busca em 25%.' },
    { id: PowerUpType.GLITCH_BOMB, icon: '👾', name: 'Glitch Bomb', desc: 'Embaralha a tela do oponente.' },
    { id: PowerUpType.DOUBLE_THREAD, icon: '🎲', name: 'Double Thread', desc: 'Chute 2 números (Ex: 50,51).' },
    { id: PowerUpType.FREEZE_FRAME, icon: '❄️', name: 'Freeze Frame', desc: 'Congela o input por 5s.' },
];

const PASSIVE_POWERUPS = [
    { id: PassiveType.FIREWALL, icon: '🛡️', name: 'Firewall', desc: 'Imune a Glitch e Freeze.' },
    { id: PassiveType.THERMAL_SENSOR, icon: '🌡️', name: 'Thermal Sensor', desc: 'Borda muda de cor.' },
    { id: PassiveType.OVERCLOCK, icon: '⚡', name: 'Overclock', desc: 'Cada 4º chute é grátis.' },
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

  // Determine Opponent info
  const isMeHost = myPlayerName === config.hostName;
  const opponentName = isMeHost ? config.joinerName : config.hostName;
  const opponentAvatar = isMeHost ? config.joinerAvatar : config.hostAvatar;

  // Socket Listener for Effects
  useEffect(() => {
    if (config.gameMode === 'CLASSIC') return;

    const handleEffect = (msg: SocketMessage) => {
        if (msg.type === 'POWER_UP_EFFECT' && msg.payload.roomId === config.roomId) {
            
            // CHECK PASSIVE: FIREWALL
            if (selectedPassive === PassiveType.FIREWALL) {
                setFeedbackText("FIREWALL BLOQUEOU!");
                return;
            }

            if (msg.payload.effect === 'GLITCH') {
                setIsGlitched(true);
                setFeedbackText("HACKEADO!");
                setTimeout(() => setIsGlitched(false), msg.payload.duration || 5000);
            }
            if (msg.payload.effect === 'FREEZE') {
                setIsFrozen(true);
                setFeedbackText("CONGELADO!");
                setTimeout(() => setIsFrozen(false), msg.payload.duration || 5000);
            }
        }
    };

    const unsubscribe = socketService.subscribe(handleEffect);
    return unsubscribe;
  }, [config.roomId, config.gameMode, selectedPassive]);

  // Auto scroll history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  // -- POWER UP LOGIC --

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
              setFeedbackText("GLITCH ENVIADO!");
              break;

          case PowerUpType.FREEZE_FRAME:
              socketService.sendPowerUpEffect(config.roomId, 'FREEZE', 5000);
              setFeedbackText("FREEZE ENVIADO!");
              break;

          case PowerUpType.DOUBLE_THREAD:
              setFeedbackText("THREAD DUPLA: Ex: 10,11");
              break;
      }
  };


  const processGuessValue = (val: number): 'HIGHER' | 'LOWER' | 'CORRECT' => {
      if (val === config.targetNumber) return 'CORRECT';
      return val < config.targetNumber ? 'HIGHER' : 'LOWER';
  }

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFrozen) return;
    if (gameState !== GameState.PLAYING) return;

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

        if (direction === 'HIGHER') {
            setFeedbackText(NEED_HIGHER_MESSAGES[Math.floor(Math.random() * NEED_HIGHER_MESSAGES.length)]);
        } else if (direction === 'LOWER') {
            setFeedbackText(NEED_LOWER_MESSAGES[Math.floor(Math.random() * NEED_LOWER_MESSAGES.length)]);
        }
    });

    setHistory(newHistory);
    setGuess('');

    if (finished) {
        const realAttempts = newHistory.filter(h => !h.freeAttempt).length;
        onFinish(realAttempts);
    }
  };

  const getBorderColor = () => {
      if (selectedPassive !== PassiveType.THERMAL_SENSOR || history.length === 0) return 'border-white/10';
      const lastVal = history[history.length - 1].value;
      const dist = Math.abs(lastVal - config.targetNumber);
      const totalRange = config.maxRange - config.minRange;
      const percentage = dist / totalRange;

      if (percentage < 0.05) return 'border-red-500 shadow-[0_0_30px_red]'; 
      if (percentage < 0.15) return 'border-orange-400'; 
      if (percentage < 0.3) return 'border-yellow-300'; 
      return 'border-blue-400'; 
  };

  const isWaiting = gameState === GameState.WAITING_RESULT;

  // -- LOADOUT SCREEN (FULL PAGE) --
  if (!loadoutConfirmed) {
      return (
          <div className="h-[100dvh] flex flex-col items-center justify-center p-4 animate-pop-in overflow-y-auto">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-2 text-center">ESCOLHA SEU LOADOUT</h2>
              <p className="text-white/60 mb-6 text-sm text-center">1 Tool Ativa + 1 Hardware Passivo</p>
              
              <div className="grid md:grid-cols-2 gap-4 w-full max-w-4xl mb-6">
                  {/* ACTIVE */}
                  <div className="bg-black/20 p-4 rounded-3xl border-2 border-bitwin-primary">
                      <h3 className="text-bitwin-primary font-bold mb-3 uppercase tracking-widest text-sm">⚡ TOOL (ATIVO)</h3>
                      <div className="grid grid-cols-1 gap-2">
                          {ACTIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedActive(p.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedActive === p.id ? 'bg-bitwin-primary text-bitwin-bg border-white scale-102 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-2xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold text-sm">{p.name}</div>
                                      <div className="text-[10px] opacity-70 leading-tight">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* PASSIVE */}
                  <div className="bg-black/20 p-4 rounded-3xl border-2 border-bitwin-accent">
                      <h3 className="text-bitwin-accent font-bold mb-3 uppercase tracking-widest text-sm">💾 HARDWARE (PASSIVO)</h3>
                      <div className="grid grid-cols-1 gap-2">
                          {PASSIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedPassive(p.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedPassive === p.id ? 'bg-bitwin-accent text-bitwin-bg border-white scale-102 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-2xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold text-sm">{p.name}</div>
                                      <div className="text-[10px] opacity-70 leading-tight">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <Button 
                className="w-full max-w-md shadow-2xl mb-4" 
                size="lg" 
                disabled={!selectedActive || !selectedPassive}
                onClick={() => setLoadoutConfirmed(true)}
              >
                  CONFIRMAR
              </Button>
          </div>
      )
  }

  // -- MAIN GAME RENDER (APP STYLE) --

  return (
    <div className={`flex flex-col h-[100dvh] bg-bitwin-bg overflow-hidden ${isGlitched ? 'glitch-effect' : ''}`}>
      
      {/* 1. COMPACT HEADER */}
      <div className="flex-none bg-bitwin-card/80 border-b border-white/10 px-4 py-2 flex justify-between items-center z-20 relative shadow-md">
         {/* Me */}
         <div className="flex items-center gap-2 max-w-[40%]">
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-bitwin-primary flex items-center justify-center border-2 border-white text-lg">
                 {myAvatar}
             </div>
             <div className="overflow-hidden">
                 <div className="font-bold text-bitwin-primary text-sm uppercase truncate">{myPlayerName}</div>
                 {config.gameMode === 'HACKER' && (
                     <div className="flex gap-1 text-[10px] text-white/60">
                         <span>{ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.icon}</span>
                         <span>{PASSIVE_POWERUPS.find(p => p.id === selectedPassive)?.icon}</span>
                     </div>
                 )}
             </div>
         </div>

         {/* Center */}
         <div className="absolute left-1/2 transform -translate-x-1/2 top-1 text-center">
             <div className="bg-black/40 px-3 py-0.5 rounded-b-xl text-[10px] font-bold tracking-widest uppercase border-x border-b border-white/10 text-white/50">
                {config.gameMode === 'HACKER' ? '⚡ HACKER' : '🛡️ CLÁSSICO'}
             </div>
             <div className="text-xl font-black italic text-white/20 mt-1">VS</div>
         </div>

         {/* Opponent */}
         <div className="flex items-center justify-end gap-2 max-w-[40%]">
             <div className="text-right overflow-hidden">
                <div className="font-bold text-bitwin-secondary text-sm uppercase truncate">{opponentName}</div>
             </div>
             <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-bitwin-secondary flex items-center justify-center border-2 border-white text-lg">
                 {opponentAvatar}
             </div>
         </div>
      </div>

      {/* 2. GAME CONTAINER (Flex Body) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-7xl mx-auto w-full">
         
         {/* LEFT PANEL: GAME INPUT (Top on mobile) */}
         <div className={`flex-none lg:flex-1 p-2 md:p-6 flex flex-col justify-center items-center transition-all duration-500 border-b lg:border-b-0 lg:border-r border-white/10 relative z-10 ${getBorderColor()} ${isFrozen ? 'freeze-effect' : ''}`}>
             
            {isWaiting ? (
                <div className="flex flex-col items-center justify-center h-full text-center animate-pulse p-4">
                    <div className="text-6xl mb-4">🏆</div>
                    <h2 className="text-2xl font-black text-bitwin-primary mb-2">VOCÊ ACERTOU!</h2>
                    <p className="text-white/60 text-sm">Aguardando {opponentName}...</p>
                    <div className="mt-4 bg-black/20 px-6 py-2 rounded-xl">
                        <p className="text-white font-bold">SCORE: <span className="text-bitwin-accent">{history.filter(h => !h.freeAttempt).length}</span></p>
                    </div>
                </div>
            ) : (
                <div className="w-full max-w-lg flex flex-col gap-2 md:gap-6">
                    
                    {/* Range Display */}
                    <div className="flex justify-center items-center gap-2 md:gap-4 text-center py-2">
                        <span className="text-2xl md:text-5xl font-black text-bitwin-accent transition-all">{visualMin}</span>
                        <div className="flex flex-col items-center mx-2">
                             <span className="text-xs text-white/30 uppercase font-bold tracking-widest mb-1">ALVO</span>
                             <span className="text-4xl md:text-7xl font-black text-bitwin-primary drop-shadow-lg">?</span>
                        </div>
                        <span className="text-2xl md:text-5xl font-black text-bitwin-secondary transition-all">{visualMax}</span>
                    </div>

                    {/* Active Powerup Button */}
                    {config.gameMode === 'HACKER' && !activeUsed && (
                        <div className="flex justify-center">
                            <button 
                                onClick={activatePowerUp}
                                className="bg-bitwin-primary text-black font-black text-[10px] md:text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-transform"
                            >
                                USAR {ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.name}
                            </button>
                        </div>
                    )}

                    {/* Input Controls */}
                    <div className="flex items-center justify-between gap-2 md:gap-4 bg-black/20 p-2 md:p-6 rounded-2xl border border-white/5">
                        
                        {/* Up Arrow Feedback */}
                        <div className={`transition-all duration-300 flex flex-col items-center ${lastDirection === 'HIGHER' ? 'opacity-100 scale-105' : 'opacity-30 grayscale scale-90'}`}>
                            <div className="bg-bitwin-accent text-bitwin-bg w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-3xl shadow-sm">▲</div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleGuess} className="flex-1 flex flex-col gap-2">
                            <input
                                type={selectedActive === PowerUpType.DOUBLE_THREAD && activeUsed ? "text" : "number"}
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="00"
                                disabled={isFrozen}
                                className="w-full bg-white text-bitwin-card text-center text-3xl md:text-5xl font-black rounded-xl h-14 md:h-20 outline-none focus:ring-4 ring-bitwin-primary transition-all disabled:bg-gray-400"
                            />
                            <Button type="submit" variant="primary" size="md" className="w-full py-2 text-lg md:text-xl shadow-md" disabled={!guess || isFrozen}>
                                CHUTAR
                            </Button>
                        </form>

                        {/* Down Arrow Feedback */}
                        <div className={`transition-all duration-300 flex flex-col items-center ${lastDirection === 'LOWER' ? 'opacity-100 scale-105' : 'opacity-30 grayscale scale-90'}`}>
                            <div className="bg-bitwin-secondary text-white w-10 h-10 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-3xl shadow-sm">▼</div>
                        </div>
                    </div>
                    
                    {/* Feedback Text */}
                    <div className="h-6 text-center">
                        <p className={`font-bold uppercase text-xs md:text-sm animate-bounce ${lastDirection === 'HIGHER' ? 'text-bitwin-accent' : 'text-bitwin-secondary'}`}>
                             {feedbackText}
                        </p>
                    </div>

                </div>
            )}
         </div>

         {/* RIGHT/BOTTOM PANEL: HISTORY (Fills remaining space) */}
         <div className="flex-1 lg:w-80 bg-black/10 flex flex-col overflow-hidden">
             <div className="bg-black/20 px-4 py-2 flex justify-between items-center border-b border-white/5 flex-none">
                 <span className="text-white/40 font-bold text-xs uppercase tracking-widest">HISTÓRICO</span>
                 <div className="text-xs font-mono text-white/40">
                    <span className="text-white font-bold text-sm mr-1">{history.filter(h => !h.freeAttempt).length}</span> 
                    TENTATIVAS
                 </div>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {history.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-white/20 text-xs italic py-4">
                        <span>Aguardando o primeiro chute...</span>
                    </div>
                )}
                {/* Reversed map for history so newest is at bottom naturally, but we auto-scroll there */}
                {history.map((h, idx) => (
                    <div key={idx} className={`flex items-center justify-between bg-bitwin-bg/90 p-2 md:p-3 rounded-lg border ${h.freeAttempt ? 'border-yellow-400/50' : 'border-white/5'} animate-pop-in`}>
                        <div className="flex items-center gap-3">
                            <span className="text-white/30 font-mono text-[10px] w-4">#{idx + 1}</span>
                            <span className="text-xl md:text-2xl font-black text-white">{h.value}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {h.freeAttempt && <span className="text-[10px]">⚡</span>}
                            {h.direction === 'HIGHER' && (
                                <span className="text-bitwin-accent font-bold text-[10px] md:text-xs bg-bitwin-accent/10 px-2 py-0.5 rounded">▲ SOBE</span>
                            )}
                            {h.direction === 'LOWER' && (
                                <span className="text-bitwin-secondary font-bold text-[10px] md:text-xs bg-bitwin-secondary/10 px-2 py-0.5 rounded">▼ DESCE</span>
                            )}
                            {h.direction === 'CORRECT' && (
                                <span className="text-bitwin-primary font-bold text-[10px] md:text-xs">★ ACERTOU</span>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={historyEndRef} />
             </div>
         </div>
      </div>
    </div>
  );
};