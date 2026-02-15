import { useState, useEffect, useCallback, useRef } from 'react';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { ResultScreen } from './components/ResultScreen';
import { GameState, GameConfig, SocketMessage, GameMode } from './types';
import { socketService } from './services/socketService';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [myPlayerName, setMyPlayerName] = useState<string>('');
  const [myAvatar, setMyAvatar] = useState<string>('🤖');
  
  // Scoring
  const [myAttempts, setMyAttempts] = useState<number>(0);
  const [opponentAttempts, setOpponentAttempts] = useState<number | null>(null);

  // Rematch State
  const [incomingRematchRequest, setIncomingRematchRequest] = useState<string | null>(null);

  // Status message for waiting room
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Refs to handle race conditions in event listeners
  const roomIdRef = useRef('');
  const isHostRef = useRef(false);
  const myNameRef = useRef('');
  const myAvatarRef = useRef('');
  const gameStateRef = useRef<GameState>(GameState.LOBBY);
  const gameConfigRef = useRef<GameConfig | null>(null);

  // --- AD INJECTION ---
  useEffect(() => {
    try {
        const adCode = localStorage.getItem('BITWIN_AD_CODE');
        if (adCode) {
            console.log("Injecting Ads...");
            // Extract script src if it's a script tag, or creates a generic script element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = adCode;
            
            const scripts = tempDiv.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                const script = document.createElement('script');
                if (scripts[i].src) script.src = scripts[i].src;
                if (scripts[i].innerHTML) script.innerHTML = scripts[i].innerHTML;
                if (scripts[i].async) script.async = true;
                if (scripts[i].crossOrigin) script.crossOrigin = scripts[i].crossOrigin;
                document.head.appendChild(script);
            }
        }
    } catch (e) {
        console.error("Failed to inject ads", e);
    }
  }, []);


  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
      gameConfigRef.current = gameConfig;
  }, [gameConfig]);

  const handleSocketMessage = useCallback((msg: SocketMessage) => {
    const currentRoomId = roomIdRef.current;
    const currentIsHost = isHostRef.current;
    const currentName = myNameRef.current;
    const currentAvatar = myAvatarRef.current;

    console.log('Msg:', msg.type, 'CurrRoom:', currentRoomId);

    switch (msg.type) {
      case 'JOIN':
        if (currentIsHost && msg.payload.roomId === currentRoomId) {
          if (gameStateRef.current === GameState.LOBBY || gameStateRef.current === GameState.GAME_OVER) {
             console.log('Host received JOIN, starting game...');
             const joinerName = msg.payload.playerName;
             const joinerAvatar = msg.payload.playerAvatar || '👽';
             
             // Host determines the game mode from the config if it exists (rematch) or from selection 
             // stored in pendingGameModeRef via handleCreateGame
             initializeGame(currentRoomId, currentName, currentAvatar, joinerName, joinerAvatar);
          } else {
             console.log('Ignored JOIN because game is already in progress');
          }
        }
        break;

      case 'START_GAME':
        if (msg.payload.roomId === currentRoomId) {
             console.log('Received START_GAME');
             
             // Reset round state
             setMyAttempts(0);
             setOpponentAttempts(null);
             setIncomingRematchRequest(null);

             setGameConfig({
               minRange: msg.payload.minRange,
               maxRange: msg.payload.maxRange,
               targetNumber: msg.payload.targetNumber,
               roomId: msg.payload.roomId,
               hostName: msg.payload.hostName,
               joinerName: msg.payload.joinerName,
               hostAvatar: msg.payload.hostAvatar,
               joinerAvatar: msg.payload.joinerAvatar,
               gameMode: msg.payload.gameMode,
             });
             setGameState(GameState.PLAYING);
             setRoomId(msg.payload.roomId);
        }
        break;

      case 'PLAYER_FINISHED':
        if (msg.payload.roomId === currentRoomId) {
          setOpponentAttempts(msg.payload.attempts);
        }
        break;

      case 'REMATCH_REQUEST':
          if (msg.payload.roomId === currentRoomId) {
              setIncomingRematchRequest(msg.payload.requesterName);
          }
          break;
      
      case 'REMATCH_ACCEPTED':
          if (msg.payload.roomId === currentRoomId) {
              // Opponent accepted my request (or Joiner accepted Host's logic)
              // If I am Host, I should start the game now.
              if (currentIsHost && gameConfigRef.current) {
                  const cfg = gameConfigRef.current;
                  initializeGame(cfg.roomId, cfg.hostName, cfg.hostAvatar, cfg.joinerName, cfg.joinerAvatar, cfg.gameMode);
              }
          }
          break;

      case 'REMATCH_DECLINED':
          if (msg.payload.roomId === currentRoomId) {
              alert("Oponente recusou a revanche.");
              resetGame(true);
          }
          break;
    }
  }, []); 

  useEffect(() => {
    const unsubscribe = socketService.subscribe(handleSocketMessage);
    return unsubscribe;
  }, [handleSocketMessage]);

  useEffect(() => {
    if (gameState === GameState.WAITING_RESULT && opponentAttempts !== null) {
      setGameState(GameState.GAME_OVER);
    } else if (opponentAttempts !== null && gameState === GameState.PLAYING) {
        // Opponent finished, waiting for me
    }
  }, [gameState, opponentAttempts]);

  // Store the mode selected by Host during creation
  const pendingGameModeRef = useRef<GameMode>('CLASSIC');

  // Host Logic: Create numbers and broadcast start
  const initializeGame = (activeRoomId: string, hostName: string, hostAvatar: string, joinerName: string, joinerAvatar: string, specificMode?: GameMode) => {
    const minRange = Math.floor(Math.random() * 15) + 1;
    const maxRange = Math.floor(Math.random() * (110 - 90 + 1)) + 90;
    const targetNumber = Math.floor(Math.random() * (maxRange - minRange - 1)) + minRange + 1;
    
    // Use passed mode (Rematch) OR pending mode (First game)
    const gameMode = specificMode || pendingGameModeRef.current;

    const config = { 
        minRange, maxRange, targetNumber, 
        hostName, joinerName,
        hostAvatar, joinerAvatar,
        gameMode 
    };
    
    // Broadcast START_GAME to everyone in the room (including self)
    socketService.startGame(activeRoomId, config); 
    
    // Manually set state for HOST because socketService filters out own messages
    setMyAttempts(0);
    setOpponentAttempts(null);
    setIncomingRematchRequest(null);
    setGameConfig({ ...config, roomId: activeRoomId });
    setGameState(GameState.PLAYING);
    setRoomId(activeRoomId);
  };

  const handleCreateGame = async (newCode: string, name: string, avatar: string, gameMode: GameMode) => {
    roomIdRef.current = newCode;
    isHostRef.current = true;
    myNameRef.current = name;
    myAvatarRef.current = avatar;
    pendingGameModeRef.current = gameMode;

    setRoomId(newCode);
    setIsHost(true);
    setMyPlayerName(name);
    setMyAvatar(avatar);
    setStatusMessage(`CRIANDO SALA...`);
    setIsCopied(false);
    
    // Initialize Host Peer
    await socketService.host(newCode, name);
    setStatusMessage(`CÓDIGO: ${newCode}`);
  };

  const handleJoinGame = async (code: string, name: string, avatar: string) => {
    roomIdRef.current = code;
    isHostRef.current = false;
    myNameRef.current = name;
    myAvatarRef.current = avatar;

    setRoomId(code);
    setIsHost(false);
    setMyPlayerName(name);
    setMyAvatar(avatar);
    setStatusMessage('CONECTANDO À SALA...');
    
    try {
        await socketService.joinRoom(code, name, avatar);
        // The service now handles the retry loop for JOIN
        setStatusMessage('AGUARDANDO O HOST INICIAR...');
    } catch (e) {
        console.error(e);
        setStatusMessage('ERRO AO ENTRAR. TENTE NOVAMENTE.');
        setTimeout(() => resetGame(true), 3000);
    }
  };

  const handleFinishGame = (attempts: number) => {
    setMyAttempts(attempts);
    socketService.sendFinished(roomIdRef.current, attempts);
    
    if (opponentAttempts !== null) {
      setGameState(GameState.GAME_OVER);
    } else {
      setGameState(GameState.WAITING_RESULT);
    }
  };

  const resetGame = (fullDisconnect: boolean = true) => {
      setGameState(GameState.LOBBY);
      setGameConfig(null);
      
      setMyAttempts(0);
      setOpponentAttempts(null);
      setIncomingRematchRequest(null);
      setStatusMessage('');
      setIsCopied(false);

      if (fullDisconnect) {
        setRoomId('');
        roomIdRef.current = '';
        setIsHost(false);
        isHostRef.current = false;
        socketService.disconnect();
      }
  }

  // --- Rematch Handlers ---

  const handleRequestRematch = () => {
      socketService.requestRematch(roomId, myPlayerName);
  }

  const handleAcceptRematch = () => {
      // If Host accepts, Host initializes game immediately
      if (isHost && gameConfig) {
          initializeGame(gameConfig.roomId, gameConfig.hostName, gameConfig.hostAvatar, gameConfig.joinerName, gameConfig.joinerAvatar, gameConfig.gameMode);
      } else {
          // If Joiner accepts, send Accepted msg so Host can start
          socketService.acceptRematch(roomId);
      }
      setIncomingRematchRequest(null); // Clear modal
  }

  const handleDeclineRematch = () => {
      socketService.declineRematch(roomId);
      setIncomingRematchRequest(null);
      resetGame(true); // Decliner goes back to lobby
  }


  const handleCopyCode = () => {
      navigator.clipboard.writeText(roomId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  // --- RENDER ---

  if (gameState === GameState.LOBBY) {
    if (statusMessage) {
        return (
            <div className="bg-cosmic min-h-[100dvh] flex flex-col lg:flex-row items-center justify-between overflow-hidden relative">
               
               {/* --- DESKTOP LEFT AD (Skyscraper) --- */}
               <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none z-10 p-4 h-screen sticky top-0">
                  <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group backdrop-blur-sm">
                     <img 
                       src="https://placehold.co/160x600/2e003e/ffcc00?text=WAITING+AD+L" 
                       alt="Advertisement Left" 
                       className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                     />
                  </div>
               </div>

               {/* --- CENTER CONTENT (Updated to Cosmic/Glass Style) --- */}
               <div className="flex-1 flex flex-col items-center justify-center h-full w-full relative z-20 p-6 overflow-y-auto animate-fade-in">
                   
                   <div className="glass-panel p-10 w-full max-w-md flex flex-col items-center text-center shadow-2xl relative">
                       
                       {/* Avatar Ring */}
                       <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4cc9f0] to-[#4361ee] p-0.5 shadow-glow-gold mb-6 animate-bounce-slight">
                           <div className="w-full h-full bg-black/10 rounded-full flex items-center justify-center text-6xl shadow-inner backdrop-blur-sm">
                               {myAvatar}
                           </div>
                       </div>

                       {/* Status Title */}
                       <h2 className="text-xl font-bold mb-4 uppercase text-white/80 tracking-widest">
                           {statusMessage === 'AGUARDANDO O HOST INICIAR...' ? 'Conectado!' : 'Sua Sala'}
                       </h2>
                       
                       {statusMessage.startsWith('CÓDIGO') ? (
                           <div className="w-full mb-8">
                               <div className="bg-[#150029]/80 border-2 border-[#3c096c] rounded-2xl p-4 flex flex-col items-center gap-2 shadow-inner-highlight relative overflow-hidden group">
                                   <div className="text-[10px] text-white/30 uppercase font-black tracking-[0.3em]">Código da Sala</div>
                                   <div className="flex items-center gap-3">
                                      <span className="text-5xl font-brand text-bitwin-primary drop-shadow-md tracking-wider">
                                          {roomId}
                                      </span>
                                      <button 
                                          onClick={handleCopyCode}
                                          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors border border-white/10 active:scale-95"
                                      >
                                          {isCopied ? '✓' : '📋'}
                                      </button>
                                   </div>
                               </div>
                               <p className="text-white/40 text-xs mt-3 font-bold animate-pulse">Compartilhe o código para jogar</p>
                           </div>
                       ) : (
                           <div className="text-xl font-bold text-bitwin-primary my-6 animate-pulse">
                               {statusMessage}
                           </div>
                       )}

                       {statusMessage === 'AGUARDANDO O HOST INICIAR...' && (
                           <div className="flex gap-2 justify-center mb-6">
                              <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></span>
                              <span className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></span>
                           </div>
                       )}

                       <button onClick={() => resetGame(true)} className="text-white/30 font-bold text-xs uppercase hover:text-red-400 transition-colors border-b border-transparent hover:border-red-400 pb-0.5">
                           Cancelar e Voltar
                       </button>
                   </div>
                   
                   <div className="mt-8 text-white/10 text-xs font-bold font-mono flex-none">
                      v2.13
                   </div>

                    {/* --- MOBILE BOTTOM AD (Banner) --- */}
                    <div className="lg:hidden flex-none w-full h-[60px] mt-4 flex items-center justify-center bg-black/20 border border-white/5 rounded-lg">
                        <span className="text-white/20 text-[10px] uppercase font-bold">Ad Banner</span>
                    </div>
               </div>

               {/* --- DESKTOP RIGHT AD (Skyscraper) --- */}
               <div className="hidden lg:flex flex-col justify-center items-center w-[180px] flex-none z-10 p-4 h-screen sticky top-0">
                  <div className="w-[160px] h-[600px] bg-black/20 border-2 border-white/5 rounded-xl overflow-hidden shadow-2xl flex items-center justify-center group backdrop-blur-sm">
                     <img 
                       src="https://placehold.co/160x600/2e003e/ff0066?text=WAITING+AD+R" 
                       alt="Advertisement Right" 
                       className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity"
                     />
                  </div>
               </div>

            </div>
        )
    }

    return <Lobby onCreateGame={handleCreateGame} onJoinGame={handleJoinGame} />;
  }

  if (gameState === GameState.GAME_OVER && gameConfig) {
    return (
      <ResultScreen 
        myAttempts={myAttempts}
        opponentAttempts={opponentAttempts || 0}
        targetNumber={gameConfig.targetNumber}
        onRestartRequest={handleRequestRematch}
        onAcceptRematch={handleAcceptRematch}
        onDeclineRematch={handleDeclineRematch}
        onExit={() => resetGame(true)}
        incomingRematchFrom={incomingRematchRequest}
        myPlayerName={myPlayerName}
        myAvatar={myAvatar}
        opponentName={myPlayerName === gameConfig.hostName ? gameConfig.joinerName : gameConfig.hostName}
        opponentAvatar={myPlayerName === gameConfig.hostName ? gameConfig.joinerAvatar : gameConfig.hostAvatar}
      />
    );
  }

  if (gameConfig) {
    return (
      <Game 
        config={gameConfig} 
        onFinish={handleFinishGame}
        gameState={gameState}
        myPlayerName={myPlayerName}
        myAvatar={myAvatar}
      />
    );
  }

  return <div>Carregando...</div>;
}