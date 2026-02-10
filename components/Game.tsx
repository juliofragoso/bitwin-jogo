import React, { useState, useRef, useEffect } from 'react';
import { GameConfig, GuessResult, GameState } from '../types';
import { Button } from './Button';

interface GameProps {
  config: GameConfig;
  onFinish: (attempts: number) => void;
  gameState: GameState;
  myPlayerName: string;
}

const HIGHER_MESSAGES = [
  "PODE SUBIR ESSE CHUTE AÍ...",
  "MAIS BAIXO QUE BARRIGA DE COBRA...",
  "SOBE! SOBE! SOBE!",
  "TÁ COM MEDO DE ALTURA? AUMENTA!",
  "MUITO POUCO, PÕE MAIS!",
  "IXI, TÁ LONGE. PÕE FERMENTO!"
];

const LOWER_MESSAGES = [
  "TEU CHUTE FOI MAIS ALTO QUE EVEREST...",
  "CALMA ASTRONAUTA, DESCE PRA TERRA!",
  "MENOS... BEM MENOS.",
  "TÁ CHUTANDO A LUA? BAIXA A BOLA.",
  "EXAGEROU! DIMINUI ISSO AÍ.",
  "PASSOU LONGE... PRA CIMA!" // Note: 'Pra cima' referring to "go back up" contextually usually means increase, but here it's funny irony or just "back to reality". Let's stick to "Desce daí!"
];

export const Game: React.FC<GameProps> = ({ config, onFinish, gameState, myPlayerName }) => {
  const [guess, setGuess] = useState<string>('');
  const [history, setHistory] = useState<GuessResult[]>([]);
  const [lastDirection, setLastDirection] = useState<'HIGHER' | 'LOWER' | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine Opponent Name
  const opponentName = myPlayerName === config.hostName ? config.joinerName : config.hostName;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(guess);
    
    if (isNaN(val)) return;
    if (gameState !== GameState.PLAYING) return;

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
      const randomMsg = HIGHER_MESSAGES[Math.floor(Math.random() * HIGHER_MESSAGES.length)];
      setFeedbackText(randomMsg);
    } else if (direction === 'LOWER') {
      const randomMsg = LOWER_MESSAGES[Math.floor(Math.random() * LOWER_MESSAGES.length)];
      setFeedbackText(randomMsg);
    }

    setGuess('');

    if (direction === 'CORRECT') {
      onFinish(newHistory.length);
    }
  };

  const isWaiting = gameState === GameState.WAITING_RESULT;

  return (
    <div className="flex flex-col items-center min-h-screen p-4 max-w-5xl mx-auto w-full">
      
      {/* VS Header */}
      <div className="flex justify-between items-center w-full mb-8 max-w-3xl bg-bitwin-card/50 p-4 rounded-3xl border border-white/10">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-bitwin-primary flex items-center justify-center text-bitwin-bg font-bold text-xl border-2 border-white">
                👤
            </div>
            <span className="font-bold text-bitwin-primary text-xl uppercase">{myPlayerName} (VOCÊ)</span>
        </div>
        <div className="text-4xl font-black text-white italic transform -skew-x-12">VS</div>
        <div className="flex items-center gap-3">
             <span className="font-bold text-bitwin-secondary text-xl uppercase text-right">{opponentName}</span>
             <div className="w-10 h-10 rounded-full bg-bitwin-secondary flex items-center justify-center text-white font-bold text-xl border-2 border-white">
                👤
            </div>
        </div>
      </div>

      <div className="w-full max-w-4xl bg-bitwin-card border-4 border-white/10 rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        
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
                <span className="text-5xl md:text-6xl font-black text-bitwin-accent">{config.minRange}...</span>
                <span className="text-7xl md:text-8xl font-black text-bitwin-primary transform rotate-12 drop-shadow-lg mx-4">?</span>
                <span className="text-5xl md:text-6xl font-black text-bitwin-secondary">...{config.maxRange}</span>
            </div>

            {/* Middle Section: Arrows and Input */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mt-4">
                
                {/* Left Arrow (Higher) */}
                <div className={`flex-1 text-center transition-opacity duration-300 ${lastDirection === 'HIGHER' ? 'opacity-100 scale-110' : 'opacity-30 grayscale'}`}>
                     <div className="bg-bitwin-accent text-bitwin-bg w-24 h-24 mx-auto rounded-full flex items-center justify-center text-6xl shadow-[0_6px_0_#00b36b] mb-4">
                        ▲
                     </div>
                     <p className="text-bitwin-accent font-bold uppercase text-sm md:text-base leading-tight min-h-[48px]">
                        {lastDirection === 'HIGHER' ? feedbackText : '...'}
                     </p>
                </div>

                {/* Input Area */}
                <div className="flex-initial w-full md:w-auto z-10">
                    <form onSubmit={handleGuess} className="flex flex-col items-center gap-4 bg-black/20 p-6 rounded-3xl border-2 border-white/5">
                        <div className="bg-bitwin-bg px-6 py-2 rounded-xl text-white font-bold text-2xl min-w-[120px] text-center shadow-inner">
                            {history.length > 0 ? history[history.length - 1].value : '--'}
                        </div>
                        
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

                {/* Right Arrow (Lower) */}
                 <div className={`flex-1 text-center transition-opacity duration-300 ${lastDirection === 'LOWER' ? 'opacity-100 scale-110' : 'opacity-30 grayscale'}`}>
                     <div className="bg-bitwin-secondary text-white w-24 h-24 mx-auto rounded-full flex items-center justify-center text-6xl shadow-[0_6px_0_#99003d] mb-4">
                        ▼
                     </div>
                     <p className="text-bitwin-secondary font-bold uppercase text-sm md:text-base leading-tight min-h-[48px]">
                        {lastDirection === 'LOWER' ? feedbackText : '...'}
                     </p>
                </div>
            </div>

            {/* Footer: Attempt Counter */}
            <div className="flex justify-center mt-4">
                <div className="bg-bitwin-bg/50 px-6 py-3 rounded-full border border-white/10">
                    <span className="text-white/70 font-bold uppercase mr-2">Você já palpitou</span>
                    <span className="text-2xl font-black text-white bg-white/10 px-3 py-0.5 rounded-lg">{history.length}</span>
                    <span className="text-white/70 font-bold uppercase ml-2">vezes</span>
                </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};