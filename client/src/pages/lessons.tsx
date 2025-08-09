import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Trophy, Clock, Target, Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

export default function LessonsPage() {
  const [, setLocation] = useLocation();
  
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
          <h1 className="text-2xl font-bold text-white">Chess Lessons</h1>
          <p className="text-slate-400 text-sm">Master chess fundamentals step by step</p>
        </div>
        <Badge className="bg-emerald-500 text-white font-semibold px-3 py-1">
          Level 1
        </Badge>
      </div>

      {/* Progress Overview */}
      <Card className="bg-slate-700 border-slate-600">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Your Progress</h3>
            <div className="flex items-center space-x-2 text-emerald-400">
              <Trophy className="w-4 h-4" />
              <span className="text-sm font-medium">0/{lessons.length} Complete</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={0} className="h-2 mb-3" />
          <div className="flex justify-between text-xs text-slate-400">
            <span>Just getting started!</span>
            <span>0% Complete</span>
          </div>
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

      {/* Upcoming Lessons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Upcoming Lessons</h3>
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
                      <Badge className={`${getDifficultyColor(lesson.difficulty)} text-white text-xs flex-shrink-0`}>
                        {lesson.difficulty}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{lesson.description}</p>
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
