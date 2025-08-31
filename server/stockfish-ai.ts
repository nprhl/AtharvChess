import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Chess, Move } from 'chess.js';
import type { Difficulty } from './chess-ai';

interface StockfishConfig {
  depth: number;
  skillLevel: number;
  moveTime: number; // milliseconds
}

interface StockfishAnalysis {
  bestMove: string;
  bestMoveSan: string;
  evaluation: number; // centipawns
  depth: number;
  pv: string[];
}

export class StockfishAI {
  private stockfishProcess: ChildProcessWithoutNullStreams | null = null;
  private difficulty: Difficulty;
  private pendingResolvers: Map<string, (value: any) => void> = new Map();

  constructor(difficulty: Difficulty = 'beginner') {
    this.difficulty = difficulty;
  }

  private getStockfishConfig(): StockfishConfig {
    switch (this.difficulty) {
      case 'beginner':
        return { depth: 5, skillLevel: 1, moveTime: 100 };
      case 'intermediate':
        return { depth: 10, skillLevel: 10, moveTime: 500 };
      case 'advanced':
        return { depth: 15, skillLevel: 20, moveTime: 1000 };
      default:
        return { depth: 8, skillLevel: 5, moveTime: 300 };
    }
  }

  private async initStockfish(): Promise<void> {
    if (this.stockfishProcess) {
      return;
    }

    try {
      // Try to spawn stockfish process
      this.stockfishProcess = spawn('stockfish', [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const config = this.getStockfishConfig();

      // Configure stockfish
      this.stockfishProcess.stdin.write('uci\n');
      this.stockfishProcess.stdin.write(`setoption name Skill Level value ${config.skillLevel}\n`);
      this.stockfishProcess.stdin.write('isready\n');

      // Wait for initialization
      await this.waitForResponse('readyok');
      console.log(`Stockfish initialized with skill level ${config.skillLevel}`);
    } catch (error) {
      console.log('Stockfish not available:', error);
      this.stockfishProcess = null;
      throw new Error('Stockfish engine not available');
    }
  }

  private waitForResponse(expectedResponse: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.stockfishProcess) {
        reject(new Error('Stockfish process not available'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Stockfish response timeout'));
      }, 5000);

      const onData = (data: Buffer) => {
        const output = data.toString();
        if (output.includes(expectedResponse)) {
          clearTimeout(timeout);
          this.stockfishProcess?.stdout.removeListener('data', onData);
          resolve();
        }
      };

      this.stockfishProcess.stdout.on('data', onData);
    });
  }

  private extractBestMove(output: string): string | null {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.startsWith('bestmove ')) {
        const parts = line.split(' ');
        return parts[1];
      }
    }
    return null;
  }

  private extractEvaluation(output: string): { score: number; depth: number; pv: string[] } {
    const lines = output.split('\n');
    let bestScore = 0;
    let bestDepth = 0;
    let bestPv: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('info ') && line.includes('score')) {
        const depthMatch = line.match(/depth (\d+)/);
        const scoreMatch = line.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = line.match(/pv (.+)/);
        
        if (depthMatch && scoreMatch) {
          const depth = parseInt(depthMatch[1]);
          const [, type, value] = scoreMatch;
          
          if (depth >= bestDepth) {
            bestDepth = depth;
            
            if (type === 'cp') {
              bestScore = parseInt(value);
            } else if (type === 'mate') {
              const mateIn = parseInt(value);
              bestScore = mateIn > 0 ? 30000 : -30000;
            }
            
            if (pvMatch) {
              bestPv = pvMatch[1].split(' ').slice(0, 5); // First 5 moves of PV
            }
          }
        }
      }
    }
    
    return { score: bestScore, depth: bestDepth, pv: bestPv };
  }

  public async getAnalysis(fen: string): Promise<StockfishAnalysis | null> {
    try {
      await this.initStockfish();
      
      if (!this.stockfishProcess) {
        throw new Error('Stockfish not initialized');
      }

      const config = this.getStockfishConfig();
      const chess = new Chess(fen);

      // Send position to stockfish
      this.stockfishProcess.stdin.write(`position fen ${fen}\n`);
      this.stockfishProcess.stdin.write(`go depth ${config.depth} movetime ${config.moveTime}\n`);

      // Capture both move and evaluation
      const analysisResult = await new Promise<{ bestMove: string; output: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish analysis timeout'));
        }, config.moveTime + 2000);

        let buffer = '';
        const onData = (data: Buffer) => {
          buffer += data.toString();
          const bestMove = this.extractBestMove(buffer);
          if (bestMove) {
            clearTimeout(timeout);
            this.stockfishProcess?.stdout.removeListener('data', onData);
            resolve({ bestMove, output: buffer });
          }
        };

        this.stockfishProcess!.stdout.on('data', onData);
      });

      const { bestMove: bestMoveUci, output } = analysisResult;
      
      if (!bestMoveUci || bestMoveUci === '(none)') {
        return null;
      }

      // Convert UCI move to chess.js move format
      const from = bestMoveUci.slice(0, 2);
      const to = bestMoveUci.slice(2, 4);
      const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;
      const moveObj = { from, to, promotion };
      const move = chess.move(moveObj);
      
      if (!move) {
        console.log('Stockfish returned invalid move:', bestMoveUci);
        return null;
      }

      // Extract evaluation from output
      const evaluation = this.extractEvaluation(output);
      
      console.log(`Stockfish analysis: ${move.san} (${evaluation.score}cp at depth ${evaluation.depth})`);
      
      return {
        bestMove: bestMoveUci,
        bestMoveSan: move.san,
        evaluation: evaluation.score,
        depth: evaluation.depth,
        pv: evaluation.pv
      };
    } catch (error) {
      console.log('Stockfish analysis error:', error);
      return null;
    }
  }

  public async getBestMove(fen: string): Promise<Move | null> {
    try {
      await this.initStockfish();
      
      if (!this.stockfishProcess) {
        throw new Error('Stockfish not initialized');
      }

      const config = this.getStockfishConfig();
      const chess = new Chess(fen);

      // Send position to stockfish
      this.stockfishProcess.stdin.write(`position fen ${fen}\n`);
      this.stockfishProcess.stdin.write(`go depth ${config.depth} movetime ${config.moveTime}\n`);

      // Wait for best move response
      const bestMoveUci = await new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Stockfish move timeout'));
        }, config.moveTime + 2000);

        let buffer = '';
        const onData = (data: Buffer) => {
          buffer += data.toString();
          const bestMove = this.extractBestMove(buffer);
          if (bestMove) {
            clearTimeout(timeout);
            this.stockfishProcess?.stdout.removeListener('data', onData);
            resolve(bestMove);
          }
        };

        this.stockfishProcess!.stdout.on('data', onData);
      });

      // Convert UCI move to chess.js move format
      if (bestMoveUci && bestMoveUci !== '(none)') {
        const from = bestMoveUci.slice(0, 2);
        const to = bestMoveUci.slice(2, 4);
        const promotion = bestMoveUci.length > 4 ? bestMoveUci[4] : undefined;

        const moveObj = { from, to, promotion };
        const move = chess.move(moveObj);
        
        if (move) {
          console.log(`Stockfish (${this.difficulty}) played: ${move.san} from UCI ${bestMoveUci}`);
          return move;
        }
      }

      console.log('Stockfish returned invalid move:', bestMoveUci);
      return null;
    } catch (error) {
      console.log('Stockfish error:', error);
      return null;
    }
  }

  public cleanup(): void {
    if (this.stockfishProcess) {
      this.stockfishProcess.stdin.write('quit\n');
      this.stockfishProcess.kill();
      this.stockfishProcess = null;
    }
  }
}