import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import GamePage from "@/pages/game";
import LessonsPage from "@/pages/lessons";
import LessonDetailPage from "@/pages/lesson-detail";
import ProgressPage from "@/pages/progress-demo";
import SettingsPage from "@/pages/settings";
import TipsPage from "@/pages/tips";
import TournamentsPage from "@/pages/tournaments";
import TournamentCreatePage from "@/pages/tournament-create";
import TournamentDetailPage from "@/pages/tournament-detail";
import OrganizationsPage from "@/pages/organizations";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import OnboardingPage from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import HeaderNavigation from "@/components/header-navigation";
import BottomNavigation from "@/components/bottom-navigation";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Public routes (no authentication required)
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/register" component={RegisterPage} />
        <Route path="/" component={LoginPage} />
        <Route component={LoginPage} />
      </Switch>
    );
  }

  // Authenticated routes
  if (!user?.onboardingCompleted) {
    return (
      <Switch>
        <Route path="/onboarding" component={OnboardingPage} />
        <Route component={OnboardingPage} />
      </Switch>
    );
  }

  // Main app routes (authenticated + onboarded users)
  return (
    <div className="flex flex-col min-h-screen md:max-w-none max-w-md mx-auto bg-background md:shadow-none shadow-2xl">
      <HeaderNavigation />
      <main className="flex-1 overflow-y-auto pb-20">
        <Switch>
          <Route path="/" component={GamePage} />
          <Route path="/lessons" component={LessonsPage} />
          <Route path="/lesson/:id" component={LessonDetailPage} />
          <Route path="/tips" component={TipsPage} />
          <Route path="/tournaments" component={TournamentsPage} />
          <Route path="/tournaments/create" component={TournamentCreatePage} />
          <Route path="/tournaments/:id" component={TournamentDetailPage} />
          <Route path="/organizations" component={OrganizationsPage} />
          <Route path="/progress" component={ProgressPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
