import { Switch, Route, Link } from "wouter";
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

  // Public routes (no authentication required) - Show both login options
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route>
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="max-w-md w-full space-y-8 p-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-foreground mb-4">Chess Learning App</h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Master chess with AI-powered lessons, real-time analysis, and comprehensive tournament management.
                </p>
                
                <div className="space-y-4">
                  {/* Replit Auth Option */}
                  <a 
                    href="/api/login"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                  >
                    Log in with Replit
                  </a>
                  
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  
                  {/* Form-based Auth Options */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/login">
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">
                        Login
                      </button>
                    </Link>
                    <Link href="/register">
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full">
                        Sign Up
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Route>
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
