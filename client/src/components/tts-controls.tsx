import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Play, 
  Pause, 
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ttsService, TTSSettings, TTSState } from '@/lib/tts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface TTSControlsProps {
  className?: string;
  compact?: boolean;
}

export default function TTSControls({ className = '', compact = false }: TTSControlsProps) {
  const [settings, setSettings] = useState<TTSSettings>(ttsService.getSettings());
  const [state, setState] = useState<TTSState>(ttsService.getState());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const handleToggleEnabled = () => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSettings(newSettings);
    ttsService.updateSettings(newSettings);
    
    if (!newSettings.enabled) {
      ttsService.stopSpeaking();
    }
  };

  const handleRateChange = (value: number[]) => {
    const newSettings = { ...settings, rate: value[0] };
    setSettings(newSettings);
    ttsService.updateSettings(newSettings);
  };

  const handleReplay = () => {
    ttsService.replayLastHint();
  };

  const handlePlayPause = () => {
    if (state.isSpeaking && !state.isPaused) {
      ttsService.pauseSpeaking();
    } else if (state.isPaused) {
      ttsService.resumeSpeaking();
    } else if (state.lastHint) {
      ttsService.replayLastHint();
    }
  };

  const handleStop = () => {
    ttsService.stopSpeaking();
  };

  // Check if TTS is supported
  if (!ttsService.isSupported()) {
    return null; // Graceful degradation
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleEnabled}
          className="w-8 h-8 p-0"
          aria-label={settings.enabled ? "Mute speech" : "Enable speech"}
        >
          {settings.enabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </Button>

        {settings.enabled && state.lastHint && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReplay}
            className="w-8 h-8 p-0"
            aria-label="Replay last hint"
            disabled={state.isSpeaking}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}

        {settings.enabled && state.isSpeaking && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            className="w-8 h-8 p-0"
            aria-label={state.isPaused ? "Resume speech" : "Pause speech"}
          >
            {state.isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardContent className="p-4">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleEnabled}
                className="w-10 h-10"
                aria-label={settings.enabled ? "Mute speech" : "Enable speech"}
              >
                {settings.enabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Voice Assistant</span>
                {state.isSpeaking && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Speaking</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {settings.enabled && state.lastHint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReplay}
                  disabled={state.isSpeaking}
                  aria-label="Replay last hint"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Replay
                </Button>
              )}

              {settings.enabled && state.isSpeaking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                  aria-label={state.isPaused ? "Resume speech" : "Pause speech"}
                >
                  {state.isPaused ? (
                    <Play className="w-4 h-4 mr-1" />
                  ) : (
                    <Pause className="w-4 h-4 mr-1" />
                  )}
                  {state.isPaused ? 'Resume' : 'Pause'}
                </Button>
              )}

              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Toggle speech settings">
                  <Settings className="w-4 h-4 mr-1" />
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Speech Speed: {settings.rate.toFixed(1)}x
                </label>
                <Slider
                  value={[settings.rate]}
                  onValueChange={handleRateChange}
                  min={0.7}
                  max={1.2}
                  step={0.1}
                  className="w-full"
                  aria-label="Adjust speech speed"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slower</span>
                  <span>Normal</span>
                  <span>Faster</span>
                </div>
              </div>

              {state.lastHint && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    Last Hint:
                  </div>
                  <div className="text-sm">
                    {state.lastHint.length > 80 
                      ? `${state.lastHint.substring(0, 80)}...` 
                      : state.lastHint}
                  </div>
                </div>
              )}

              {settings.enabled && (
                <div className="text-xs text-muted-foreground">
                  💡 Hints will be spoken aloud automatically. Use the replay button to hear them again.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}