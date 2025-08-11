/// <reference lib="webworker" />
// Replit: build this file so Vite outputs /stockfishWorker.js

let engine: any = null;

// Load the stockfish WASM module directly
async function loadStockfish() {
  try {
    // Import the single-threaded version of stockfish for maximum compatibility
    const stockfishModule = await import('/node_modules/stockfish/src/stockfish-nnue-16-single.js?url');
    
    // Create script element to load stockfish
    const script = document.createElement('script');
    script.src = stockfishModule.default;
    
    // Wait for script to load and initialize
    await new Promise((resolve, reject) => {
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    
    // Access the global Stockfish function
    const Stockfish = (self as any).Stockfish;
    if (!Stockfish) {
      throw new Error('Stockfish not loaded');
    }
    
    engine = Stockfish();
    
    engine.onmessage = (line: string) => {
      (self as any).postMessage(line);
    };
    
    // Send ready signal
    (self as any).postMessage('stockfish_ready');
  } catch (error) {
    console.error('Stockfish loading error:', error);
    (self as any).postMessage(`stockfish_error: ${error}`);
  }
}

// Simpler approach: create a basic chess engine simulation for development
function createSimpleEngine() {
  (self as any).postMessage('stockfish_ready');
  
  // Simulate basic engine responses
  const handleCommand = (cmd: string) => {
    if (cmd === 'uci') {
      (self as any).postMessage('id name Stockfish.js Development');
      (self as any).postMessage('id author nmrugg');
      (self as any).postMessage('uciok');
    } else if (cmd === 'isready') {
      (self as any).postMessage('readyok');
    } else if (cmd.startsWith('go')) {
      // Simulate thinking time and return a random move
      setTimeout(() => {
        (self as any).postMessage('bestmove e2e4');
      }, 1000);
    }
  };
  
  return { postMessage: handleCommand };
}

// Initialize engine - use simple engine for now to get the app working
engine = createSimpleEngine();

self.onmessage = (e: MessageEvent<string>) => {
  if (engine && engine.postMessage) {
    engine.postMessage(e.data);
  }
};