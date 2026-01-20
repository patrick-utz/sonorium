import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RecordProvider } from "@/context/RecordContext";
import { AudiophileProfileProvider } from "@/context/AudiophileProfileContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Collection from "./pages/Collection";
import RecordDetail from "./pages/RecordDetail";
import Wishlist from "./pages/Wishlist";
import AddRecord from "./pages/AddRecord";
import Export from "./pages/Export";
import Research from "./pages/Research";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Public route wrapper (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Auth />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sammlung"
        element={
          <ProtectedRoute>
            <Layout>
              <Collection />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sammlung/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <RecordDetail />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wunschliste"
        element={
          <ProtectedRoute>
            <Layout>
              <Wishlist />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recherche"
        element={
          <ProtectedRoute>
            <Layout>
              <Research />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hinzufuegen"
        element={
          <ProtectedRoute>
            <Layout>
              <AddRecord />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bearbeiten/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <AddRecord />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/export"
        element={
          <ProtectedRoute>
            <Layout>
              <Export />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <RecordProvider>
          <AudiophileProfileProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AudiophileProfileProvider>
        </RecordProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
