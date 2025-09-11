import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Eye, User, Phone, MapPin } from "lucide-react";
import { apiService, Client, Order } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";

export const ClientOrders: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadClientAndOrders();
    }
  }, [id]);

  const loadClientAndOrders = async () => {
    if (!id) return;
    
    try {
      const [clientData, ordersData] = await Promise.all([
        apiService.getClientById(id),
        apiService.getAllOrders()
      ]);
      
      setClient(clientData);
      // Filter orders for this client
      const clientOrders = ordersData.filter(order => 
        typeof order.clientId === 'string' 
          ? order.clientId === id 
          : order.clientId._id === id
      );
      setOrders(clientOrders);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load client data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading client orders...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Client not found</p>
          <Button asChild className="mt-4">
            <Link to="/clients">Back to Clients</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link to="/clients">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Client Orders</h1>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Client Info Card */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-foreground">{client.name}</h2>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    <span>{client.mobileNumber}</span>
                  </div>
                  {client.address && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{client.address}, {client.city}</span>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {orders.length} Orders
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-3">
          <h3 className="font-medium text-foreground">Order History</h3>
          
          {orders.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No orders found for this client</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order._id} className="shadow-card hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">{order.orderName}</h4>
                        <p className="text-sm text-muted-foreground">#{order.number}</p>
                      </div>
                      <div className="flex gap-2">
                        <StatusBadge status={order.status} />
                        <Badge variant="outline" className="text-xs">
                          {order.type}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Work:</span>
                        <span className="text-foreground font-medium truncate ml-2">{order.work}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery:</span>
                        <span className="text-foreground">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="text-foreground font-medium">₹{order.totalAmount?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment:</span>
                        <StatusBadge status={order.paymentStatus} type="payment" />
                      </div>
                    </div>

                    {/* Action */}
                    <div className="pt-3 border-t border-border">
                      <Button asChild size="sm" variant="outline" className="w-full">
                        <Link to={`/orders/${order._id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};