import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PWAProvider } from "@/contexts/PWAContext";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { Login } from "./pages/Login";
import { AdminDashboard } from "./pages/AdminDashboard";
import { UserDashboard } from "./pages/UserDashboard";
import { OrdersList } from "./pages/OrdersList";
import { CreateOrder } from "./pages/CreateOrder";
import { EditOrder } from "./pages/EditOrder";
import { CalendarView } from "./pages/CalendarView";
import { Analytics } from "./pages/Analytics";
import { OrderDetail } from "./pages/OrderDetail";
import { ClientManagement } from "./pages/ClientManagement";
import { CreateClient } from "./pages/CreateClient";
import { ClientOrders } from "./pages/ClientOrders";
import { AdminOrdersTable } from "./pages/AdminOrdersTable";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: string[] 
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
};

// Main App Routes
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Root Route - Login */}
      <Route 
        path="/" 
        element={!isAuthenticated ? <Login /> : <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} replace />} 
      />
      
      {/* Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <OrdersList />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateOrder />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/orders/:id/edit"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <EditOrder />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/calendar"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <CalendarView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/analytics"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Analytics />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/clients"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ClientManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/clients/new"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <CreateClient />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/clients/:id/orders"
        element={
          <ProtectedRoute>
            <ClientOrders />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/orders-table"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrdersTable />
          </ProtectedRoute>
        }
      />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  console.log('App component rendering');
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <PWAProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <div className="app-shell">
                <AppRoutes />
                <PWAInstallPrompt />
              </div>
            </BrowserRouter>
          </PWAProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
