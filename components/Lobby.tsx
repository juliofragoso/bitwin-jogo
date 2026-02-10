import React, { useState } from 'react';
import { Button } from './Button';
import { socketService } from '../services/socketService';
import { GameMode } from '../types';

interface LobbyProps {
  onCreateGame: (roomId: string, playerName: string, avatar: string, gameMode: GameMode) => void;
  onJoinGame: (roomId: string, playerName: string, avatar: string) => void;
}

const AVATARS = ['🤖', '😍', '🔥', '😒', '🥱', '🥶', '👺', '👽', '💩'];

export const Lobby: React.FC<LobbyProps> = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(AVATARS[0]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'create'>('menu');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('CLASSIC');

  const handleCreate = () => {
    if (!playerName.trim()) return;
    const newCode = socketService.generateRoomId();
    onCreateGame(newCode, playerName.trim().toUpperCase(), playerAvatar, selectedGameMode);
  };

  const handleJoin = () => {
    if (joinCode.length === 5 && playerName.trim()) {
      onJoinGame(joinCode.toUpperCase(), playerName.trim().toUpperCase(), playerAvatar);
    }
  };

  const NameInput = () => (
    <div className="space-y-2 text-left w-full relative">
      <label className="text-sm text-bitwin-primary font-bold ml-2">SEU NICKNAME & AVATAR</label>
      <div className="flex gap-2">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            placeholder="EX: GORBINAL"
            className="flex-1 bg-bitwin-bg/50 border-2 border-white/20 focus:border-bitwin-primary text-white text-xl font-bold p-4 rounded-2xl outline-none transition-all placeholder-white/20 text-center"
            autoFocus
          />
          <button 
            className="w-20 bg-bitwin-bg/50 border-2 border-white/20 hover:border-bitwin-primary rounded-2xl text-4xl flex items-center justify-center transition-all active:scale-95"
            onClick={() => setShowAvatarSelector(!showAvatarSelector)}
          >
            {playerAvatar}
          </button>
      </div>

      {showAvatarSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bitwin-bg border-4 border-bitwin-primary rounded-2xl p-4 shadow-2xl z-50 animate-pop-in grid grid-cols-5 gap-2">
              {AVATARS.map(av => (
                  <button
                    key={av}
                    onClick={() => { setPlayerAvatar(av); setShowAvatarSelector(false); }}
                    className={`text-3xl p-2 rounded-xl hover:bg-white/10 transition-colors ${playerAvatar === av ? 'bg-white/20 ring-2 ring-bitwin-primary' : ''}`}
                  >
                      {av}
                  </button>
              ))}
          </div>
      )}

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

        {/* Step 2: Create (Mode Selection) */}
        {mode === 'create' && (
          <div className="space-y-6 animate-pop-in">
             <div className="text-2xl font-bold mb-2">Olá, {playerName}!</div>
             <p className="text-white/60 mb-4">Escolha o modo de jogo:</p>
             
             <div className="grid grid-cols-2 gap-4">
                 <button 
                    onClick={() => setSelectedGameMode('CLASSIC')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${selectedGameMode === 'CLASSIC' ? 'bg-white/10 border-bitwin-primary scale-105 shadow-xl' : 'bg-black/20 border-white/10 opacity-60 hover:opacity-100'}`}
                 >
                     <div className="text-4xl">🛡️</div>
                     <div className="font-bold text-sm">CLÁSSICO</div>
                     <div className="text-[10px] text-white/50 leading-tight">Lógica pura. Sem poderes.</div>
                 </button>

                 <button 
                    onClick={() => setSelectedGameMode('HACKER')}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${selectedGameMode === 'HACKER' ? 'bg-white/10 border-bitwin-accent scale-105 shadow-xl' : 'bg-black/20 border-white/10 opacity-60 hover:opacity-100'}`}
                 >
                     <div className="text-4xl">⚡</div>
                     <div className="font-bold text-sm">HACKER</div>
                     <div className="text-[10px] text-white/50 leading-tight">Com poderes e caos! (Beta)</div>
                 </button>
             </div>

             <div className="pt-4">
                <Button onClick={handleCreate} variant="primary" size="lg" className="w-full">
                INICIAR LOBBY
                </Button>
             </div>
             
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
        v2.06
      </div>
    </div>
  );
};