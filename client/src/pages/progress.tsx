import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, Puzzle, Flame, CalendarCheck, Crown, Target, BookOpen, TrendingUp, TrendingDown, Minus, ArrowUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function ProgressPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const { data: progressData, isLoading: progressLoading } = useQuery({
    queryKey: ["/api/user/progress"],
    enabled: isAuthenticated && !!user,
    retry: false,
  });

  if (isLoading || progressLoading) {
    return (
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">Please log in to view your progress</p>
            <a href="/api/login" className="text-blue-600 hover:underline">
              Sign In
            </a>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!progressData) {
    return (
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Unable to load progress data</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Handle case where user has no progress data yet
  if (!progressData.hasData) {
    return (
      <section className="p-4 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Your Progress</h2>
        <Card className="bg-card border-border">
          <CardContent className="p-6 text-center">
            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Start Your Chess Journey?</h3>
            <p className="text-muted-foreground mb-4">{progressData.message}</p>
            <p className="text-sm text-muted-foreground">
              Play games, solve puzzles, and complete lessons to track your progress and improvement.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  const getEloProgress = (rating: number, target: number) => {
    const range = target - Math.max(600, target - 400); // Dynamic range based on target
    const progress = ((rating - (target - 400)) / range) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getPlayerLevel = (rating: number) => {
    if (rating < 1000) return 'Beginner';
    if (rating < 1200) return 'Novice';
    if (rating < 1400) return 'Intermediate';
    if (rating < 1600) return 'Advanced';
    if (rating < 1800) return 'Expert';
    if (rating < 2000) return 'Master';
    return 'Grandmaster';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp;
      case 'declining': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-500';
      case 'declining': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const eloProgress = getEloProgress(progressData.currentElo, progressData.nextEloTarget);

  return (
    <section className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Your Progress</h2>

      {/* Elo Rating Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-blue-100 text-sm">Current Rating</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{progressData.currentElo}</p>
                {progressData.eloChange !== 0 && (
                  <Badge 
                    variant={progressData.eloChange > 0 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {progressData.eloChange > 0 ? '+' : ''}{progressData.eloChange}
                  </Badge>
                )}
              </div>
              <p className="text-blue-200 text-xs">{getPlayerLevel(progressData.currentElo)} Player</p>
              <p className="text-blue-300 text-xs mt-1">
                Target: {progressData.nextEloTarget} ({progressData.estimatedGamesToTarget} games)
              </p>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="rgba(255,255,255,0.2)" 
                  strokeWidth="4" 
                  fill="none"
                />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="white" 
                  strokeWidth="4" 
                  fill="none" 
                  strokeDasharray="175.9" 
                  strokeDashoffset={175.9 - (175.9 * eloProgress / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">{Math.round(eloProgress)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <p className="text-xs text-muted-foreground">Games Played</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{progressData.gamesPlayed}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="w-4 h-4 text-green-400" />
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{progressData.winRate}%</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-muted-foreground">Skill Areas</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{progressData.skillAreas.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <p className="text-xs text-muted-foreground">Improvements</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{progressData.recommendations.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Areas Progress */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Skill Areas
        </h3>
        
        {progressData.skillAreas.map((skill, index) => {
          const TrendIcon = getTrendIcon(skill.trend);
          
          return (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold capitalize text-card-foreground">
                    {skill.area}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Level {skill.currentLevel}/10
                    </span>
                    <TrendIcon className={`w-3 h-3 ${getTrendColor(skill.trend)}`} />
                  </div>
                </div>
                <Progress value={skill.currentLevel * 10} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground mb-1">
                  {skill.description}
                </p>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Practice: {skill.practiceCount} times</span>
                  <span>Success: {skill.successRate}%</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Improvement Recommendations */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recommended Improvements
        </h3>
        
        {progressData.recommendations.map((rec, index) => {
          const priorityColors = {
            high: 'bg-red-500',
            medium: 'bg-yellow-500',
            low: 'bg-green-500'
          };

          return (
            <Card key={index} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${priorityColors[rec.priority]}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold capitalize text-card-foreground">
                        {rec.area}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        +{rec.estimatedEloGain} ELO
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {rec.description}
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {rec.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="w-1 h-1 bg-muted-foreground rounded-full mt-1.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Games */}
      {progressData.recentPerformance.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Games
          </h3>
          
          {progressData.recentPerformance.map((game, index) => {
            const resultColors = {
              win: 'bg-green-500',
              loss: 'bg-red-500',
              draw: 'bg-gray-500'
            };

            return (
              <Card key={index} className="bg-card border-border">
                <CardContent className="p-3 flex items-center space-x-3">
                  <div className={`w-8 h-8 ${resultColors[game.result]} rounded-full flex items-center justify-center`}>
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-card-foreground">
                      {game.result.charAt(0).toUpperCase() + game.result.slice(1)} vs {game.opponent}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game.date} • {game.eloChange > 0 ? '+' : ''}{game.eloChange} ELO • {game.movesPlayed} moves
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
