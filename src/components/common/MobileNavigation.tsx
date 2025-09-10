import { Home, FileText, Calendar, BarChart3 } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export const MobileNavigation: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const navItems = user.role === 'admin' 
    ? [
        { to: "/admin", icon: Home, label: "Dashboard" },
        { to: "/orders", icon: FileText, label: "Orders" },
        { to: "/analytics", icon: BarChart3, label: "Analytics" },
      ]
    : [
        { to: "/dashboard", icon: Home, label: "Dashboard" },
        { to: "/orders", icon: FileText, label: "Orders" },
        { to: "/calendar", icon: Calendar, label: "Calendar" },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-nav-background border-t border-nav-border z-40">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center p-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            <Icon className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};