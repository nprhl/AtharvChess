import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkCheck, Clock, Star, CheckCircle, Lightbulb, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SimpleChessboard from "@/components/simple-chessboard";

interface ChessTip {
  id: number;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  fen?: string;
  moves?: Array<{ from: string; to: string }>;
  estimatedReadTime: number;
  tags: string[];
  isPersonalized?: boolean;
  progress: {
    completed: boolean;
    bookmarked: boolean;
    rating?: number;
  };
}

export default function TipOfTheDay() {
  const [showChessboard, setShowChessboard] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch today's tip
  const { data: tip, isLoading, error } = useQuery<ChessTip>({
    queryKey: ["/api/tips/today"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mark tip as completed
  const completeTipMutation = useMutation({
    mutationFn: (tipId: number) => apiRequest(`/api/tips/${tipId}/complete`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips/today"] });
      toast({ title: "Great job!", description: "Tip completed successfully!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark tip as completed", variant: "destructive" });
    },
  });

  // Toggle bookmark
  const bookmarkMutation = useMutation({
    mutationFn: (tipId: number) => apiRequest(`/api/tips/${tipId}/bookmark`, "POST"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips/today"] });
      toast({ title: "Saved!", description: "Tip bookmark updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to bookmark tip", variant: "destructive" });
    },
  });

  // Rate tip
  const rateTipMutation = useMutation({
    mutationFn: ({ tipId, rating }: { tipId: number; rating: number }) => 
      apiRequest(`/api/tips/${tipId}/rate`, "POST", { rating }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tips/today"] });
      toast({ title: "Thanks!", description: "Your rating has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to rate tip", variant: "destructive" });
    },
  });

  const getCategoryColor = (category: string) => {
    const colors = {
      opening: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      tactics: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      endgame: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      strategy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      psychology: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      general: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category as keyof typeof colors] || colors.general;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
      intermediate: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      advanced: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
    };
    return colors[difficulty as keyof typeof colors] || colors.beginner;
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !tip) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No tip available today</h3>
          <p className="text-muted-foreground">Check back later for your daily chess insight!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <CardTitle className="text-lg">Daily Chess Tip</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getCategoryColor(tip.category)}>
              {tip.category}
            </Badge>
            <Badge className={getDifficultyColor(tip.difficulty)}>
              {tip.difficulty}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {tip.estimatedReadTime}s read
          {tip.progress.completed && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              Completed
            </span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg mb-3">{tip.title}</h3>
          <p className="text-foreground leading-relaxed">{tip.content}</p>
        </div>

        {tip.fen && (
          <div className="space-y-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowChessboard(!showChessboard)}
              className="flex items-center gap-2"
            >
              {showChessboard ? "Hide" : "Show"} Example Position
              <ChevronRight className={`w-4 h-4 transition-transform ${showChessboard ? "rotate-90" : ""}`} />
            </Button>
            
            {showChessboard && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="w-full max-w-sm mx-auto flex flex-col items-center">
                  <SimpleChessboard fen={tip.fen} size={280} />
                  <div className="text-xs text-muted-foreground text-center mt-2">
                    Position: {tip.fen}
                  </div>
                </div>
                {tip.moves && tip.moves.length > 0 && (
                  <div className="mt-3 text-center">
                    <p className="text-sm text-muted-foreground">
                      Key moves: {tip.moves.map(move => `${move.from}-${move.to}`).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tip.tags && tip.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tip.tags.map((tag, index) => (
              <Badge 
                key={index} 
                variant={tag === 'personalized' || tag === 'ai-generated' ? 'default' : 'secondary'} 
                className={`text-xs ${
                  tag === 'personalized' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                  tag === 'ai-generated' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : ''
                }`}
              >
                {tag === 'personalized' ? '👤 Personalized' : 
                 tag === 'ai-generated' ? '🤖 AI-Generated' : tag}
              </Badge>
            ))}
          </div>
        )}

        {tip.isPersonalized && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-3 rounded-lg border">
            <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              This tip was generated specifically for your skill level and recent performance
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bookmarkMutation.mutate(tip.id)}
              disabled={bookmarkMutation.isPending}
              className="flex items-center gap-2"
            >
              {tip.progress.bookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-blue-600" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              {tip.progress.bookmarked ? "Saved" : "Save"}
            </Button>

            {!tip.progress.completed && (
              <Button
                size="sm"
                onClick={() => completeTipMutation.mutate(tip.id)}
                disabled={completeTipMutation.isPending}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Complete
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground mr-2">Rate:</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                className="p-1 h-auto"
                onClick={() => rateTipMutation.mutate({ tipId: tip.id, rating })}
                disabled={rateTipMutation.isPending}
              >
                <Star
                  className={`w-4 h-4 ${
                    tip.progress.rating && rating <= tip.progress.rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}