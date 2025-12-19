import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <RecordProvider>
        <AudiophileProfileProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sammlung" element={<Collection />} />
                <Route path="/sammlung/:id" element={<RecordDetail />} />
                <Route path="/wunschliste" element={<Wishlist />} />
                <Route path="/recherche" element={<Research />} />
                <Route path="/hinzufuegen" element={<AddRecord />} />
                <Route path="/bearbeiten/:id" element={<AddRecord />} />
                <Route path="/export" element={<Export />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AudiophileProfileProvider>
      </RecordProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
