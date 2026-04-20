import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GridPage } from '@/routes/grid';
import '@/styles/globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="provider-mgmt-medicaid-theme">
        <TooltipProvider delayDuration={300}>
          <GridPage />
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
