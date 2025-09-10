import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Eye, Edit, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { apiService, Order } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const OrdersList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await apiService.getAllOrders();
      setOrders(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await apiService.updateOrder(orderId, { status: newStatus });
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: newStatus as any } : order
      ));
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const handlePaymentUpdate = async (orderId: string, newPaymentStatus: string) => {
    try {
      await apiService.updateOrder(orderId, { paymentStatus: newPaymentStatus });
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, paymentStatus: newPaymentStatus as any } : order
      ));
      toast({
        title: "Success",
        description: "Payment status updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
      await apiService.deleteOrder(orderId);
      setOrders(orders.filter(order => order._id !== orderId));
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getNextStatus = (currentStatus: string, orderType: string) => {
    if (orderType === 'Inquiry') {
      return currentStatus === 'Pending' ? 'Confirm Order' : null;
    }
    
    if (currentStatus === 'Pending') return 'Running';
    if (currentStatus === 'Running') return 'Done';
    return null;
  };

  const handleOrderTypeUpdate = async (orderId: string, newType: string) => {
    try {
      await apiService.updateOrder(orderId, { type: newType });
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, type: newType as any } : order
      ));
      toast({
        title: "Success",
        description: "Order type updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update order type",
        variant: "destructive",
      });
    }
  };

  const handleStatusButtonClick = (order: Order) => {
    if (order.type === 'Inquiry' && order.status === 'Pending') {
      // Convert inquiry to confirm order
      handleOrderTypeUpdate(order._id, 'Confirm');
    } else {
      const nextStatus = getNextStatus(order.status, order.type);
      if (nextStatus) {
        handleStatusUpdate(order._id, nextStatus);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          {user?.role === 'admin' && (
            <Button asChild size="sm" className="bg-primary hover:bg-primary-hover">
              <Link to="/orders/new">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Search and Filters */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Inquiry">Inquiry</SelectItem>
                  <SelectItem value="Confirm">Confirm</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order._id} className="shadow-card">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{order.orderName}</h3>
                        <p className="text-sm text-muted-foreground">#{order.number}</p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={order.status} />
                        <Badge variant="outline" className="text-xs">
                          {order.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Work:</span>
                        <span className="text-foreground font-medium">{order.work}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span className="text-foreground">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment:</span>
                        <StatusBadge status={order.paymentStatus} type="payment" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3 pt-3 border-t border-border">
                      {/* Progress Actions Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Update Button */}
                        {(() => {
                          if (order.type === 'Inquiry' && order.status === 'Pending') {
                            return (
                              <Button
                                size="sm"
                                onClick={() => handleStatusButtonClick(order)}
                                className="flex-1 min-w-[120px] bg-primary hover:bg-primary-hover text-primary-foreground"
                              >
                                Confirm Order
                              </Button>
                            );
                          }
                          
                          const nextStatus = getNextStatus(order.status, order.type);
                          return nextStatus && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(order._id, nextStatus)}
                              className="flex-1 min-w-[120px] bg-primary hover:bg-primary-hover text-primary-foreground"
                            >
                              Mark as {nextStatus}
                            </Button>
                          );
                        })()}

                        {/* Payment Update for Admin */}
                        {user?.role === 'admin' && order.paymentStatus === 'Unpaid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePaymentUpdate(order._id, 'Paid')}
                            className="flex-1 min-w-[100px] border-success text-success hover:bg-success hover:text-success-foreground"
                          >
                            Mark Paid
                          </Button>
                        )}
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          {/* View Button */}
                          <Button asChild size="sm" variant="outline" className="px-3">
                            <Link to={`/orders/${order._id}`}>
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Link>
                          </Button>

                          {/* File Link */}
                          {order.url && (
                            <Button asChild size="sm" variant="outline" className="px-3">
                              <a href={order.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                File
                              </a>
                            </Button>
                          )}
                        </div>

                        {/* Admin Only Actions */}
                        {user?.role === 'admin' && (
                          <div className="flex gap-1">
                            <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <Link to={`/orders/${order._id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(order._id)}
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <MobileNavigation />
    </div>
  );
};