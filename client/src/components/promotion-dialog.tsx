import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PromotionDialogProps {
  open: boolean;
  onPromotion: (piece: 'q' | 'r' | 'b' | 'n') => void;
  playerColor: 'w' | 'b';
}

const PIECE_SYMBOLS = {
  'wq': '♕', 'wr': '♖', 'wb': '♗', 'wn': '♘',
  'bq': '♛', 'br': '♜', 'bb': '♝', 'bn': '♞'
};

export default function PromotionDialog({ open, onPromotion, playerColor }: PromotionDialogProps) {
  const pieces: Array<{ type: 'q' | 'r' | 'b' | 'n'; name: string }> = [
    { type: 'q', name: 'Queen' },
    { type: 'r', name: 'Rook' },
    { type: 'b', name: 'Bishop' },
    { type: 'n', name: 'Knight' }
  ];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pawn Promotion</DialogTitle>
          <DialogDescription>
            Choose what piece you want to promote your pawn to:
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 mt-4">
          {pieces.map((piece) => {
            const symbol = PIECE_SYMBOLS[`${playerColor}${piece.type}` as keyof typeof PIECE_SYMBOLS];
            
            return (
              <button
                key={piece.type}
                onClick={() => onPromotion(piece.type)}
                className="flex flex-col items-center p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-muted transition-colors"
              >
                <span className="text-4xl mb-2">{symbol}</span>
                <span className="text-xs font-medium text-muted-foreground">{piece.name}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}