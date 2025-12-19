import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Library, 
  Heart, 
  Plus,
  Download,
  Disc3,
  Menu,
  X,
  Star
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
  { to: "/export", label: "Export", icon: Download },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { getFavoriteRecords } = useRecords();
  const favoriteCount = getFavoriteRecords().length;

  return (
    <div className="min-h-screen bg-background texture-overlay">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/10 transition-all duration-300">
              <Disc3 className="w-5 h-5 text-primary group-hover:animate-spin-slow" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-sans text-xl font-bold tracking-widest text-foreground">SONORIUM</h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-widest uppercase">A place for your music</p>
            </div>
          </NavLink>

          {/* Quick Search */}
          <div className="hidden md:block flex-1 max-w-xs mx-4">
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
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
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
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
                location.search.includes("favorites=true")
                  ? "bg-red-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title="Favoriten anzeigen"
            >
              <Star className={cn("w-4 h-4", location.search.includes("favorites=true") && "fill-current")} />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {favoriteCount}
                </span>
              )}
            </NavLink>
          </nav>

          {/* Add Button */}
          <div className="flex items-center gap-2">
            <NavLink to="/hinzufuegen">
              <Button className="gap-2 bg-gradient-vinyl hover:opacity-90 text-primary-foreground shadow-vinyl">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Hinzufügen</span>
              </Button>
            </NavLink>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border/50 bg-background overflow-hidden"
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
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
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
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      location.search.includes("favorites=true")
                        ? "bg-red-500 text-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Star className={cn("w-5 h-5", location.search.includes("favorites=true") && "fill-current")} />
                    Favoriten
                    {favoriteCount > 0 && (
                      <span className="ml-auto w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
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
      <main className="container py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}