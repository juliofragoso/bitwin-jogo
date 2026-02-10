import React, { useState } from 'react';
import { Button } from './Button';
import { socketService } from '../services/socketService';

interface LobbyProps {
  onCreateGame: (roomId: string, playerName: string) => void;
  onJoinGame: (roomId: string, playerName: string) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'create'>('menu');

  const handleCreate = () => {
    if (!playerName.trim()) return;
    const newCode = socketService.generateRoomId();
    onCreateGame(newCode, playerName.trim().toUpperCase());
  };

  const handleJoin = () => {
    if (joinCode.length === 5 && playerName.trim()) {
      onJoinGame(joinCode.toUpperCase(), playerName.trim().toUpperCase());
    }
  };

  const NameInput = () => (
    <div className="space-y-2 text-left w-full">
      <label className="text-sm text-bitwin-primary font-bold ml-2">SEU NICKNAME</label>
      <input
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
        placeholder="EX: GORBINAL"
        className="w-full bg-bitwin-bg/50 border-2 border-white/20 focus:border-bitwin-primary text-white text-xl font-bold p-4 rounded-2xl outline-none transition-all placeholder-white/20 text-center"
        autoFocus
      />
      <div className="text-right text-xs text-white/40">{playerName.length}/15</div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      
      {/* Logo Area */}
      <div className="mb-8 transform rotate-[-2deg]">
        <h1 className="text-7xl md:text-9xl font-black text-bitwin-primary drop-shadow-[0_5px_0_#b38f00] stroke-black" style={{ WebkitTextStroke: '2px #2e003e' }}>
          BITWIN
        </h1>
        <div className="bg-bitwin-secondary text-white font-bold px-4 py-1 rounded-full inline-block transform rotate-[4deg] -mt-4 border-2 border-white/20 shadow-lg">
          QUEM CHUTA MELHOR?
        </div>
      </div>

      <div className="w-full max-w-md bg-bitwin-card border-4 border-white/10 p-8 rounded-[2rem] shadow-2xl relative">
        
        {/* Step 1: Menu */}
        {mode === 'menu' && (
          <div className="space-y-6 animate-pop-in">
             <NameInput />
             <div className="pt-4 space-y-4">
                <Button 
                    onClick={() => setMode('create')} 
                    disabled={!playerName}
                    variant="primary" 
                    size="lg" 
                    className="w-full"
                >
                CRIAR SALA
                </Button>
                <div className="flex items-center gap-4 opacity-50">
                    <div className="h-0.5 flex-1 bg-white/20"></div>
                    <span className="font-bold text-sm">OU</span>
                    <div className="h-0.5 flex-1 bg-white/20"></div>
                </div>
                <Button 
                    onClick={() => setMode('join')} 
                    disabled={!playerName}
                    variant="secondary" 
                    size="lg" 
                    className="w-full"
                >
                ENTRAR
                </Button>
            </div>
          </div>
        )}

        {/* Step 2: Create (Just confirmation, logic handles next) */}
        {mode === 'create' && (
          <div className="space-y-6 animate-pop-in">
             <div className="text-2xl font-bold mb-4">Olá, {playerName}!</div>
             <p className="text-white/60">Vamos criar uma sala para você desafiar alguém.</p>
             <Button onClick={handleCreate} variant="primary" size="lg" className="w-full">
               INICIAR LOBBY
             </Button>
             <button onClick={() => setMode('menu')} className="text-white/40 font-bold text-sm mt-4 hover:text-white">VOLTAR</button>
          </div>
        )}

        {/* Step 3: Join */}
        {mode === 'join' && (
          <div className="space-y-6 animate-pop-in">
            <div className="space-y-2 text-left">
              <label className="text-sm text-bitwin-accent font-bold ml-2">CÓDIGO DA SALA</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="A1B2C"
                className="w-full bg-bitwin-bg/50 border-2 border-white/20 focus:border-bitwin-accent text-white text-center text-4xl font-bold p-4 rounded-2xl outline-none transition-all placeholder-white/20 tracking-widest uppercase"
                autoFocus
              />
            </div>
            <Button 
              onClick={handleJoin} 
              disabled={joinCode.length !== 5} 
              variant="secondary" 
              size="lg" 
              className="w-full"
            >
              ENTRAR
            </Button>
            <button onClick={() => setMode('menu')} className="text-white/40 font-bold text-sm mt-4 hover:text-white">VOLTAR</button>
          </div>
        )}

      </div>
      
      <div className="mt-8 text-white/10 text-xs font-bold font-mono">
        v1.01
      </div>
    </div>
  );
};