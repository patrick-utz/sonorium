import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Library, 
  Heart, 
  Plus,
  Save,
  Disc3,
  Menu,
  X,
  Star,
  Search,
  User,
  Bell,
  Grid3X3,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QuickSearch } from "@/components/QuickSearch";
import { useRecords } from "@/context/RecordContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/sammlung", label: "Sammlung", icon: Library },
  { to: "/wunschliste", label: "Wunschliste", icon: Heart },
  { to: "/recherche", label: "Recherche", icon: Search },
  { to: "/export", label: "Speichern", icon: Save },
];

// Bottom nav items for mobile
const bottomNavItems = [
  { to: "/", label: "Home", icon: Grid3X3 },
  { to: "/recherche", label: "Suche", icon: Search },
  { to: "/sammlung", label: "Sammlung", icon: Library },
  { to: "/export", label: "Profil", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getFavoriteRecords } = useRecords();
  const favoriteCount = getFavoriteRecords().length;

  return (
    <div className="min-h-screen bg-background texture-overlay">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-lg">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 flex-shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/15 transition-all duration-300">
              <Disc3 className="w-4.5 h-4.5 text-primary group-hover:animate-spin-slow" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-sans text-lg font-bold tracking-widest text-foreground">SONORIUM</h1>
            </div>
          </NavLink>

          {/* Quick Search - Desktop */}
          <div className="hidden md:block flex-1 max-w-sm mx-6">
            <QuickSearch />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-purple"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
            
            {/* Favorites Quick Link */}
            <NavLink
              to="/sammlung?favorites=true"
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all relative",
                location.search.includes("favorites=true")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title="Favoriten anzeigen"
            >
              <Star className={cn("w-4 h-4", location.search.includes("favorites=true") && "fill-current")} />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-semibold">
                  {favoriteCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Notification Bell - Desktop */}
            <Button variant="ghost" size="icon" className="hidden md:flex text-muted-foreground hover:text-foreground">
              <Bell className="w-5 h-5" />
            </Button>

            {/* Add Button */}
            <NavLink to="/hinzufuegen">
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-purple">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Hinzufügen</span>
              </Button>
            </NavLink>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border/30 bg-card/95 backdrop-blur-lg overflow-hidden"
            >
              <div className="container py-4 space-y-3">
                {/* Mobile Search */}
                <div className="px-1">
                  <QuickSearch />
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.to;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                        )}
                      >
                        <Icon className="w-5 h-5" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                  
                  {/* Mobile Favorites Link */}
                  <NavLink
                    to="/sammlung?favorites=true"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      location.search.includes("favorites=true")
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Star className={cn("w-5 h-5", location.search.includes("favorites=true") && "fill-current")} />
                    Favoriten
                    {favoriteCount > 0 && (
                      <span className="ml-auto w-6 h-6 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-semibold">
                        {favoriteCount}
                      </span>
                    )}
                  </NavLink>
                </div>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="container py-6 md:py-8 pb-safe">
        {children}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav md:hidden">
        <div className="flex items-center justify-around py-1">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn("bottom-nav-item", isActive && "active")}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}