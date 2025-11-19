import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Clock, CheckCircle, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { firebaseService, Order } from "@/lib/firebaseService";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";

export const UserDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      // For demo purposes, showing all orders for user role
      // In real app, you'd filter by user ID
      const data = await firebaseService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!fromDate || !toDate) return true;
    const orderDate = new Date(order.addDate);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return orderDate >= from && orderDate <= to;
  });

  const recentOrders = filteredOrders.slice(0, 3);
  const stats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'Pending').length,
    running: filteredOrders.filter(o => o.status === 'Running').length,
    done: filteredOrders.filter(o => o.status === 'Done').length,
    delivered: filteredOrders.filter(o => o.status === 'Delivered').length,
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
            <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.username}</p>
          </div>
          <Button variant="outline" onClick={logout} size="sm">
            Logout
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Date Filter */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <h3 className="font-medium text-foreground mb-3">Filter by Date</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">From Date</label>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">To Date</label>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {(fromDate || toDate) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="w-full mt-3"
              >
                Clear Date Filter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">My Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-warning" />
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
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.running}</p>
                  <p className="text-sm text-muted-foreground">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.done}</p>
                  <p className="text-sm text-muted-foreground">Done</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Orders</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/orders">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentOrders.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No orders found</p>
            ) : (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{order.orderName}</p>
                    <p className="text-sm text-muted-foreground">#{order.number}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button asChild variant="outline" className="h-16">
            <Link to="/orders" className="flex flex-col items-center gap-1">
              <FileText className="w-5 h-5" />
              <span className="text-sm">View Orders</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-16">
            <Link to="/calendar" className="flex flex-col items-center gap-1">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Calendar</span>
            </Link>
          </Button>
        </div>
      </div>

      <PWAInstallPrompt />
      <MobileNavigation />
    </div>
  );
};