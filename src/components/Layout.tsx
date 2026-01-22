import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Disc3 } from "lucide-react";
import { QuickSearch } from "@/components/QuickSearch";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import { motion } from "framer-motion";

const SIDEBAR_COLLAPSED_KEY = "sonorium-sidebar-collapsed";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <AppSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 md:hidden border-b border-border/50 bg-background/95 backdrop-blur-lg">
          <div className="flex h-14 items-center justify-between px-4">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Disc3 className="w-4 h-4 text-primary" />
              </div>
              <span className="font-sans text-base font-bold tracking-widest text-foreground">
                SONORIUM
              </span>
            </NavLink>

            {/* Search (compact) */}
            <div className="flex-1 max-w-[180px] ml-3">
              <QuickSearch />
            </div>
          </div>
        </header>

        {/* Desktop Header with Search */}
        <header className="hidden md:flex sticky top-0 z-40 h-14 items-center border-b border-border/50 bg-background/95 backdrop-blur-lg px-6">
          <div className="flex-1 max-w-md">
            <QuickSearch />
          </div>
        </header>

        {/* Page Content */}
        <motion.main 
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-1 px-4 md:px-6 py-4 md:py-6 pb-24 md:pb-6 overflow-x-hidden min-w-0"
        >
          {children}
        </motion.main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
