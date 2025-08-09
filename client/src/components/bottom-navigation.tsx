import { useLocation } from "wouter";
import { Link } from "wouter";
import { Gamepad2, BookOpen, BarChart3, Settings } from "lucide-react";

const navItems = [
  { path: "/", icon: Gamepad2, label: "Play" },
  { path: "/lessons", icon: BookOpen, label: "Lessons" },
  { path: "/progress", icon: BarChart3, label: "Progress" },
  { path: "/settings", icon: Settings, label: "Settings" }
];

export default function BottomNavigation() {
  const [location] = useLocation();

  return (
    <nav className="bg-slate-900 border-t border-slate-700 px-4 py-2">
      <div className="flex items-center justify-around">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive ? 'nav-tab active' : 'nav-tab'
              }`}>
                <Icon className={`text-lg mb-1 ${
                  isActive ? 'text-blue-400' : 'text-slate-300'
                }`} size={20} />
                <span className={`text-xs ${
                  isActive ? 'text-blue-400 font-medium' : 'text-slate-300'
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
