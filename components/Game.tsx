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
      if (selectedPassive !== PassiveType.THERMAL_SENSOR || history.length === 0) return 'border-white/10 lg:border-white/10';
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
              <h2 className="text-3xl md:text-5xl font-black text-white mb-2 text-center">ESCOLHA SEU LOADOUT</h2>
              <p className="text-white/60 mb-8 text-lg text-center">1 Tool Ativa + 1 Hardware Passivo</p>
              
              <div className="grid md:grid-cols-2 gap-6 w-full max-w-5xl mb-8">
                  {/* ACTIVE */}
                  <div className="bg-black/20 p-6 rounded-[2rem] border-4 border-bitwin-primary">
                      <h3 className="text-bitwin-primary font-bold mb-4 uppercase tracking-widest text-lg">⚡ TOOL (ATIVO)</h3>
                      <div className="grid grid-cols-1 gap-3">
                          {ACTIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedActive(p.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${selectedActive === p.id ? 'bg-bitwin-primary text-bitwin-bg border-white scale-102 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-4xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold text-lg">{p.name}</div>
                                      <div className="text-xs opacity-80 leading-tight">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* PASSIVE */}
                  <div className="bg-black/20 p-6 rounded-[2rem] border-4 border-bitwin-accent">
                      <h3 className="text-bitwin-accent font-bold mb-4 uppercase tracking-widest text-lg">💾 HARDWARE (PASSIVO)</h3>
                      <div className="grid grid-cols-1 gap-3">
                          {PASSIVE_POWERUPS.map(p => (
                              <button 
                                key={p.id}
                                onClick={() => setSelectedPassive(p.id)}
                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${selectedPassive === p.id ? 'bg-bitwin-accent text-bitwin-bg border-white scale-102 shadow-lg' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                              >
                                  <div className="text-4xl">{p.icon}</div>
                                  <div>
                                      <div className="font-bold text-lg">{p.name}</div>
                                      <div className="text-xs opacity-80 leading-tight">{p.desc}</div>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>

              <Button 
                className="w-full max-w-lg shadow-2xl mb-4" 
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
    <div className={`
        flex flex-row
        h-[100dvh] w-full
        lg:min-h-screen lg:h-auto 
        lg:items-start lg:justify-between
        bg-bitwin-bg 
        overflow-hidden
        ${isGlitched ? 'glitch-effect' : ''}
    `}>
      
      {/* --- DESKTOP LEFT AD (Skyscraper) --- */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none sticky top-0 h-screen p-4 z-0">
          <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group">
             <img 
               src="https://placehold.co/160x600/2e003e/ffcc00?text=SKYSCRAPER+AD+L" 
               alt="Advertisement Left" 
               className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
             />
          </div>
      </div>

      {/* --- CENTER GAME AREA --- */}
      <div className="flex-1 flex flex-col h-full max-w-7xl mx-auto w-full relative z-10 lg:py-2">

        {/* 1. HEADER - BRAND ROW (Mobile Only) */}
        <div className="flex-none flex justify-center py-2 lg:hidden">
            <div className="bg-bitwin-bg px-4 rounded-b-xl border-x-2 border-b-2 border-white/10 shadow-lg">
                <h1 className="text-3xl font-black text-bitwin-primary tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">BITWIN</h1>
            </div>
        </div>

        {/* 1. HEADER - PLAYER BAR */}
        <div className={`
            flex-none w-full z-20 relative
            bg-bitwin-card/90 border-b-2 border-white/10 px-4 py-2 shadow-md
            lg:bg-bitwin-card/50 lg:border-4 lg:border-white/10 lg:rounded-[2rem] lg:px-6 lg:py-3 lg:mb-4 lg:w-full lg:shadow-none
            flex justify-between items-center
        `}>
           {/* Desktop Logo (Hidden on Mobile) */}
           <div className="hidden lg:block absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-30">
                <div className="bg-bitwin-bg px-4 rounded-b-xl border-x-2 border-b-2 border-white/10 shadow-lg">
                    <h1 className="text-3xl font-black text-bitwin-primary tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">BITWIN</h1>
                </div>
           </div>

           {/* Me - CLEAN LOOK (No Circle) */}
           <div className="flex items-center gap-2 lg:gap-4 max-w-[40%]">
               {/* Just Emoji */}
               <div className="text-3xl lg:text-5xl filter drop-shadow-md">
                   {myAvatar}
               </div>
               {/* Text Info */}
               <div className="overflow-hidden text-left">
                   <div className="font-black text-white text-base lg:text-2xl uppercase truncate drop-shadow-md">{myPlayerName}</div>
                   {config.gameMode === 'HACKER' && (
                       <div className="flex gap-2 text-xs lg:text-base text-white/60">
                           <span>{ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.icon}</span>
                           <span>{PASSIVE_POWERUPS.find(p => p.id === selectedPassive)?.icon}</span>
                       </div>
                   )}
               </div>
           </div>

           {/* Center VS - ROUNDED BAR ADDED */}
           <div className="absolute left-1/2 transform -translate-x-1/2 text-center top-1/2 -translate-y-1/2">
               <div className="bg-black/30 border-2 border-white/10 rounded-full px-3 py-1 lg:px-4 lg:py-1 backdrop-blur-sm">
                   <div className="text-xl lg:text-3xl font-black italic text-white/50 leading-none">VS</div>
               </div>
           </div>

           {/* Opponent - CLEAN LOOK (No Circle) */}
           <div className="flex items-center justify-end gap-2 lg:gap-4 max-w-[40%]">
               <div className="text-right overflow-hidden">
                  <div className="font-black text-white text-base lg:text-2xl uppercase truncate drop-shadow-md">{opponentName}</div>
               </div>
               <div className="text-3xl lg:text-5xl filter drop-shadow-md">
                   {opponentAvatar}
               </div>
           </div>
        </div>

        {/* 2. GAME CONTENT WRAPPER */}
        <div className={`
           flex-1 w-full min-h-0
           flex flex-col lg:flex-row 
           lg:gap-6 lg:items-stretch lg:justify-center 
           lg:h-[calc(100vh-180px)] lg:flex-none
           lg:px-4
        `}>
           
           {/* LEFT PANEL: GAME INPUT */}
           <div className={`
               flex-none 
               p-4 pb-2
               flex flex-col justify-center items-center 
               transition-all duration-500 
               border-b border-white/10 
               lg:flex-1 lg:border-8 lg:border-white/10 lg:rounded-[3rem] lg:bg-bitwin-card lg:shadow-2xl lg:p-8
               relative z-10 
               ${getBorderColor()} 
               ${isFrozen ? 'freeze-effect' : ''}
           `}>
               
              {isWaiting ? (
                  <div className="flex flex-col items-center justify-center h-full text-center animate-pulse p-4">
                      <div className="text-8xl lg:text-9xl mb-6">🏆</div>
                      <h2 className="text-4xl lg:text-6xl font-black text-bitwin-primary mb-4">VOCÊ ACERTOU!</h2>
                      <p className="text-white/60 text-lg lg:text-3xl">Aguardando {opponentName}...</p>
                      <div className="mt-8 bg-black/20 px-10 py-4 rounded-3xl">
                          <p className="text-white font-bold text-2xl lg:text-4xl">SCORE: <span className="text-bitwin-accent">{history.filter(h => !h.freeAttempt).length}</span></p>
                      </div>
                  </div>
              ) : (
                  <div className="w-full max-w-xl flex flex-col gap-1 lg:gap-4">
                      
                      {/* RANGE DISPLAY (THE TARGET) */}
                      <div className="flex justify-center items-end gap-4 lg:gap-8 text-center py-2 lg:py-4">
                          <span className="text-6xl lg:text-7xl font-black text-bitwin-accent transition-all drop-shadow-lg leading-none mb-1 lg:mb-2">{visualMin}</span>
                          <div className="flex flex-col items-center justify-end mx-2">
                               <span className="text-[10px] lg:text-sm text-white/30 uppercase font-bold tracking-widest mb-1">ALVO</span>
                               <span className="text-6xl lg:text-8xl font-black text-bitwin-primary drop-shadow-[0_0_15px_rgba(255,204,0,0.5)] leading-none">?</span>
                          </div>
                          <span className="text-6xl lg:text-7xl font-black text-bitwin-secondary transition-all drop-shadow-lg leading-none mb-1 lg:mb-2">{visualMax}</span>
                      </div>

                      {/* FEEDBACK AREA */}
                      <div className="h-10 lg:h-14 flex items-center justify-center">
                          <p className={`font-black uppercase text-2xl lg:text-4xl animate-bounce tracking-wider ${lastDirection === 'HIGHER' ? 'text-bitwin-accent' : 'text-bitwin-secondary'}`}>
                              {feedbackText}
                          </p>
                      </div>

                      {/* Active Powerup Button (Hacker Mode) */}
                      {config.gameMode === 'HACKER' && !activeUsed && (
                          <div className="flex justify-center mb-2">
                              <button 
                                  onClick={activatePowerUp}
                                  className="bg-bitwin-primary text-black font-black text-xs lg:text-base px-6 py-2 rounded-full uppercase tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-transform border-2 border-white"
                              >
                                  ATIVAR {ACTIVE_POWERUPS.find(a => a.id === selectedActive)?.name}
                              </button>
                          </div>
                      )}

                      {/* INPUT CONTROLS (Narrower input, Bigger arrows) */}
                      <div className="relative">
                          {/* Container */}
                          <div className="flex items-center justify-center gap-6 lg:gap-8 bg-black/30 p-4 lg:p-6 rounded-[2rem] lg:rounded-[3rem] border-4 border-white/10 shadow-inner">
                              
                              {/* Up Arrow Feedback (Huge) */}
                              <div className={`transition-all duration-300 flex flex-col items-center flex-none ${lastDirection === 'HIGHER' ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                  <div className={`text-bitwin-accent text-5xl lg:text-7xl filter drop-shadow-[0_0_10px_#00ff99] ${lastDirection === 'HIGHER' ? 'animate-arrow-up' : ''}`}>▲</div>
                              </div>

                              {/* Form - Narrow Width */}
                              <form onSubmit={handleGuess} className="flex-none flex flex-col items-center gap-2">
                                  <input
                                      type={selectedActive === PowerUpType.DOUBLE_THREAD && activeUsed ? "text" : "number"}
                                      value={guess}
                                      onChange={(e) => setGuess(e.target.value)}
                                      placeholder="00"
                                      disabled={isFrozen}
                                      className="no-spinner w-32 lg:w-48 bg-white text-bitwin-card text-center text-6xl lg:text-7xl font-black rounded-xl lg:rounded-2xl h-16 lg:h-24 outline-none focus:ring-4 lg:focus:ring-8 ring-bitwin-primary transition-all disabled:bg-gray-400 placeholder-gray-300 shadow-inner"
                                  />
                                  <Button type="submit" variant="primary" size="md" className="w-full py-2 text-xl shadow-xl" disabled={!guess || isFrozen}>
                                      CHUTAR
                                  </Button>
                              </form>

                              {/* Down Arrow Feedback (Huge) */}
                              <div className={`transition-all duration-300 flex flex-col items-center flex-none ${lastDirection === 'LOWER' ? 'opacity-100' : 'opacity-20 grayscale'}`}>
                                  <div className={`text-bitwin-secondary text-5xl lg:text-7xl filter drop-shadow-[0_0_10px_#ff0066] ${lastDirection === 'LOWER' ? 'animate-arrow-down' : ''}`}>▼</div>
                              </div>
                          </div>
                      </div>

                  </div>
              )}
           </div>

           {/* RIGHT PANEL: HISTORY (COMPACT GRID) */}
           <div className={`
               flex-1 min-h-0
               bg-black/10 
               lg:flex-none lg:bg-black/20 lg:w-[400px] lg:rounded-[3rem] lg:border-4 lg:border-white/10 lg:p-6 lg:shadow-xl
               flex flex-col
               mt-4 lg:mt-0
           `}>
               {/* History Header */}
               <div className="bg-black/20 px-6 py-2 flex justify-between items-center border-b border-white/5 flex-none lg:bg-transparent lg:border-b-2 lg:border-white/10 lg:mb-4 lg:px-0">
                   <span className="text-white/60 font-black text-xs lg:text-lg uppercase tracking-widest">HISTÓRICO</span>
                   <div className="text-xs lg:text-base font-mono text-white/60">
                      <span className="text-white font-bold text-base lg:text-xl mr-2">{history.filter(h => !h.freeAttempt).length}</span> 
                      TENTATIVAS
                   </div>
               </div>

               {/* COMPACT GRID LIST */}
               <div className="flex-1 overflow-y-auto p-2 lg:p-2 custom-scrollbar">
                  {history.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-white/20 text-sm lg:text-lg italic">
                          <span>Aguardando...</span>
                      </div>
                  )}
                  {/* Grid Layout: 4 cols mobile, 3 cols desktop */}
                  <div className="grid grid-cols-4 lg:grid-cols-3 gap-2">
                      {history.map((h, idx) => (
                          <div key={idx} className={`relative flex flex-col items-center justify-center bg-bitwin-bg/90 p-2 rounded-xl border-2 ${h.freeAttempt ? 'border-yellow-400/50' : 'border-white/5'} animate-pop-in shadow-sm aspect-square`}>
                              {/* Direction Indicator (Corner) */}
                              <div className="absolute top-1 right-1">
                                  {h.direction === 'HIGHER' && <span className="text-bitwin-accent text-xs lg:text-sm">▲</span>}
                                  {h.direction === 'LOWER' && <span className="text-bitwin-secondary text-xs lg:text-sm">▼</span>}
                                  {h.direction === 'CORRECT' && <span className="text-bitwin-primary text-xs lg:text-sm">★</span>}
                              </div>
                              
                              <span className="text-white/30 font-mono text-[8px] absolute top-1 left-2">#{idx + 1}</span>
                              
                              {/* Increased Font Size for History Numbers */}
                              <span className={`text-4xl lg:text-5xl font-black ${
                                  h.direction === 'HIGHER' ? 'text-bitwin-accent' : 
                                  h.direction === 'LOWER' ? 'text-bitwin-secondary' : 'text-bitwin-primary'
                              }`}>
                                  {h.value}
                              </span>
                          </div>
                      ))}
                      <div ref={historyEndRef} />
                  </div>
               </div>
           </div>
        </div>
        
        {/* --- MOBILE BOTTOM AD (Banner) --- */}
        <div className="lg:hidden flex-none w-full h-[60px] bg-black/40 border-t-4 border-white/10 flex items-center justify-center p-1">
            <img 
               src="https://placehold.co/320x50/2e003e/ffcc00?text=MOBILE+BANNER+AD" 
               alt="Mobile Ad" 
               className="h-full object-contain opacity-80"
            />
        </div>

        <div className="hidden lg:block mt-2 text-white/10 text-xs font-bold font-mono text-center">
          v2.12
        </div>
      </div>

      {/* --- DESKTOP RIGHT AD (Skyscraper) --- */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none sticky top-0 h-screen p-4 z-0">
          <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group">
             <img 
               src="https://placehold.co/160x600/2e003e/ff0066?text=SKYSCRAPER+AD+R" 
               alt="Advertisement Right" 
               className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
             />
          </div>
      </div>

    </div>
  );
};