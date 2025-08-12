interface SimpleChessboardProps {
  fen: string;
  size?: number;
}

export default function SimpleChessboard({ fen, size = 300 }: SimpleChessboardProps) {
  // Parse FEN to extract board position
  const boardPart = fen.split(' ')[0];
  const ranks = boardPart.split('/');
  
  const pieceSymbols: { [key: string]: string } = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
  };

  const expandRank = (rank: string): string[] => {
    const squares: string[] = [];
    for (const char of rank) {
      if (char >= '1' && char <= '8') {
        const emptySquares = parseInt(char);
        for (let i = 0; i < emptySquares; i++) {
          squares.push('');
        }
      } else {
        squares.push(char);
      }
    }
    return squares;
  };

  const boardSquares = ranks.map(expandRank);
  const squareSize = Math.floor(size / 8);

  return (
    <div 
      className="border-2 border-amber-700 bg-amber-100"
      style={{ width: size, height: size }}
    >
      {boardSquares.map((rank, rankIndex) => (
        <div key={rankIndex} className="flex">
          {rank.map((piece, fileIndex) => {
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const squareColor = isLight ? 'bg-amber-100' : 'bg-amber-700';
            
            return (
              <div
                key={`${rankIndex}-${fileIndex}`}
                className={`${squareColor} flex items-center justify-center text-2xl select-none`}
                style={{ width: squareSize, height: squareSize }}
              >
                {piece && pieceSymbols[piece]}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}