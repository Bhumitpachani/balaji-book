import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Edit, FileText } from "lucide-react";
import { apiService, Order } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      // Since the API doesn't have a single order endpoint, we'll search by ID
      const orders = await apiService.getAllOrders();
      const foundOrder = orders.find(o => o._id === id);
      
      if (foundOrder) {
        setOrder(foundOrder);
      } else {
        toast({
          title: "Error",
          description: "Order not found",
          variant: "destructive",
        });
        navigate('/orders');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load order",
        variant: "destructive",
      });
      navigate('/orders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    
    try {
      await apiService.updateOrder(order._id, { status: newStatus });
      setOrder({ ...order, status: newStatus as any });
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

  const handlePaymentUpdate = async (newPaymentStatus: string) => {
    if (!order) return;
    
    try {
      await apiService.updateOrder(order._id, { paymentStatus: newPaymentStatus });
      setOrder({ ...order, paymentStatus: newPaymentStatus as any });
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

  const getNextStatus = (currentStatus: string, orderType: string) => {
    if (orderType === 'Inquiry') {
      return currentStatus === 'Pending' ? 'Confirm Order' : null;
    }
    
    if (currentStatus === 'Pending') return 'Running';
    if (currentStatus === 'Running') return 'Done';
    return null;
  };

  const handleStatusButtonClick = (currentStatus: string, orderType: string) => {
    if (orderType === 'Inquiry' && currentStatus === 'Pending') {
      // Convert inquiry to confirm order
      handleOrderTypeUpdate('Confirm');
    } else {
      const nextStatus = getNextStatus(currentStatus, orderType);
      if (nextStatus) {
        handleStatusUpdate(nextStatus);
      }
    }
  };

  const handleOrderTypeUpdate = async (newType: string) => {
    if (!order) return;
    
    try {
      await apiService.updateOrder(order._id, { type: newType });
      setOrder({ ...order, type: newType as any });
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading order...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Order not found</h2>
          <Button onClick={() => navigate('/orders')} variant="outline">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Order Details</h1>
            <p className="text-sm text-muted-foreground">#{order.number}</p>
          </div>
          {user?.role === 'admin' && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/orders/${order._id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Order Info Card */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg text-foreground">{order.orderName}</CardTitle>
                <p className="text-sm text-muted-foreground">Order #{order.number}</p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={order.status} />
                <Badge variant="outline" className="text-xs">
                  {order.type}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Work Description</span>
                <span className="text-sm text-foreground font-medium text-right">{order.work}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Added Date</span>
                <span className="text-sm text-foreground">{new Date(order.addDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Delivery Date</span>
                <span className="text-sm text-foreground">{new Date(order.deliveryDate).toLocaleDateString()}</span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <StatusBadge status={order.paymentStatus} type="payment" />
              </div>
              
              {order.url && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-muted-foreground">Attached File</span>
                  <Button asChild size="sm" variant="outline" className="h-8">
                    <a href={order.url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4 mr-2" />
                      View File
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Quick Actions</h3>
              
              <div className="flex flex-col gap-2">
                {/* Status Update Button */}
                {(() => {
                  if (order.type === 'Inquiry' && order.status === 'Pending') {
                    return (
                      <Button
                        onClick={() => handleStatusButtonClick(order.status, order.type)}
                        className="w-full"
                      >
                        Confirm Order
                      </Button>
                    );
                  }
                  
                  const nextStatus = getNextStatus(order.status, order.type);
                  return nextStatus && (
                    <Button
                      onClick={() => handleStatusUpdate(nextStatus)}
                      className="w-full"
                    >
                      Mark as {nextStatus}
                    </Button>
                  );
                })()}

                {/* Admin Payment Actions */}
                {user?.role === 'admin' && order.paymentStatus === 'Unpaid' && (
                  <Button
                    variant="outline"
                    onClick={() => handlePaymentUpdate('Paid')}
                    className="w-full"
                  >
                    Mark as Paid
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};