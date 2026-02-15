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
    <div className="space-y-2 lg:space-y-3 text-left w-full relative">
      <label className="text-sm lg:text-lg text-bitwin-primary font-bold ml-2 uppercase tracking-wide">Seu Nickname & Avatar</label>
      <div className="flex gap-2 lg:gap-3">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
            placeholder="EX: GORBINAL"
            className="flex-1 bg-bitwin-bg/50 border-4 border-white/20 focus:border-bitwin-primary text-white text-xl lg:text-3xl font-bold p-4 lg:p-4 rounded-2xl outline-none transition-all placeholder-white/20 text-center uppercase"
            autoFocus
          />
          <button 
            className="w-20 lg:w-24 bg-bitwin-bg/50 border-4 border-white/20 hover:border-bitwin-primary rounded-2xl text-4xl lg:text-5xl flex items-center justify-center transition-all active:scale-95 shadow-lg"
            onClick={() => setShowAvatarSelector(!showAvatarSelector)}
          >
            {playerAvatar}
          </button>
      </div>

      {showAvatarSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bitwin-bg border-4 border-bitwin-primary rounded-3xl p-4 lg:p-4 shadow-2xl z-50 animate-pop-in grid grid-cols-5 gap-2 lg:gap-2">
              {AVATARS.map(av => (
                  <button
                    key={av}
                    onClick={() => { setPlayerAvatar(av); setShowAvatarSelector(false); }}
                    className={`text-3xl lg:text-4xl p-2 rounded-xl hover:bg-white/10 transition-colors ${playerAvatar === av ? 'bg-white/20 ring-4 ring-bitwin-primary' : ''}`}
                  >
                      {av}
                  </button>
              ))}
          </div>
      )}

      <div className="text-right text-xs lg:text-sm font-bold text-white/40">{playerName.length}/15</div>
    </div>
  );

  return (
    <div className="flex flex-row h-[100dvh] lg:min-h-screen lg:items-center lg:justify-between bg-bitwin-bg overflow-hidden lg:overflow-visible text-center">
      
      {/* --- DESKTOP LEFT AD (Skyscraper) --- */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none sticky top-0 h-screen p-4 z-0">
          <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group">
             <img 
               src="https://placehold.co/160x600/2e003e/ffcc00?text=LOBBY+AD+L" 
               alt="Advertisement Left" 
               className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
             />
          </div>
      </div>

      {/* --- CENTER CONTENT --- */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center h-full w-full relative z-10 p-4 pt-8 lg:p-4 overflow-y-auto custom-scrollbar">
        
        {/* Logo Area - Scaled down for mobile & desktop */}
        <div className="mb-8 lg:mb-8 transform rotate-[-2deg] flex-none">
          <h1 className="text-6xl md:text-8xl lg:text-8xl font-black text-bitwin-primary drop-shadow-[0_4px_0_#b38f00] lg:drop-shadow-[0_6px_0_#b38f00] stroke-black leading-none" style={{ WebkitTextStroke: '2px #2e003e' }}>
            BITWIN
          </h1>
          <div className="bg-bitwin-secondary text-white font-bold text-sm lg:text-xl px-4 py-1 lg:px-5 lg:py-1 rounded-full inline-block transform rotate-[4deg] -mt-4 lg:-mt-4 border-2 lg:border-4 border-white/20 shadow-xl">
            QUEM CHUTA MELHOR?
          </div>
        </div>

        <div className="w-full max-w-lg lg:max-w-xl bg-bitwin-card border-4 lg:border-8 border-white/10 p-6 lg:p-8 rounded-[2rem] lg:rounded-[2.5rem] shadow-2xl relative flex-none mb-auto lg:mb-0">
          
          {/* Step 1: Menu */}
          {mode === 'menu' && (
            <div className="space-y-6 lg:space-y-6 animate-pop-in">
              <NameInput />
              <div className="pt-2 lg:pt-4 space-y-3 lg:space-y-4">
                  <Button 
                      onClick={() => setMode('create')} 
                      disabled={!playerName}
                      variant="primary" 
                      size="lg" 
                      className="w-full text-xl lg:text-2xl py-4 lg:py-4 shadow-xl"
                  >
                  CRIAR SALA
                  </Button>
                  <div className="flex items-center gap-4 opacity-50">
                      <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
                      <span className="font-black text-lg lg:text-xl">OU</span>
                      <div className="h-1 flex-1 bg-white/20 rounded-full"></div>
                  </div>
                  <Button 
                      onClick={() => setMode('join')} 
                      disabled={!playerName}
                      variant="secondary" 
                      size="lg" 
                      className="w-full text-xl lg:text-2xl py-4 lg:py-4 shadow-xl"
                  >
                  ENTRAR
                  </Button>
              </div>
            </div>
          )}

          {/* Step 2: Create (Mode Selection) */}
          {mode === 'create' && (
            <div className="space-y-6 lg:space-y-6 animate-pop-in">
              <div className="text-2xl lg:text-4xl font-black mb-2 lg:mb-2">Olá, {playerName}!</div>
              <p className="text-white/60 mb-4 lg:mb-4 text-base lg:text-lg font-bold">Escolha o modo de jogo:</p>
              
              <div className="grid grid-cols-2 gap-4 lg:gap-4">
                  <button 
                      onClick={() => setSelectedGameMode('CLASSIC')}
                      className={`p-4 lg:p-4 rounded-[2rem] border-4 transition-all duration-300 flex flex-col items-center gap-2 lg:gap-2 ${selectedGameMode === 'CLASSIC' ? 'bg-white/10 border-bitwin-primary scale-105 shadow-2xl' : 'bg-black/20 border-white/10 opacity-60 hover:opacity-100'}`}
                  >
                      <div className="text-5xl lg:text-6xl">🛡️</div>
                      <div className="font-black text-lg lg:text-xl">CLÁSSICO</div>
                      <div className="text-[10px] lg:text-xs text-white/50 leading-tight">Lógica pura.<br/>Sem poderes.</div>
                  </button>

                  <button 
                      onClick={() => setSelectedGameMode('HACKER')}
                      className={`p-4 lg:p-4 rounded-[2rem] border-4 transition-all duration-300 flex flex-col items-center gap-2 lg:gap-2 ${selectedGameMode === 'HACKER' ? 'bg-white/10 border-bitwin-accent scale-105 shadow-2xl' : 'bg-black/20 border-white/10 opacity-60 hover:opacity-100'}`}
                  >
                      <div className="text-5xl lg:text-6xl">⚡</div>
                      <div className="font-black text-lg lg:text-xl">HACKER</div>
                      <div className="text-[10px] lg:text-xs text-white/50 leading-tight">Com poderes<br/>e caos! (Beta)</div>
                  </button>
              </div>

              <div className="pt-2 lg:pt-4">
                  <Button onClick={handleCreate} variant="primary" size="lg" className="w-full text-xl lg:text-2xl py-4 lg:py-4 shadow-xl">
                  INICIAR LOBBY
                  </Button>
              </div>
              
              <button onClick={() => setMode('menu')} className="text-white/40 font-black text-base lg:text-base mt-2 hover:text-white uppercase tracking-widest">VOLTAR</button>
            </div>
          )}

          {/* Step 3: Join */}
          {mode === 'join' && (
            <div className="space-y-6 lg:space-y-6 animate-pop-in">
              <div className="space-y-3 lg:space-y-4 text-left">
                <label className="text-base lg:text-lg text-bitwin-accent font-bold ml-2">CÓDIGO DA SALA</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                  placeholder="A1B2C"
                  className="w-full bg-bitwin-bg/50 border-4 border-white/20 focus:border-bitwin-accent text-white text-center text-5xl lg:text-6xl font-black p-4 lg:p-4 rounded-3xl outline-none transition-all placeholder-white/20 tracking-widest uppercase"
                  autoFocus
                />
              </div>
              <Button 
                onClick={handleJoin} 
                disabled={joinCode.length !== 5} 
                variant="secondary" 
                size="lg" 
                className="w-full text-xl lg:text-2xl py-4 lg:py-4 shadow-xl"
              >
                ENTRAR NA SALA
              </Button>
              <button onClick={() => setMode('menu')} className="text-white/40 font-black text-base lg:text-base mt-2 hover:text-white uppercase tracking-widest">VOLTAR</button>
            </div>
          )}

        </div>
        
        <div className="mt-4 lg:mt-4 text-white/10 text-xs lg:text-sm font-bold font-mono flex-none">
          v2.13
        </div>

        {/* --- MOBILE BOTTOM AD (Banner) --- */}
        <div className="lg:hidden flex-none w-full h-[60px] mt-4 flex items-center justify-center">
            <img 
               src="https://placehold.co/320x50/2e003e/ffcc00?text=MOBILE+LOBBY+AD" 
               alt="Mobile Ad" 
               className="h-full object-contain opacity-80"
            />
        </div>

      </div>

      {/* --- DESKTOP RIGHT AD (Skyscraper) --- */}
      <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none sticky top-0 h-screen p-4 z-0">
          <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group">
             <img 
               src="https://placehold.co/160x600/2e003e/ff0066?text=LOBBY+AD+R" 
               alt="Advertisement Right" 
               className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
             />
          </div>
      </div>

    </div>
  );
};