import type { Order } from './firebaseService';

type OrderMetricFields = Pick<
  Order,
  'analysisMode' | 'estimatedAmount' | 'estimatedWeight' | 'totalAmount' | 'receivedPayment'
>;

export const isEstimatedOrder = (order: OrderMetricFields) => {
  return order.analysisMode === 'estimate' ||
    order.estimatedAmount !== undefined ||
    order.estimatedWeight !== undefined;
};

export const hasEstimatedData = (order: OrderMetricFields) => {
  if (!isEstimatedOrder(order)) {
    return false;
  }

  return (order.estimatedAmount || 0) > 0 || (order.estimatedWeight || 0) > 0;
};

export const hasLegacyPaymentData = (order: OrderMetricFields) => {
  return (order.totalAmount || 0) > 0 || (order.receivedPayment || 0) > 0;
};

export const shouldShowPaymentTracking = (order: OrderMetricFields) => {
  return !isEstimatedOrder(order) && hasLegacyPaymentData(order);
};

export const formatMetricNumber = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
  }).format(value || 0);
};
