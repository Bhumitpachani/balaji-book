import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, X, Search, User, Loader2 } from "lucide-react";
import { firebaseService, Client, Order } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";

export const EditOrder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  
  const [formData, setFormData] = useState({
    orderName: '',
    work: '',
    status: 'Pending',
    addDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    type: 'Inquiry',
    paymentStatus: 'Unpaid',
    totalAmount: 0,
    receivedPayment: 0,
  });
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    loadClients();
    if (id) {
      loadOrder();
    }
  }, [id]);

  const loadOrder = async () => {
    try {
      const foundOrder = await firebaseService.getOrderById(id!);
      
      if (foundOrder) {
        setOrder(foundOrder);
        setOrderNumber(foundOrder.number || '');
        setFormData({
          orderName: foundOrder.orderName,
          work: foundOrder.work,
          status: foundOrder.status,
          addDate: new Date(foundOrder.addDate).toISOString().split('T')[0],
          deliveryDate: new Date(foundOrder.deliveryDate).toISOString().split('T')[0],
          type: foundOrder.type,
          paymentStatus: foundOrder.paymentStatus,
          totalAmount: foundOrder.totalAmount,
          receivedPayment: foundOrder.receivedPayment,
        });
        
        const allClients = await firebaseService.getAllClients();
        const orderClient = allClients.find(c => c.id === foundOrder.clientId);
        if (orderClient) {
          setSelectedClient(orderClient);
          setClientSearch(orderClient.name);
        }
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
      setIsLoadingOrder(false);
    }
  };

  const loadClients = async () => {
    try {
      const data = await firebaseService.getAllClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const filteredClients = clients.filter(client => {
    const search = clientSearch.trim().toLowerCase();
    if (!search) return true;
    return [
      client.name,
      client.mobileNumber,
      client.city,
      client.state,
      client.field,
      client.clientType
    ]
      .filter(Boolean)
      .some(value => value!.toLowerCase().includes(search));
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const clearClientSelection = () => {
    setSelectedClient(null);
    setClientSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }

    if (!order) return;

    setIsLoading(true);

    try {
      const orderData: any = {
        ...formData,
        number: orderNumber,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        clientMobileNumber: selectedClient.mobileNumber,
        clientAddress: selectedClient.address,
        clientCity: selectedClient.city,
      };

      if (selectedFiles.length > 0) {
        orderData.files = selectedFiles;
      }

      await firebaseService.updateOrder(order.id, orderData);

      toast({
        title: "Success",
        description: "Order updated successfully",
      });

      navigate('/orders');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading order...</div>
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
          <div>
            <h1 className="text-xl font-bold text-foreground">Edit Order</h1>
            <p className="text-sm text-muted-foreground">Update order details</p>
          </div>
        </div>
      </header>

      <div className="p-4">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader>
            <CardTitle className="text-foreground">Order Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Order Number - Read only */}
{/*               <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  value={orderNumber}
                  readOnly
                  className="bg-muted"
                />
              </div> */}

              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Client *</Label>
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          setShowClientDropdown(true);
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        placeholder="Search client by name or mobile..."
                        className="pl-10"
                      />
                    </div>
                    {selectedClient && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={clearClientSelection}
                        className="px-3"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Client Dropdown */}
                  {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="p-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.mobileNumber}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Client Display */}
                {selectedClient && (
                  <div className="bg-muted/50 p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{selectedClient.name}</p>
                        <p className="text-sm text-muted-foreground">{selectedClient.mobileNumber}</p>
                        {(selectedClient.address || selectedClient.city || selectedClient.state) && (
                          <p className="text-sm text-muted-foreground">
                            {[selectedClient.address, selectedClient.city, selectedClient.state]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        )}
                        {(selectedClient.field || selectedClient.clientType) && (
                          <p className="text-xs text-muted-foreground">
                            {[selectedClient.clientType, selectedClient.field].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Name */}
{/*               <div className="space-y-2">
                <Label htmlFor="orderName">Order Name *</Label>
                <Input
                  id="orderName"
                  value={formData.orderName}
                  onChange={(e) => handleInputChange('orderName', e.target.value)}
                  placeholder="Enter order name"
                  required
                />
              </div> */}

              {/* Work Description */}
              <div className="space-y-2">
                <Label htmlFor="work">Work Description *</Label>
                <Textarea
                  id="work"
                  value={formData.work}
                  onChange={(e) => handleInputChange('work', e.target.value)}
                  placeholder="Describe the work to be done"
                  rows={3}
                  required
                />
              </div>

              {/* Row 1: Status and Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Running">Running</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                      <SelectItem value="Delivered">Delivered</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => handleInputChange('type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inquiry">Inquiry</SelectItem>
                      <SelectItem value="Confirm">Confirm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addDate">Add Date *</Label>
                  <Input
                    id="addDate"
                    type="date"
                    value={formData.addDate}
                    onChange={(e) => handleInputChange('addDate', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveryDate">Delivery Date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => handleInputChange('deliveryDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Row 3: Payment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select
                    value={formData.paymentStatus}
                    onValueChange={(value) => handleInputChange('paymentStatus', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receivedPayment">Received Payment</Label>
                  <Input
                    id="receivedPayment"
                    type="number"
                    min="0"
                    step="0.01"
                    max={formData.totalAmount}
                    value={formData.receivedPayment}
                    onChange={(e) => handleInputChange('receivedPayment', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Files (Multiple Upload)</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Add Files
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      multiple
                    />
                  </div>
                  
                  {/* Current Files */}
                  {order?.imageUrls && order.imageUrls.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Current Files</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {order.imageUrls.map((url, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={url} 
                              alt={`Order file ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer"
                              onClick={() => window.open(url, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Files to Upload */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">New Images to Upload</Label>
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <span className="text-sm flex-1">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Order...
                  </>
                ) : (
                  'Update Order'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
