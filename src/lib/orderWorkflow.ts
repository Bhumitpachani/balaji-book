import type { Order } from "./firebaseService";

export type OrderStatus = Order["status"];
export type OrderType = Order["type"];

export const isPendingInquiry = (order: Pick<Order, "status" | "type">): boolean =>
  order.type === "Inquiry" && order.status === "Pending";

export const getNextOrderStatus = (
  currentStatus: OrderStatus,
  orderType: OrderType
): OrderStatus | null => {
  if (orderType === "Inquiry") {
    return null;
  }

  switch (currentStatus) {
    case "Pending":
      return "Running";
    case "Running":
      return "Done";
    case "Done":
      return "Delivered";
    default:
      return null;
  }
};
