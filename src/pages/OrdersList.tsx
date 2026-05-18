import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Eye, Edit, Trash2, DollarSign, User } from "lucide-react";
import { Link } from "react-router-dom";
import { firebaseService, Order } from "@/lib/firebaseService";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaymentModal } from "@/components/common/PaymentModal";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatMetricNumber, isEstimatedOrder } from "@/lib/orderMetrics";

export const OrdersList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const formatWeight = (value: number) => formatMetricNumber(value);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedStatusFilter = localStorage.getItem('statusFilter');
    const savedTypeFilter = localStorage.getItem('typeFilter');

    if (savedStatusFilter) {
      setStatusFilter(savedStatusFilter);
    }
    if (savedTypeFilter) {
      setTypeFilter(savedTypeFilter);
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('statusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('typeFilter', typeFilter);
  }, [typeFilter]);

  // Helper: Check if order is overdue
  const isOverdue = (order: Order): boolean => {
    if (!order.deliveryDate || order.status === 'Delivered') return false;
    const deliveryDate = new Date(order.deliveryDate);
    const today = new Date();
    deliveryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return deliveryDate < today;
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await firebaseService.getAllOrders();
      const validOrders = data.filter(order => order && order.id);
      setOrders(validOrders);
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

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await firebaseService.deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o.id !== orderId));
      toast({ title: "Success", description: "Order deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to delete", variant: "destructive" });
    }
  };

  const handleStatusButtonClick = async (order: Order) => {
    try {
      if (order.type === 'Inquiry' && order.status === 'Pending') {
        await firebaseService.updateOrder(order.id, { type: 'Confirm' });
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, type: 'Confirm' } : o));
        toast({ title: "Success", description: "Inquiry converted to confirmed order" });
      } else {
        const nextStatus = getNextStatus(order.status, order.type);
        if (nextStatus) {
          await firebaseService.updateOrder(order.id, { status: nextStatus });
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o));
          toast({ title: "Success", description: `Status updated to ${nextStatus}` });
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Failed to update", variant: "destructive" });
    }
  };

  const getNextStatus = (currentStatus: string, orderType: string) => {
    if (orderType === 'Inquiry') return currentStatus === 'Pending' ? 'Confirm Order' : null;
    if (currentStatus === 'Pending') return 'Running';
    if (currentStatus === 'Running') return 'Done';
    if (currentStatus === 'Done') return 'Delivered';
    return null;
  };

  const handlePaymentCollected = async (newReceivedAmount: number) => {
    if (!selectedOrder) return;
    setIsPaymentLoading(true);
    try {
      const isFullPayment = newReceivedAmount >= selectedOrder.totalAmount;
      await firebaseService.collectPayment(selectedOrder.id, newReceivedAmount);
      if (isFullPayment) {
        await firebaseService.updateOrder(selectedOrder.id, { paymentStatus: 'Paid' });
      }
      setOrders(prev => prev.map(order =>
        order.id === selectedOrder.id
          ? { ...order, receivedPayment: newReceivedAmount, paymentStatus: isFullPayment ? 'Paid' : 'Unpaid' }
          : order
      ));
      toast({
        title: "Success",
        description: `₹${(newReceivedAmount - selectedOrder.receivedPayment).toLocaleString('en-IN')} collected${isFullPayment ? ' → Fully Paid!' : ''}`,
      });
      setIsPaymentModalOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Payment failed", variant: "destructive" });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  // Filtering Logic
  const filteredOrders = orders.filter(order => {
    if (!order || !order.id) return false;
    const clientName = order.clientName || '';
    const clientMobile = order.clientMobileNumber || '';
    const matchesSearch =
      (order.orderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.number || '').includes(searchTerm) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientMobile.includes(searchTerm);

    let matchesStatus = true;
    if (statusFilter === 'overdue') {
      matchesStatus = isOverdue(order);
    } else if (statusFilter !== 'all') {
      matchesStatus = order.status === statusFilter;
    }

    const matchesType = typeFilter === 'all' || order.type === typeFilter;

    let matchesDate = true;
    if (fromDate && toDate && order.addDate) {
      const orderDate = new Date(order.addDate);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      matchesDate = orderDate >= from && orderDate <= to;
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Orders</h1>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'overdue'
                ? `${filteredOrders.length} overdue order${filteredOrders.length !== 1 ? 's' : ''}`
                : `${filteredOrders.length} of ${orders.length} orders`
              }
            </p>
          </div>
          {user?.role === 'admin' && (
            <Button asChild className="bg-primary hover:bg-primary-hover text-primary-foreground">
              <Link to="/orders/new">
                <Plus className="w-4 h-4 mr-2" />
                New Order
              </Link>
            </Button>
          )}
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order name, number, client..."
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Running">Running</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="overdue">
                    <span className="text-destructive font-medium">Due Orders (Overdue)</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Type Filter */}
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

              {/* Date Filters */}
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="From" />
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="To" />
            </div>

            {(fromDate || toDate) && (
              <Button variant="outline" size="sm" onClick={() => { setFromDate(''); setToDate(''); }} className="w-full">
                Clear Date Filter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Orders List - All filtered orders shown */}
        <div className="space-y-3" style={{ marginBottom: "80px" }}>
          {filteredOrders.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                No orders found
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const overdue = isOverdue(order);
              const estimatedMode = isEstimatedOrder(order);
              return (
                <Card
                  key={order.id}
                  className={`shadow-card hover:shadow-lg transition-all duration-300 ${
                    overdue
                      ? 'border-2 border-destructive shadow-lg shadow-destructive/20 animate-pulse-slow'
                      : 'border-border'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Header with Overdue Warning */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground text-lg truncate flex items-center gap-2">
                            {order.orderName}
                            {overdue && (
                              <span className="text-destructive font-bold text-sm">OVERDUE!</span>
                            )}
                          </h3>
                          <p className="text-sm text-muted-foreground">Order ID: #{order.number || 'N/A'}</p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <StatusBadge status={order.status} />
                          <Badge variant="outline" className="text-xs">{order.type}</Badge>
                          {overdue && (
                            <Badge variant="destructive" className="animate-pulse text-xs">
                              OVERDUE
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Client Info */}
                      {order.clientName && (
                        <div className="bg-muted/30 p-3 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{order.clientName}</p>
                              <p className="text-sm text-muted-foreground">{order.clientMobileNumber}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Work Description */}
                      <div className="bg-card p-3 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground mb-1">Work Description:</p>
                        <p className="text-sm text-foreground line-clamp-3">{order.work}</p>
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-card p-3 rounded-lg border border-border">
                          <p className="text-xs text-muted-foreground mb-1">Added</p>
                          <p className="text-sm font-medium">{new Date(order.addDate).toLocaleDateString('en-IN')}</p>
                        </div>
                        <div className={`bg-card p-3 rounded-lg border ${overdue ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
                          <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                          <p className={`text-sm font-medium ${overdue ? 'text-destructive font-bold' : ''}`}>
                            {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
                          </p>
                        </div>
                      </div>

                      {/* Payment / Analysis */}
                      {estimatedMode ? (
                        <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-lg border border-primary/20">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Estimated Amount</p>
                              <p className="text-lg font-bold">â‚¹{(order.estimatedAmount || 0).toLocaleString('en-IN')}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Estimated Weight</p>
                              <p className="text-lg font-bold text-success">{formatWeight(order.estimatedWeight || 0)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-lg border border-primary/20">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Total</p>
                            <p className="text-lg font-bold">₹{order.totalAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Received</p>
                            <p className="text-lg font-bold text-success">₹{order.receivedPayment.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        {order.totalAmount > order.receivedPayment && (
                          <div className="mt-2 pt-2 border-t border-primary/20">
                            <p className="text-sm font-semibold text-destructive">
                              ₹{(order.totalAmount - order.receivedPayment).toLocaleString('en-IN')} pending
                            </p>
                          </div>
                        )}
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Payment:</span>
                          <StatusBadge status={order.paymentStatus} type="payment" />
                        </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={`/orders/${order.id}`}>
                            <Eye className="w-4 h-4 mr-2" /> View
                          </Link>
                        </Button>
                        {user?.role === 'admin' && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/orders/${order.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                        {user?.role === 'admin' && !estimatedMode && order.totalAmount > order.receivedPayment && (
                          <Button
                            onClick={() => { setSelectedOrder(order); setIsPaymentModalOpen(true); }}
                            className="flex-1"
                            size="sm"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Collect ₹{(order.totalAmount - order.receivedPayment).toLocaleString('en-IN')}
                          </Button>
                        )}
                        {user?.role === 'admin' && (
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <div className="h-20 md:h-0" />
      <MobileNavigation />

      {/* Payment Modal */}
      {selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          isOpen={isPaymentModalOpen}
          onClose={() => { setIsPaymentModalOpen(false); setSelectedOrder(null); }}
          onPaymentCollected={handlePaymentCollected}
          isLoading={isPaymentLoading}
        />
      )}
    </div>
  );
};
