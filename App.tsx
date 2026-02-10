import { useState, useEffect, useCallback, useRef } from 'react';
import { Lobby } from './components/Lobby';
import { Game } from './components/Game';
import { ResultScreen } from './components/ResultScreen';
import { GameState, GameConfig, SocketMessage } from './types';
import { socketService } from './services/socketService';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.LOBBY);
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [roomId, setRoomId] = useState<string>('');
  const [, setIsHost] = useState<boolean>(false);
  const [myPlayerName, setMyPlayerName] = useState<string>('');
  
  // Scoring
  const [myAttempts, setMyAttempts] = useState<number>(0);
  const [opponentAttempts, setOpponentAttempts] = useState<number | null>(null);

  // Status message for waiting room
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Refs to handle race conditions in event listeners
  const roomIdRef = useRef('');
  const isHostRef = useRef(false);
  const myNameRef = useRef('');
  const gameStateRef = useRef<GameState>(GameState.LOBBY);

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const handleSocketMessage = useCallback((msg: SocketMessage) => {
    const currentRoomId = roomIdRef.current;
    const currentIsHost = isHostRef.current;
    const currentName = myNameRef.current;

    console.log('Msg:', msg.type, 'CurrRoom:', currentRoomId);

    switch (msg.type) {
      case 'JOIN':
        // Host receives JOIN from Joiner
        // ONLY accept JOIN if we are currently in LOBBY (prevents resetting game on retry-packets)
        if (currentIsHost && msg.payload.roomId === currentRoomId) {
          if (gameStateRef.current === GameState.LOBBY || gameStateRef.current === GameState.GAME_OVER) {
             console.log('Host received JOIN, starting game...');
             const joinerName = msg.payload.playerName;
             initializeGame(currentRoomId, currentName, joinerName);
          } else {
             // If we are already playing, we should probably re-send the START_GAME config 
             // in case the joiner missed it (Handshake Ack), but for now, let's just ignore to prevent reset.
             // Ideally, we would cache the config and resend it here.
             console.log('Ignored JOIN because game is already in progress');
          }
        }
        break;

      case 'START_GAME':
        // Joiner receives START_GAME
        if (!currentIsHost && msg.payload.roomId === currentRoomId) {
             console.log('Joiner received START_GAME');
             setGameConfig({
               minRange: msg.payload.minRange,
               maxRange: msg.payload.maxRange,
               targetNumber: msg.payload.targetNumber,
               roomId: msg.payload.roomId,
               hostName: msg.payload.hostName,
               joinerName: msg.payload.joinerName
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
      
      case 'RESTART':
        if(msg.payload.roomId === currentRoomId) {
           resetGame(false); // Do not disconnect peer, just reset UI
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

  // Host Logic: Create numbers and broadcast start
  const initializeGame = (activeRoomId: string, hostName: string, joinerName: string) => {
    const minRange = Math.floor(Math.random() * 15) + 1;
    const maxRange = Math.floor(Math.random() * (110 - 90 + 1)) + 90;
    const targetNumber = Math.floor(Math.random() * (maxRange - minRange - 1)) + minRange + 1;

    const config = { minRange, maxRange, targetNumber, hostName, joinerName };
    
    socketService.startGame(activeRoomId, config); 
    
    setGameConfig({ ...config, roomId: activeRoomId });
    setGameState(GameState.PLAYING);
    setStatusMessage('');
  };

  const handleCreateGame = async (newCode: string, name: string) => {
    roomIdRef.current = newCode;
    isHostRef.current = true;
    myNameRef.current = name;

    setRoomId(newCode);
    setIsHost(true);
    setMyPlayerName(name);
    setStatusMessage(`CRIANDO SALA...`);
    setIsCopied(false);
    
    // Initialize Host Peer
    await socketService.host(newCode, name);
    setStatusMessage(`CÓDIGO: ${newCode}`);
  };

  const handleJoinGame = async (code: string, name: string) => {
    roomIdRef.current = code;
    isHostRef.current = false;
    myNameRef.current = name;

    setRoomId(code);
    setIsHost(false);
    setMyPlayerName(name);
    setStatusMessage('CONECTANDO À SALA...');
    
    try {
        await socketService.joinRoom(code, name);
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

  const handleRestart = () => {
      socketService.restartGame(roomIdRef.current);
      resetGame(false);
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
                   <div className="text-6xl mb-6 animate-bounce">⏳</div>
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
        onRestart={handleRestart}
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
      />
    );
  }

  return <div>Carregando...</div>;
}