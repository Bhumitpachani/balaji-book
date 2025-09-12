import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, X, Search, User, Loader2 } from "lucide-react";
import { apiService, Client } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  
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
    loadNextOrderNumber();
  }, []);

  const loadNextOrderNumber = async () => {
    try {
      const ms = Date.now()
      setOrderNumber(ms);
    } catch (error) {
      const ms = Date.now()
      console.error('Failed to load next order number:', error);
      setOrderNumber(ms); // Fallback to 1 if API fails
    }
  };

  const loadClients = async () => {
    try {
      const data = await apiService.getAllClients();
      setClients(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.mobileNumber.includes(clientSearch)
  );

  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setClientSearch(client.name);
    setShowClientDropdown(false);
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

    setIsLoading(true);

    try {
      const orderData = {
        ...formData,
        clientId: selectedClient._id,
        clientName: selectedClient.name,
        clientMobileNumber: selectedClient.mobileNumber,
        clientAddress: selectedClient.address,
        clientCity: selectedClient.city,
        ...(selectedFile && { file: selectedFile })
      };

      await apiService.createOrder(orderData);
      
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      
      navigate('/orders');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Create Order</h1>
        </div>
      </header>

      <div className="p-4">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Order Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Select Client *</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                        if (!e.target.value) setSelectedClient(null);
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      placeholder="Search client by name or mobile..."
                      className="pl-10"
                      required
                    />
                  </div>
                  
                  {showClientDropdown && filteredClients.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client._id}
                          onClick={() => selectClient(client)}
                          className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{client.name}</p>
                              <p className="text-sm text-muted-foreground">{client.mobileNumber}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {selectedClient && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{selectedClient.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedClient.mobileNumber}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Selected</Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Name */}
              <div className="space-y-2">
                <Label htmlFor="orderName">Order Name *</Label>
                <Input
                  id="orderName"
                  value={formData.orderName}
                  onChange={(e) => handleInputChange('orderName', e.target.value)}
                  placeholder="Enter order name"
                  required
                />
              </div>

              {/* Order Number */}
              <div className="space-y-2">
                <Label htmlFor="number">Order Number</Label>
                <Input
                  id="number"
                  value={orderNumber}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                  placeholder="Auto-generated"
                />
                <p className="text-xs text-muted-foreground">Order number will be auto-generated</p>
              </div>

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

              {/* Payment Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="totalAmount">Total Amount *</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => handleInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receivedPayment">Received Payment</Label>
                  <Input
                    id="receivedPayment"
                    type="number"
                    value={formData.receivedPayment}
                    onChange={(e) => handleInputChange('receivedPayment', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    min="0"
                    max={formData.totalAmount}
                    step="0.01"
                  />
                </div>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Order Type *</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Inquiry">Inquiry</SelectItem>
                    <SelectItem value="Confirm">Confirm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Running">Running</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={formData.paymentStatus} onValueChange={(value) => handleInputChange('paymentStatus', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Unpaid">Unpaid</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addDate">Add Date</Label>
                  <Input
                    id="addDate"
                    type="date"
                    value={formData.addDate}
                    onChange={(e) => handleInputChange('addDate', e.target.value)}
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

              {/* File Upload */}
              <div className="space-y-2">
                <Label>File Upload</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4 relative">
                  {!selectedFile ? (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, Excel, or Image files
                      </p>
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Order...
                  </>
                ) : (
                  'Create Order'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
