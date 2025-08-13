import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Lightbulb, X } from "lucide-react";

interface GameTip {
  title: string;
  content: string;
  category: string;
  estimatedReadTime: number;
  contextual?: boolean;
  situational?: boolean;
  gamePhase?: string;
  situation?: string;
  message?: string;
}

interface GameTipOverlayProps {
  tip: GameTip | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GameTipOverlay({ tip, isOpen, onClose }: GameTipOverlayProps) {
  if (!tip) return null;

  const getCategoryColor = (category: string) => {
    const colors = {
      opening: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      tactics: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      endgame: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      strategy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      psychology: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  const getIcon = () => {
    if (tip.contextual) return "🎯";
    if (tip.situational) return "💡";
    return "🧠";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <span className="text-xl">{getIcon()}</span>
              Game Tip
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          {tip.message && (
            <DialogDescription className="text-muted-foreground">
              {tip.message}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge className={getCategoryColor(tip.category)}>
              {tip.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-3 h-3" />
              {tip.estimatedReadTime}s
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">{tip.title}</h3>
            <p className="text-foreground leading-relaxed">{tip.content}</p>
          </div>

          {(tip.contextual || tip.situational) && (
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <Lightbulb className="w-4 h-4" />
                {tip.contextual && tip.gamePhase && `Perfect for the ${tip.gamePhase} phase`}
                {tip.situational && tip.situation && `Tailored for ${tip.situation.replace('_', ' ')} situations`}
              </div>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <Button onClick={onClose} className="flex items-center gap-2">
              Got it, thanks!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}