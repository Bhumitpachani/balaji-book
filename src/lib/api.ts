const API_BASE_URL = 'https://balaji-b.vercel.app/api';

export interface Order {
  _id: string;
  orderName: string;
  number: string;
  work: string;
  status: 'Pending' | 'Running' | 'Done';
  addDate: string;
  deliveryDate: string;
  type: 'Inquiry' | 'Confirm';
  paymentStatus: 'Paid' | 'Unpaid';
  url?: string;
  publicId?: string;
  __v: number;
}

export interface CreateOrderData {
  orderName: string;
  number: string;
  work: string;
  status: string;
  addDate: string;
  deliveryDate: string;
  type: string;
  paymentStatus: string;
  file?: File;
}

export interface SearchParams {
  name?: string;
  number?: string;
  fromDate?: string;
  toDate?: string;
}

class ApiService {
  private async makeRequest(url: string, options: RequestInit = {}) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async createOrder(data: CreateOrderData): Promise<Order> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });

    return this.makeRequest(`${API_BASE_URL}/orders`, {
      method: 'POST',
      body: formData,
    });
  }

  async updateOrder(id: string, data: Partial<CreateOrderData>): Promise<Order> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, value);
      }
    });

    return this.makeRequest(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  async deleteOrder(id: string): Promise<{ message: string }> {
    return this.makeRequest(`${API_BASE_URL}/orders/${id}`, {
      method: 'DELETE',
    });
  }

  async searchOrders(params: SearchParams): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value);
      }
    });

    const url = `${API_BASE_URL}/orders/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest(url);
  }

  async getAllOrders(): Promise<Order[]> {
    return this.searchOrders({});
  }
}

export const apiService = new ApiService();