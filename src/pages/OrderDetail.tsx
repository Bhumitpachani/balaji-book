import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink, Edit, Download } from "lucide-react";
import { firebaseService, Order } from "@/lib/firebaseService";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ImageModal } from "@/components/common/ImageModal";
import { getFileType, getFileIcon, getFileName } from "@/lib/fileUtils";
import { formatMetricNumber, isEstimatedOrder } from "@/lib/orderMetrics";

export const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const formatWeight = (value: number) => formatMetricNumber(value);

  useEffect(() => {
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const foundOrder = await firebaseService.getOrderById(id!);
      setOrder(foundOrder);
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
      await firebaseService.updateOrder(order.id, { status: newStatus });
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
      await firebaseService.updateOrder(order.id, { paymentStatus: newPaymentStatus });
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
    if (currentStatus === 'Done') return 'Delivered';
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
      await firebaseService.updateOrder(order.id, { type: newType });
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

  const estimatedMode = isEstimatedOrder(order);

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
              <Link to={`/orders/${order.id}/edit`}>
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
                <CardTitle className="text-lg text-foreground">
                  {order.clientName || 'Unknown Client'}
                </CardTitle>
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
              
              {estimatedMode ? (
                <>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Estimated Amount</span>
                    <span className="text-sm text-foreground font-medium">â‚¹{(order.estimatedAmount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">Estimated Weight</span>
                    <span className="text-sm text-foreground font-medium">{formatWeight(order.estimatedWeight || 0)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Payment Status</span>
                  <StatusBadge status={order.paymentStatus} type="payment" />
                </div>
              )}
              
              {order.imageUrls && order.imageUrls.length > 0 && (
                <div className="py-2 space-y-3">
                  {/* Images Section */}
                  {order.imageUrls.filter(url => getFileType(url) === 'image').length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Images</span>
                      <div className="grid grid-cols-3 gap-2">
                        {order.imageUrls
                          .map((url, originalIndex) => ({ url, originalIndex }))
                          .filter(({ url }) => getFileType(url) === 'image')
                          .map(({ url, originalIndex }) => (
                            <img 
                              key={originalIndex}
                              src={url} 
                              alt={`Order ${originalIndex + 1}`}
                              className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setSelectedImageIndex(originalIndex)}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Other Files Section */}
                  {order.imageUrls.filter(url => getFileType(url) !== 'image').length > 0 && (
                    <div>
                      <span className="text-sm text-muted-foreground mb-2 block">Documents</span>
                      <div className="space-y-2">
                        {order.imageUrls
                          .filter(url => getFileType(url) !== 'image')
                          .map((url, index) => {
                            const fileType = getFileType(url);
                            const Icon = getFileIcon(fileType);
                            const fileName = getFileName(url);
                            
                            return (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                              >
                                <Icon className="w-5 h-5 text-primary flex-shrink-0" />
                                <span className="text-sm text-foreground flex-1 truncate">{fileName}</span>
                                <Download className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              </a>
                            );
                          })}
                      </div>
                    </div>
                  )}
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
{/*                 {user?.role === 'admin' && order.paymentStatus === 'Unpaid' && (
                  <Button
                    variant="outline"
                    onClick={() => handlePaymentUpdate('Paid')}
                    className="w-full"
                  >
                    Mark as Paid
                  </Button>
                )} */}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image Modal */}
      {selectedImageIndex !== null && order?.imageUrls && (() => {
        const imageUrls = order.imageUrls.filter(url => getFileType(url) === 'image');
        const currentImageIndex = imageUrls.findIndex((_, idx) => {
          const originalIndices = order.imageUrls
            .map((url, originalIdx) => ({ url, originalIdx }))
            .filter(({ url }) => getFileType(url) === 'image');
          return originalIndices[idx]?.originalIdx === selectedImageIndex;
        });
        
        if (currentImageIndex === -1 || imageUrls.length === 0) return null;
        
        return (
          <ImageModal
            isOpen={true}
            onClose={() => setSelectedImageIndex(null)}
            imageUrl={imageUrls[currentImageIndex]}
            imageIndex={currentImageIndex}
            totalImages={imageUrls.length}
            onNext={() => {
              const nextImageIndex = (currentImageIndex + 1) % imageUrls.length;
              const originalIndices = order.imageUrls
                .map((url, originalIdx) => ({ url, originalIdx }))
                .filter(({ url }) => getFileType(url) === 'image');
              setSelectedImageIndex(originalIndices[nextImageIndex]?.originalIdx || 0);
            }}
            onPrev={() => {
              const prevImageIndex = (currentImageIndex - 1 + imageUrls.length) % imageUrls.length;
              const originalIndices = order.imageUrls
                .map((url, originalIdx) => ({ url, originalIdx }))
                .filter(({ url }) => getFileType(url) === 'image');
              setSelectedImageIndex(originalIndices[prevImageIndex]?.originalIdx || 0);
            }}
          />
        );
      })()}
    </div>
  );
};
