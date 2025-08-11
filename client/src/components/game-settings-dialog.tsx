import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings } from "lucide-react";
import { useState } from "react";

interface GameSettingsDialogProps {
  currentSettings: {
    gameMode: 'pvp' | 'pvc';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
    playerColor: 'w' | 'b';
  };
  onSettingsChange: (settings: {
    gameMode: 'pvp' | 'pvc';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
    playerColor: 'w' | 'b';
  }) => void;
  onNewGame: () => void;
}

export default function GameSettingsDialog({ 
  currentSettings, 
  onSettingsChange, 
  onNewGame 
}: GameSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [gameMode, setGameMode] = useState(currentSettings.gameMode);
  const [aiDifficulty, setAiDifficulty] = useState(currentSettings.aiDifficulty);
  const [playerColor, setPlayerColor] = useState(currentSettings.playerColor);

  const handleApplySettings = () => {
    onSettingsChange({
      gameMode,
      aiDifficulty,
      playerColor
    });
    onNewGame(); // Start new game with new settings
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Game Settings</DialogTitle>
          <DialogDescription>
            Configure your chess game preferences. Changes will start a new game.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Game Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Game Mode</Label>
            <RadioGroup value={gameMode} onValueChange={(value: 'pvp' | 'pvc') => setGameMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pvc" id="pvc" />
                <Label htmlFor="pvc">Player vs Computer</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pvp" id="pvp" />
                <Label htmlFor="pvp">Player vs Player</Label>
              </div>
            </RadioGroup>
          </div>

          {/* AI Difficulty (only show for PvC mode) */}
          {gameMode === 'pvc' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">AI Difficulty</Label>
              <Select value={aiDifficulty} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setAiDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Player Color (only show for PvC mode) */}
          {gameMode === 'pvc' && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Play As</Label>
              <RadioGroup value={playerColor} onValueChange={(value: 'w' | 'b') => setPlayerColor(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="w" id="white" />
                  <Label htmlFor="white">White (goes first)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="b" id="black" />
                  <Label htmlFor="black">Black (goes second)</Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplySettings}>
            Apply & New Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}