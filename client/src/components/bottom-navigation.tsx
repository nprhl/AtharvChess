import { useLocation } from "wouter";
import { Link } from "wouter";
import { Gamepad2, BookOpen, Lightbulb, BarChart3, Settings, Trophy } from "lucide-react";
import { useHasAnyRole } from "@/hooks/usePermissions";

const navItems = [
  { path: "/", icon: Gamepad2, label: "Play" },
  { path: "/lessons", icon: BookOpen, label: "Lessons" },
  { path: "/tips", icon: Lightbulb, label: "Tips" },
  { path: "/tournaments", icon: Trophy, label: "Tournaments" },
  { path: "/progress", icon: BarChart3, label: "Progress" },
  { path: "/settings", icon: Settings, label: "Settings" }
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 py-2 z-50">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path || (path === "/tournaments" && location.startsWith("/tournaments"));
          
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-2 rounded-lg transition-colors ${
                isActive ? 'nav-tab active' : 'nav-tab'
              }`}>
                <Icon className={`text-lg mb-1 ${
                  isActive ? 'text-blue-400' : 'text-muted-foreground'
                }`} size={20} />
                <span className={`text-xs ${
                  isActive ? 'text-blue-400 font-medium' : 'text-muted-foreground'
                }`}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
