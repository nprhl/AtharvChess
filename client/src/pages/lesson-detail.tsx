import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Play, Lightbulb, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ChessBoard from "@/components/chess-board";
import { Chess, Square } from "chess.js";
import { useState, useEffect } from "react";

export default function LessonDetailPage() {
  const [, params] = useRoute("/lesson/:id");
  const [, setLocation] = useLocation();
  const lessonId = parseInt(params?.id || "1");

  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [game, setGame] = useState(new Chess());
  const [showHint, setShowHint] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const { data: lesson, isLoading } = useQuery<any>({
    queryKey: ['/api/lesson', lessonId]
  });

  useEffect(() => {
    if (lesson && lesson.content.sections[currentSectionIndex]?.content?.fen) {
      const newGame = new Chess(lesson.content.sections[currentSectionIndex].content.fen);
      setGame(newGame);
      setIsCorrect(false);
      setShowHint(false);
      setAttemptCount(0);
    }
  }, [lesson, currentSectionIndex]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-slate-700 rounded animate-pulse" />
        <div className="h-64 bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Lesson not found</p>
        <Button onClick={() => setLocation('/lessons')} className="mt-4">
          Back to Lessons
        </Button>
      </div>
    );
  }

  const currentSection = lesson.content.sections[currentSectionIndex];
  const isInteractive = currentSection.type === 'interactive';
  const progress = ((currentSectionIndex + 1) / lesson.content.sections.length) * 100;

  const handleMove = (from: Square, to: Square) => {
    if (!isInteractive || isCorrect) return false;

    const move = `${from}${to}`;
    const correctMoves = currentSection.content.correctMoves || [];
    
    if (correctMoves.includes(move)) {
      const newGame = new Chess(game.fen());
      try {
        newGame.move({ from, to });
        setGame(newGame);
        setIsCorrect(true);
        
        // Computer response after 1 second
        setTimeout(() => {
          makeComputerMove(newGame);
        }, 1000);
        
        return true;
      } catch {
        return false;
      }
    } else {
      setAttemptCount(prev => prev + 1);
      if (attemptCount >= 2) {
        setShowHint(true);
      }
      return false;
    }
  };

  const makeComputerMove = (currentGame: Chess) => {
    const moves = currentGame.moves();
    if (moves.length > 0) {
      // Simple computer logic: random move
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      const newGame = new Chess(currentGame.fen());
      newGame.move(randomMove);
      setGame(newGame);
    }
  };

  const getValidMoves = (square: Square) => {
    if (!isInteractive || isCorrect) return [];
    return game.moves({ square, verbose: true }).map(move => move.to);
  };

  const resetPosition = () => {
    if (currentSection.content?.fen) {
      setGame(new Chess(currentSection.content.fen));
      setIsCorrect(false);
      setShowHint(false);
      setAttemptCount(0);
    }
  };

  const nextSection = () => {
    if (currentSectionIndex < lesson.content.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      // Lesson completed - could track progress here
      setLocation('/lessons');
    }
  };

  const previousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  return (
    <section className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation('/lessons')}
          className="text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{lesson.title}</h1>
          <p className="text-sm text-slate-400">{lesson.description}</p>
        </div>
        <Badge className="bg-emerald-500 text-white">
          {currentSectionIndex + 1}/{lesson.content.sections.length}
        </Badge>
      </div>

      {/* Progress */}
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Lesson Progress</span>
            <span className="text-sm text-emerald-400">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </CardContent>
      </Card>

      {/* Current Section */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{currentSection.title}</h3>
            {isInteractive && (
              <Badge className="bg-blue-500 text-white">Interactive</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300 leading-relaxed">{currentSection.content.content || currentSection.content}</p>

          {/* Interactive Chess Section */}
          {isInteractive && currentSection.content.fen && (
            <div className="space-y-4">
              <div className="bg-slate-800 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-emerald-400">Practice Position</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetPosition}
                    className="text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mb-3">
                  <p className="text-sm text-slate-400 mb-2">Task:</p>
                  <p className="text-white text-sm">{currentSection.content.instruction}</p>
                </div>

                <ChessBoard
                  game={game}
                  onMove={handleMove}
                  getValidMoves={getValidMoves}
                  disabled={isCorrect}
                />

                {/* Feedback */}
                {isCorrect && (
                  <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Excellent move!</span>
                    </div>
                    <p className="text-sm text-emerald-300 mt-1">
                      You've successfully completed this exercise.
                    </p>
                  </div>
                )}

                {showHint && !isCorrect && (
                  <div className="mt-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                    <div className="flex items-center space-x-2 text-amber-400 mb-2">
                      <Lightbulb className="w-5 h-5" />
                      <span className="font-medium">Hint</span>
                    </div>
                    <ul className="text-sm text-amber-300 space-y-1">
                      {currentSection.content.hints?.map((hint: string, idx: number) => (
                        <li key={idx}>• {hint}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {attemptCount > 0 && !isCorrect && !showHint && (
                  <div className="mt-4 p-3 bg-slate-600/50 rounded-lg">
                    <p className="text-sm text-slate-400">
                      Try again! {attemptCount >= 2 ? "Hint will appear after one more attempt." : `Attempts: ${attemptCount}/3`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-600">
            <Button
              variant="outline"
              onClick={previousSection}
              disabled={currentSectionIndex === 0}
              className="border-slate-600 text-slate-400 hover:text-white"
            >
              Previous
            </Button>
            
            <Button
              onClick={nextSection}
              disabled={isInteractive && !isCorrect}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {currentSectionIndex === lesson.content.sections.length - 1 ? 'Complete Lesson' : 'Next'}
              <Play className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}