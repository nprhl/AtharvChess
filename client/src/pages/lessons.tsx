import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, BookOpen, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function LessonsPage() {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ['/api/lessons']
  });

  const currentLesson = lessons?.[3]; // Knight Moves lesson
  const completedLessons = lessons?.slice(0, 3) || [];

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

  return (
    <section className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Daily Lessons</h2>
        <Badge className="bg-emerald-500 text-xs">Day 5</Badge>
      </div>

      {/* Current Lesson Card */}
      {currentLesson && (
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none">
          <CardContent className="p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{currentLesson.title}</h3>
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-2xl">♘</span>
              </div>
            </div>
            <p className="text-emerald-100 text-sm mb-4">
              {currentLesson.description}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full" />
                <div className="w-2 h-2 bg-white/50 rounded-full" />
                <div className="w-2 h-2 bg-white/30 rounded-full" />
              </div>
              <Button 
                className="bg-white text-emerald-600 hover:bg-emerald-50"
                size="sm"
              >
                Start Lesson
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Previous Lessons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Previous Lessons
        </h3>
        
        {completedLessons.map((lesson) => (
          <Card key={lesson.id} className="bg-slate-700 border-slate-600">
            <CardContent className="p-3 flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-sm">{lesson.title}</h4>
                <p className="text-xs text-slate-400">
                  Completed • {Math.floor(Math.random() * 5) + 1} days ago
                </p>
              </div>
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                {Math.floor(Math.random() * 10) + 85}%
              </Badge>
            </CardContent>
          </Card>
        ))}

        {completedLessons.length === 0 && (
          <Card className="bg-slate-700 border-slate-600">
            <CardContent className="p-6 text-center">
              <BookOpen className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No completed lessons yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Complete your first lesson to see progress here
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
}
