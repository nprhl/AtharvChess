import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Bookmark, TrendingUp, Clock, Star, BookOpen } from "lucide-react";
import TipOfTheDay from "@/components/tip-of-the-day";

interface TipStats {
  totalViewed: number;
  totalCompleted: number;
  totalBookmarked: number;
  completionRate: number;
  totalReadingTime: number;
  currentStreak: number;
}

interface BookmarkedTip {
  id: number;
  title: string;
  content: string;
  category: string;
  difficulty: string;
  estimatedReadTime: number;
  tags: string[];
  bookmarkedAt: string;
}

export default function TipsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Fetch user tip stats
  const { data: stats, isLoading: statsLoading } = useQuery<TipStats>({
    queryKey: ["/api/tips/stats"],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch bookmarked tips
  const { data: bookmarks, isLoading: bookmarksLoading } = useQuery<BookmarkedTip[]>({
    queryKey: ["/api/tips/bookmarks"],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch tips by category
  const { data: categoryTips, isLoading: categoryLoading } = useQuery({
    queryKey: ["/api/tips/category", activeCategory],
    enabled: activeCategory !== "all",
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const categories = [
    { id: "all", name: "All", icon: "📚" },
    { id: "opening", name: "Opening", icon: "🏁" },
    { id: "tactics", name: "Tactics", icon: "⚔️" },
    { id: "endgame", name: "Endgame", icon: "🏆" },
    { id: "strategy", name: "Strategy", icon: "🧩" },
    { id: "psychology", name: "Psychology", icon: "🧠" },
  ];

  const formatReadingTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes === 0) return `${seconds}s`;
    return minutes === 1 ? "1 min" : `${minutes} mins`;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      opening: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      tactics: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      endgame: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      strategy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      psychology: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
    return colors[category as keyof typeof colors] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  };

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          Chess Tips
        </h1>
        <p className="text-muted-foreground">
          Bite-sized chess wisdom to improve your game every day
        </p>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Today's Tip</TabsTrigger>
          <TabsTrigger value="explore">Explore</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <TipOfTheDay />
        </TabsContent>

        <TabsContent value="explore" className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                className="flex items-center gap-2"
              >
                <span>{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>

          {activeCategory === "all" ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-blue-600" />
                    Your Bookmarks
                  </CardTitle>
                  <CardDescription>
                    Tips you've saved for later reference
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bookmarksLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                      ))}
                    </div>
                  ) : bookmarks && bookmarks.length > 0 ? (
                    <div className="space-y-3">
                      {bookmarks.slice(0, 5).map((tip) => (
                        <div key={tip.id} className="flex justify-between items-center p-3 border rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium">{tip.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getCategoryColor(tip.category)} variant="secondary">
                                {tip.category}
                              </Badge>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {tip.estimatedReadTime}s
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {bookmarks.length > 5 && (
                        <p className="text-center text-muted-foreground text-sm">
                          And {bookmarks.length - 5} more bookmarked tips
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No bookmarked tips yet. Save your favorite tips to find them here!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {categoryLoading ? (
                <div className="grid gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                          <div className="h-6 bg-muted rounded w-3/4"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded"></div>
                            <div className="h-4 bg-muted rounded w-5/6"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : categoryTips && Array.isArray(categoryTips) && categoryTips.length > 0 ? (
                <div className="grid gap-4">
                  {categoryTips.map((tip: any) => (
                    <Card key={tip.id}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{tip.title}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={getCategoryColor(tip.category)}>
                              {tip.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {tip.estimatedReadTime}s
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-foreground leading-relaxed mb-4">
                          {tip.content.length > 200 
                            ? `${tip.content.substring(0, 200)}...` 
                            : tip.content
                          }
                        </p>
                        {tip.tags && tip.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {tip.tags.map((tag: string, index: number) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No tips in this category yet</h3>
                    <p className="text-muted-foreground">
                      More {activeCategory} tips are coming soon!
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-8 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stats ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Learning Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {stats.currentStreak}
                  </div>
                  <p className="text-muted-foreground">
                    {stats.currentStreak === 1 ? "day" : "days"} in a row
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    Tips Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.totalCompleted}
                  </div>
                  <p className="text-muted-foreground">
                    out of {stats.totalViewed} viewed
                  </p>
                  <Progress 
                    value={stats.completionRate} 
                    className="mt-2" 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.completionRate}% completion rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bookmark className="w-5 h-5 text-yellow-600" />
                    Bookmarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">
                    {stats.totalBookmarked}
                  </div>
                  <p className="text-muted-foreground">
                    tips saved for later
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Reading Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {formatReadingTime(stats.totalReadingTime)}
                  </div>
                  <p className="text-muted-foreground">
                    total learning time
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Start Your Learning Journey</h3>
                <p className="text-muted-foreground">
                  Read your first tip to begin tracking your progress!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}