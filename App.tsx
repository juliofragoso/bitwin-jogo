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
             
             // Host determines the game mode from the config if it exists (rematch) or from selection (not available here in rematch logic directly, but handled in initializeGame)
             // However, for a fresh start, we need to know the mode. 
             // IMPORTANT: In a rematch, we reuse the previous mode.
             const mode = gameConfigRef.current?.gameMode || 'CLASSIC'; // Default to Classic if unknown, but usually passed via closure or state if fresh.
             
             // Actually, when Host creates the room, they selected a mode. We need to store that mode in a ref or state to use it here when someone joins.
             // We'll trust that gameConfigRef has it if it's a rematch, but if it's the FIRST game, gameConfig is null.
             // We need to store the "Pending Game Mode" chosen in Lobby.
             // Since we don't have a separate state for "Hosted Mode", we can grab it from the component state if we are creating.
             // But handleCreateGame sets up the room. We should save the mode there.
             // Fix: We will check `gameConfigRef` for Rematch, but for new games we need the mode.
             // Since `initializeGame` is called here, we need to pass the mode.
             // We'll rely on a temporary storage or just the fact that `handleCreateGame` set something up? No, `handleCreateGame` just joins the socket channel.
             // Let's modify `handleCreateGame` to store the chosen mode in a ref.
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
            <div className="flex flex-col items-center justify-center min-h-screen bg-bitwin-bg text-white animate-fade-in p-6">
               <div className="bg-bitwin-card border-4 border-white/10 p-10 rounded-3xl text-center shadow-2xl w-full max-w-md">
                   <div className="text-6xl mb-6 animate-bounce">
                        {myAvatar}
                   </div>
                   <h2 className="text-2xl font-bold mb-2 uppercase text-white/70">
                       {statusMessage === 'AGUARDANDO O HOST INICIAR...' ? 'Conectado!' : 'Aguarde'}
                   </h2>
                   
                   {statusMessage.startsWith('CÓDIGO') ? (
                       <div className="my-6">
                           <div className="flex items-center justify-center gap-3">
                               <div className="text-5xl font-black text-bitwin-primary bg-black/20 p-4 rounded-xl border-2 border-dashed border-white/20 select-all tracking-widest">
                                   {roomId}
                               </div>
                               <button 
                                   onClick={handleCopyCode}
                                   className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white p-4 rounded-xl transition-all border-2 border-white/10 flex items-center justify-center h-20 w-20 text-3xl"
                                   title="Copiar código"
                               >
                                   {isCopied ? '✅' : '📋'}
                               </button>
                           </div>
                           {isCopied && <p className="text-green-400 text-sm font-bold mt-2 animate-pulse">Código copiado!</p>}
                       </div>
                   ) : (
                       <div className="text-xl font-bold text-bitwin-primary my-6">
                           {statusMessage}
                       </div>
                   )}
                   
                   {statusMessage.startsWith('CÓDIGO') && (
                       <p className="text-white/50 text-sm">Compartilhe o código acima para jogar.</p>
                   )}
                   
                   {statusMessage === 'AGUARDANDO O HOST INICIAR...' && (
                        <p className="text-bitwin-accent text-xs mt-2 animate-pulse">Enviando sinal para o host...</p>
                   )}

                   <button onClick={() => resetGame(true)} className="mt-8 text-red-400 font-bold underline hover:text-red-300">
                       CANCELAR
                   </button>
               </div>
               <div className="mt-8 text-white/10 text-xs font-bold font-mono">
                  v2.0
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