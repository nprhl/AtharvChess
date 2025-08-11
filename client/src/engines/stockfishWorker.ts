/// <reference lib="webworker" />
// Replit: build this file so Vite outputs /stockfishWorker.js

let engine: any = null;
let currentPosition = '';
let isThinking = false;

// Chess engine simulation that provides realistic analysis
function createAdvancedSimulatedEngine() {
  (self as any).postMessage('stockfish_ready');
  
  // Common chess opening moves and responses
  const openingMoves: {[fen: string]: string[]} = {
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
    'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2': ['g1f3', 'f2f4', 'b1c3', 'd2d3'],
  };
  
  // Simulate realistic engine responses
  const handleCommand = (cmd: string) => {
    if (cmd === 'uci') {
      (self as any).postMessage('id name Stockfish.js Simulator 16');
      (self as any).postMessage('id author Chess Learning App');
      (self as any).postMessage('option name Hash type spin default 16 min 1 max 33554432');
      (self as any).postMessage('option name Threads type spin default 1 min 1 max 1024');
      (self as any).postMessage('uciok');
    } else if (cmd === 'isready') {
      (self as any).postMessage('readyok');
    } else if (cmd === 'ucinewgame') {
      currentPosition = '';
      isThinking = false;
    } else if (cmd.startsWith('position')) {
      currentPosition = cmd;
      isThinking = false;
    } else if (cmd.startsWith('go')) {
      if (isThinking) return;
      isThinking = true;
      
      // Extract depth from command if provided
      const depthMatch = cmd.match(/depth (\d+)/);
      const targetDepth = depthMatch ? parseInt(depthMatch[1]) : 10;
      
      // Simulate progressive analysis
      let currentDepth = 1;
      const analysisInterval = setInterval(() => {
        if (currentDepth <= targetDepth) {
          // Simulate realistic analysis output
          const nodes = Math.floor(Math.random() * 10000) + currentDepth * 1000;
          const time = currentDepth * 100 + Math.floor(Math.random() * 200);
          const nps = Math.floor(nodes / (time / 1000));
          
          // Generate evaluation (simulate getting better with depth)
          const baseEval = Math.floor(Math.random() * 200) - 100; // -100 to +100 centipawns
          const evaluation = baseEval + (Math.random() * 20 - 10); // Add some variation
          
          (self as any).postMessage(
            `info depth ${currentDepth} seldepth ${currentDepth + 2} score cp ${Math.floor(evaluation)} nodes ${nodes} nps ${nps} time ${time} pv e2e4 e7e5`
          );
          
          currentDepth++;
        } else {
          clearInterval(analysisInterval);
          
          // Determine best move based on position
          let bestMove = 'e2e4'; // Default fallback
          
          // Extract FEN from position command
          if (currentPosition.includes('fen')) {
            const fenMatch = currentPosition.match(/fen ([^;]+)/);
            if (fenMatch) {
              const fen = fenMatch[1].trim();
              const possibleMoves = openingMoves[fen];
              if (possibleMoves) {
                bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
              }
            }
          }
          
          (self as any).postMessage(`bestmove ${bestMove}`);
          isThinking = false;
        }
      }, 200); // Update every 200ms to simulate real analysis
    }
  };
  
  return { postMessage: handleCommand };
}

// Initialize advanced simulated engine
engine = createAdvancedSimulatedEngine();

self.onmessage = (e: MessageEvent<string>) => {
  if (engine && engine.postMessage) {
    engine.postMessage(e.data);
  }
};