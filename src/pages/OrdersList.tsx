import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, Eye, Edit, Trash2, ExternalLink, DollarSign, User, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { firebaseService, Order, Client } from "@/lib/firebaseService";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PaymentModal } from "@/components/common/PaymentModal";
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
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await firebaseService.getAllOrders();
      // Filter out any invalid orders
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
    if (!window.confirm('Are you sure you want to delete this order?')) {
      return;
    }

    try {
      await firebaseService.deleteOrder(orderId);
      setOrders(orders.filter(order => order.id !== orderId));
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete order",
        variant: "destructive",
      });
    }
  };

  const handleStatusButtonClick = async (order: Order) => {
    try {
      if (order.type === 'Inquiry' && order.status === 'Pending') {
        // Convert inquiry to confirm order
        await firebaseService.updateOrder(order.id, { type: 'Confirm' });
        setOrders(orders.map(o => 
          o.id === order.id ? { ...o, type: 'Confirm' as any } : o
        ));
        toast({
          title: "Success",
          description: "Order confirmed successfully",
        });
      } else {
        const nextStatus = getNextStatus(order.status, order.type);
        if (nextStatus) {
          await firebaseService.updateOrder(order.id, { status: nextStatus });
          setOrders(orders.map(o => 
            o.id === order.id ? { ...o, status: nextStatus as any } : o
          ));
          toast({
            title: "Success",
            description: `Order status updated to ${nextStatus}`,
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update order",
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
    if (currentStatus === 'Done') return 'Delivered';
    return null;
  };

  const handlePaymentCollected = async (newReceivedAmount: number) => {
    if (!selectedOrder) return;

    setIsPaymentLoading(true);
    try {
      // Check if this makes the payment complete
      const isFullPayment = newReceivedAmount >= selectedOrder.totalAmount;
      
      // Update payment in backend
      await firebaseService.collectPayment(selectedOrder.id, newReceivedAmount);
      
      // If full payment, also update payment status
      if (isFullPayment) {
        await firebaseService.updateOrder(selectedOrder.id, { paymentStatus: 'Paid' });
      }
      
      // Update the order in the list
      setOrders(orders.map(order => 
        order.id === selectedOrder.id
          ? { 
              ...order, 
              receivedPayment: newReceivedAmount,
              paymentStatus: isFullPayment ? 'Paid' : 'Unpaid'
            }
          : order
      ));

      toast({
        title: "Success",
        description: `Payment of ₹${(newReceivedAmount - selectedOrder.receivedPayment).toLocaleString('en-IN')} collected successfully${isFullPayment ? '. Payment completed!' : ''}`,
      });

      setIsPaymentModalOpen(false);
      setSelectedOrder(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to collect payment",
        variant: "destructive",
      });
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    // Safety check for order object
    if (!order || typeof order !== 'object') {
      return false;
    }
    
    const clientName = order.clientName || '';
    const clientMobile = order.clientMobileNumber || '';
    
    const matchesSearch = (order.orderName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (order.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         clientMobile.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesType = typeFilter === 'all' || order.type === typeFilter;
    
    // Date filtering
    let matchesDate = true;
    if (fromDate && toDate && order.addDate) {
      const orderDate = new Date(order.addDate);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // End of day
      matchesDate = orderDate >= from && orderDate <= to;
    }
    
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, typeFilter, fromDate, toDate]);

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
              {filteredOrders.length} of {orders.length} orders
              {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by order name or number..."
                className="pl-10"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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

              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Items per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                placeholder="From Date"
              />

              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                placeholder="To Date"
              />
            </div>

            {/* Clear Date Filter Button */}
            {(fromDate || toDate) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setFromDate('');
                  setToDate('');
                }}
                className="w-full"
              >
                Clear Date Filter
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3" style={{marginBottom:"80px"}}>
          {filteredOrders.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            paginatedOrders.map((order) => (
              <Card key={order.id} className="shadow-card hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-lg truncate">
                          {order.orderName}
                        </h3>
                        <p className="text-sm text-muted-foreground">Order ID: #{order.number || 'N/A'}</p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={order.status} />
                        <Badge variant="outline" className="text-xs">
                          {order.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Client Info */}
                    {(() => {
                      const clientData = order.clientId && typeof order.clientId === 'object' 
                        ? order.clientId 
                        : {
                            name: (order as any).clientName,
                            mobileNumber: (order as any).clientMobileNumber,
                            address: (order as any).clientAddress,
                            city: (order as any).clientCity
                          };
                      
                      if (clientData.name) {
                        return (
                          <div className="bg-muted/30 p-3 rounded-lg border border-border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
{/*                                 <p className="font-medium text-foreground">{clientData.name}</p> */}
                                <p className="text-sm text-muted-foreground">{clientData.mobileNumber}</p>
                                {clientData.address && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {clientData.address}{clientData.city ? `, ${clientData.city}` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Work Description */}
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-sm text-muted-foreground mb-1">Work Description:</p>
                      <p className="text-sm text-foreground line-clamp-3">{order.work}</p>
                    </div>
                    
                    {/* Date Information */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-card p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Added Date</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(order.addDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="bg-card p-3 rounded-lg border border-border">
                        <p className="text-xs text-muted-foreground mb-1">Delivery Date</p>
                        <p className="text-sm font-medium text-foreground">
                          {new Date(order.deliveryDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    
                    {/* Payment Information */}
                    <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 rounded-lg border border-primary/20">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                          <p className="text-lg font-bold text-foreground">
                            ₹{order.totalAmount.toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Received</p>
                          <p className="text-lg font-bold text-success">
                            ₹{order.receivedPayment.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      {order.totalAmount > order.receivedPayment && (
                        <div className="mt-2 pt-2 border-t border-primary/20">
                          <p className="text-xs text-muted-foreground mb-1">Pending Amount</p>
                          <p className="text-sm font-semibold text-destructive">
                            ₹{(order.totalAmount - order.receivedPayment).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <StatusBadge status={order.paymentStatus} type="payment" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link to={`/orders/${order.id}`}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Link>
                        </Button>
                        
                        {user?.role === 'admin' && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/orders/${order.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                        )}
                      </div>

                      {/* Payment Collection Button */}
                      {user?.role === 'admin' && order.totalAmount > order.receivedPayment && (
                        <Button
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsPaymentModalOpen(true);
                          }}
                          className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Collect Payment (₹{(order.totalAmount - order.receivedPayment).toLocaleString('en-IN')} pending)
                        </Button>
                      )}

                      {user?.role === 'admin' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Order
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && totalPages > 1 && (
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = page === 1 || 
                                       page === totalPages || 
                                       Math.abs(page - currentPage) <= 1;
                        
                        const showEllipsis = (page === 2 && currentPage > 3) ||
                                           (page === totalPages - 1 && currentPage < totalPages - 2);

                        if (showEllipsis) {
                          return <span key={page} className="px-2 text-muted-foreground">...</span>;
                        }

                        if (!showPage) return null;

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-10"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom spacing for mobile navigation */}
      <div className="h-20 md:h-0" />

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* Payment Modal */}
      {selectedOrder && (
        <PaymentModal
          order={selectedOrder}
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
          onPaymentCollected={handlePaymentCollected}
          isLoading={isPaymentLoading}
        />
      )}
    </div>
  );
};
