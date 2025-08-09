import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Puzzle, Flame, CalendarCheck, Crown, Target, BookOpen } from "lucide-react";

export default function ProgressPage() {
  // For now, we'll use mock data since we don't have user authentication
  const mockUser = {
    id: 1,
    eloRating: 1250,
    gamesWon: 47,
    puzzlesSolved: 156,
    currentStreak: 5,
    lessonsCompleted: 12
  };

  const mockRecentActivity = [
    {
      id: 1,
      type: 'game_won',
      description: 'Won game vs. Alex',
      timestamp: '2 hours ago',
      detail: '+12 Elo',
      icon: Trophy,
      color: 'emerald'
    },
    {
      id: 2,
      type: 'puzzles',
      description: 'Completed 5 puzzles',
      timestamp: 'Yesterday',
      detail: '95% accuracy',
      icon: Puzzle,
      color: 'purple'
    },
    {
      id: 3,
      type: 'lesson',
      description: 'Finished Knight Moves lesson',
      timestamp: '2 days ago',
      detail: '88% score',
      icon: BookOpen,
      color: 'blue'
    }
  ];

  const getEloProgress = (rating: number) => {
    const minRating = 1000;
    const maxRating = 2000;
    const progress = ((rating - minRating) / (maxRating - minRating)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getPlayerLevel = (rating: number) => {
    if (rating < 1200) return 'Beginner';
    if (rating < 1500) return 'Intermediate';
    if (rating < 1800) return 'Advanced';
    return 'Expert';
  };

  const eloProgress = getEloProgress(mockUser.eloRating);

  return (
    <section className="p-4 space-y-4">
      <h2 className="text-xl font-bold text-foreground">Your Progress</h2>

      {/* Elo Rating Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Current Rating</p>
              <p className="text-2xl font-bold text-white">{mockUser.eloRating}</p>
              <p className="text-blue-200 text-xs">{getPlayerLevel(mockUser.eloRating)} Player</p>
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
              <p className="text-xs text-muted-foreground">Games Won</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{mockUser.gamesWon}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Puzzle className="w-4 h-4 text-purple-400" />
              <p className="text-xs text-muted-foreground">Puzzles Solved</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{mockUser.puzzlesSolved}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Flame className="w-4 h-4 text-red-400" />
              <p className="text-xs text-muted-foreground">Current Streak</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{mockUser.currentStreak}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2 mb-2">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
            <p className="text-xl font-bold text-card-foreground">{mockUser.lessonsCompleted}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Activity
        </h3>
        
        {mockRecentActivity.map((activity) => {
          const IconComponent = activity.icon;
          const colorClasses = {
            emerald: 'bg-emerald-500',
            purple: 'bg-purple-500',
            blue: 'bg-blue-500'
          };

          return (
            <Card key={activity.id} className="bg-card border-border">
              <CardContent className="p-3 flex items-center space-x-3">
                <div className={`w-8 h-8 ${colorClasses[activity.color as keyof typeof colorClasses]} rounded-full flex items-center justify-center`}>
                  <IconComponent className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-card-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.timestamp} • {activity.detail}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
