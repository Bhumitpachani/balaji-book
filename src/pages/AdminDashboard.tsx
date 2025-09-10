import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, TrendingUp, DollarSign, Clock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService, Order } from "@/lib/api";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await apiService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'Pending').length,
    running: orders.filter(o => o.status === 'Running').length,
    completed: orders.filter(o => o.status === 'Done').length,
    paid: orders.filter(o => o.paymentStatus === 'Paid').length,
    unpaid: orders.filter(o => o.paymentStatus === 'Unpaid').length,
    inquiry: orders.filter(o => o.type === 'Inquiry').length,
    confirm: orders.filter(o => o.type === 'Confirm').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={logout} size="sm">
            Logout
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button asChild className="h-16 bg-primary hover:bg-primary-hover text-primary-foreground">
            <Link to="/orders/new" className="flex flex-col items-center gap-1">
              <Plus className="w-5 h-5" />
              <span className="text-sm">New Order</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16">
            <Link to="/orders" className="flex flex-col items-center gap-1">
              <FileText className="w-5 h-5" />
              <span className="text-sm">View Orders</span>
            </Link>
          </Button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.paid}</p>
                  <p className="text-sm text-muted-foreground">Paid Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Types */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Order Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Inquiry Orders</span>
              <span className="font-medium">{stats.inquiry}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Confirmed Orders</span>
              <span className="font-medium">{stats.confirm}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Unpaid Orders</span>
              <span className="font-medium text-destructive">{stats.unpaid}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Analytics Link */}
        <Button asChild variant="outline" className="w-full">
          <Link to="/analytics" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            View Detailed Analytics
          </Link>
        </Button>
      </div>

      <PWAInstallPrompt />
      <MobileNavigation />
    </div>
  );
};