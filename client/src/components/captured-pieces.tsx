import { Piece } from 'chess.js';

interface CapturedPiecesProps {
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  playerColor: 'w' | 'b';
}

const PIECE_SYMBOLS = {
  'wp': '♟︎', 'wr': '♜', 'wn': '♞', 'wb': '♝', 'wq': '♛', 'wk': '♚',
  'bp': '♟︎', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
};

// Piece values for material advantage calculation
const PIECE_VALUES = {
  'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0
};

export default function CapturedPieces({ capturedByWhite, capturedByBlack, playerColor }: CapturedPiecesProps) {
  // Calculate material advantage
  const whiteMaterial = capturedByWhite.reduce((sum, piece) => sum + PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES], 0);
  const blackMaterial = capturedByBlack.reduce((sum, piece) => sum + PIECE_VALUES[piece.type as keyof typeof PIECE_VALUES], 0);
  const materialAdvantage = whiteMaterial - blackMaterial;

  const renderCapturedPieces = (pieces: Piece[], isOpponent: boolean) => {
    if (pieces.length === 0) return null;

    // Group pieces by type for better display
    const groupedPieces = pieces.reduce((acc, piece) => {
      const key = `${piece.color}${piece.type}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="flex flex-wrap items-center gap-1">
        {Object.entries(groupedPieces).map(([key, count]) => {
          const symbol = PIECE_SYMBOLS[key as keyof typeof PIECE_SYMBOLS];
          const isWhitePiece = key.startsWith('w');
          
          return (
            <div key={key} className="flex items-center">
              <span 
                className={`text-sm ${isWhitePiece 
                  ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' 
                  : 'text-gray-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                }`}
                style={{ 
                  fontSize: key.includes('p') ? '14px' : '16px',
                  fontWeight: 'bold'
                }}
              >
                {symbol}
                {count > 1 && <sub className="text-xs ml-0.5">{count}</sub>}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Opponent's captured pieces (top) */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">
          {playerColor === 'w' ? 'Black' : 'White'} captured:
        </div>
        <div className="min-h-[20px] p-2 bg-gray-50 dark:bg-gray-800 rounded border">
          {renderCapturedPieces(
            playerColor === 'w' ? capturedByBlack : capturedByWhite, 
            true
          )}
          {/* Material advantage indicator */}
          {materialAdvantage !== 0 && (
            <div className="ml-2 text-xs font-semibold inline-flex items-center">
              {((playerColor === 'w' && materialAdvantage < 0) || 
                (playerColor === 'b' && materialAdvantage > 0)) && (
                <span className="text-green-600 dark:text-green-400">
                  +{Math.abs(materialAdvantage)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Player's captured pieces (bottom) */}
      <div>
        <div className="text-xs text-gray-500 mb-1">
          {playerColor === 'w' ? 'White' : 'Black'} captured:
        </div>
        <div className="min-h-[20px] p-2 bg-gray-50 dark:bg-gray-800 rounded border">
          {renderCapturedPieces(
            playerColor === 'w' ? capturedByWhite : capturedByBlack, 
            false
          )}
          {/* Material advantage indicator */}
          {materialAdvantage !== 0 && (
            <div className="ml-2 text-xs font-semibold inline-flex items-center">
              {((playerColor === 'w' && materialAdvantage > 0) || 
                (playerColor === 'b' && materialAdvantage < 0)) && (
                <span className="text-green-600 dark:text-green-400">
                  +{Math.abs(materialAdvantage)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}