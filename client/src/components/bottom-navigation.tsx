import { useLocation } from "wouter";
import { Link } from "wouter";
import { Gamepad2, BookOpen, Lightbulb, BarChart3, Settings, Trophy, Users, Globe, History, type LucideIcon } from "lucide-react";
import { useNavigationItems, ROLES, PERMISSIONS } from "@/contexts/PermissionContext";

interface NavItem {
  id: string;
  path: string;
  icon?: React.ReactNode;
  label: string;
  permission?: string;
  role?: string;
  anyOf?: { permissions?: string[]; roles?: string[] };
}

const allNavItems: NavItem[] = [
  { 
    id: "play", 
    path: "/", 
    icon: <Gamepad2 />, 
    label: "Play" 
  },
  { 
    id: "lessons", 
    path: "/lessons", 
    icon: <BookOpen />, 
    label: "Lessons" 
  },
  { 
    id: "tips", 
    path: "/tips", 
    icon: <Lightbulb />, 
    label: "Tips" 
  },
  { 
    id: "tournaments", 
    path: "/tournaments", 
    icon: <Trophy />, 
    label: "Tournaments",
    anyOf: {
      roles: [ROLES.STUDENT, ROLES.TEACHER, ROLES.COACH, ROLES.ORGANIZER, ROLES.SUPER_ADMIN]
    }
  },
  { 
    id: "organizations", 
    path: "/organizations", 
    icon: <Globe />, 
    label: "Orgs",
    anyOf: {
      roles: [ROLES.TEACHER, ROLES.COACH, ROLES.ORGANIZER, ROLES.SUPER_ADMIN],
      permissions: [PERMISSIONS.ORG_MANAGE, PERMISSIONS.ORG_VIEW_MEMBERS]
    }
  },
  { 
    id: "history", 
    path: "/games/history", 
    icon: <History />, 
    label: "History" 
  },
  { 
    id: "progress", 
    path: "/progress", 
    icon: <BarChart3 />, 
    label: "Progress" 
  },
  { 
    id: "settings", 
    path: "/settings", 
    icon: <Settings />, 
    label: "Settings" 
  }
];

export default function BottomNavigation() {
  const [location] = useLocation();
  const { getVisibleItems, isLoading } = useNavigationItems();

  const visibleNavItems = getVisibleItems(allNavItems);

  if (isLoading) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 py-2 z-50">
        <div className="flex items-center justify-around">
          <div className="animate-pulse h-12 w-12 bg-muted rounded-lg"></div>
          <div className="animate-pulse h-12 w-12 bg-muted rounded-lg"></div>
          <div className="animate-pulse h-12 w-12 bg-muted rounded-lg"></div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-2 py-2 z-50">
      <div className="flex items-center justify-around">
        {visibleNavItems.map((item) => {
          const { path, icon, label } = item;
          const isActive = location === path || 
            (path === "/tournaments" && location.startsWith("/tournaments")) ||
            (path === "/organizations" && location.startsWith("/organizations"));
          
          return (
            <Link key={path} href={path}>
              <button className={`flex flex-col items-center py-2 px-2 rounded-lg transition-colors ${
                isActive ? 'nav-tab active' : 'nav-tab'
              }`}>
                {React.isValidElement(icon) ? 
                  React.cloneElement(icon as React.ReactElement<any>, { 
                    className: `text-lg mb-1 ${isActive ? 'text-blue-400' : 'text-muted-foreground'}`,
                    size: 20 
                  }) :
                  icon
                }
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
