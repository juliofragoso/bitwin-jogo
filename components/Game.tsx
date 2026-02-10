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

// User needs to go HIGHER (Guess was too low)
const NEED_HIGHER_MESSAGES = [
  "TÁ COM MEDO DE ALTURA? SOBE!",
  "MUITO BAIXO! PÕE FERMENTO NISSO!",
  "TÁ CAVANDO BURACO? O NÚMERO É MAIS ALTO!",
  "SAI DO CHÃO! SOBE, SOBE, SOBE!",
  "MAIS! BEM MAIS QUE ISSO!",
  "SUBINDO! O ELEVADOR VAI PRO TOPO!",
  "VIXE, TÁ RASTEJANDO... AUMENTA!",
  "CHUTE FRACO! JOGA LÁ EM CIMA!"
];

// User needs to go LOWER (Guess was too high)
const NEED_LOWER_MESSAGES = [
  "EITA, MIROU NA LUA? BAIXA A BOLA!",
  "MENOS... BEM MENOS, EMPOLGADO!",
  "TÁ CHUTANDO SATÉLITE? DESCE!",
  "O NÚMERO NÃO TEM ASAS! DIMINUI!",
  "CALMA ALPINISTA, DESCE A MONTANHA!",
  "EXAGEROU! CORTA ESSE NÚMERO!",
  "TÁ VOANDO MUITO ALTO, ÍCARO. DESCE!",
  "NOSSA, PASSOU LONGE... PRA BAIXO!"
];

// Power-up Definitions
const ACTIVE_POWERUPS = [
    { id: PowerUpType.BINARY_SCAN, icon: '📡', name: 'Binary Scan', desc: 'Reduz a área de busca em 25%.' },
    { id: PowerUpType.GLITCH_BOMB, icon: '👾', name: 'Glitch Bomb', desc: 'Embaralha a tela do oponente.' },
    { id: PowerUpType.DOUBLE_THREAD, icon: '🎲', name: 'Double Thread', desc: 'Chute 2 números de uma vez (Ex: 50,51).' },
    { id: PowerUpType.FREEZE_FRAME, icon: '❄️', name: 'Freeze Frame', desc: 'Congela o input do oponente por 5s.' },
];

const PASSIVE_POWERUPS = [
    { id: PassiveType.FIREWALL, icon: '🛡️', name: 'Firewall', desc: 'Imune a Glitch e Freeze.' },
    { id: PassiveType.THERMAL_SENSOR, icon: '🌡️', name: 'Thermal Sensor', desc: 'Borda da tela muda de cor perto do alvo.' },
    { id: PassiveType.OVERCLOCK, icon: '⚡', name: 'Overclock', desc: 'Cada 4º chute não conta no placar.' },
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
                setFeedbackText("FIREWALL BLOQUEOU O ATAQUE!");
                return;
            }

            if (msg.payload.effect === 'GLITCH') {
                setIsGlitched(true);
                setFeedbackText("VOCÊ FOI HACKEADO!");
                setTimeout(() => setIsGlitched(false), msg.payload.duration || 5000);
            }
            if (msg.payload.effect === 'FREEZE') {
                setIsFrozen(true);
                setFeedbackText("SISTEMA CONGELADO!");
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
              // Eliminar 25% da range errada
              const range = visualMax - visualMin;
              const cutSize = Math.floor(range * 0.25);
              
              const distToMin = config.targetNumber - visualMin;
              const distToMax = visualMax - config.targetNumber;

              if (distToMin > distToMax) {
                  // Target is closer to Max, cut from Min
                  setVisualMin(prev => prev + cutSize);
                  setFeedbackText(`SCANNER: > ${visualMin + cutSize}`);
              } else {
                  // Target is closer to Min, cut from Max
                  setVisualMax(prev => prev - cutSize);
                  setFeedbackText(`SCANNER: < ${visualMax - cutSize}`);
              }
              break;

          case PowerUpType.GLITCH_BOMB:
              socketService.sendPowerUpEffect(config.roomId, 'GLITCH', 5000);
              setFeedbackText("GLITCH ENVIADO!");
              break;

          case PowerUpType.FREEZE_FRAME:
              socketService.sendPowerUpEffect(config.roomId, 'FREEZE', 5000);
              setFeedbackText("CONGELAMENTO ENVIADO!");
              break;

          case PowerUpType.DOUBLE_THREAD:
              setFeedbackText("MODO THREAD DUPLA ATIVO! (Use vírgula: 10,11)");
              // Logic is handled in handleGuess
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

    // Handle Double Thread
    let valuesToProcess: number[] = [];
    
    if (selectedActive === PowerUpType.DOUBLE_THREAD && activeUsed && guess.includes(',')) {
        // Parse "50,51"
        const parts = guess.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        valuesToProcess = parts.slice(0, 2); // Max 2
    } else {
        const val = parseInt(guess);
        if (isNaN(val)) return;
        valuesToProcess = [val];
    }

    // Process all guesses
    let finished = false;
    let newHistory = [...history];

    valuesToProcess.forEach(val => {
        if (finished) return; // If already won in the first part of a double guess

        if (newHistory.some(h => h.value === val)) {
            setFeedbackText("JÁ CHUTOU ESSE!");
            return;
        }

        const direction = processGuessValue(val);
        
        // PASSIVE: OVERCLOCK
        // Every 4th attempt is free (index 3, 7, 11...)
        // We calculate index based on current length BEFORE adding this one
        const isFreeAttempt = selectedPassive === PassiveType.OVERCLOCK && ((newHistory.length + 1) % 4 === 0);

        newHistory.push({ value: val, direction, freeAttempt: isFreeAttempt });
        setLastDirection(direction !== 'CORRECT' ? direction : null);

        if (direction === 'CORRECT') finished = true;

        // Feedback Text
        if (direction === 'HIGHER') {
            setFeedbackText(NEED_HIGHER_MESSAGES[Math.floor(Math.random() * NEED_HIGHER_MESSAGES.length)]);
        } else if (direction === 'LOWER') {
            setFeedbackText(NEED_LOWER_MESSAGES[Math.floor(Math.random() * NEED_LOWER_MESSAGES.length)]);
        }
    });

    setHistory(newHistory);
    setGuess('');

    if (finished) {
        // Calculate REAL score (excluding free attempts)
        const realAttempts = newHistory.filter(h => !h.freeAttempt).length;
        onFinish(realAttempts);
    }
  };

  // THERMAL SENSOR COLOR
  const getBorderColor = () => {
      if (selectedPassive !== PassiveType.THERMAL_SENSOR || history.length === 0) return 'border-white/10';
      const lastVal = history[history.length - 1].value;
      const dist = Math.abs(lastVal - config.targetNumber);
      const totalRange = config.maxRange - config.minRange;
      const percentage = dist / totalRange;

      if (percentage < 0.05) return 'border-red-500 shadow-[0_0_30px_red]'; // BOILING
      if (percentage < 0.15) return 'border-orange-400'; // HOT
      if (percentage < 0.3) return 'border-yellow-300'; // WARM
      return 'border-blue-400'; // COLD
  };

  const isWaiting = gameState === GameState.WAITING_RESULT;

  // -- LOADOUT SCREEN --
  if (!loadoutConfirmed) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 animate-pop-in">
              <h2 className="text-4xl font-black text-white mb-2">ESCOLHA SEU LOADOUT</h2>
              <p className="text-white/60 mb-8">Escolha 1 Hacker Tool e 1 Hardware Passivo</p>
              
              <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
                  {/* ACTIVE */}
                  <div className="bg-black/20 p-6 rounded-3xl border-2 border-bitwin-primary">
                      <h3 className="text-bitwin-primary font-bold mb-4 uppercase tracking-widest">⚡ TOOL (ATIVO)</h3>
                      <div className="grid grid-cols-1 gap-3">
                          {ACTIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedActive(p.id)}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedActive === p.id ? 'bg-bitwin-primary text-bitwin-bg border-white scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-3xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold">{p.name}</div>
                                      <div className="text-xs opacity-70">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* PASSIVE */}
                  <div className="bg-black/20 p-6 rounded-3xl border-2 border-bitwin-accent">
                      <h3 className="text-bitwin-accent font-bold mb-4 uppercase tracking-widest">💾 HARDWARE (PASSIVO)</h3>
                      <div className="grid grid-cols-1 gap-3">
                          {PASSIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedPassive(p.id)}
                                className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedPassive === p.id ? 'bg-bitwin-accent text-bitwin-bg border-white scale-105' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-3xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold">{p.name}</div>
                                      <div className="text-xs opacity-70">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <Button 
                className="mt-8 w-full max-w-md shadow-2xl" 
                size="lg" 
                disabled={!selectedActive || !selectedPassive}
                onClick={() => setLoadoutConfirmed(true)}
              >
                  CONFIRMAR LOADOUT
              </Button>
          </div>
      )
  }

  // -- MAIN GAME RENDER --

  return (
    <div className={`flex flex-col items-center min-h-screen p-4 max-w-6xl mx-auto w-full relative ${isGlitched ? 'glitch-effect' : ''}`}>
      
      {/* Mode Indicator */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-black/30 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border border-white/10 text-white/50 z-20">
          MODO {config.gameMode === 'HACKER' ? '⚡ HACKER' : '🛡️ CLÁSSICO'}
      </div>

      {/* VS Header */}
      <div className="flex justify-between items-center w-full mb-6 mt-6 max-w-3xl bg-bitwin-card/50 p-4 rounded-3xl border border-white/10 z-10">
        <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-bitwin-primary flex items-center justify-center text-bitwin-bg font-bold text-3xl border-4 border-white shadow-lg">
                {myAvatar}
            </div>
            <div className="flex flex-col text-left overflow-hidden">
                <span className="font-bold text-bitwin-primary text-xl uppercase truncate max-w-[100px] md:max-w-none">{myPlayerName}</span>
                {config.gameMode === 'HACKER' && (
                     <div className="flex gap-1 text-[10px] opacity-70">
                         <span>{ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.icon}</span>
                         <span>{PASSIVE_POWERUPS.find(p => p.id === selectedPassive)?.icon}</span>
                     </div>
                )}
            </div>
        </div>
        <div className="text-4xl font-black text-white italic transform -skew-x-12">VS</div>
        <div className="flex items-center gap-3">
             <span className="font-bold text-bitwin-secondary text-xl uppercase text-right truncate max-w-[100px] md:max-w-none">{opponentName}</span>
             <div className="w-14 h-14 rounded-full bg-bitwin-secondary flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg">
                {opponentAvatar}
            </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch justify-center lg:h-[600px] relative z-10">

          {/* MAIN GAME AREA */}
          <div className={`flex-1 w-full bg-bitwin-card border-4 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden order-2 lg:order-1 flex flex-col justify-center transition-colors duration-500 ${getBorderColor()} ${isFrozen ? 'freeze-effect' : ''}`}>
            
            {isWaiting ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                <div className="text-8xl mb-6">🏆</div>
                <h2 className="text-4xl font-black text-bitwin-primary mb-2">VOCÊ ACERTOU!</h2>
                <p className="text-white/60 text-xl font-medium">Aguardando {opponentName} terminar...</p>
                <div className="mt-8 bg-black/20 px-8 py-4 rounded-2xl">
                    <p className="text-white font-bold text-2xl">SEU SCORE: <span className="text-bitwin-accent">{history.filter(h => !h.freeAttempt).length}</span></p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-8">
                
                {/* Top Display: Ranges and Question Mark */}
                <div className="flex justify-center items-center gap-4 text-center">
                    <span className="text-4xl md:text-6xl font-black text-bitwin-accent transition-all">{visualMin}...</span>
                    <span className="text-6xl md:text-8xl font-black text-bitwin-primary transform rotate-12 drop-shadow-lg mx-2 md:mx-4">?</span>
                    <span className="text-4xl md:text-6xl font-black text-bitwin-secondary transition-all">...{visualMax}</span>
                </div>

                {/* Middle Section: Arrows and Input */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-4 relative">
                    
                    {/* Left Arrow (Need Higher) */}
                    <div className={`arrow-indicator flex-1 text-center transition-all duration-300 ${lastDirection === 'HIGHER' ? 'opacity-100 scale-110' : 'opacity-20 grayscale scale-90'}`}>
                        <div className="bg-bitwin-accent text-bitwin-bg w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full flex items-center justify-center text-5xl md:text-6xl shadow-[0_6px_0_#00b36b] mb-4">
                            ▲
                        </div>
                        <p className="text-bitwin-accent font-bold uppercase text-xs md:text-sm leading-tight min-h-[40px] px-2">
                            {lastDirection === 'HIGHER' ? feedbackText : ''}
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="flex-initial w-full md:w-auto z-10 order-first md:order-none relative">
                        {config.gameMode === 'HACKER' && !activeUsed && !isWaiting && (
                             <button 
                                onClick={activatePowerUp}
                                className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-bitwin-primary text-black font-black text-xs px-3 py-1 rounded-full uppercase tracking-widest shadow-lg hover:scale-110 transition-transform whitespace-nowrap z-20"
                             >
                                 ATIVAR {ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.name}
                             </button>
                        )}

                        <form onSubmit={handleGuess} className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-3xl border-2 border-white/5 relative">
                            <input
                                type={selectedActive === PowerUpType.DOUBLE_THREAD && activeUsed ? "text" : "number"}
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="?"
                                autoFocus
                                disabled={isFrozen}
                                className="w-40 h-24 bg-white text-bitwin-card text-center text-4xl md:text-6xl font-black rounded-2xl outline-none focus:ring-4 ring-bitwin-primary transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                            />
                            
                            <Button type="submit" variant="primary" size="lg" className="w-full shadow-xl" disabled={!guess || isFrozen}>
                                CHUTAR
                            </Button>
                        </form>
                    </div>

                    {/* Right Arrow (Need Lower) */}
                    <div className={`arrow-indicator flex-1 text-center transition-all duration-300 ${lastDirection === 'LOWER' ? 'opacity-100 scale-110' : 'opacity-20 grayscale scale-90'}`}>
                        <div className="bg-bitwin-secondary text-white w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full flex items-center justify-center text-5xl md:text-6xl shadow-[0_6px_0_#99003d] mb-4">
                            ▼
                        </div>
                        <p className="text-bitwin-secondary font-bold uppercase text-xs md:text-sm leading-tight min-h-[40px] px-2">
                            {lastDirection === 'LOWER' ? feedbackText : ''}
                        </p>
                    </div>
                </div>

            </div>
            )}
          </div>

          {/* SIDEBAR HISTORY */}
          <div className="w-full lg:w-72 bg-black/20 border-2 border-white/10 rounded-3xl p-4 flex flex-col order-3 lg:order-2 h-[400px] lg:h-auto self-stretch">
            <h3 className="text-center font-bold text-white/50 uppercase text-sm mb-4 tracking-widest border-b border-white/10 pb-2 flex-none">Histórico de Chutes</h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar min-h-0">
               {history.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm italic">
                       <span>Nenhum chute ainda...</span>
                   </div>
               )}
               {history.map((h, idx) => (
                   <div key={idx} className={`flex items-center justify-between bg-bitwin-bg/80 p-3 rounded-xl border animate-pop-in ${h.freeAttempt ? 'border-yellow-400/50' : 'border-white/5'}`}>
                       <span className="text-white/40 font-mono text-xs">#{idx + 1}</span>
                       <span className="text-2xl font-black text-white">{h.value}</span>
                       <div className="flex items-center gap-2">
                           {h.freeAttempt && <span title="Overclock Free Attempt" className="text-xs">⚡</span>}
                           {h.direction === 'HIGHER' && (
                               <span className="text-bitwin-accent font-bold text-xs bg-bitwin-accent/10 px-2 py-1 rounded">▲ SOBE</span>
                           )}
                           {h.direction === 'LOWER' && (
                               <span className="text-bitwin-secondary font-bold text-xs bg-bitwin-secondary/10 px-2 py-1 rounded">▼ DESCE</span>
                           )}
                           {h.direction === 'CORRECT' && (
                               <span className="text-bitwin-primary font-bold text-xs">★ ACERTOU</span>
                           )}
                       </div>
                   </div>
               ))}
               <div ref={historyEndRef} />
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/10 text-center flex-none">
                <span className="text-4xl font-black text-white">{history.filter(h => !h.freeAttempt).length}</span>
                <span className="block text-xs uppercase text-white/40 font-bold">Tentativas</span>
            </div>
          </div>

      </div>

      <div className="mt-8 text-white/10 text-xs font-bold font-mono">
        v2.1
      </div>

    </div>
  );
};