const API_BASE_URL = 'https://balaji-b.vercel.app/api';

export interface Client {
  _id: string;
  name: string;
  mobileNumber: string;
  address: string;
  city: string;
  createdAt?: string;
  updatedAt?: string;
}

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
  totalAmount: number;
  receivedPayment: number;
  clientId: string | Client;
  url?: string;
  publicId?: string;
  __v: number;
}

export interface CreateClientData {
  name: string;
  mobileNumber: string;
  address: string;
  city: string;
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
  totalAmount: number;
  receivedPayment: number;
  clientId: string;
  file?: File;
}

export interface PaymentData {
  amount: number;
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
        if (typeof value === 'number') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, value);
        }
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
        if (typeof value === 'number') {
          formData.append(key, value.toString());
        } else {
          formData.append(key, value);
        }
      }
    });

    return this.makeRequest(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      body: formData,
    });
  }

  // Client API methods
  async createClient(data: CreateClientData): Promise<Client> {
    return this.makeRequest(`${API_BASE_URL}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async getAllClients(): Promise<Client[]> {
    return this.makeRequest(`${API_BASE_URL}/clients`);
  }

  async getClientById(id: string): Promise<Client> {
    return this.makeRequest(`${API_BASE_URL}/clients/${id}`);
  }

  async updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
    return this.makeRequest(`${API_BASE_URL}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async deleteClient(id: string): Promise<{ message: string }> {
    return this.makeRequest(`${API_BASE_URL}/clients/${id}`, {
      method: 'DELETE',
    });
  }

  async getOrderById(id: string): Promise<Order> {
    return this.makeRequest(`${API_BASE_URL}/orders/${id}`);
  }

  async collectPayment(id: string, amount: number): Promise<Order> {
    return this.makeRequest(`${API_BASE_URL}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receivedPayment: amount }),
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