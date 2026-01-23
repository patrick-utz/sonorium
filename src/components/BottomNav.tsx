import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Library, 
  Heart, 
  Plus,
  User
} from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sammlung", label: "Sammlung", icon: Library },
  { to: "/hinzufuegen", label: "Hinzufügen", icon: Plus, isMain: true },
  { to: "/wunschliste", label: "Wunschliste", icon: Heart },
  { to: "/profil", label: "Profil", icon: User },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Gradient fade above nav */}
      <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      
      <div className="bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(item.to);
            
            if (item.isMain) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="relative -mt-6"
                >
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all",
                      "bg-gradient-vinyl border-2 border-primary/20"
                    )}
                  >
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </motion.div>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex-1 flex flex-col items-center gap-1 py-2"
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "relative flex flex-col items-center gap-1 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn("w-5 h-5", isActive && "text-primary")} />
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                        transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
                      />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
