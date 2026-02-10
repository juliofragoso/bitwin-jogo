import React from 'react';
import { Button } from './Button';

interface ResultScreenProps {
  myAttempts: number;
  opponentAttempts: number;
  targetNumber: number;
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ 
  myAttempts, 
  opponentAttempts, 
  targetNumber,
  onRestart 
}) => {
  const iWon = myAttempts < opponentAttempts;
  const isDraw = myAttempts === opponentAttempts;

  // Solid cartoon-style text shadow instead of stroke
  const titleStyle = {
    textShadow: `
      3px 3px 0 #000,
      -2px -2px 0 #000,  
      2px -2px 0 #000,
      -2px 2px 0 #000,
      2px 2px 0 #000,
      0 8px 0 rgba(0,0,0,0.2)
    `
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      
      <div className="relative mb-12 animate-pop-in">
        <h1 className="text-7xl md:text-9xl font-black text-white mb-4 tracking-wider" style={titleStyle}>
          {iWon ? 'VITÓRIA!' : isDraw ? 'EMPATE!' : 'DERROTA!'}
        </h1>
        <p className="text-2xl text-white font-bold bg-black/30 inline-block px-8 py-3 rounded-full border-2 border-white/10 backdrop-blur-sm">
          {iWon ? 'MANDOU MUITO BEM!' : isDraw ? 'QUASE LÁ!' : 'TENTE DE NOVO!'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 w-full max-w-3xl mb-12 justify-center items-center h-64">
        
        {/* Opponent Card */}
        <div className={`order-2 md:order-1 flex flex-col justify-center items-center p-6 rounded-3xl border-4 bg-bitwin-card transition-all duration-500
            ${!iWon && !isDraw ? 'border-bitwin-primary scale-110 z-10 shadow-2xl h-60 w-56' : 'border-white/10 opacity-70 scale-95 h-48 w-48'}`}>
           <div className="text-sm uppercase font-bold text-white/50 mb-2">Oponente</div>
           <div className="text-5xl font-black text-white">{opponentAttempts}</div>
           <div className="text-xs uppercase font-bold text-white/30 mt-1">Tentativas</div>
        </div>

        {/* My Card */}
        <div className={`order-1 md:order-2 flex flex-col justify-center items-center p-8 rounded-[2.5rem] border-4 bg-bitwin-card transition-all duration-500
            ${iWon ? 'border-bitwin-accent scale-110 z-10 shadow-[0_0_40px_rgba(0,255,153,0.3)] h-64 w-60' : isDraw ? 'border-bitwin-primary h-64 w-60' : 'border-white/10 opacity-70 scale-95 h-48 w-48'}`}>
           <div className="text-lg uppercase font-bold text-white/50 mb-2">Você</div>
           <div className={`text-7xl font-black ${iWon ? 'text-bitwin-accent' : 'text-white'}`}>{myAttempts}</div>
           <div className="text-sm uppercase font-bold text-white/30 mt-2">Tentativas</div>
        </div>

      </div>

      <div className="bg-bitwin-card px-10 py-6 rounded-3xl mb-12 border-4 border-bitwin-primary shadow-xl rotate-1">
        <div className="text-white/60 font-bold uppercase text-sm mb-1">O NÚMERO SECRETO ERA</div>
        <div className="text-6xl font-black text-bitwin-primary drop-shadow-md">{targetNumber}</div>
      </div>

      <Button onClick={onRestart} size="lg" variant="primary" className="min-w-[250px] shadow-2xl animate-bounce-slight">
        JOGAR NOVAMENTE
      </Button>
    </div>
  );
};