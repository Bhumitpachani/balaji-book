
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, FileText, DollarSign, Package, Users, Wallet, AlertTriangle, Clock, BadgePercent } from "lucide-react";
import { firebaseService, Order, Client } from "@/lib/firebaseService";
import { MobileNavigation } from "@/components/common/MobileNavigation";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];
const DEFAULT_INACTIVITY_DAYS = 45;
const ACTIVE_DAYS = 30;
const DUE_SOON_DAYS = 7;

const parseDate = (value?: string | Date) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const formatDate = (value?: string | Date) => {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-GB') : 'N/A';
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount || 0);
};

const getDaysSince = (value?: Date) => {
  if (!value) return null;
  const today = startOfDay(new Date());
  return Math.floor((today.getTime() - startOfDay(value).getTime()) / (24 * 60 * 60 * 1000));
};

export const Analytics: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityDays, setInactivityDays] = useState(DEFAULT_INACTIVITY_DAYS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ordersData, clientsData] = await Promise.all([
        firebaseService.getAllOrders(),
        firebaseService.getAllClients()
      ]);
      setOrders(ordersData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const monthlySeries = React.useMemo(() => {
    const months: Record<string, { orders: number; revenue: number; received: number }> = {};
    orders.forEach(order => {
      const date = parseDate(order.addDate) || parseDate(order.createdAt as Date);
      if (!date) return;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = { orders: 0, revenue: 0, received: 0 };
      }
      months[monthKey].orders += 1;
      months[monthKey].revenue += order.totalAmount || 0;
      months[monthKey].received += order.receivedPayment || 0;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(`${month}-01`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        orders: data.orders,
        revenue: data.revenue,
        received: data.received
      }))
      .slice(-6);
  }, [orders]);

  const summary = React.useMemo(() => {
    let completed = 0;
    let paid = 0;
    let inquiries = 0;
    let totalValue = 0;
    let totalReceived = 0;
    let outstanding = 0;

    orders.forEach(order => {
      if (order.status === 'Delivered') completed += 1;
      if (order.paymentStatus === 'Paid') paid += 1;
      if (order.type === 'Inquiry') inquiries += 1;
      const amount = order.totalAmount || 0;
      const received = order.receivedPayment || 0;
      totalValue += amount;
      totalReceived += received;
      outstanding += Math.max(amount - received, 0);
    });

    return {
      total: orders.length,
      completed,
      paid,
      inquiries,
      totalValue,
      totalReceived,
      outstanding,
      avgOrderValue: orders.length ? totalValue / orders.length : 0,
      collectionRate: totalValue ? (totalReceived / totalValue) * 100 : 0
    };
  }, [orders]);

  const statusData = React.useMemo(() => ([
    { name: 'Pending', value: orders.filter(o => o.status === 'Pending').length },
    { name: 'Running', value: orders.filter(o => o.status === 'Running').length },
    { name: 'Done', value: orders.filter(o => o.status === 'Done').length },
    { name: 'Delivered', value: orders.filter(o => o.status === 'Delivered').length },
  ].filter(item => item.value > 0)), [orders]);

  const paymentData = React.useMemo(() => ([
    { name: 'Paid', value: orders.filter(o => o.paymentStatus === 'Paid').length },
    { name: 'Unpaid', value: orders.filter(o => o.paymentStatus === 'Unpaid').length },
  ].filter(item => item.value > 0)), [orders]);

  const paymentAmountData = React.useMemo(() => ([
    { name: 'Received', value: summary.totalReceived },
    { name: 'Outstanding', value: summary.outstanding },
  ].filter(item => item.value > 0)), [summary]);

  const typeData = React.useMemo(() => ([
    { name: 'Inquiry', value: orders.filter(o => o.type === 'Inquiry').length },
    { name: 'Confirm', value: orders.filter(o => o.type === 'Confirm').length },
  ].filter(item => item.value > 0)), [orders]);

  const { overdueOrders, dueSoonOrders } = React.useMemo(() => {
    const today = startOfDay(new Date());
    const dueSoonCutoff = new Date(today.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
    const overdue: Order[] = [];
    const dueSoon: Order[] = [];

    orders.forEach(order => {
      const delivery = parseDate(order.deliveryDate);
      if (!delivery) return;
      const deliveryDay = startOfDay(delivery);
      const isClosed = order.status === 'Delivered' || order.status === 'Done';
      if (isClosed) return;
      if (deliveryDay < today) {
        overdue.push(order);
      } else if (deliveryDay >= today && deliveryDay <= dueSoonCutoff) {
        dueSoon.push(order);
      }
    });

    return { overdueOrders: overdue, dueSoonOrders: dueSoon };
  }, [orders]);

  const handleInactivityDaysChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      setInactivityDays(Math.max(1, parsed));
    }
  };
  const clientInsights = React.useMemo(() => {
    const today = startOfDay(new Date());
    const daysSince = (date: Date) => Math.floor((today.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000));

    type ClientStat = {
      clientId: string;
      name: string;
      mobileNumber?: string;
      city?: string;
      totalOrders: number;
      totalValue: number;
      totalReceived: number;
      outstanding: number;
      lastOrderDate?: Date;
      firstOrderDate?: Date;
      avgOrderValue: number;
      repeatCustomer: boolean;
      hasClientRecord: boolean;
    };

    const statsMap = new Map<string, ClientStat>();

    clients.forEach(client => {
      statsMap.set(client.id, {
        clientId: client.id,
        name: client.name,
        mobileNumber: client.mobileNumber,
        city: client.city,
        totalOrders: 0,
        totalValue: 0,
        totalReceived: 0,
        outstanding: 0,
        lastOrderDate: undefined,
        firstOrderDate: undefined,
        avgOrderValue: 0,
        repeatCustomer: false,
        hasClientRecord: true
      });
    });

    orders.forEach(order => {
      const key = order.clientId || order.clientName || order.clientMobileNumber || order.id;
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          clientId: order.clientId || key,
          name: order.clientName || 'Unknown Client',
          mobileNumber: order.clientMobileNumber,
          city: order.clientCity,
          totalOrders: 0,
          totalValue: 0,
          totalReceived: 0,
          outstanding: 0,
          lastOrderDate: undefined,
          firstOrderDate: undefined,
          avgOrderValue: 0,
          repeatCustomer: false,
          hasClientRecord: false
        });
      }

      const stat = statsMap.get(key)!;
      stat.totalOrders += 1;
      stat.totalValue += order.totalAmount || 0;
      stat.totalReceived += order.receivedPayment || 0;
      stat.outstanding += Math.max((order.totalAmount || 0) - (order.receivedPayment || 0), 0);
      const orderDate = parseDate(order.addDate) || parseDate(order.createdAt as Date);
      if (orderDate) {
        stat.lastOrderDate = stat.lastOrderDate ? (orderDate > stat.lastOrderDate ? orderDate : stat.lastOrderDate) : orderDate;
        stat.firstOrderDate = stat.firstOrderDate ? (orderDate < stat.firstOrderDate ? orderDate : stat.firstOrderDate) : orderDate;
      }
    });

    const stats = Array.from(statsMap.values()).map(stat => ({
      ...stat,
      avgOrderValue: stat.totalOrders ? stat.totalValue / stat.totalOrders : 0,
      repeatCustomer: stat.totalOrders >= 2
    }));

    const withOrders = stats.filter(stat => stat.totalOrders > 0);
    const noOrders = stats.filter(stat => stat.totalOrders === 0);

    const topByOrders = [...withOrders].sort((a, b) => b.totalOrders - a.totalOrders).slice(0, 5);
    const topByValue = [...withOrders].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);
    const topUnpaid = [...withOrders].filter(stat => stat.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    const inactiveClients = [...withOrders]
      .filter(stat => stat.lastOrderDate && daysSince(stat.lastOrderDate) > inactivityDays)
      .sort((a, b) => (a.lastOrderDate?.getTime() || 0) - (b.lastOrderDate?.getTime() || 0))
      .slice(0, 8);

    const activeClients = withOrders.filter(stat => stat.lastOrderDate && daysSince(stat.lastOrderDate) <= ACTIVE_DAYS).length;
    const repeatClients = withOrders.filter(stat => stat.repeatCustomer).length;

    return {
      stats,
      topByOrders,
      topByValue,
      topUnpaid,
      inactiveClients,
      noOrders,
      activeClients,
      repeatClients,
      totalClients: stats.length,
      clientsWithOrders: withOrders.length,
      repeatRate: withOrders.length ? (repeatClients / withOrders.length) * 100 : 0
    };
  }, [orders, clients, inactivityDays]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 sticky top-0 z-30">
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
      </header>

      <div className="p-4 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.completed}</p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.paid}</p>
                  <p className="text-sm text-muted-foreground">Paid Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{summary.inquiries}</p>
                  <p className="text-sm text-muted-foreground">Inquiries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(summary.totalValue)}</p>
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(summary.totalReceived)}</p>
                  <p className="text-sm text-muted-foreground">Received</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(summary.outstanding)}</p>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                  <BadgePercent className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground">
                    {summary.collectionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Activity */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted/50 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientInsights.totalClients}</p>
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientInsights.activeClients}</p>
                  <p className="text-sm text-muted-foreground">Active (last {ACTIVE_DAYS}d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientInsights.inactiveClients.length}</p>
                  <p className="text-sm text-muted-foreground">Inactive ({inactivityDays}+d)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BadgePercent className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{clientInsights.repeatRate.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Repeat Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Filters */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Client Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <p className="text-sm text-muted-foreground">Inactive Days Threshold</p>
                <Input
                  type="number"
                  min={1}
                  value={inactivityDays}
                  onChange={(event) => handleInactivityDaysChange(event.target.value)}
                  className="mt-2"
                />
              </div>
              <p className="text-xs text-muted-foreground md:col-span-2">
                Clients are marked inactive when they have no orders in the last {inactivityDays} days.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Operational Alerts */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Operational Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-destructive/10 p-4">
                <p className="text-sm text-muted-foreground">Overdue Orders</p>
                <p className="text-2xl font-bold text-destructive">{overdueOrders.length}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-4">
                <p className="text-sm text-muted-foreground">Due in Next {DUE_SOON_DAYS} Days</p>
                <p className="text-2xl font-bold text-foreground">{dueSoonOrders.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Trend */}
        {monthlySeries.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Orders Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revenue Trend */}
        {monthlySeries.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySeries}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Status Distribution */}
        {statusData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Status */}
        {paymentData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="hsl(var(--accent))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Amounts */}
        {paymentAmountData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Payment Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentAmountData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Order Types */}
        {typeData.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Order Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {typeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Top Clients by Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {clientInsights.topByOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client data available yet.</p>
              ) : (
                <div className="space-y-4">
                  {clientInsights.topByOrders.map(client => (
                    <div key={client.clientId} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                        <p className="text-xs text-muted-foreground">
                          Last order: {client.lastOrderDate ? `${formatDate(client.lastOrderDate)} (${getDaysSince(client.lastOrderDate)}d ago)` : 'N/A'}
                        </p>
                        {client.hasClientRecord && client.clientId && (
                          <Link to={`/clients/${client.clientId}/orders`} className="text-xs text-primary hover:underline">
                            View orders
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-semibold text-foreground">{client.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Top Clients by Value</CardTitle>
            </CardHeader>
            <CardContent>
              {clientInsights.topByValue.length === 0 ? (
                <p className="text-sm text-muted-foreground">No client data available yet.</p>
              ) : (
                <div className="space-y-4">
                  {clientInsights.topByValue.map(client => (
                    <div key={client.clientId} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                        <p className="text-xs text-muted-foreground">
                          Avg order: {formatCurrency(client.avgOrderValue)}
                        </p>
                        {client.hasClientRecord && client.clientId && (
                          <Link to={`/clients/${client.clientId}/orders`} className="text-xs text-primary hover:underline">
                            View orders
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">{formatCurrency(client.totalValue)}</p>
                        <p className="text-xs text-muted-foreground">total value</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Clients with Outstanding Amounts</CardTitle>
            </CardHeader>
            <CardContent>
              {clientInsights.topUnpaid.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outstanding payments found.</p>
              ) : (
                <div className="space-y-4">
                  {clientInsights.topUnpaid.map(client => (
                    <div key={client.clientId} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                        <p className="text-xs text-muted-foreground">
                          Last order: {client.lastOrderDate ? `${formatDate(client.lastOrderDate)} (${getDaysSince(client.lastOrderDate)}d ago)` : 'N/A'}
                        </p>
                        {client.hasClientRecord && client.clientId && (
                          <Link to={`/clients/${client.clientId}/orders`} className="text-xs text-primary hover:underline">
                            View orders
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-destructive">{formatCurrency(client.outstanding)}</p>
                        <p className="text-xs text-muted-foreground">outstanding</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Inactive Clients ({inactivityDays}+ Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {clientInsights.inactiveClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No inactive clients found.</p>
              ) : (
                <div className="space-y-4">
                  {clientInsights.inactiveClients.map(client => (
                    <div key={client.clientId} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                        <p className="text-xs text-muted-foreground">
                          Last order: {client.lastOrderDate ? formatDate(client.lastOrderDate) : 'N/A'}
                        </p>
                        {client.hasClientRecord && client.clientId && (
                          <Link to={`/clients/${client.clientId}/orders`} className="text-xs text-primary hover:underline">
                            View orders
                          </Link>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-foreground">{client.totalOrders}</p>
                        <p className="text-xs text-muted-foreground">orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {clientInsights.noOrders.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">Clients with No Orders Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientInsights.noOrders.slice(0, 8).map(client => (
                  <div key={client.clientId} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                    </div>
                    {client.hasClientRecord && client.clientId && (
                      <Link to={`/clients/${client.clientId}/orders`} className="text-xs text-primary hover:underline">
                        View profile
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <MobileNavigation />
    </div>
  );
};
