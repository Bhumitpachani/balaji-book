import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { apiService, Order } from "@/lib/api";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MobileNavigation } from "@/components/common/MobileNavigation";

export const CalendarView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await apiService.getAllOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    let current = new Date(startDate);
    
    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getOrdersForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return orders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate).toISOString().split('T')[0];
      const addDate = new Date(order.addDate).toISOString().split('T')[0];
      return deliveryDate === dateStr || addDate === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateOrders = selectedDate ? getOrdersForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-medium px-3">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Calendar Grid */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, index) => {
                const dayOrders = getOrdersForDate(date);
                const hasOrders = dayOrders.length > 0;
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      relative p-2 text-sm rounded-lg transition-colors min-h-[3rem]
                      ${isCurrentMonth(date) 
                        ? 'text-foreground hover:bg-muted' 
                        : 'text-muted-foreground'
                      }
                      ${isToday(date) 
                        ? 'bg-primary text-primary-foreground font-bold' 
                        : ''
                      }
                      ${isSelected && !isToday(date)
                        ? 'bg-accent text-accent-foreground'
                        : ''
                      }
                    `}
                  >
                    <div className="flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {hasOrders && (
                        <div className="flex gap-1 mt-1">
                          {dayOrders.slice(0, 2).map((_, i) => (
                            <div
                              key={i}
                              className="w-1.5 h-1.5 bg-accent rounded-full"
                            />
                          ))}
                          {dayOrders.length > 2 && (
                            <span className="text-xs">+{dayOrders.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Orders */}
        {selectedDate && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No orders for this date
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateOrders.map((order) => (
                    <div key={order._id} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{order.orderName}</h4>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Order #{order.number}</p>
                        <p>Work: {order.work}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {order.type}
                          </Badge>
                          <StatusBadge status={order.paymentStatus} type="payment" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNavigation />
    </div>
  );
};