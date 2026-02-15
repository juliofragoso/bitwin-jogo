import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { socketService } from '../services/socketService';
import { GameMode } from '../types';

interface LobbyProps {
  onCreateGame: (roomId: string, playerName: string, avatar: string, gameMode: GameMode) => void;
  onJoinGame: (roomId: string, playerName: string, avatar: string) => void;
}

const AVATARS = ['🤖', '😍', '🔥', '😒', '🥱', '🥶', '👺', '👽', '💩', '🦄', '🐲', '👻'];

export const Lobby: React.FC<LobbyProps> = ({ onCreateGame, onJoinGame }) => {
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState(AVATARS[0]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'join' | 'create'>('menu');
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('CLASSIC');

  // Ad Manager Logic
  const [versionClickCount, setVersionClickCount] = useState(0);
  const [showAdManager, setShowAdManager] = useState(false);
  const [adCode, setAdCode] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('BITWIN_AD_CODE');
    if (saved) setAdCode(saved);
  }, []);

  const handleVersionClick = () => {
    setVersionClickCount(prev => prev + 1);
    if (versionClickCount + 1 >= 10) {
      setShowAdManager(true);
      setVersionClickCount(0);
    }
  };

  const saveAdCode = () => {
    localStorage.setItem('BITWIN_AD_CODE', adCode);
    alert('Código salvo! Recarregue a página para ativar.');
    setShowAdManager(false);
    window.location.reload();
  };

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

  const LogoSection = () => (
      <div className="relative z-10 flex flex-col items-center mb-8 transform hover:scale-105 transition-transform duration-500">
          {/* Logo without the stroke class, relying on global CSS drop-shadows */}
          <h1 className="text-7xl md:text-8xl logo-3d tracking-wide text-center leading-none">
              BITWIN
          </h1>
          <div className="bg-bitwin-cta border border-white/30 shadow-glow-pink px-4 py-1 rounded-full -mt-2 transform -rotate-2 relative z-20">
              <span className="text-white font-black text-[10px] md:text-sm uppercase tracking-widest drop-shadow-md">
                  Quem chuta melhor?
              </span>
          </div>
      </div>
  );

  return (
    <div className="bg-cosmic min-h-[100dvh] flex flex-col items-center relative overflow-hidden font-sans">
      
      {/* Background stars are now handled by body/bg-cosmic CSS in index.html */}

      {/* --- SECRET AD MANAGER --- */}
      {showAdManager && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl p-6">
             <h2 className="text-2xl font-mono font-black text-green-400 mb-4">ADMIN ADS</h2>
             <textarea 
                className="w-full h-64 bg-black/50 border border-white/20 text-green-400 font-mono text-xs p-4 rounded-xl outline-none"
                value={adCode}
                onChange={(e) => setAdCode(e.target.value)}
             />
             <div className="flex gap-4 mt-4">
                <Button variant="outline" onClick={() => setShowAdManager(false)}>CANCELAR</Button>
                <button onClick={saveAdCode} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl">SALVAR</button>
             </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col h-full justify-center min-h-[100dvh] py-8">
        
        <LogoSection />

        {/* --- GLASS CONTAINER --- */}
        <div className="glass-panel p-1 w-full animate-pop-in relative overflow-visible">
            {/* Inner Border Container */}
            <div className="bg-[#240046]/40 rounded-[28px] p-6 lg:p-8 border border-white/5 shadow-inner-highlight flex flex-col items-center gap-6">

                {mode === 'menu' && (
                    <>
                        <div className="w-full text-center">
                             <p className="text-white/60 text-sm font-bold uppercase tracking-widest">Digite seu Nickname</p>
                        </div>
                        
                        {/* SIDE-BY-SIDE LAYOUT: Avatar + Input */}
                        <div className="flex flex-row items-center gap-4 w-full">
                            
                            {/* Avatar (Left) */}
                            <div className="relative shrink-0">
                                <button 
                                    onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                                    className="w-16 h-16 rounded-full bg-gradient-to-b from-[#4cc9f0] to-[#4361ee] p-0.5 shadow-lg border-2 border-white/30 hover:scale-105 transition-transform"
                                >
                                    <div className="w-full h-full bg-black/10 rounded-full flex items-center justify-center text-3xl shadow-inner backdrop-blur-sm">
                                        {playerAvatar}
                                    </div>
                                </button>
                                {/* Edit Icon */}
                                <div className="absolute bottom-0 right-0 bg-white text-[#240046] rounded-full p-1 shadow-md pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                    </svg>
                                </div>

                                {/* Avatar Popover */}
                                {showAvatarSelector && (
                                    <div className="absolute top-full left-0 mt-3 w-64 bg-[#3c096c] border-2 border-white/20 rounded-xl p-3 grid grid-cols-4 gap-2 shadow-2xl z-50 animate-pop-in">
                                        {AVATARS.map(av => (
                                            <button
                                                key={av}
                                                onClick={() => { setPlayerAvatar(av); setShowAvatarSelector(false); }}
                                                className={`text-2xl p-2 rounded-lg hover:bg-white/10 transition-colors ${playerAvatar === av ? 'bg-white/20' : ''}`}
                                            >
                                                {av}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Input (Right) */}
                            <input
                                type="text"
                                value={playerName}
                                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                                className="w-full h-14 bg-[#10002b]/60 border-2 border-[#3c096c] focus:border-bitwin-primary rounded-2xl px-4 text-center text-white text-xl font-bold placeholder-white/20 outline-none transition-all shadow-inner"
                                placeholder="Seu Nome"
                            />

                        </div>

                        {/* Buttons */}
                        <div className="w-full flex flex-col gap-3 mt-2">
                            <Button 
                                onClick={() => setMode('create')} 
                                disabled={!playerName}
                                variant="primary"
                                size="lg"
                                className={`w-full ${!playerName ? 'opacity-50 grayscale' : ''}`}
                            >
                                CRIAR SALA
                            </Button>

                            <Button 
                                onClick={() => setMode('join')} 
                                disabled={!playerName}
                                variant="cta"
                                size="lg"
                                className={`w-full ${!playerName ? 'opacity-50 grayscale' : ''}`}
                            >
                                ENTRAR
                            </Button>
                        </div>
                    </>
                )}

                {mode === 'create' && (
                    <div className="w-full flex flex-col items-center gap-4 animate-pop-in">
                        <h2 className="text-xl font-black text-white uppercase drop-shadow-md">Escolha o Modo</h2>
                        <div className="grid grid-cols-2 gap-3 w-full">
                             <button 
                                onClick={() => setSelectedGameMode('CLASSIC')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group ${selectedGameMode === 'CLASSIC' ? 'bg-bitwin-primary/20 border-bitwin-primary shadow-glow-gold' : 'bg-black/20 border-white/10 opacity-70'}`}
                            >
                                <span className="text-3xl">🛡️</span>
                                <span className="font-bold text-xs uppercase text-white">Clássico</span>
                            </button>
                            <button 
                                onClick={() => setSelectedGameMode('HACKER')}
                                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden group ${selectedGameMode === 'HACKER' ? 'bg-bitwin-cta/20 border-bitwin-cta shadow-glow-pink' : 'bg-black/20 border-white/10 opacity-70'}`}
                            >
                                <span className="text-3xl">⚡</span>
                                <span className="font-bold text-xs uppercase text-white">Hacker</span>
                            </button>
                        </div>
                        <Button onClick={handleCreate} variant="primary" className="w-full mt-2">INICIAR</Button>
                        <button onClick={() => setMode('menu')} className="text-white/40 font-bold text-xs uppercase hover:text-white mt-2">Voltar</button>
                    </div>
                )}

                {mode === 'join' && (
                    <div className="w-full flex flex-col items-center gap-4 animate-pop-in">
                        <h2 className="text-xl font-black text-white uppercase drop-shadow-md">Código da Sala</h2>
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 5))}
                            placeholder="A1B2C"
                            className="w-full bg-[#10002b]/60 border-2 border-bitwin-cta focus:shadow-glow-pink rounded-xl py-4 text-center text-4xl font-brand font-black text-white tracking-[0.2em] uppercase outline-none"
                            autoFocus
                        />
                        <Button 
                            onClick={handleJoin} 
                            disabled={joinCode.length !== 5}
                            variant="cta"
                            className="w-full mt-2"
                        >
                            ENTRAR NA SALA
                        </Button>
                        <button onClick={() => setMode('menu')} className="text-white/40 font-bold text-xs uppercase hover:text-white mt-2">Voltar</button>
                    </div>
                )}

            </div>
        </div>

        {/* Footer */}
        <div 
          onClick={handleVersionClick}
          className="mt-6 text-white/20 text-xs font-bold font-mono text-center cursor-pointer hover:text-white/50"
        >
          v2.13 {versionClickCount > 0 && versionClickCount < 10 && `(${10 - versionClickCount})`}
        </div>

        <div className="mt-auto pt-4 w-full flex justify-center pb-safe">
             <div className="bg-black/30 border border-white/10 rounded-lg w-full h-[50px] flex items-center justify-center">
                 <span className="text-white/20 text-[10px] font-bold tracking-widest uppercase">Advertisement</span>
             </div>
        </div>
      </div>

    </div>
  );
};