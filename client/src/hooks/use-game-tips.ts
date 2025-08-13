import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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

export function useGameTips() {
  const [currentTip, setCurrentTip] = useState<GameTip | null>(null);
  const [showTip, setShowTip] = useState(false);
  const { toast } = useToast();

  // Get contextual tip based on game position
  const contextualTipMutation = useMutation({
    mutationFn: async ({ fen, gamePhase }: { fen: string; gamePhase: 'opening' | 'middlegame' | 'endgame' }) => {
      const response = await apiRequest('/api/game/contextual-tip', 'POST', { fen, gamePhase });
      return response as GameTip;
    },
    onSuccess: (tip: GameTip) => {
      setCurrentTip(tip);
      setShowTip(true);
    },
    onError: () => {
      toast({
        title: "Tip unavailable",
        description: "Unable to fetch contextual tip right now",
        variant: "destructive"
      });
    }
  });

  // Record learning moments during gameplay
  const recordLearningMomentMutation = useMutation({
    mutationFn: ({ momentType, fen, moveSan }: { 
      momentType: 'blunder' | 'missed_tactic' | 'good_move'; 
      fen: string; 
      moveSan: string 
    }) => apiRequest('/api/game/learning-moment', 'POST', { momentType, fen, moveSan }),
    onSuccess: () => {
      console.log('Learning moment recorded successfully');
    }
  });

  // Get situational advice
  const situationalAdviceMutation = useMutation({
    mutationFn: async ({ situation }: { 
      situation: 'game_start' | 'after_blunder' | 'time_pressure' | 'winning_position' | 'losing_position' 
    }) => {
      const response = await apiRequest('/api/game/situational-advice', 'POST', { situation });
      return response as GameTip;
    },
    onSuccess: (advice: GameTip) => {
      setCurrentTip(advice);
      setShowTip(true);
    },
    onError: () => {
      toast({
        title: "Advice unavailable",
        description: "Unable to fetch situational advice right now",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const getContextualTip = useCallback((fen: string, gamePhase: 'opening' | 'middlegame' | 'endgame') => {
    contextualTipMutation.mutate({ fen, gamePhase });
  }, [contextualTipMutation]);

  const recordLearningMoment = useCallback((
    momentType: 'blunder' | 'missed_tactic' | 'good_move',
    fen: string,
    moveSan: string
  ) => {
    recordLearningMomentMutation.mutate({ momentType, fen, moveSan });
  }, [recordLearningMomentMutation]);

  const getSituationalAdvice = useCallback((
    situation: 'game_start' | 'after_blunder' | 'time_pressure' | 'winning_position' | 'losing_position'
  ) => {
    situationalAdviceMutation.mutate({ situation });
  }, [situationalAdviceMutation]);

  const closeTip = useCallback(() => {
    setShowTip(false);
    setTimeout(() => setCurrentTip(null), 300); // Allow for exit animation
  }, []);

  // Determine game phase from FEN
  const getGamePhase = useCallback((fen: string, moveCount: number): 'opening' | 'middlegame' | 'endgame' => {
    if (moveCount < 20) return 'opening';
    
    // Count pieces to determine if it's endgame
    const pieceCounts = fen.split(' ')[0].split('').filter(char => 
      'rnbqkpRNBQKP'.includes(char)
    ).length;
    
    if (pieceCounts <= 12) return 'endgame';
    return 'middlegame';
  }, []);

  return {
    currentTip,
    showTip,
    isLoading: contextualTipMutation.isPending || situationalAdviceMutation.isPending,
    getContextualTip,
    recordLearningMoment,
    getSituationalAdvice,
    closeTip,
    getGamePhase
  };
}