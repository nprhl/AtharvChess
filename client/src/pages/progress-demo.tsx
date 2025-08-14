import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, BookOpen, Flame, TrendingUp, TrendingDown, Minus, Clock, Star, CheckCircle2, Award, Brain } from "lucide-react";

export default function ProgressPage() {
  // Realistic mock data for a beginner who has progressed through openings and middle game, now learning endgames
  const mockProgress = {
    user: {
      username: "ChessLearner",
      eloRating: 1185,
      gamesWon: 23,
      gamesLost: 31,
      gamesDrawn: 4,
      totalGames: 58
    },
    skillAreas: [
      {
        name: "Opening Principles",
        level: "Intermediate",
        progress: 85,
        description: "You've mastered basic opening principles! Control the center, develop pieces, and castle early.",
        recentImprovement: "+15% in last month",
        color: "bg-green-500",
        status: "mastered"
      },
      {
        name: "Middle Game Tactics",
        level: "Intermediate", 
        progress: 72,
        description: "Great tactical awareness! You're spotting pins, forks, and discovered attacks consistently.",
        recentImprovement: "+8% in last month",
        color: "bg-blue-500",
        status: "progressing"
      },
      {
        name: "Endgame Technique",
        level: "Learning",
        progress: 35,
        description: "Currently focusing on endgame fundamentals. King and pawn endings are your priority.",
        recentImprovement: "+12% in last month",
        color: "bg-orange-500",
        status: "learning"
      },
      {
        name: "Positional Understanding",
        level: "Beginner",
        progress: 28,
        description: "Building awareness of pawn structure and piece coordination.",
        recentImprovement: "+5% in last month", 
        color: "bg-purple-500",
        status: "starting"
      }
    ],
    recentGames: [
      { 
        date: "2 days ago", 
        opponent: "AI (Easy)", 
        result: "win", 
        duration: "12 min", 
        opening: "Italian Game",
        eloChange: +12,
        phase: "Won in endgame"
      },
      { 
        date: "3 days ago", 
        opponent: "Player1542", 
        result: "loss", 
        duration: "18 min", 
        opening: "Sicilian Defense",
        eloChange: -8,
        phase: "Lost in middlegame"
      },
      { 
        date: "4 days ago", 
        opponent: "ChessBot", 
        result: "win", 
        duration: "25 min", 
        opening: "Queen's Pawn",
        eloChange: +15,
        phase: "Won tactically"
      },
      { 
        date: "5 days ago", 
        opponent: "AI (Medium)", 
        result: "loss", 
        duration: "16 min", 
        opening: "French Defense",
        eloChange: -10,
        phase: "Endgame mistake"
      },
      { 
        date: "1 week ago", 
        opponent: "BeginnerBot", 
        result: "draw", 
        duration: "31 min", 
        opening: "English Opening",
        eloChange: +2,
        phase: "Drew complex endgame"
      }
    ],
    achievements: [
      { title: "First Win!", description: "Won your first chess game", date: "3 weeks ago", icon: "🏆", completed: true },
      { title: "Opening Master", description: "Completed opening fundamentals course", date: "2 weeks ago", icon: "🚀", completed: true },
      { title: "Tactical Ninja", description: "Solved 50+ tactical puzzles", date: "1 week ago", icon: "⚔️", completed: true },
      { title: "Endgame Student", description: "Started endgame lessons", date: "3 days ago", icon: "👑", completed: true },
      { title: "Consistent Player", description: "Play 5 games in a week", date: "In progress", icon: "🔥", completed: false, progress: 3 }
    ],
    weeklyStats: {
      gamesPlayed: 8,
      puzzlesSolved: 15,
      studyTime: "3h 42m",
      winRate: 40,
      streak: 2
    },
    nextGoals: [
      { goal: "Master King + Pawn vs King", priority: "High", estimatedTime: "2 weeks" },
      { goal: "Learn Basic Rook Endgames", priority: "High", estimatedTime: "3 weeks" },
      { goal: "Improve Tactical Vision", priority: "Medium", estimatedTime: "4 weeks" }
    ]
  };

  const getEloColor = (rating: number) => {
    if (rating < 1000) return "text-orange-500";
    if (rating < 1200) return "text-yellow-500";
    if (rating < 1400) return "text-green-500";
    if (rating < 1600) return "text-blue-500";
    return "text-purple-500";
  };

  const getResultColor = (result: string) => {
    const colors = {
      win: "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200",
      loss: "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200",
      draw: "text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200"
    };
    return colors[result as keyof typeof colors] || colors.draw;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      mastered: CheckCircle2,
      progressing: TrendingUp,
      learning: Brain,
      starting: Target
    };
    return icons[status as keyof typeof icons] || Target;
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          Your Chess Progress
        </h1>
        <p className="text-muted-foreground">
          Track your improvement and master new skills
        </p>
      </div>

      {/* ELO Rating Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm mb-1">Current Rating</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{mockProgress.user.eloRating}</span>
                <Badge className="bg-white/20 text-white border-white/30">
                  Improving Player
                </Badge>
              </div>
              <p className="text-blue-200 text-sm mt-2">
                Next goal: 1300 ELO (~25 games)
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {Math.round((mockProgress.user.gamesWon / mockProgress.user.totalGames) * 100)}%
              </div>
              <p className="text-blue-200 text-sm">Win Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold text-green-600">{mockProgress.user.gamesWon}</div>
            <p className="text-sm text-muted-foreground">Games Won</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold">{mockProgress.user.totalGames}</div>
            <p className="text-sm text-muted-foreground">Total Games</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <div className="text-2xl font-bold">{mockProgress.weeklyStats.studyTime}</div>
            <p className="text-sm text-muted-foreground">Study Time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Flame className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold">{mockProgress.weeklyStats.streak}</div>
            <p className="text-sm text-muted-foreground">Day Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Skill Areas Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Skill Development
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockProgress.skillAreas.map((skill, index) => {
            const StatusIcon = getStatusIcon(skill.status);
            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusIcon className={`w-4 h-4 ${skill.color.replace('bg-', 'text-')}`} />
                    <span className="font-medium">{skill.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {skill.level}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {skill.recentImprovement}
                  </span>
                </div>
                <Progress value={skill.progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{skill.description}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Learning Focus */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
            <Star className="w-5 h-5" />
            Current Learning Focus: Endgames
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Why Endgames Matter</h4>
              <p className="text-sm text-muted-foreground mb-3">
                You've built a solid foundation in openings and tactics. Now it's time to learn how to convert your advantages in the endgame!
              </p>
              <div className="space-y-2">
                {mockProgress.nextGoals.map((goal, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        goal.priority === 'High' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      {goal.goal}
                    </span>
                    <span className="text-muted-foreground">{goal.estimatedTime}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Recent Games
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockProgress.recentGames.map((game, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Badge className={getResultColor(game.result)}>
                    {game.result.toUpperCase()}
                  </Badge>
                  <div>
                    <p className="font-medium">vs {game.opponent}</p>
                    <p className="text-sm text-muted-foreground">
                      {game.opening} • {game.duration} • {game.phase}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${game.eloChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {game.eloChange >= 0 ? '+' : ''}{game.eloChange}
                  </div>
                  <p className="text-xs text-muted-foreground">{game.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {mockProgress.achievements.map((achievement, index) => (
              <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                achievement.completed 
                  ? 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' 
                  : 'bg-muted/30'
              }`}>
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{achievement.title}</h4>
                  <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  {!achievement.completed && achievement.progress && (
                    <div className="mt-1">
                      <Progress value={(achievement.progress / 5) * 100} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.progress}/5 complete
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {achievement.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-muted rounded-full" />
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{achievement.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}