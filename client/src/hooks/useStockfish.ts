import { useEffect, useRef, useState } from 'react';

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const w = new Worker(new URL('../engines/stockfishWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = w;
    
    w.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;
      
      if (line === 'stockfish_ready') {
        setIsReady(true);
        // Initialize UCI protocol
        w.postMessage('uci');
        return;
      }
      
      if (line.startsWith('stockfish_error:')) {
        console.error('Stockfish error:', line);
        return;
      }
      
      setLines(prev => [...prev, line]);
    };
    
    return () => {
      w.terminate();
      setIsReady(false);
    };
  }, []);

  const send = (cmd: string) => {
    if (workerRef.current && isReady) {
      workerRef.current.postMessage(cmd);
    }
  };

  const clearLines = () => setLines([]);

  return { send, lines, isReady, clearLines };
}