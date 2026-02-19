import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RecordProvider } from "@/context/RecordContext";
import { AudiophileProfileProvider } from "@/context/AudiophileProfileContext";
import { Layout } from "@/components/Layout";
import { Loader2 } from "lucide-react";
import { lazy, Suspense } from "react";

// Lazy load page components
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Collection = lazy(() => import("./pages/Collection"));
const RecordDetail = lazy(() => import("./pages/RecordDetail"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const AddRecord = lazy(() => import("./pages/AddRecord"));
const Export = lazy(() => import("./pages/Export"));
const Research = lazy(() => import("./pages/Research"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

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
            <Suspense fallback={<PageLoader />}>
              <Auth />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Dashboard />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sammlung"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Collection />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sammlung/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <RecordDetail />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/wunschliste"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Wishlist />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recherche"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Research />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hinzufuegen"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <AddRecord />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bearbeiten/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <AddRecord />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/export"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Export />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profil"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<PageLoader />}>
                <Profile />
              </Suspense>
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
