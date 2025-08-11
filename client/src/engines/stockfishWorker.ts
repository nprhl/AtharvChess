/// <reference lib="webworker" />
// Replit: build this file so Vite outputs /stockfishWorker.js
// @ts-ignore - stockfish package doesn't have TypeScript declarations
import Stockfish from 'stockfish';

let engine: any = null;

// Initialize Stockfish WASM instance
(async () => {
  try {
    engine = await Stockfish(); // WASM instance
    
    engine.onmessage = (line: string | { data: string }) => {
      const text = typeof line === 'string' ? line : (line as any).data;
      (self as any).postMessage(text);
    };
    
    // Send ready signal
    (self as any).postMessage('stockfish_ready');
  } catch (error) {
    (self as any).postMessage(`stockfish_error: ${error}`);
  }
})();

self.onmessage = (e: MessageEvent<string>) => {
  if (engine) {
    engine.postMessage(e.data);
  } else {
    // Queue message if engine not ready yet
    setTimeout(() => {
      if (engine) {
        engine.postMessage(e.data);
      }
    }, 100);
  }
};