import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Target, Zap, TrendingUp, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MoveEvaluation {
  message: string;
  moveType: 'brilliant' | 'excellent' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';
  explanation: string;
  tactical: string[];
  strategic: string[];
  rating: number;
}

interface MoveEvaluationProps {
  evaluation: MoveEvaluation | null;
  moveSan: string;
  onDismiss: () => void;
  isVisible: boolean;
}

export default function MoveEvaluationDisplay({ 
  evaluation, 
  moveSan, 
  onDismiss, 
  isVisible 
}: MoveEvaluationProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (evaluation && isVisible) {
      // Auto-hide after 5 seconds for good moves, longer for mistakes
      const timeout = evaluation.moveType === 'mistake' || evaluation.moveType === 'blunder' ? 8000 : 5000;
      const timer = setTimeout(onDismiss, timeout);
      return () => clearTimeout(timer);
    }
  }, [evaluation, isVisible, onDismiss]);

  if (!evaluation || !isVisible) return null;

  const getMoveTypeColor = (moveType: string) => {
    switch (moveType) {
      case 'brilliant': return 'bg-yellow-500 text-black';
      case 'excellent': return 'bg-green-600 text-white';
      case 'good': return 'bg-green-500 text-white';
      case 'inaccuracy': return 'bg-yellow-600 text-white';
      case 'mistake': return 'bg-orange-600 text-white';
      case 'blunder': return 'bg-red-600 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const getMoveTypeIcon = (moveType: string) => {
    switch (moveType) {
      case 'brilliant': return <Zap className="w-4 h-4" />;
      case 'excellent': return <TrendingUp className="w-4 h-4" />;
      case 'good': return <Target className="w-4 h-4" />;
      case 'inaccuracy': return <AlertTriangle className="w-4 h-4" />;
      case 'mistake': return <AlertTriangle className="w-4 h-4" />;
      case 'blunder': return <X className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getRatingStars = (rating: number) => {
    const stars = Math.min(Math.max(Math.round(rating / 2), 1), 5);
    return '⭐'.repeat(stars);
  };

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 bg-slate-800 border-slate-600 shadow-xl animate-in slide-in-from-bottom-2 duration-300">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Badge className={`${getMoveTypeColor(evaluation.moveType)} flex items-center space-x-1`}>
              {getMoveTypeIcon(evaluation.moveType)}
              <span className="capitalize">{evaluation.moveType}</span>
            </Badge>
            <Badge variant="outline" className="border-slate-500 text-slate-300">
              {moveSan}
            </Badge>
            <span className="text-sm text-slate-400">
              {getRatingStars(evaluation.rating)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-white font-medium">{evaluation.message}</p>
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">{evaluation.explanation}</p>
            
            {(evaluation.tactical.length > 0 || evaluation.strategic.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs border-slate-500 text-slate-300 hover:bg-slate-600"
              >
                {showDetails ? 'Less' : 'More'}
              </Button>
            )}
          </div>

          {showDetails && (evaluation.tactical.length > 0 || evaluation.strategic.length > 0) && (
            <div className="pt-2 border-t border-slate-600 space-y-2">
              {evaluation.tactical.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
                    <Target className="w-3 h-3" />
                    <span>Tactical Themes</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {evaluation.tactical.map((theme, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-blue-400 text-blue-400">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {evaluation.strategic.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-1 flex items-center space-x-1">
                    <Brain className="w-3 h-3" />
                    <span>Strategic Concepts</span>
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {evaluation.strategic.map((concept, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-green-400 text-green-400">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}