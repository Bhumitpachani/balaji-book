import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityCombobox } from "@/components/common/CityCombobox";
import { FieldCombobox } from "@/components/common/FieldCombobox";
import { StatusBadge } from "@/components/common/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, FileText, DollarSign, Users, Wallet, AlertTriangle, Clock, BadgePercent, Search, Activity, ArrowUpRight, BriefcaseBusiness, Building2 } from "lucide-react";
import { firebaseService, Order, Client } from "@/lib/firebaseService";
import { MobileNavigation } from "@/components/common/MobileNavigation";
import { getCitiesForState } from "@/lib/indiaLocations";
import { INDUSTRY_FIELDS } from "@/lib/industryFields";
import { cn } from "@/lib/utils";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];
const DEFAULT_INACTIVITY_DAYS = 45;
const INACTIVITY_OPTIONS = [15, 30, 45, 60, 75];
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

const getOrderAgeDays = (order: Order) => {
  const orderDate = parseDate(order.addDate) || parseDate(order.createdAt as Date);
  return orderDate ? getDaysSince(orderDate) : null;
};

type ClientFilterProfile = {
  name?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  field?: string;
  clientType?: string;
};

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

type SegmentRow = {
  name: string;
  orders: number;
  revenue: number;
  outstanding: number;
  clients: number;
  avgOrderValue: number;
};

const normalizeText = (value?: string) => value?.trim().toLowerCase() || '';

const matchesClientFilters = (
  profile: ClientFilterProfile,
  filters: {
    searchTerm: string;
    cityFilter: string;
    stateFilter: string;
    fieldFilter: string;
    typeFilter: string;
  }
) => {
  const search = normalizeText(filters.searchTerm);
  const matchesSearch = !search || [
    profile.name,
    profile.mobileNumber,
    profile.address,
    profile.city,
    profile.state,
    profile.field,
    profile.clientType
  ]
    .filter(Boolean)
    .some(value => normalizeText(value).includes(search));

  const matchesCity = !filters.cityFilter.trim() ||
    normalizeText(profile.city).includes(normalizeText(filters.cityFilter));
  const matchesState = filters.stateFilter === 'all' ||
    normalizeText(profile.state) === normalizeText(filters.stateFilter);
  const matchesField = !filters.fieldFilter.trim() ||
    normalizeText(profile.field).includes(normalizeText(filters.fieldFilter));
  const matchesType = filters.typeFilter === 'all' ||
    normalizeText(profile.clientType) === normalizeText(filters.typeFilter);

  return matchesSearch && matchesCity && matchesState && matchesField && matchesType;
};

const formatPercent = (value: number) => `${value.toFixed(1)}%`;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const formatDeltaLabel = (current: number, previous: number) => {
  if (previous === 0 && current === 0) {
    return 'No change vs previous 30 days';
  }

  if (previous === 0) {
    return 'Fresh activity vs previous 30 days';
  }

  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous 30 days`;
};

type MetricCardProps = {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  toneClass: string;
  progress?: number;
  progressLabel?: string;
  badge?: string;
  className?: string;
  valueClassName?: string;
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  toneClass,
  progress,
  progressLabel,
  badge,
  className,
  valueClassName
}) => (
  <Card className={cn("border-border/60 bg-card/95 shadow-card", className)}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", toneClass)}>
          {icon}
        </div>
        {badge && <Badge variant="secondary" className="text-[11px]">{badge}</Badge>}
      </div>
      <div className="mt-4 space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className={cn("text-2xl font-semibold text-foreground", valueClassName)}>{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {progress !== undefined && (
        <div className="mt-4 space-y-2">
          <Progress value={clampPercent(progress)} className="h-2" />
          {progressLabel && <p className="text-xs text-muted-foreground">{progressLabel}</p>}
        </div>
      )}
    </CardContent>
  </Card>
);

export const Analytics: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inactivityDays, setInactivityDays] = useState(DEFAULT_INACTIVITY_DAYS);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [fieldFilter, setFieldFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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

  const clientLookup = React.useMemo(() => {
    return new Map(clients.map(client => [client.id, client]));
  }, [clients]);

  const availableStates = React.useMemo(() => {
    const unique = new Set(
      clients
        .map(client => client.state?.trim())
        .filter((value): value is string => Boolean(value))
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [clients]);

  const availableCities = React.useMemo(() => {
    const selectedState = stateFilter === 'all' ? '' : stateFilter.trim().toLowerCase();
    const baseCities = selectedState ? getCitiesForState(stateFilter) : [];
    const clientCities = clients
      .filter(client => {
        if (!selectedState) return true;
        return normalizeText(client.state) === selectedState;
      })
      .map(client => client.city?.trim())
      .filter((value): value is string => Boolean(value));

    const unique = new Set([...baseCities, ...clientCities]);
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [clients, stateFilter]);

  const availableFields = React.useMemo(() => {
    const unique = new Set(INDUSTRY_FIELDS);
    if (fieldFilter.trim()) {
      unique.add(fieldFilter.trim());
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [fieldFilter]);

  useEffect(() => {
    if (!cityFilter.trim()) return;
    const normalizedCity = normalizeText(cityFilter);
    const matches = availableCities.some(city => normalizeText(city).includes(normalizedCity));
    if (!matches) {
      setCityFilter('');
    }
  }, [availableCities, cityFilter]);

  const filters = React.useMemo(() => ({
    searchTerm,
    cityFilter,
    stateFilter,
    fieldFilter,
    typeFilter
  }), [searchTerm, cityFilter, stateFilter, fieldFilter, typeFilter]);

  const filteredClients = React.useMemo(() => {
    return clients.filter(client => matchesClientFilters(client, filters));
  }, [clients, filters]);

  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const linkedClient = order.clientId ? clientLookup.get(order.clientId) : undefined;
      return matchesClientFilters({
        name: linkedClient?.name || order.clientName,
        mobileNumber: linkedClient?.mobileNumber || order.clientMobileNumber,
        address: linkedClient?.address || order.clientAddress,
        city: linkedClient?.city || order.clientCity,
        state: linkedClient?.state,
        field: linkedClient?.field,
        clientType: linkedClient?.clientType
      }, filters);
    });
  }, [orders, clientLookup, filters]);

  const monthlySeries = React.useMemo(() => {
    const months: Record<string, { orders: number; revenue: number; received: number }> = {};

    filteredOrders.forEach(order => {
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
  }, [filteredOrders]);

  const summary = React.useMemo(() => {
    let completed = 0;
    let paid = 0;
    let inquiries = 0;
    let totalValue = 0;
    let totalReceived = 0;
    let outstanding = 0;

    filteredOrders.forEach(order => {
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
      total: filteredOrders.length,
      completed,
      paid,
      inquiries,
      totalValue,
      totalReceived,
      outstanding,
      avgOrderValue: filteredOrders.length ? totalValue / filteredOrders.length : 0,
      collectionRate: totalValue ? (totalReceived / totalValue) * 100 : 0
    };
  }, [filteredOrders]);

  const statusData = React.useMemo(() => ([
    { name: 'Pending', value: filteredOrders.filter(o => o.status === 'Pending').length },
    { name: 'Running', value: filteredOrders.filter(o => o.status === 'Running').length },
    { name: 'Done', value: filteredOrders.filter(o => o.status === 'Done').length },
    { name: 'Delivered', value: filteredOrders.filter(o => o.status === 'Delivered').length },
  ].filter(item => item.value > 0)), [filteredOrders]);

  const paymentData = React.useMemo(() => ([
    { name: 'Paid', value: filteredOrders.filter(o => o.paymentStatus === 'Paid').length },
    { name: 'Unpaid', value: filteredOrders.filter(o => o.paymentStatus === 'Unpaid').length },
  ].filter(item => item.value > 0)), [filteredOrders]);

  const paymentAmountData = React.useMemo(() => ([
    { name: 'Received', value: summary.totalReceived },
    { name: 'Outstanding', value: summary.outstanding },
  ].filter(item => item.value > 0)), [summary]);

  const typeData = React.useMemo(() => ([
    { name: 'Inquiry', value: filteredOrders.filter(o => o.type === 'Inquiry').length },
    { name: 'Confirm', value: filteredOrders.filter(o => o.type === 'Confirm').length },
  ].filter(item => item.value > 0)), [filteredOrders]);

  const { overdueOrders, dueSoonOrders } = React.useMemo(() => {
    const today = startOfDay(new Date());
    const dueSoonCutoff = new Date(today.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
    const overdue: Order[] = [];
    const dueSoon: Order[] = [];

    filteredOrders.forEach(order => {
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
  }, [filteredOrders]);

  const handleInactivityDaysChange = (value: string) => {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && INACTIVITY_OPTIONS.includes(parsed)) {
      setInactivityDays(parsed);
    }
  };

  const openOrders = React.useMemo(
    () => filteredOrders.filter(order => order.status === 'Pending' || order.status === 'Running'),
    [filteredOrders]
  );

  const pendingAgeData = React.useMemo(() => {
    const buckets = [
      { label: '0-7d', min: 0, max: 7 },
      { label: '8-14d', min: 8, max: 14 },
      { label: '15-30d', min: 15, max: 30 },
      { label: '31+d', min: 31, max: Number.POSITIVE_INFINITY },
    ];

    const counts = buckets.map(bucket => ({ bucket: bucket.label, count: 0 }));

    openOrders.forEach(order => {
      const age = getOrderAgeDays(order);
      if (age === null) return;
      const bucketIndex = buckets.findIndex(bucket => age >= bucket.min && age <= bucket.max);
      if (bucketIndex >= 0) {
        counts[bucketIndex].count += 1;
      }
    });

    return counts;
  }, [openOrders]);

  const longestPendingOrders = React.useMemo(() => {
    return [...openOrders]
      .map(order => ({ order, age: getOrderAgeDays(order) }))
      .filter((item): item is { order: Order; age: number } => item.age !== null)
      .sort((a, b) => b.age - a.age)
      .slice(0, 5);
  }, [openOrders]);

  const overdueOrderList = React.useMemo(() => {
    const today = startOfDay(new Date());
    return [...overdueOrders]
      .map(order => {
        const delivery = parseDate(order.deliveryDate);
        const overdueDays = delivery
          ? Math.floor((today.getTime() - startOfDay(delivery).getTime()) / (24 * 60 * 60 * 1000))
          : null;
        return { order, overdueDays };
      })
      .filter((item): item is { order: Order; overdueDays: number } => item.overdueDays !== null)
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 5);
  }, [overdueOrders]);

  const clientInsights = React.useMemo(() => {
    const today = startOfDay(new Date());
    const daysSince = (date: Date) => Math.floor((today.getTime() - startOfDay(date).getTime()) / (24 * 60 * 60 * 1000));
    const statsMap = new Map<string, ClientStat>();

    filteredClients.forEach(client => {
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

    filteredOrders.forEach(order => {
      const key = order.clientId || order.clientName || order.clientMobileNumber || order.id;
      if (!statsMap.has(key)) {
        const linkedClient = order.clientId ? clientLookup.get(order.clientId) : undefined;
        statsMap.set(key, {
          clientId: order.clientId || key,
          name: linkedClient?.name || order.clientName || 'Unknown Client',
          mobileNumber: linkedClient?.mobileNumber || order.clientMobileNumber,
          city: linkedClient?.city || order.clientCity,
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
    const topUnpaid = [...withOrders]
      .filter(stat => stat.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 5);

    const inactiveClients = [...withOrders]
      .filter(stat => stat.lastOrderDate && daysSince(stat.lastOrderDate) > inactivityDays)
      .sort((a, b) => (a.lastOrderDate?.getTime() || 0) - (b.lastOrderDate?.getTime() || 0));

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
  }, [filteredOrders, filteredClients, clientLookup, inactivityDays]);

  const overviewMetrics = React.useMemo(() => {
    const confirmOrders = filteredOrders.filter(order => order.type === 'Confirm').length;
    const unpaidOrders = filteredOrders.filter(order => order.paymentStatus === 'Unpaid').length;
    const completionRate = summary.total ? (summary.completed / summary.total) * 100 : 0;
    const paidRate = summary.total ? (summary.paid / summary.total) * 100 : 0;
    const confirmRate = summary.total ? (confirmOrders / summary.total) * 100 : 0;
    const openRate = summary.total ? (openOrders.length / summary.total) * 100 : 0;
    const overdueRate = summary.total ? (overdueOrders.length / summary.total) * 100 : 0;
    const avgRevenuePerClient = clientInsights.clientsWithOrders ? summary.totalValue / clientInsights.clientsWithOrders : 0;

    return {
      confirmOrders,
      unpaidOrders,
      completionRate,
      paidRate,
      confirmRate,
      openRate,
      overdueRate,
      avgRevenuePerClient,
      noOrderClients: clientInsights.noOrders.length
    };
  }, [filteredOrders, summary, openOrders, overdueOrders, clientInsights]);

  const rollingMetrics = React.useMemo(() => {
    const today = startOfDay(new Date());
    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - 29);

    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - 29);

    const result = {
      ordersCurrent: 0,
      ordersPrevious: 0,
      revenueCurrent: 0,
      revenuePrevious: 0,
      collectionsCurrent: 0,
      collectionsPrevious: 0,
      newClientsCurrent: 0,
      newClientsPrevious: 0,
    };

    filteredOrders.forEach(order => {
      const parsed = parseDate(order.addDate) || parseDate(order.createdAt as Date);
      if (!parsed) return;

      const orderDate = startOfDay(parsed);
      const amount = order.totalAmount || 0;
      const received = order.receivedPayment || 0;

      if (orderDate >= currentStart && orderDate <= today) {
        result.ordersCurrent += 1;
        result.revenueCurrent += amount;
        result.collectionsCurrent += received;
      } else if (orderDate >= previousStart && orderDate <= previousEnd) {
        result.ordersPrevious += 1;
        result.revenuePrevious += amount;
        result.collectionsPrevious += received;
      }
    });

    filteredClients.forEach(client => {
      const createdAt = parseDate(client.createdAt as Date);
      if (!createdAt) return;

      const createdDay = startOfDay(createdAt);
      if (createdDay >= currentStart && createdDay <= today) {
        result.newClientsCurrent += 1;
      } else if (createdDay >= previousStart && createdDay <= previousEnd) {
        result.newClientsPrevious += 1;
      }
    });

    return result;
  }, [filteredOrders, filteredClients]);

  const segmentInsights = React.useMemo(() => {
    type SegmentAccumulator = {
      name: string;
      orders: number;
      revenue: number;
      outstanding: number;
      clientIds: Set<string>;
    };

    const createMap = () => new Map<string, SegmentAccumulator>();
    const byCity = createMap();
    const byField = createMap();
    const byType = createMap();

    const upsert = (
      map: Map<string, SegmentAccumulator>,
      rawName: string | undefined,
      order: Order,
      clientKey: string
    ) => {
      const name = rawName?.trim() || 'Unspecified';
      if (!map.has(name)) {
        map.set(name, {
          name,
          orders: 0,
          revenue: 0,
          outstanding: 0,
          clientIds: new Set<string>()
        });
      }

      const segment = map.get(name)!;
      segment.orders += 1;
      segment.revenue += order.totalAmount || 0;
      segment.outstanding += Math.max((order.totalAmount || 0) - (order.receivedPayment || 0), 0);
      segment.clientIds.add(clientKey);
    };

    filteredOrders.forEach(order => {
      const linkedClient = order.clientId ? clientLookup.get(order.clientId) : undefined;
      const clientKey = order.clientId || order.clientMobileNumber || order.clientName || order.id;

      upsert(byCity, linkedClient?.city || order.clientCity, order, clientKey);
      upsert(byField, linkedClient?.field, order, clientKey);
      upsert(byType, linkedClient?.clientType, order, clientKey);
    });

    const toRows = (map: Map<string, SegmentAccumulator>): SegmentRow[] =>
      Array.from(map.values())
        .map(segment => ({
          name: segment.name,
          orders: segment.orders,
          revenue: segment.revenue,
          outstanding: segment.outstanding,
          clients: segment.clientIds.size,
          avgOrderValue: segment.orders ? segment.revenue / segment.orders : 0
        }))
        .sort((a, b) => b.revenue - a.revenue || b.orders - a.orders);

    return {
      cityPerformance: toRows(byCity).slice(0, 5),
      fieldPerformance: toRows(byField).slice(0, 5),
      typePerformance: toRows(byType)
    };
  }, [filteredOrders, clientLookup]);

  const activeFilters = React.useMemo(() => {
    const filtersList: string[] = [];
    if (searchTerm.trim()) filtersList.push(`Search: ${searchTerm.trim()}`);
    if (stateFilter !== 'all') filtersList.push(`State: ${stateFilter}`);
    if (cityFilter.trim()) filtersList.push(`City: ${cityFilter.trim()}`);
    if (fieldFilter.trim()) filtersList.push(`Field: ${fieldFilter.trim()}`);
    if (typeFilter !== 'all') filtersList.push(`Type: ${typeFilter}`);
    return filtersList;
  }, [searchTerm, stateFilter, cityFilter, fieldFilter, typeFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setCityFilter('');
    setStateFilter('all');
    setFieldFilter('');
    setTypeFilter('all');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-pulse">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">Professional performance, revenue, and client intelligence.</p>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            {summary.total} orders in scope
          </Badge>
        </div>
      </header>

      <div className="space-y-6 p-4">
        <Card className="relative overflow-hidden border-border/60 bg-gradient-to-br from-primary/15 via-card to-accent/10 shadow-card">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.18),transparent_55%)]" />
          <CardContent className="relative p-6">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Executive Dashboard</Badge>
                  <Badge variant="outline">Production-safe metrics</Badge>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">Business performance at a glance</h2>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    Track order flow, collection health, client retention, and segment performance from one place.
                    Every metric below respects the same client filters used on the Clients page.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.length === 0 ? (
                    <Badge variant="outline">All client filters applied</Badge>
                  ) : (
                    activeFilters.map(filter => (
                      <Badge key={filter} variant="secondary">{filter}</Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[520px]">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Revenue</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalValue)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.revenueCurrent, rollingMetrics.revenuePrevious)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Collections</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.totalReceived)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.collectionsCurrent, rollingMetrics.collectionsPrevious)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{summary.total}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.ordersCurrent, rollingMetrics.ordersPrevious)}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">New Clients</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{rollingMetrics.newClientsCurrent}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.newClientsCurrent, rollingMetrics.newClientsPrevious)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/95 shadow-card">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Client Filters</CardTitle>
                <CardDescription>Use the same filters as Clients page to narrow every insight on this dashboard.</CardDescription>
              </div>
              {activeFilters.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, mobile, city, state, field, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {availableStates.map(state => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <CityCombobox
                id="analyticsCityFilter"
                value={cityFilter}
                options={availableCities}
                onChange={setCityFilter}
                placeholder="Filter by city"
                allowAll
                allLabel="All cities"
              />

              <FieldCombobox
                id="analyticsFieldFilter"
                value={fieldFilter}
                options={availableFields}
                onChange={setFieldFilter}
                placeholder="Filter by field"
                allowAll
                allLabel="All fields"
              />

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="B2B">B2B</SelectItem>
                  <SelectItem value="B2C">B2C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">
              Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} across {clientInsights.totalClients} client{clientInsights.totalClients !== 1 ? 's' : ''}.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-1 md:grid-cols-4">
            <TabsTrigger value="overview" className="rounded-xl">Overview</TabsTrigger>
            <TabsTrigger value="operations" className="rounded-xl">Operations</TabsTrigger>
            <TabsTrigger value="clients" className="rounded-xl">Clients</TabsTrigger>
            <TabsTrigger value="segments" className="rounded-xl">Segments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr,1fr]">
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-xl">Executive Summary</CardTitle>
                      <CardDescription>Financial performance, delivery strength, and commercial momentum.</CardDescription>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {formatPercent(overviewMetrics.confirmRate)} confirm share
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(summary.totalValue)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.revenueCurrent, rollingMetrics.revenuePrevious)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">Collected</p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">{formatCurrency(summary.totalReceived)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatDeltaLabel(rollingMetrics.collectionsCurrent, rollingMetrics.collectionsPrevious)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-sm text-muted-foreground">Outstanding</p>
                      <p className="mt-2 text-3xl font-semibold text-destructive">{formatCurrency(summary.outstanding)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{formatPercent(summary.totalValue ? (summary.outstanding / summary.totalValue) * 100 : 0)} of order value still open</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Collection health</p>
                          <p className="text-xs text-muted-foreground">Received share of billed amount</p>
                        </div>
                        <Badge variant="outline">{formatPercent(summary.collectionRate)}</Badge>
                      </div>
                      <Progress value={summary.collectionRate} className="mt-4 h-2.5" />
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatCurrency(summary.totalReceived)} collected</span>
                        <span>{formatCurrency(summary.outstanding)} pending</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Delivery completion</p>
                          <p className="text-xs text-muted-foreground">Delivered orders as a share of total workload</p>
                        </div>
                        <Badge variant="outline">{formatPercent(overviewMetrics.completionRate)}</Badge>
                      </div>
                      <Progress value={overviewMetrics.completionRate} className="mt-4 h-2.5" />
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{summary.completed} delivered</span>
                        <span>{openOrders.length} still active</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl bg-primary/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Orders 30d</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{rollingMetrics.ordersCurrent}</p>
                    </div>
                    <div className="rounded-xl bg-success/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Collections 30d</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(rollingMetrics.collectionsCurrent)}</p>
                    </div>
                    <div className="rounded-xl bg-accent/10 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Avg order</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(summary.avgOrderValue)}</p>
                    </div>
                    <div className="rounded-xl bg-muted/70 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue per client</p>
                      <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(overviewMetrics.avgRevenuePerClient)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <MetricCard
                  title="Order Throughput"
                  value={String(summary.total)}
                  subtitle={formatDeltaLabel(rollingMetrics.ordersCurrent, rollingMetrics.ordersPrevious)}
                  icon={<FileText className="h-5 w-5 text-primary" />}
                  toneClass="bg-primary/10"
                  progress={overviewMetrics.completionRate}
                  progressLabel={`${summary.completed} delivered orders`}
                  badge={`${openOrders.length} open`}
                />
                <MetricCard
                  title="Collection Strength"
                  value={formatPercent(overviewMetrics.paidRate)}
                  subtitle={`${overviewMetrics.unpaidOrders} unpaid order${overviewMetrics.unpaidOrders !== 1 ? 's' : ''} in scope`}
                  icon={<Wallet className="h-5 w-5 text-success" />}
                  toneClass="bg-success/10"
                  progress={summary.collectionRate}
                  progressLabel={`${formatCurrency(summary.totalReceived)} received from ${formatCurrency(summary.totalValue)} billed`}
                />
                <MetricCard
                  title="Client Retention"
                  value={formatPercent(clientInsights.repeatRate)}
                  subtitle={`${clientInsights.repeatClients} repeat client${clientInsights.repeatClients !== 1 ? 's' : ''}`}
                  icon={<Users className="h-5 w-5 text-accent" />}
                  toneClass="bg-accent/10"
                  progress={clientInsights.repeatRate}
                  progressLabel={`${clientInsights.activeClients} active in last ${ACTIVE_DAYS} days`}
                />
                <MetricCard
                  title="Risk Exposure"
                  value={String(overdueOrders.length)}
                  subtitle={`${formatPercent(overviewMetrics.overdueRate)} of orders are overdue`}
                  icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                  toneClass="bg-destructive/10"
                  progress={overviewMetrics.overdueRate}
                  progressLabel={`${dueSoonOrders.length} due in the next ${DUE_SOON_DAYS} days`}
                  valueClassName="text-destructive"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {monthlySeries.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Orders Trend</CardTitle>
                    <CardDescription>Last six months of order flow.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlySeries}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: 'hsl(var(--primary))' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {monthlySeries.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Revenue and Collections</CardTitle>
                    <CardDescription>Billing and receipts across the same six-month window.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={monthlySeries}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ fill: 'hsl(var(--accent))' }} />
                          <Line type="monotone" dataKey="received" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              {statusData.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Status</CardTitle>
                    <CardDescription>Current workload by stage.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={86}
                            dataKey="value"
                          >
                            {statusData.map((_, index) => (
                              <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {paymentData.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Status</CardTitle>
                    <CardDescription>Paid versus unpaid orders.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}

              {typeData.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Types</CardTitle>
                    <CardDescription>Inquiry versus confirm mix.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={typeData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={86}
                            dataKey="value"
                          >
                            {typeData.map((_, index) => (
                              <Cell key={`type-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="operations" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Overdue Orders"
                value={String(overdueOrders.length)}
                subtitle="Orders past promised delivery date"
                icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
                toneClass="bg-destructive/10"
                progress={overviewMetrics.overdueRate}
                progressLabel={`${formatPercent(overviewMetrics.overdueRate)} of current scoped orders`}
                valueClassName="text-destructive"
              />
              <MetricCard
                title={`Due in ${DUE_SOON_DAYS} Days`}
                value={String(dueSoonOrders.length)}
                subtitle="Upcoming delivery pressure"
                icon={<Clock className="h-5 w-5 text-primary" />}
                toneClass="bg-primary/10"
                progress={summary.total ? (dueSoonOrders.length / summary.total) * 100 : 0}
                progressLabel={`${openOrders.length} total open orders`}
              />
              <MetricCard
                title="Open Orders"
                value={String(openOrders.length)}
                subtitle="Pending and running orders"
                icon={<Activity className="h-5 w-5 text-accent" />}
                toneClass="bg-accent/10"
                progress={overviewMetrics.openRate}
                progressLabel={`${formatPercent(overviewMetrics.openRate)} of all orders`}
              />
              <MetricCard
                title="Unpaid Orders"
                value={String(overviewMetrics.unpaidOrders)}
                subtitle="Orders still awaiting payment"
                icon={<DollarSign className="h-5 w-5 text-foreground" />}
                toneClass="bg-muted/70"
                progress={summary.total ? (overviewMetrics.unpaidOrders / summary.total) * 100 : 0}
                progressLabel={`${formatCurrency(summary.outstanding)} outstanding amount`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Pending Order Ageing</CardTitle>
                  <CardDescription>Shows how long open work has been sitting in the system.</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingAgeData.every(item => item.count === 0) ? (
                    <p className="text-sm text-muted-foreground">No pending or running orders.</p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pendingAgeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="bucket" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Longest Pending Orders</CardTitle>
                  <CardDescription>Oldest active jobs that may need management attention.</CardDescription>
                </CardHeader>
                <CardContent>
                  {longestPendingOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No pending or running orders.</p>
                  ) : (
                    <div className="space-y-4">
                      {longestPendingOrders.map(({ order, age }) => (
                        <div key={order.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="min-w-0">
                            <Link to={`/orders/${order.id}`} className="font-medium text-foreground hover:text-primary">
                              {order.orderName || `Order #${order.number}`}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {(order.clientName || 'Unknown Client')} | Added {formatDate(order.addDate)}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusBadge status={order.status} type="order" />
                              <StatusBadge status={order.paymentStatus} type="payment" />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">{age}d</p>
                            <p className="text-xs text-muted-foreground">pending</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr,0.8fr]">
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Most Overdue Orders</CardTitle>
                  <CardDescription>Orders with the longest delay beyond their delivery date.</CardDescription>
                </CardHeader>
                <CardContent>
                  {overdueOrderList.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No overdue orders right now.</p>
                  ) : (
                    <div className="space-y-4">
                      {overdueOrderList.map(({ order, overdueDays }) => {
                        const outstanding = Math.max((order.totalAmount || 0) - (order.receivedPayment || 0), 0);
                        return (
                          <div key={order.id} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                            <div className="min-w-0">
                              <Link to={`/orders/${order.id}`} className="font-medium text-foreground hover:text-primary">
                                {order.orderName || `Order #${order.number}`}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {(order.clientName || 'Unknown Client')} | Due {formatDate(order.deliveryDate)}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <StatusBadge status={order.status} type="order" />
                                <StatusBadge status={order.paymentStatus} type="payment" />
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-destructive">{overdueDays}d</p>
                              <p className="text-xs text-muted-foreground">
                                {outstanding > 0 ? `${formatCurrency(outstanding)} due` : 'No balance'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {paymentAmountData.length > 0 && (
                <Card className="border-border/60 bg-card/95 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Amounts</CardTitle>
                    <CardDescription>Receipts versus pending balance.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentAmountData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Total Clients"
                value={String(clientInsights.totalClients)}
                subtitle={`${clientInsights.clientsWithOrders} client${clientInsights.clientsWithOrders !== 1 ? 's' : ''} with orders`}
                icon={<Users className="h-5 w-5 text-foreground" />}
                toneClass="bg-muted/70"
                progress={clientInsights.totalClients ? (clientInsights.clientsWithOrders / clientInsights.totalClients) * 100 : 0}
                progressLabel={`${overviewMetrics.noOrderClients} client${overviewMetrics.noOrderClients !== 1 ? 's' : ''} still without orders`}
              />
              <MetricCard
                title="Active Clients"
                value={String(clientInsights.activeClients)}
                subtitle={`Clients active in the last ${ACTIVE_DAYS} days`}
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                toneClass="bg-success/10"
                progress={clientInsights.clientsWithOrders ? (clientInsights.activeClients / clientInsights.clientsWithOrders) * 100 : 0}
                progressLabel={`${formatPercent(clientInsights.clientsWithOrders ? (clientInsights.activeClients / clientInsights.clientsWithOrders) * 100 : 0)} of ordering clients`}
              />
              <MetricCard
                title="Inactive Clients"
                value={String(clientInsights.inactiveClients.length)}
                subtitle={`No orders in ${inactivityDays}+ days`}
                icon={<Clock className="h-5 w-5 text-destructive" />}
                toneClass="bg-destructive/10"
                progress={clientInsights.clientsWithOrders ? (clientInsights.inactiveClients.length / clientInsights.clientsWithOrders) * 100 : 0}
                progressLabel="Threshold can be adjusted below"
              />
              <MetricCard
                title="Repeat Rate"
                value={formatPercent(clientInsights.repeatRate)}
                subtitle={`${clientInsights.repeatClients} repeat client${clientInsights.repeatClients !== 1 ? 's' : ''}`}
                icon={<BadgePercent className="h-5 w-5 text-primary" />}
                toneClass="bg-primary/10"
                progress={clientInsights.repeatRate}
                progressLabel="Clients with two or more orders"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Top Clients by Orders</CardTitle>
                  <CardDescription>Best repeat demand based on order count.</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientInsights.topByOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client data available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientInsights.topByOrders.map(client => (
                        <div key={client.clientId} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                            <p className="text-xs text-muted-foreground">
                              Last order: {client.lastOrderDate ? `${formatDate(client.lastOrderDate)} (${getDaysSince(client.lastOrderDate)}d ago)` : 'N/A'}
                            </p>
                            {client.hasClientRecord && client.clientId && (
                              <Link to={`/clients/${client.clientId}/orders`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                View orders <ArrowUpRight className="h-3 w-3" />
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

              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Top Clients by Value</CardTitle>
                  <CardDescription>Highest billing contribution in the filtered scope.</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientInsights.topByValue.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client data available yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientInsights.topByValue.map(client => (
                        <div key={client.clientId} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                            <p className="text-xs text-muted-foreground">Avg order: {formatCurrency(client.avgOrderValue)}</p>
                            {client.hasClientRecord && client.clientId && (
                              <Link to={`/clients/${client.clientId}/orders`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                View orders <ArrowUpRight className="h-3 w-3" />
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

              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Clients with Outstanding Amounts</CardTitle>
                  <CardDescription>Largest unpaid exposure by client.</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientInsights.topUnpaid.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No outstanding payments found.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientInsights.topUnpaid.map(client => (
                        <div key={client.clientId} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                            <p className="text-xs text-muted-foreground">
                              Last order: {client.lastOrderDate ? `${formatDate(client.lastOrderDate)} (${getDaysSince(client.lastOrderDate)}d ago)` : 'N/A'}
                            </p>
                            {client.hasClientRecord && client.clientId && (
                              <Link to={`/clients/${client.clientId}/orders`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                View orders <ArrowUpRight className="h-3 w-3" />
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

              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="sm:w-52">
                    <p className="text-xs text-muted-foreground">Inactive Days Threshold</p>
                    <Select value={String(inactivityDays)} onValueChange={handleInactivityDaysChange}>
                      <SelectTrigger className="mt-2 h-9">
                        <SelectValue placeholder="Select days" />
                      </SelectTrigger>
                      <SelectContent>
                        {INACTIVITY_OPTIONS.map(option => (
                          <SelectItem key={option} value={String(option)}>
                            {option}+ days
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <CardTitle className="text-lg">Inactive Clients</CardTitle>
                    <CardDescription>{inactivityDays}+ days without a fresh order.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {clientInsights.inactiveClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No inactive clients found.</p>
                  ) : (
                    <div className="space-y-4">
                      {clientInsights.inactiveClients.map(client => (
                        <div key={client.clientId} className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.mobileNumber || 'No mobile number'}</p>
                            <p className="text-xs text-muted-foreground">Last order: {client.lastOrderDate ? formatDate(client.lastOrderDate) : 'N/A'}</p>
                            {client.hasClientRecord && client.clientId && (
                              <Link to={`/clients/${client.clientId}/orders`} className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                View orders <ArrowUpRight className="h-3 w-3" />
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
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Clients with No Orders Yet</CardTitle>
                  <CardDescription>Useful for follow-up and conversion activity.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {clientInsights.noOrders.slice(0, 8).map(client => (
                      <div key={client.clientId} className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background/60 p-4">
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
          </TabsContent>

          <TabsContent value="segments" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                title="Top City"
                value={segmentInsights.cityPerformance[0]?.name || 'N/A'}
                subtitle={segmentInsights.cityPerformance[0] ? `${segmentInsights.cityPerformance[0].orders} orders | ${formatCurrency(segmentInsights.cityPerformance[0].revenue)}` : 'No city data available'}
                icon={<Building2 className="h-5 w-5 text-primary" />}
                toneClass="bg-primary/10"
                progress={segmentInsights.cityPerformance[0] && summary.total ? (segmentInsights.cityPerformance[0].orders / summary.total) * 100 : 0}
                progressLabel={segmentInsights.cityPerformance[0] ? `${segmentInsights.cityPerformance[0].clients} client${segmentInsights.cityPerformance[0].clients !== 1 ? 's' : ''}` : undefined}
              />
              <MetricCard
                title="Top Field"
                value={segmentInsights.fieldPerformance[0]?.name || 'N/A'}
                subtitle={segmentInsights.fieldPerformance[0] ? `${segmentInsights.fieldPerformance[0].orders} orders | ${formatCurrency(segmentInsights.fieldPerformance[0].revenue)}` : 'No field data available'}
                icon={<BriefcaseBusiness className="h-5 w-5 text-accent" />}
                toneClass="bg-accent/10"
                progress={segmentInsights.fieldPerformance[0] && summary.total ? (segmentInsights.fieldPerformance[0].orders / summary.total) * 100 : 0}
                progressLabel={segmentInsights.fieldPerformance[0] ? `${segmentInsights.fieldPerformance[0].clients} client${segmentInsights.fieldPerformance[0].clients !== 1 ? 's' : ''}` : undefined}
              />
              <MetricCard
                title="Top Client Type"
                value={segmentInsights.typePerformance[0]?.name || 'N/A'}
                subtitle={segmentInsights.typePerformance[0] ? `${segmentInsights.typePerformance[0].orders} orders | ${formatCurrency(segmentInsights.typePerformance[0].revenue)}` : 'No type data available'}
                icon={<Users className="h-5 w-5 text-success" />}
                toneClass="bg-success/10"
                progress={segmentInsights.typePerformance[0] && summary.total ? (segmentInsights.typePerformance[0].orders / summary.total) * 100 : 0}
                progressLabel={segmentInsights.typePerformance[0] ? `${segmentInsights.typePerformance[0].clients} client${segmentInsights.typePerformance[0].clients !== 1 ? 's' : ''}` : undefined}
              />
              <MetricCard
                title="Client Coverage"
                value={formatPercent(clientInsights.totalClients ? (clientInsights.clientsWithOrders / clientInsights.totalClients) * 100 : 0)}
                subtitle="Clients with at least one order"
                icon={<Activity className="h-5 w-5 text-foreground" />}
                toneClass="bg-muted/70"
                progress={clientInsights.totalClients ? (clientInsights.clientsWithOrders / clientInsights.totalClients) * 100 : 0}
                progressLabel={`${clientInsights.clientsWithOrders} of ${clientInsights.totalClients} clients are active in the ledger`}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Top Cities by Revenue</CardTitle>
                  <CardDescription>Geographic concentration of order value.</CardDescription>
                </CardHeader>
                <CardContent>
                  {segmentInsights.cityPerformance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No city data available.</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={segmentInsights.cityPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/95 shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Top Fields by Revenue</CardTitle>
                  <CardDescription>Most valuable industries in the current filtered scope.</CardDescription>
                </CardHeader>
                <CardContent>
                  {segmentInsights.fieldPerformance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No field data available.</p>
                  ) : (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={segmentInsights.fieldPerformance}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={80} />
                          <YAxis />
                          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                          <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card className="border-border/60 bg-card/95 shadow-card xl:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Client Type Performance</CardTitle>
                  <CardDescription>Revenue, client count, and order concentration by type.</CardDescription>
                </CardHeader>
                <CardContent>
                  {segmentInsights.typePerformance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No client type data available.</p>
                  ) : (
                    <div className="space-y-4">
                      {segmentInsights.typePerformance.map(segment => (
                        <div key={segment.name} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-foreground">{segment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {segment.clients} client{segment.clients !== 1 ? 's' : ''} | {segment.orders} orders
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(segment.revenue)}</p>
                          </div>
                          <Progress
                            value={summary.totalValue ? (segment.revenue / summary.totalValue) * 100 : 0}
                            className="mt-3 h-2"
                          />
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Avg order {formatCurrency(segment.avgOrderValue)}</span>
                            <span>{formatCurrency(segment.outstanding)} outstanding</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card/95 shadow-card xl:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Segment Rankings</CardTitle>
                  <CardDescription>Quick comparison across the strongest city and field segments.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Cities</Badge>
                      <p className="text-sm text-muted-foreground">Revenue-focused ranking</p>
                    </div>
                    {segmentInsights.cityPerformance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No city data available.</p>
                    ) : (
                      segmentInsights.cityPerformance.map(segment => (
                        <div key={segment.name} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{segment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {segment.orders} orders | {segment.clients} client{segment.clients !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(segment.revenue)}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Avg order {formatCurrency(segment.avgOrderValue)}</span>
                            <span>{formatCurrency(segment.outstanding)} pending</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Fields</Badge>
                      <p className="text-sm text-muted-foreground">Industry-wise revenue ranking</p>
                    </div>
                    {segmentInsights.fieldPerformance.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No field data available.</p>
                    ) : (
                      segmentInsights.fieldPerformance.map(segment => (
                        <div key={segment.name} className="rounded-2xl border border-border/60 bg-background/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground">{segment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {segment.orders} orders | {segment.clients} client{segment.clients !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{formatCurrency(segment.revenue)}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Avg order {formatCurrency(segment.avgOrderValue)}</span>
                            <span>{formatCurrency(segment.outstanding)} pending</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MobileNavigation />
    </div>
  );
};
