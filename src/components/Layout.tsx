import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Library, 
  BarChart3,
  Plus,
} from "lucide-react";
import { motion } from "framer-motion";

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const isCollectionActive = location.pathname === "/sammlung" || location.pathname.startsWith("/sammlung/");
  const isDashboardActive = location.pathname === "/";

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Main Content */}
      <main className="px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto relative">
          {/* Left nav item - Sammlung */}
          <NavLink
            to="/sammlung"
            className={cn("bottom-nav-item", isCollectionActive && "active")}
          >
            <Library className="w-6 h-6" />
            <span className="text-xs mt-1">Sammlung</span>
          </NavLink>

          {/* Center FAB button */}
          <NavLink
            to="/hinzufuegen"
            className="absolute left-1/2 -translate-x-1/2 -top-5"
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="fab-button"
            >
              <Plus className="w-7 h-7" />
            </motion.div>
          </NavLink>

          {/* Right nav item - Dashboard */}
          <NavLink
            to="/"
            className={cn("bottom-nav-item", isDashboardActive && "active")}
          >
            <BarChart3 className="w-6 h-6" />
            <span className="text-xs mt-1">Stats</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}