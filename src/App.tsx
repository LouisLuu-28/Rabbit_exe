import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tutorial } from "@/components/Tutorial";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import MenuPlanning from "./pages/MenuPlanning";
import Inventory from "./pages/Inventory";
import Financial from "./pages/Financial";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <main className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center px-4 bg-card">
          <p className="text-sm font-medium">Hệ Thống Quản Lý Rabbit EMS</p>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  </SidebarProvider>
);

const App = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const tutorialCompleted = localStorage.getItem(`tutorial_completed_${session.user.id}`);
      if (!tutorialCompleted) {
        // Delay to ensure user is on dashboard
        setTimeout(() => setShowTutorial(true), 1000);
      }
    }
  };

  const handleTutorialComplete = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      localStorage.setItem(`tutorial_completed_${session.user.id}`, "true");
    }
    setShowTutorial(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {showTutorial && <Tutorial onComplete={handleTutorialComplete} />}
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/orders" element={<DashboardLayout><Orders /></DashboardLayout>} />
            <Route path="/menu-planning" element={<DashboardLayout><MenuPlanning /></DashboardLayout>} />
            <Route path="/inventory" element={<DashboardLayout><Inventory /></DashboardLayout>} />
            <Route path="/financial" element={<DashboardLayout><Financial /></DashboardLayout>} />
            <Route path="/account" element={<DashboardLayout><Account /></DashboardLayout>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
