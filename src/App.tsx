
import { Toaster } from "@/components/ui/toaster"; // Keep if shadcn toast is used
import { Toaster as Sonner } from "@/components/ui/sonner"; // Keep if sonner is used
import { TooltipProvider } from "@/components/ui/tooltip"; // Keep if shadcn tooltip is used
// QueryClient and Provider might not be needed for V1 unless complex state arises
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import IndexPage from "./pages/Index"; // Renamed for clarity
import NotFound from "./pages/NotFound";

// const queryClient = new QueryClient(); // Not used in V1

const App = () => (
  // <QueryClientProvider client={queryClient}> // Not used in V1
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<IndexPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  // </QueryClientProvider> // Not used in V1
);

export default App;
