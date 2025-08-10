import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Trophy, Clock, Target, Play, Star, Brain, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function LessonsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const { data: lessons = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/lessons']
  });

  const currentLesson = lessons[0]; // First uncompleted lesson
  const completedLessons = []; // No completed lessons yet
  const upcomingLessons = lessons.slice(1, 4);
  
  const startLesson = (lessonId: number) => {
    setLocation(`/lesson/${lessonId}`);
  };

  if (isLoading) {
    return (
      <section className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-12" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </section>
    );
  }

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'beginner': return 'bg-green-500';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getPieceIcon = (order: number) => {
    const icons = ['♟︎', '♜', '♝', '♞', '♛', '♚'];
    return icons[order - 1] || '♟︎';
  };

  return (
    <section className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI-Personalized Lessons</h1>
          <div className="flex items-center space-x-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <p className="text-slate-400 text-sm">
              Tailored for your ELO rating ({user?.eloRating || 'calculating...'})
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-blue-600 text-white font-semibold px-3 py-1 flex items-center space-x-1">
            <Sparkles className="w-3 h-3" />
            <span>AI Selected</span>
          </Badge>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">AI-Recommended Progress</h3>
            <div className="flex items-center space-x-2 text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">0/{lessons.length} Complete</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={0} className="h-2 mb-3" />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Lessons matched to your skill level</span>
            <span>0% Complete</span>
          </div>
          {user?.eloRating && (
            <div className="mt-3 p-2 bg-slate-600/50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-slate-300">
                  <Brain className="w-3 h-3 text-blue-400" />
                  <span>
                    {user.eloRating > 1200 ? "Advanced content focused on tactics and strategy" :
                     user.eloRating > 1000 ? "Intermediate lessons with tactical training" :
                     "Beginner-friendly lessons with fundamentals"}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs border-slate-500 text-slate-300 hover:bg-slate-600"
                  onClick={() => {
                    // Could navigate to a detailed explanation or settings
                  }}
                >
                  Learn More
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Lesson */}
      {currentLesson && (
        <Card className="bg-gradient-to-br from-blue-600 to-purple-700 border-none text-white">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className="bg-white/20 text-white text-xs">Next Up</Badge>
                  <Badge className={`${getDifficultyColor(currentLesson.difficulty)} text-white text-xs`}>
                    {currentLesson.difficulty}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold mb-2">{currentLesson.title}</h3>
                <p className="text-blue-100 mb-4">{currentLesson.description}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center ml-4">
                <span className="text-3xl">{getPieceIcon(currentLesson.order)}</span>
              </div>
            </div>

            {currentLesson.content && (
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-4 text-blue-100 text-sm">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{currentLesson.content.estimatedTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Target className="w-4 h-4" />
                    <span>{currentLesson.content.objectives?.length || 0} objectives</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Difficulty {currentLesson.content.difficulty}/5</span>
                  </div>
                </div>
                
                {currentLesson.content.objectives && (
                  <div className="bg-white/10 rounded-lg p-3">
                    <h4 className="text-sm font-medium mb-2">Learning Objectives:</h4>
                    <ul className="space-y-1">
                      {currentLesson.content.objectives.slice(0, 3).map((objective: string, idx: number) => (
                        <li key={idx} className="text-xs text-blue-100 flex items-center space-x-2">
                          <div className="w-1 h-1 bg-white rounded-full flex-shrink-0" />
                          <span>{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={() => startLesson(currentLesson.id)}
              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Learning
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommended Lessons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">AI Recommendations for You</h3>
          <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
            ELO {user?.eloRating || 850} Level
          </Badge>
        </div>
        
        {/* Skill Level Explanation */}
        <Card className="bg-slate-800/50 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3 mb-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <h4 className="font-medium text-white">Why these lessons?</h4>
            </div>
            <p className="text-sm text-slate-300">
              {user?.eloRating && user.eloRating > 1200 ? 
                "Advanced player focus: Complex tactics, positional play, and strategic concepts. Basic lessons are hidden." :
              user?.eloRating && user.eloRating > 1000 ? 
                "Intermediate player focus: Tactical training, opening principles, and endgame basics. You've moved beyond basics." :
                "Beginner-friendly focus: Piece coordination, simple tactics, and fundamental concepts. Building your foundation."
              }
            </p>
            <div className="flex items-center space-x-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Target className="w-3 h-3" />
                <span>Focus: {user?.eloRating && user.eloRating > 1000 ? 'Tactics & Strategy' : 'Fundamentals'}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>{lessons.length} lessons selected from {user?.eloRating && user.eloRating > 1200 ? '20+' : '15+'} total</span>
              </span>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-3">
          {upcomingLessons.map((lesson: any, index: number) => (
            <Card key={lesson.id} className="bg-slate-700/50 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-slate-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{getPieceIcon(lesson.order)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-white truncate">{lesson.title}</h4>
                      <div className="flex items-center space-x-1">
                        <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white text-xs flex-shrink-0`}>
                          {lesson.difficulty}
                        </Badge>
                        {/* AI Recommendation Reason Badge */}
                        {lesson.title.toLowerCase().includes('tactics') && user?.eloRating && user.eloRating >= 800 && (
                          <Badge variant="outline" className="border-green-400 text-green-400 text-xs">
                            Key Skill
                          </Badge>
                        )}
                        {lesson.difficulty === 'intermediate' && user?.eloRating && user.eloRating >= 1000 && (
                          <Badge variant="outline" className="border-blue-400 text-blue-400 text-xs">
                            Perfect Match
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{lesson.description}</p>
                    {/* AI Recommendation Reason */}
                    <div className="mt-2 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <Brain className="w-3 h-3 text-blue-400" />
                        <span>
                          {lesson.title.toLowerCase().includes('tactics') ? 'Recommended: Critical for your rating improvement' :
                           lesson.difficulty === 'intermediate' && user?.eloRating && user.eloRating >= 1000 ? 'Recommended: Matches your skill level' :
                           lesson.difficulty === 'beginner' && user?.eloRating && user.eloRating < 1000 ? 'Recommended: Builds foundation' :
                           'Recommended: AI-selected for your progress'}
                        </span>
                      </span>
                    </div>
                    {lesson.content && (
                      <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{lesson.content.estimatedTime}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>{lesson.content.objectives?.length || 0} goals</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => startLesson(lesson.id)}
                    className="text-slate-400 hover:text-white flex-shrink-0"
                  >
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Learning Path Visualization */}
      <Card className="bg-slate-800 border-slate-600">
        <CardHeader>
          <h3 className="font-semibold text-white flex items-center space-x-2">
            <Target className="w-5 h-5 text-green-400" />
            <span>Your Learning Path</span>
          </h3>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Current Stage */}
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                1
              </div>
              <div className="flex-1">
                <h4 className="text-white font-medium">
                  {user?.eloRating && user.eloRating > 1200 ? 'Advanced Tactics' :
                   user?.eloRating && user.eloRating > 1000 ? 'Intermediate Skills' :
                   'Foundation Building'}
                </h4>
                <p className="text-slate-400 text-sm">Current stage</p>
              </div>
              <Badge className="bg-green-500 text-white">Active</Badge>
            </div>
            
            {/* Next Stage */}
            <div className="flex items-center space-x-4 opacity-60">
              <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-slate-300 text-sm font-bold">
                2
              </div>
              <div className="flex-1">
                <h4 className="text-slate-300 font-medium">
                  {user?.eloRating && user.eloRating > 1200 ? 'Master Strategy' :
                   user?.eloRating && user.eloRating > 1000 ? 'Advanced Tactics' :
                   'Tactical Training'}
                </h4>
                <p className="text-slate-500 text-sm">Next milestone</p>
              </div>
              <Badge variant="outline" className="border-slate-500 text-slate-500">Locked</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievement Section */}
      <Card className="bg-gradient-to-r from-amber-500 to-orange-600 border-none text-white">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold">Ready to Start Your Journey?</h4>
              <p className="text-sm text-amber-100">Complete lessons to unlock achievements and advance your chess skills</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
