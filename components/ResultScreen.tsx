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
  opponentName: string;
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
  opponentName,
  myAvatar,
  opponentAvatar
}) => {
  const [hasRequested, setHasRequested] = useState(false);
  const iWon = myAttempts < opponentAttempts;
  const isDraw = myAttempts === opponentAttempts;

  const handleRequestClick = () => {
      setHasRequested(true);
      onRestartRequest();
  }

  return (
    <div className="bg-cosmic min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {iWon ? <Confetti /> : !isDraw ? <Rain /> : null}

      {/* REMATCH MODAL */}
      {incomingRematchFrom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-6 animate-pop-in">
              <div className="glass-panel w-full max-w-sm p-6 flex flex-col gap-4 text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-bitwin-primary flex items-center justify-center text-3xl border-4 border-white">
                      {opponentAvatar}
                  </div>
                  <h2 className="text-2xl font-black text-white uppercase leading-tight">
                      {iWon ? `${incomingRematchFrom} QUER REVANCHE!` : "QUER TENTAR DE NOVO?"}
                  </h2>
                  <div className="flex flex-col gap-3 mt-2">
                      <Button onClick={onAcceptRematch} variant="cta">ACEITAR</Button>
                      <Button onClick={onDeclineRematch} variant="outline">RECUSAR</Button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Title */}
      <div className="relative mb-8 animate-pop-in z-10 flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-brand text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm filter drop-shadow-[0_4px_0_rgba(0,0,0,0.5)]">
          {iWon ? 'VITÓRIA!' : isDraw ? 'EMPATE!' : 'DERROTA!'}
        </h1>
        <div className={`mt-2 px-6 py-2 rounded-full border ${iWon ? 'bg-green-500/20 border-green-400 text-green-300' : 'bg-white/10 border-white/20 text-white'}`}>
             <span className="font-bold uppercase tracking-widest text-sm">
                 {iWon ? 'Parabéns!' : 'Mais sorte na próxima'}
             </span>
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-4 w-full max-w-md mb-8 items-end justify-center">
          {/* Opponent */}
          <div className={`glass-panel flex-1 p-4 flex flex-col items-center transition-transform ${!iWon && !isDraw ? 'scale-110 z-10 border-bitwin-success shadow-glow-gold' : 'opacity-70 scale-95'}`}>
              <div className="flex items-center gap-2 mb-1 opacity-50">
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
                      {opponentAvatar}
                  </div>
                  <div className="text-xs font-bold uppercase">{opponentName}</div>
              </div>
              <div className="text-4xl font-brand text-white">{opponentAttempts}</div>
              <div className="text-[10px] text-white/40 uppercase mt-1">Tentativas</div>
          </div>

          {/* Me */}
          <div className={`glass-panel flex-1 p-6 flex flex-col items-center transition-transform ${iWon ? 'scale-110 z-10 border-bitwin-primary shadow-glow-gold' : isDraw ? 'border-white' : 'opacity-70 scale-95'}`}>
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
                      {myAvatar}
                  </div>
                  <div className="text-sm font-bold uppercase text-white/50">Você</div>
              </div>
              <div className="text-6xl font-brand text-bitwin-primary drop-shadow-sm">{myAttempts}</div>
              <div className="text-[10px] text-white/40 uppercase mt-1">Tentativas</div>
          </div>
      </div>

      {/* Secret Number Reveal */}
      <div className="glass-panel px-10 py-4 mb-8 rotate-1 hover:rotate-0 transition-transform">
          <div className="text-center">
              <span className="text-[10px] font-bold uppercase text-white/40 tracking-widest">Número Secreto</span>
              <div className="text-6xl font-brand text-white drop-shadow-md">{targetNumber}</div>
          </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs flex flex-col gap-3 z-10">
        <Button 
            onClick={handleRequestClick} 
            variant="cta" 
            size="lg"
            className="w-full shadow-glow-pink"
            disabled={hasRequested}
        >
            {hasRequested ? 'AGUARDANDO...' : (iWon ? 'JOGAR DE NOVO' : 'PEDIR REVANCHE')}
        </Button>
        <Button onClick={onExit} variant="outline" className="w-full">SAIR</Button>
      </div>

    </div>
  );
};