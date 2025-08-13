import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Puzzle, Flame, CalendarCheck, Crown, Target, BookOpen, TrendingUp, TrendingDown, Clock, Star, Zap } from "lucide-react";

export default function ProgressPage() {
  // Mock realistic beginner progress data
  const progress = {
    user: {
      id: 1,
      username: "ChessLearner",
      eloRating: 1185,
      gamesWon: 23,
      gamesLost: 31,
      gamesDrawn: 4,
      puzzlesSolved: 87,
      lessonsCompleted: 12
    },
    skillAreas: [
      {
        name: "Opening Principles",
        level: "Intermediate",
        progress: 85,
        description: "You've mastered basic opening principles! Control the center, develop pieces, and castle early.",
        recentImprovement: "+15% in last month",
        color: "bg-green-500"
      },
      {
        name: "Middle Game Tactics",
        level: "Intermediate", 
        progress: 72,
        description: "Great tactical awareness! You're spotting pins, forks, and discovered attacks consistently.",
        recentImprovement: "+8% in last month",
        color: "bg-blue-500"
      },
      {
        name: "Endgame Technique",
        level: "Beginner",
        progress: 35,
        description: "Currently learning endgame fundamentals. Focus on king and pawn endings.",
        recentImprovement: "+12% in last month",
        color: "bg-orange-500"
      },
      {
        name: "Positional Understanding",
        level: "Beginner",
        progress: 28,
        description: "Building awareness of pawn structure and piece coordination.",
        recentImprovement: "+5% in last month", 
        color: "bg-purple-500"
      }
    ],
    recentGames: [
      { date: "2 days ago", opponent: "AI (Easy)", result: "win", duration: "12 min", opening: "Italian Game" },
      { date: "3 days ago", opponent: "AI (Easy)", result: "loss", duration: "18 min", opening: "Sicilian Defense" },
      { date: "4 days ago", opponent: "Player1542", result: "win", duration: "25 min", opening: "Queen's Pawn" },
      { date: "5 days ago", opponent: "AI (Medium)", result: "loss", duration: "16 min", opening: "French Defense" },
      { date: "1 week ago", opponent: "ChessBot", result: "draw", duration: "31 min", opening: "English Opening" }
    ],
    achievements: [
      { title: "First Win!", description: "Won your first chess game", date: "3 weeks ago", icon: "🏆" },
      { title: "Tactical Ninja", description: "Solved 50 puzzles", date: "1 week ago", icon: "⚔️" },
      { title: "Opening Expert", description: "Completed opening fundamentals", date: "5 days ago", icon: "🚀" },
      { title: "Endgame Student", description: "Started endgame lessons", date: "2 days ago", icon: "👑" }
    ],
    weeklyStats: {
      gamesPlayed: 8,
      puzzlesSolved: 15,
      studyTime: "3h 42m",
      winRate: 62
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">Your Chess Journey</h1>
        <p className="text-muted-foreground">Track your progress and celebrate achievements</p>
      </div>

      {/* Player Overview Card */}
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none text-white">
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">{progress.user.username}</h2>
            <div className="text-3xl font-bold mb-2">{progress.user.eloRating}</div>
            <div className="text-blue-100 text-sm">Novice Player</div>
            <div className="flex justify-center items-center gap-6 mt-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">{progress.user.gamesWon}</div>
                <div className="text-blue-200">Won</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{progress.user.gamesDrawn}</div>
                <div className="text-blue-200">Draw</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{progress.user.gamesLost}</div>
                <div className="text-blue-200">Lost</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Puzzle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{progress.user.puzzlesSolved}</div>
            <div className="text-sm text-muted-foreground">Puzzles Solved</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-foreground">{progress.user.lessonsCompleted}</div>
            <div className="text-sm text-muted-foreground">Lessons Done</div>
          </CardContent>
        </Card>
      </div>

      {/* Skill Areas Progress */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Learning Progress</h3>
        
        {progress.skillAreas.map((skill, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                  {skill.name === "Opening Principles" && "🚀"}
                  {skill.name === "Middle Game Tactics" && "⚔️"}
                  {skill.name === "Endgame Technique" && "👑"}
                  {skill.name === "Positional Understanding" && "🧩"}
                  {skill.name}
                </h4>
                <Badge 
                  variant={skill.level === "Intermediate" ? "default" : "secondary"}
                  className="text-xs"
                >
                  {skill.level}
                </Badge>
              </div>
              
              <Progress value={skill.progress} className="h-2 mb-3" />
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{skill.progress}% Complete</span>
                <span className="text-green-600 font-medium">{skill.recentImprovement}</span>
              </div>
              
              <p className="text-sm text-muted-foreground mt-2">{skill.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Weekly Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            This Week's Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{progress.weeklyStats.gamesPlayed}</div>
              <div className="text-sm text-muted-foreground">Games Played</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{progress.weeklyStats.puzzlesSolved}</div>
              <div className="text-sm text-muted-foreground">Puzzles Solved</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{progress.weeklyStats.studyTime}</div>
              <div className="text-sm text-muted-foreground">Study Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{progress.weeklyStats.winRate}%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {progress.achievements.map((achievement, index) => (
            <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{achievement.title}</h4>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                <p className="text-xs text-muted-foreground">{achievement.date}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Recent Games
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {progress.recentGames.map((game, index) => {
            const resultColors = {
              win: 'text-green-600',
              loss: 'text-red-600',
              draw: 'text-gray-600'
            };
            const resultBgs = {
              win: 'bg-green-100 dark:bg-green-950',
              loss: 'bg-red-100 dark:bg-red-950',
              draw: 'bg-gray-100 dark:bg-gray-950'
            };

            return (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${resultBgs[game.result as keyof typeof resultBgs]}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold capitalize ${resultColors[game.result as keyof typeof resultColors]}`}>
                      {game.result}
                    </span>
                    <span className="text-sm text-muted-foreground">vs {game.opponent}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {game.opening} • {game.duration}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{game.date}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Focus Area */}
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Crown className="w-5 h-5" />
            Current Focus: Endgame Learning
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            You're making great progress! With solid opening and middle game skills, it's time to master endgames.
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-green-500" />
              <span>Completed: King and Pawn basics</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Currently learning: Rook endgames</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Next up: Queen vs Pawn endgames</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
