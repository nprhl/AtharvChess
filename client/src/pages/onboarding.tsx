import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Chess, Square } from 'chess.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import ChessBoard from '@/components/chess-board';

interface Puzzle {
  id: number;
  fen: string;
  solution: Array<{ from: string; to: string }>;
  rating: number;
  description: string;
  tags: string[];
}

export default function OnboardingPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [attempts, setAttempts] = useState<Array<{ puzzleId: number; solved: boolean; timeSpent: number }>>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [showSolution, setShowSolution] = useState(false);

  const { data: puzzles = [], isLoading } = useQuery<Puzzle[]>({
    queryKey: ['/api/onboarding/puzzles'],
    enabled: true,
  });

  const currentPuzzle = puzzles[currentPuzzleIndex];

  const recordAttemptMutation = useMutation({
    mutationFn: async (attemptData: any) => {
      const response = await fetch('/api/onboarding/puzzle-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attemptData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to record attempt');
      }
      
      return await response.json();
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], { user: data.user });
      toast({
        title: 'Assessment Complete!',
        description: `Your skill level has been determined. ELO Rating: ${data.user.eloRating}`,
      });
      setLocation('/');
    },
  });

  useEffect(() => {
    if (currentPuzzle) {
      try {
        const newGame = new Chess(currentPuzzle.fen);
        setGame(newGame);
        setStartTime(Date.now());
        setShowSolution(false);
      } catch (error) {
        console.error('Invalid FEN string for puzzle:', currentPuzzle.id, error);
        toast({
          title: 'Puzzle Error',
          description: 'This puzzle has an invalid position. Skipping to next puzzle.',
          variant: 'destructive',
        });
        // Skip to next puzzle
        if (currentPuzzleIndex < puzzles.length - 1) {
          setCurrentPuzzleIndex(prev => prev + 1);
        } else {
          completeOnboardingMutation.mutate();
        }
      }
    }
  }, [currentPuzzle, currentPuzzleIndex, puzzles.length, completeOnboardingMutation, toast]);

  const handleMove = (from: Square, to: Square) => {
    if (!currentPuzzle || showSolution) return false;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    const solution = currentPuzzle.solution;
    const moveIndex = attempts.filter(a => a.puzzleId === currentPuzzle.id).length;
    
    let solved = false;
    if (moveIndex < solution.length) {
      const expectedMove = solution[moveIndex];
      solved = expectedMove.from === from && expectedMove.to === to;
    }

    // Make the move on the board
    try {
      const newGame = new Chess(game.fen());
      const move = newGame.move({ from, to });
      if (move) {
        setGame(newGame);
      } else {
        return false; // Invalid move
      }
    } catch (error) {
      return false; // Invalid move
    }
    
    const attemptData = {
      puzzleId: currentPuzzle.id,
      solved,
      timeSpent,
      attemptedMoves: [{ from, to }],
    };

    recordAttemptMutation.mutate(attemptData);
    setAttempts(prev => [...prev, { puzzleId: currentPuzzle.id, solved, timeSpent }]);

    if (solved) {
      toast({
        title: 'Correct!',
        description: 'Well done! Moving to next puzzle.',
      });
      setTimeout(() => {
        if (currentPuzzleIndex < puzzles.length - 1) {
          setCurrentPuzzleIndex(prev => prev + 1);
        } else {
          completeOnboardingMutation.mutate();
        }
      }, 1500);
    } else {
      toast({
        title: 'Not quite right',
        description: 'Try again or use the Show Solution button.',
        variant: 'destructive',
      });
    }

    return true;
  };

  const getValidMoves = (square: Square): Square[] => {
    return game.moves({ square, verbose: true }).map(move => move.to);
  };

  const handleShowSolution = () => {
    if (!currentPuzzle) return;
    
    setShowSolution(true);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    
    // Show the first move of the solution
    const solution = currentPuzzle.solution;
    if (solution.length > 0) {
      const firstMove = solution[0];
      try {
        const newGame = new Chess(game.fen());
        newGame.move({ from: firstMove.from, to: firstMove.to });
        setGame(newGame);
        
        toast({
          title: 'Solution Shown',
          description: `The correct move was ${firstMove.from} to ${firstMove.to}`,
        });
      } catch (error) {
        console.error('Error showing solution:', error);
      }
    }
    
    const attemptData = {
      puzzleId: currentPuzzle.id,
      solved: false,
      timeSpent,
      attemptedMoves: [],
    };

    recordAttemptMutation.mutate(attemptData);
    setAttempts(prev => [...prev, { puzzleId: currentPuzzle.id, solved: false, timeSpent }]);
  };

  const handleNextPuzzle = () => {
    if (currentPuzzleIndex < puzzles.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
    } else {
      completeOnboardingMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Preparing your skill assessment...</p>
        </div>
      </div>
    );
  }

  const progress = ((currentPuzzleIndex + 1) / puzzles.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-center">Chess Skill Assessment</CardTitle>
            <CardDescription className="text-center">
              Solve puzzles to determine your current skill level and get personalized lessons
            </CardDescription>
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  {currentPuzzleIndex + 1} of {puzzles.length}
                </span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardHeader>
        </Card>

        {currentPuzzle && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Puzzle {currentPuzzleIndex + 1}</CardTitle>
                    <CardDescription>{currentPuzzle.description}</CardDescription>
                    <div className="mt-2">
                      <Badge variant={game.turn() === 'w' ? 'default' : 'secondary'}>
                        {game.turn() === 'w' ? 'White to move' : 'Black to move'}
                      </Badge>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    Rating: {currentPuzzle.rating}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentPuzzle.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="space-y-3">
                  <Button
                    onClick={handleShowSolution}
                    variant="outline"
                    className="w-full"
                    disabled={showSolution || recordAttemptMutation.isPending}
                  >
                    {showSolution ? 'Solution Shown' : 'Show Solution'}
                  </Button>
                  {showSolution && (
                    <Button
                      onClick={handleNextPuzzle}
                      className="w-full"
                      disabled={completeOnboardingMutation.isPending}
                    >
                      {currentPuzzleIndex < puzzles.length - 1 ? 'Next Puzzle' : 'Complete Assessment'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                {currentPuzzle && (
                  <div className="aspect-square max-w-sm mx-auto">
                    <ChessBoard
                      game={game}
                      onMove={handleMove}
                      getValidMoves={getValidMoves}
                      disabled={showSolution || recordAttemptMutation.isPending}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Take your time and do your best. This helps us create the perfect learning path for you!
          </p>
        </div>
      </div>
    </div>
  );
}