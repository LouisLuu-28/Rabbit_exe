import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Tutorial } from "@/components/Tutorial";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIAssistant } from "@/components/AI/AIAssistant";
import { AccessDenied } from "@/components/AccessDenied";
import { useSubscription } from "@/hooks/use-subscription";
import { getRequiredPlanForFeature, hasFeature, normalizePlan, type FeatureKey } from "@/lib/subscription";

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
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
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
          <AIAssistant />
        </main>
      </div>
    </SidebarProvider>
  );
};

const ProtectedFeatureRoute = ({
  feature,
  children,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
}) => {
  const { loading, isAuthenticated, plan } = useSubscription();

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!hasFeature(plan, feature)) {
    return <AccessDenied requiredPlan={getRequiredPlanForFeature(feature)} />;
  }

  return <>{children}</>;
};

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { loading, isAuthenticated, role } = useSubscription();

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== "admin") {
    return <Navigate to="/account" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkTutorialStatus();
  }, []);

  const checkTutorialStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const plan = normalizePlan(session.user.user_metadata?.plan as string | undefined);
      if (!hasFeature(plan, "dashboard")) {
        return;
      }

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
            <Route path="/dashboard" element={<ProtectedFeatureRoute feature="dashboard"><DashboardLayout><Dashboard /></DashboardLayout></ProtectedFeatureRoute>} />
            <Route path="/orders" element={<ProtectedFeatureRoute feature="orders"><DashboardLayout><Orders /></DashboardLayout></ProtectedFeatureRoute>} />
            <Route path="/menu-planning" element={<ProtectedFeatureRoute feature="menu"><DashboardLayout><MenuPlanning /></DashboardLayout></ProtectedFeatureRoute>} />
            <Route path="/inventory" element={<ProtectedFeatureRoute feature="inventory"><DashboardLayout><Inventory /></DashboardLayout></ProtectedFeatureRoute>} />
            <Route path="/financial" element={<ProtectedFeatureRoute feature="financial"><DashboardLayout><Financial /></DashboardLayout></ProtectedFeatureRoute>} />
            <Route path="/account" element={<DashboardLayout><Account /></DashboardLayout>} />
            <Route path="/admin" element={<ProtectedAdminRoute><DashboardLayout><Admin /></DashboardLayout></ProtectedAdminRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
