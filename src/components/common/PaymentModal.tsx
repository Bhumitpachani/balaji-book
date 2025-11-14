import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign } from "lucide-react";
import { Order } from "@/lib/firebaseService";

interface PaymentModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentCollected: (amount: number) => void;
  isLoading?: boolean;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ 
  order, 
  isOpen, 
  onClose, 
  onPaymentCollected,
  isLoading = false 
}) => {
  const [amount, setAmount] = useState('');
  
  const pendingAmount = order.totalAmount - order.receivedPayment;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentAmount = parseFloat(amount);
    
    if (paymentAmount <= 0) {
      return;
    }
    
    if (paymentAmount > pendingAmount) {
      return;
    }
    
    onPaymentCollected(order.receivedPayment + paymentAmount);
    setAmount('');
  };

  const handleClose = () => {
    setAmount('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Collect Payment
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order Info */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Order:</span>
              <span className="font-medium">{order.orderName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="font-medium">₹{order.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Received:</span>
              <span className="font-medium text-success">₹{order.receivedPayment.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="text-sm text-muted-foreground">Pending:</span>
              <Badge variant="destructive" className="font-medium">
                ₹{pendingAmount.toLocaleString()}
              </Badge>
            </div>
          </div>

          {/* Payment Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Collection Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to collect"
                min="1"
                max={pendingAmount}
                step="0.01"
                required
              />
              <p className="text-xs text-muted-foreground">
                Maximum: ₹{pendingAmount.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-primary hover:bg-primary-hover"
                disabled={isLoading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > pendingAmount}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Collect Payment'
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};