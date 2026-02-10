import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GuessResult, GameState } from '../types';
import { Button } from './Button';

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

export const Game: React.FC<GameProps> = ({ config, onFinish, gameState, myPlayerName, myAvatar }) => {
  const [guess, setGuess] = useState<string>('');
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [lastDirection, setLastDirection] = useState<'HIGHER' | 'LOWER' | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Determine Opponent info
  const isMeHost = myPlayerName === config.hostName;
  const opponentName = isMeHost ? config.joinerName : config.hostName;
  const opponentAvatar = isMeHost ? config.joinerAvatar : config.hostAvatar;

  // Auto scroll history
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(guess);
    
    if (isNaN(val)) return;
    if (gameState !== GameState.PLAYING) return;

    // Check duplicate guess to avoid spamming
    if (history.some(h => h.value === val)) {
        setFeedbackText("VOCÊ JÁ CHUTOU ESSE!");
        setGuess('');
        return;
    }

    let direction: 'HIGHER' | 'LOWER' | 'CORRECT';

    if (val === config.targetNumber) {
      direction = 'CORRECT';
    } else if (val < config.targetNumber) {
      direction = 'HIGHER';
    } else {
      direction = 'LOWER';
    }

    const newResult: GuessResult = { value: val, direction };
    const newHistory = [...history, newResult];
    
    setHistory(newHistory);
    setLastDirection(direction !== 'CORRECT' ? direction : null);
    
    // Pick random message
    if (direction === 'HIGHER') {
      const randomMsg = NEED_HIGHER_MESSAGES[Math.floor(Math.random() * NEED_HIGHER_MESSAGES.length)];
      setFeedbackText(randomMsg);
    } else if (direction === 'LOWER') {
      const randomMsg = NEED_LOWER_MESSAGES[Math.floor(Math.random() * NEED_LOWER_MESSAGES.length)];
      setFeedbackText(randomMsg);
    }

    setGuess('');

    if (direction === 'CORRECT') {
      onFinish(newHistory.length);
    }
  };

  const isWaiting = gameState === GameState.WAITING_RESULT;

  return (
    <div className="flex flex-col items-center min-h-screen p-4 max-w-6xl mx-auto w-full">
      
      {/* VS Header */}
      <div className="flex justify-between items-center w-full mb-6 max-w-3xl bg-bitwin-card/50 p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-bitwin-primary flex items-center justify-center text-bitwin-bg font-bold text-3xl border-4 border-white shadow-lg">
                {myAvatar}
            </div>
            <span className="font-bold text-bitwin-primary text-xl uppercase truncate max-w-[100px] md:max-w-none">{myPlayerName}</span>
        </div>
        <div className="text-4xl font-black text-white italic transform -skew-x-12">VS</div>
        <div className="flex items-center gap-3">
             <span className="font-bold text-bitwin-secondary text-xl uppercase text-right truncate max-w-[100px] md:max-w-none">{opponentName}</span>
             <div className="w-14 h-14 rounded-full bg-bitwin-secondary flex items-center justify-center text-white font-bold text-3xl border-4 border-white shadow-lg">
                {opponentAvatar}
            </div>
        </div>
      </div>

      {/* Main Container - Fixed height on desktop to enforce scrolling instead of growing */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-stretch justify-center lg:h-[600px]">

          {/* MAIN GAME AREA */}
          <div className="flex-1 w-full bg-bitwin-card border-4 border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden order-2 lg:order-1 flex flex-col justify-center">
            
            {isWaiting ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                <div className="text-8xl mb-6">🏆</div>
                <h2 className="text-4xl font-black text-bitwin-primary mb-2">VOCÊ ACERTOU!</h2>
                <p className="text-white/60 text-xl font-medium">Aguardando {opponentName} terminar...</p>
                <div className="mt-8 bg-black/20 px-8 py-4 rounded-2xl">
                    <p className="text-white font-bold text-2xl">SEU SCORE: <span className="text-bitwin-accent">{history.length}</span></p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-8">
                
                {/* Top Display: Ranges and Question Mark */}
                <div className="flex justify-center items-center gap-4 text-center">
                    <span className="text-4xl md:text-6xl font-black text-bitwin-accent">{config.minRange}...</span>
                    <span className="text-6xl md:text-8xl font-black text-bitwin-primary transform rotate-12 drop-shadow-lg mx-2 md:mx-4">?</span>
                    <span className="text-4xl md:text-6xl font-black text-bitwin-secondary">...{config.maxRange}</span>
                </div>

                {/* Middle Section: Arrows and Input */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
                    
                    {/* Left Arrow (Need Higher) */}
                    <div className={`flex-1 text-center transition-all duration-300 ${lastDirection === 'HIGHER' ? 'opacity-100 scale-110' : 'opacity-20 grayscale scale-90'}`}>
                        <div className="bg-bitwin-accent text-bitwin-bg w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full flex items-center justify-center text-5xl md:text-6xl shadow-[0_6px_0_#00b36b] mb-4">
                            ▲
                        </div>
                        <p className="text-bitwin-accent font-bold uppercase text-xs md:text-sm leading-tight min-h-[40px] px-2">
                            {lastDirection === 'HIGHER' ? feedbackText : ''}
                        </p>
                    </div>

                    {/* Input Area */}
                    <div className="flex-initial w-full md:w-auto z-10 order-first md:order-none">
                        <form onSubmit={handleGuess} className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-3xl border-2 border-white/5">
                            <input
                                type="number"
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="?"
                                autoFocus
                                className="w-40 h-24 bg-white text-bitwin-card text-center text-6xl font-black rounded-2xl outline-none focus:ring-4 ring-bitwin-primary transition-all"
                            />
                            
                            <Button type="submit" variant="primary" size="lg" className="w-full shadow-xl" disabled={!guess}>
                                CHUTAR
                            </Button>
                        </form>
                    </div>

                    {/* Right Arrow (Need Lower) */}
                    <div className={`flex-1 text-center transition-all duration-300 ${lastDirection === 'LOWER' ? 'opacity-100 scale-110' : 'opacity-20 grayscale scale-90'}`}>
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
                   <div key={idx} className="flex items-center justify-between bg-bitwin-bg/80 p-3 rounded-xl border border-white/5 animate-pop-in">
                       <span className="text-white/40 font-mono text-xs">#{idx + 1}</span>
                       <span className="text-2xl font-black text-white">{h.value}</span>
                       <div className="flex items-center gap-2">
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
                <span className="text-4xl font-black text-white">{history.length}</span>
                <span className="block text-xs uppercase text-white/40 font-bold">Tentativas</span>
            </div>
          </div>

      </div>

      <div className="mt-8 text-white/10 text-xs font-bold font-mono">
        v1.06
      </div>

    </div>
  );
};