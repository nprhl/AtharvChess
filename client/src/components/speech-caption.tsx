import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Volume2 } from 'lucide-react';
import { ttsService, TTSState } from '@/lib/tts';

interface SpeechCaptionProps {
  className?: string;
}

export default function SpeechCaption({ className = '' }: SpeechCaptionProps) {
  const [state, setState] = useState<TTSState>(ttsService.getState());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((newState) => {
      setState(newState);
      setIsVisible(newState.isSpeaking && !!newState.currentText);
    });

    return unsubscribe;
  }, []);

  const handleClose = () => {
    ttsService.stopSpeaking();
    setIsVisible(false);
  };

  // Don't render if TTS is not supported or not visible
  if (!ttsService.isSupported() || !isVisible || !state.currentText) {
    return null;
  }

  return (
    <div className={`fixed bottom-20 left-4 right-4 z-50 ${className}`}>
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none shadow-lg">
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Volume2 className="w-3 h-3 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-xs font-semibold text-white">Speaking</h4>
                {state.isSpeaking && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse animation-delay-150"></div>
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse animation-delay-300"></div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-white/90 leading-relaxed">
                {state.currentText}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-5 h-5 p-0 text-white/70 hover:text-white hover:bg-white/10 flex-shrink-0"
              onClick={handleClose}
              aria-label="Stop speech"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          {state.isPaused && (
            <div className="mt-2 text-xs text-white/70 flex items-center gap-1">
              <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
              Speech paused - use controls to resume
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}