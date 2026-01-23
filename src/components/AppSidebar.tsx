import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Library, 
  Heart, 
  Plus,
  Save,
  Disc3,
  Search,
  LogOut,
  Star,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useRecords } from "@/context/RecordContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sammlung", label: "Sammlung", icon: Library },
  { to: "/wunschliste", label: "Wunschliste", icon: Heart },
  { to: "/recherche", label: "Recherche", icon: Search },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();
  const { getFavoriteRecords } = useRecords();
  const favoriteCount = getFavoriteRecords().length;

  const NavItem = ({ to, label, icon: Icon, badge }: { to: string; label: string; icon: React.ElementType; badge?: number }) => {
    const isActive = to === "/" 
      ? location.pathname === "/" 
      : location.pathname.startsWith(to);

    const content = (
      <NavLink
        to={to}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        )}
      >
        <Icon className={cn(
          "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
          isActive && "text-primary"
        )} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
        {badge && badge > 0 && !collapsed && (
          <span className="ml-auto w-5 h-5 bg-vinyl-gold/20 text-vinyl-gold text-xs rounded-full flex items-center justify-center">
            {badge}
          </span>
        )}
        {isActive && (
          <motion.div
            layoutId="sidebarActiveIndicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary"
            transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}
          />
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
            {badge && badge > 0 && ` (${badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ type: "spring", bounce: 0.1, duration: 0.3 }}
      className="hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border sticky top-0"
    >
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="relative w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
            <Disc3 className="w-5 h-5 text-primary group-hover:animate-spin-slow" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden"
              >
                <h1 className="font-sans text-lg font-bold tracking-widest text-sidebar-foreground whitespace-nowrap">
                  SONORIUM
                </h1>
                <p className="text-[9px] text-muted-foreground -mt-0.5 tracking-widest uppercase whitespace-nowrap">
                  A place for your music
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </NavLink>
      </div>

      {/* Add Button */}
      <div className="p-3">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <NavLink to="/hinzufuegen">
              <Button 
                className={cn(
                  "gap-2 bg-gradient-vinyl hover:opacity-90 text-primary-foreground shadow-vinyl transition-all",
                  collapsed ? "w-full justify-center px-0" : "w-full"
                )}
              >
                <Plus className="w-5 h-5" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Hinzufügen
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </NavLink>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right" className="font-medium">
              Album hinzufügen
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        
        {/* Favorites */}
        <div className="pt-3 mt-3 border-t border-sidebar-border">
          <NavItem 
            to="/sammlung?favorites=true" 
            label="Favoriten" 
            icon={Star}
            badge={favoriteCount}
          />
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Profile */}
        <NavItem to="/profil" label="Profil" icon={User} />
        
        {/* Moods */}
        <NavItem to="/profil?tab=moods" label="Stimmungen" icon={Sparkles} />
        
        {/* Backup */}
        <NavItem to="/export" label="Backup" icon={Save} />

        {/* Collapse Toggle */}
        <div className="pt-2 mt-2 border-t border-sidebar-border space-y-1">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={onToggle}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-all",
                  collapsed ? "w-full" : "w-full justify-start"
                )}
              >
                {collapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <>
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    <span>Einklappen</span>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Sidebar ausklappen</TooltipContent>
            )}
          </Tooltip>

          {/* Logout */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                onClick={signOut}
                className={cn(
                  "text-muted-foreground hover:text-foreground transition-all",
                  collapsed ? "w-full" : "w-full justify-start"
                )}
              >
                <LogOut className={cn("w-4 h-4", !collapsed && "mr-2")} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      Abmelden
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right">Abmelden</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </motion.aside>
  );
}
