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
import { Switch } from "@/components/ui/switch";
import { Settings, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ttsService } from "@/lib/tts";

interface GameSettingsDialogProps {
  currentSettings: {
    gameMode: 'pvp' | 'pvc';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
    playerColor: 'w' | 'b';
    moveAnnouncementsEnabled: boolean;
    educationalFeedbackEnabled: boolean;
  };
  onSettingsChange: (settings: {
    gameMode: 'pvp' | 'pvc';
    aiDifficulty: 'beginner' | 'intermediate' | 'advanced';
    playerColor: 'w' | 'b';
    moveAnnouncementsEnabled: boolean;
    educationalFeedbackEnabled: boolean;
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
  const [moveAnnouncementsEnabled, setMoveAnnouncementsEnabled] = useState(currentSettings.moveAnnouncementsEnabled);
  const [educationalFeedbackEnabled, setEducationalFeedbackEnabled] = useState(currentSettings.educationalFeedbackEnabled || true);
  const [ttsSettings, setTtsSettings] = useState(ttsService.getSettings());

  // Load TTS settings on component mount
  useEffect(() => {
    setTtsSettings(ttsService.getSettings());
  }, []);

  const handleApplySettings = () => {
    // Update TTS settings
    ttsService.updateSettings(ttsSettings);
    
    onSettingsChange({
      gameMode,
      aiDifficulty,
      playerColor,
      moveAnnouncementsEnabled,
      educationalFeedbackEnabled
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

          {/* Voice Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Voice Settings
            </Label>
            
            {/* Enable/Disable TTS */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm">Text-to-Speech</Label>
                <div className="text-xs text-muted-foreground">
                  Enable voice narration and announcements
                </div>
              </div>
              <Switch
                checked={ttsSettings.enabled}
                onCheckedChange={(enabled) => setTtsSettings({...ttsSettings, enabled})}
                aria-label="Toggle text-to-speech"
              />
            </div>

            {ttsSettings.enabled && (
              <>
                {/* Move Announcements */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Move Announcements</Label>
                    <div className="text-xs text-muted-foreground">
                      Hear each move spoken aloud (e.g., "white moves pawn to e4")
                    </div>
                  </div>
                  <Switch
                    checked={moveAnnouncementsEnabled}
                    onCheckedChange={setMoveAnnouncementsEnabled}
                    aria-label="Toggle move announcements"
                  />
                </div>

                {/* Educational Feedback */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Educational Feedback</Label>
                    <div className="text-xs text-muted-foreground">
                      Hear suggestions and analysis of your moves
                    </div>
                  </div>
                  <Switch
                    checked={educationalFeedbackEnabled}
                    onCheckedChange={setEducationalFeedbackEnabled}
                    aria-label="Toggle educational feedback"
                  />
                </div>

                {/* Voice Speed */}
                <div className="space-y-2">
                  <Label className="text-sm">Speech Speed</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Slow</span>
                    <input
                      type="range"
                      min="0.7"
                      max="1.2"
                      step="0.1"
                      value={ttsSettings.rate}
                      onChange={(e) => setTtsSettings({...ttsSettings, rate: parseFloat(e.target.value)})}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">Fast</span>
                  </div>
                </div>

                {/* Volume */}
                <div className="space-y-2">
                  <Label className="text-sm">Volume</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Quiet</span>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={ttsSettings.volume}
                      onChange={(e) => setTtsSettings({...ttsSettings, volume: parseFloat(e.target.value)})}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground">Loud</span>
                  </div>
                </div>
              </>
            )}
          </div>
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