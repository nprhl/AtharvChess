import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb , X, Volume2 } from "lucide-react";
import { speakHint } from '@/lib/tts';
import { useEffect } from 'react';

interface AIHintCardProps {
  hint: string;
  learningTips?: string[];
  onClose: () => void;
  onShowMove: () => void;
}

export default function AIHintCard({ hint, learningTips = [], onClose, onShowMove }: AIHintCardProps) {
  // Automatically speak the hint when it appears
  useEffect(() => {
    if (hint) {
      speakHint(hint);
    }
  }, [hint]);

  const handleSpeakAgain = () => {
    speakHint(hint);
  };

  return (
    <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-none">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-yellow-300" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm text-white">AI Suggestion</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={handleSpeakAgain}
                  aria-label="Speak hint again"
                  title="Hear hint again"
                >
                  <Volume2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-6 h-6 p-0 text-white/70 hover:text-white hover:bg-white/10"
                  onClick={onClose}
                  aria-label="Close hint"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-purple-100 leading-relaxed mb-2">
              {hint}
            </p>
            
            {learningTips && learningTips.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-purple-100 mb-1">💡 Learning Tips:</p>
                <ul className="text-xs text-purple-100 space-y-1">
                  {learningTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <Button
              size="sm"
              className="text-xs bg-white/20 hover:bg-white/30 text-white border-none"
              variant="outline"
              onClick={onShowMove}
            >
              Show me
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
