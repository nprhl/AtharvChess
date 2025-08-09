import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import GamePage from "@/pages/game";
import LessonsPage from "@/pages/lessons";
import LessonDetailPage from "@/pages/lesson-detail";
import ProgressPage from "@/pages/progress";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import HeaderNavigation from "@/components/header-navigation";
import BottomNavigation from "@/components/bottom-navigation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GamePage} />
      <Route path="/lessons" component={LessonsPage} />
      <Route path="/lesson/:id" component={LessonDetailPage} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen max-w-md mx-auto bg-slate-800 shadow-2xl">
          <HeaderNavigation />
          <main className="flex-1 overflow-y-auto">
            <Router />
          </main>
          <BottomNavigation />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
