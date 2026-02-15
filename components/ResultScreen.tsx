import React, { useState } from 'react';
import { Button } from './Button';
import { Confetti } from './Confetti';
import { Rain } from './Rain';

interface ResultScreenProps {
  myAttempts: number;
  opponentAttempts: number;
  targetNumber: number;
  onRestartRequest: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onExit: () => void;
  incomingRematchFrom: string | null;
  myPlayerName: string;
  myAvatar: string;
  opponentAvatar: string;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ 
  myAttempts, 
  opponentAttempts, 
  targetNumber,
  onRestartRequest,
  onAcceptRematch,
  onDeclineRematch,
  onExit,
  incomingRematchFrom,
  myAvatar,
  opponentAvatar
}) => {
  const [hasRequested, setHasRequested] = useState(false);
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

  const handleRequestClick = () => {
      setHasRequested(true);
      onRestartRequest();
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center relative overflow-hidden">
      
      {iWon ? <Confetti /> : !isDraw ? <Rain /> : null}

      {/* REMATCH MODAL OVERLAY */}
      {incomingRematchFrom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
              <div className="bg-bitwin-card border-4 border-bitwin-primary p-8 rounded-[2rem] shadow-2xl max-w-md w-full relative">
                  {/* Avatar Icon */}
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 bg-bitwin-primary rounded-full border-4 border-bitwin-card flex items-center justify-center text-4xl shadow-lg">
                      {opponentAvatar}
                  </div>
                  
                  <div className="mt-8 mb-6">
                      <h2 className="text-3xl font-black text-white uppercase leading-tight mb-2">
                          {iWon 
                            ? `${incomingRematchFrom} QUER UMA REVANCHE` 
                            : "ELE QUER TE HUMILHAR NOVAMENTE"}
                      </h2>
                      <p className="text-white/60 font-bold">
                          {iWon ? "Vai encarar ou fugir?" : "Vai aceitar o desafio?"}
                      </p>
                  </div>

                  <div className="flex flex-col gap-3">
                      <Button onClick={onAcceptRematch} variant="primary" size="lg" className="w-full shadow-xl">
                          {iWon ? "ACEITO" : "ACEITO"}
                      </Button>
                      <Button onClick={onDeclineRematch} variant="danger" size="md" className="w-full opacity-80 hover:opacity-100">
                          {iWon ? "OUTRA HORA" : "VOU NADA!"}
                      </Button>
                  </div>
              </div>
          </div>
      )}

      <div className="relative mb-8 animate-pop-in z-10">
        <h1 className="text-6xl md:text-9xl font-black text-white mb-4 tracking-wider" style={titleStyle}>
          {iWon ? 'VITÓRIA!' : isDraw ? 'EMPATE!' : 'DERROTA!'}
        </h1>
        <p className="text-xl md:text-2xl text-white font-bold bg-black/30 inline-block px-8 py-3 rounded-full border-2 border-white/10 backdrop-blur-sm">
          {iWon ? 'MANDOU MUITO BEM!' : isDraw ? 'QUASE LÁ!' : 'TENTE DE NOVO!'}
        </p>
      </div>

      {/* SCORE CARDS: Row on both Mobile and Desktop */}
      <div className="flex flex-row gap-4 w-full max-w-3xl mb-12 justify-center items-end h-auto md:h-64 z-10">
        
        {/* Opponent Card */}
        <div className={`flex flex-col justify-center items-center p-4 md:p-6 rounded-3xl border-4 bg-bitwin-card transition-all duration-500
            ${!iWon && !isDraw ? 'border-bitwin-primary z-10 shadow-2xl scale-110' : 'border-white/10 opacity-70 scale-95'}`}>
           <div className="text-[10px] md:text-sm uppercase font-bold text-white/50 mb-1">Oponente</div>
           <div className="text-4xl md:text-5xl font-black text-white">{opponentAttempts}</div>
           <div className="flex items-center gap-1 md:gap-2 text-white/50 mt-2 bg-black/20 px-2 py-1 rounded-full">
               <span className="text-base md:text-xl">{opponentAvatar}</span>
               <span className="text-[8px] md:text-xs uppercase font-bold">Tentativas</span>
           </div>
        </div>

        {/* My Card */}
        <div className={`flex flex-col justify-center items-center p-5 md:p-8 rounded-[2.5rem] border-4 bg-bitwin-card transition-all duration-500
            ${iWon ? 'border-bitwin-accent z-10 shadow-[0_0_40px_rgba(0,255,153,0.3)] scale-110' : isDraw ? 'border-bitwin-primary' : 'border-white/10 opacity-70 scale-95'}`}>
           <div className="text-xs md:text-lg uppercase font-bold text-white/50 mb-1">Você</div>
           <div className={`text-6xl md:text-7xl font-black ${iWon ? 'text-bitwin-accent' : 'text-white'}`}>{myAttempts}</div>
           <div className="flex items-center gap-2 text-white/50 mt-2 bg-black/20 px-2 py-1 md:px-3 md:py-1 rounded-full">
               <span className="text-lg md:text-xl">{myAvatar}</span>
               <span className="text-[10px] md:text-xs uppercase font-bold">Tentativas</span>
           </div>
        </div>

      </div>

      <div className="bg-bitwin-card px-8 py-4 md:px-10 md:py-6 rounded-3xl mb-12 border-4 border-bitwin-primary shadow-xl rotate-1 z-10">
        <div className="text-white/60 font-bold uppercase text-xs md:text-sm mb-1">O NÚMERO SECRETO ERA</div>
        <div className="text-5xl md:text-6xl font-black text-bitwin-primary drop-shadow-md">{targetNumber}</div>
      </div>

      <div className="w-full max-w-2xl flex flex-col md:flex-row justify-center gap-4 z-10">
        <Button 
            onClick={handleRequestClick} 
            size="lg" 
            variant="primary" 
            className="w-full md:w-auto md:min-w-[250px] shadow-2xl animate-bounce-slight"
            disabled={hasRequested}
        >
            {hasRequested 
                ? 'AGUARDANDO O OUTRO...' 
                : (iWon ? 'JOGAR NOVAMENTE' : 'PEDIR REVANCHE')
            }
        </Button>
        
        <Button 
            onClick={onExit} 
            size="lg" 
            variant="outline" 
            className="w-full md:w-auto md:min-w-[150px] shadow-xl"
        >
            SAIR
        </Button>
      </div>

      <div className="mt-8 text-white/10 text-xs font-bold font-mono">
        v2.10
      </div>
    </div>
  );
};