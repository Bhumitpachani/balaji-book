import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query,
  where,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from './firebase';

export interface Client {
  id: string;
  name: string;
  mobileNumber: string;
  address: string;
  city: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Order {
  id: string;
  orderName: string;
  number: string;
  work: string;
  status: 'Pending' | 'Running' | 'Delivered' | 'Done';
  addDate: string;
  deliveryDate: string;
  type: 'Inquiry' | 'Confirm';
  paymentStatus: 'Paid' | 'Unpaid';
  totalAmount: number;
  receivedPayment: number;
  clientId: string;
  clientName?: string;
  clientMobileNumber?: string;
  clientAddress?: string;
  clientCity?: string;
  imageUrls?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateClientData {
  name: string;
  mobileNumber: string;
  address: string;
  city: string;
}

export interface CreateOrderData {
  orderName: string;
  work: string;
  status: string;
  addDate: string;
  deliveryDate: string;
  type: string;
  paymentStatus: string;
  totalAmount: number;
  receivedPayment: number;
  clientId: string;
  clientName: string;
  clientMobileNumber: string;
  clientAddress?: string;
  clientCity?: string;
  files?: File[];
}

class FirebaseService {
  // Client methods
  async createClient(data: CreateClientData): Promise<Client> {
    const clientData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'clients'), clientData);
    return {
      id: docRef.id,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getAllClients(): Promise<Client[]> {
    const querySnapshot = await getDocs(collection(db, 'clients'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Client[];
  }

  async getClientById(id: string): Promise<{ client: Client; orders: Order[] }> {
    const clientDoc = await getDoc(doc(db, 'clients', id));
    
    if (!clientDoc.exists()) {
      throw new Error('Client not found');
    }

    const client = {
      id: clientDoc.id,
      ...clientDoc.data(),
      createdAt: clientDoc.data().createdAt?.toDate(),
      updatedAt: clientDoc.data().updatedAt?.toDate()
    } as Client;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('clientId', '==', id)
    );
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Order[];

    return { client, orders };
  }

  async updateClient(id: string, data: Partial<CreateClientData>): Promise<Client> {
    const clientRef = doc(db, 'clients', id);
    await updateDoc(clientRef, {
      ...data,
      updatedAt: Timestamp.now()
    });

    const updatedDoc = await getDoc(clientRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate()
    } as Client;
  }

  async deleteClient(id: string): Promise<{ message: string }> {
    await deleteDoc(doc(db, 'clients', id));
    return { message: 'Client deleted successfully' };
  }

  // Order methods
  async createOrder(data: CreateOrderData): Promise<Order> {
    const imageUrls: string[] = [];
    
    // Upload images if provided
    if (data.files && data.files.length > 0) {
      for (const file of data.files) {
        const timestamp = Date.now();
        const fileName = `orders/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        imageUrls.push(downloadURL);
      }
    }

    // Get next sequential order number
    const nextOrderNumber = await this.getNextOrderNumber();

    const orderData = {
      orderName: data.orderName,
      number: nextOrderNumber.nextNumber.toString(),
      work: data.work,
      status: data.status,
      addDate: data.addDate,
      deliveryDate: data.deliveryDate,
      type: data.type,
      paymentStatus: data.paymentStatus,
      totalAmount: data.totalAmount,
      receivedPayment: data.receivedPayment,
      clientId: data.clientId,
      clientName: data.clientName,
      clientMobileNumber: data.clientMobileNumber,
      clientAddress: data.clientAddress,
      clientCity: data.clientCity,
      imageUrls,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'orders'), orderData);
    
    return {
      id: docRef.id,
      ...orderData,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Order;
  }

  async updateOrder(id: string, data: Partial<CreateOrderData>): Promise<Order> {
    const orderRef = doc(db, 'orders', id);
    const updateData: any = { ...data, updatedAt: Timestamp.now() };
    
    // Handle image uploads if files are provided
    if (data.files && data.files.length > 0) {
      const imageUrls: string[] = [];
      
      for (const file of data.files) {
        const timestamp = Date.now();
        const fileName = `orders/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        imageUrls.push(downloadURL);
      }
      
      // Get existing images
      const existingOrder = await getDoc(orderRef);
      const existingImages = existingOrder.data()?.imageUrls || [];
      
      updateData.imageUrls = [...existingImages, ...imageUrls];
    }
    
    // Remove files property before updating
    delete updateData.files;
    
    await updateDoc(orderRef, updateData);

    const updatedDoc = await getDoc(orderRef);
    return {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate()
    } as Order;
  }

  async getOrderById(id: string): Promise<Order> {
    const orderDoc = await getDoc(doc(db, 'orders', id));
    
    if (!orderDoc.exists()) {
      throw new Error('Order not found');
    }

    return {
      id: orderDoc.id,
      ...orderDoc.data(),
      createdAt: orderDoc.data().createdAt?.toDate(),
      updatedAt: orderDoc.data().updatedAt?.toDate()
    } as Order;
  }

  async getAllOrders(): Promise<Order[]> {
    const querySnapshot = await getDocs(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Order[];
  }

  async deleteOrder(id: string): Promise<{ message: string }> {
    // Get order to delete associated images
    const orderDoc = await getDoc(doc(db, 'orders', id));
    if (orderDoc.exists()) {
      const imageUrls = orderDoc.data().imageUrls || [];
      
      // Delete images from storage
      for (const url of imageUrls) {
        try {
          const imageRef = ref(storage, url);
          await deleteObject(imageRef);
        } catch (error) {
          console.error('Error deleting image:', error);
        }
      }
    }
    
    await deleteDoc(doc(db, 'orders', id));
    return { message: 'Order deleted successfully' };
  }

  async collectPayment(id: string, amount: number): Promise<Order> {
    const orderRef = doc(db, 'orders', id);
    await updateDoc(orderRef, {
      receivedPayment: amount,
      updatedAt: Timestamp.now()
    });

    return this.getOrderById(id);
  }

  async searchOrders(params: {
    name?: string;
    number?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Order[]> {
    let ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(ordersQuery);
    let orders = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    })) as Order[];

    // Client-side filtering
    if (params.name) {
      orders = orders.filter(order => 
        order.orderName.toLowerCase().includes(params.name!.toLowerCase())
      );
    }

    if (params.number) {
      orders = orders.filter(order => 
        order.number.includes(params.number!)
      );
    }

    if (params.fromDate) {
      orders = orders.filter(order => 
        new Date(order.addDate) >= new Date(params.fromDate!)
      );
    }

    if (params.toDate) {
      orders = orders.filter(order => 
        new Date(order.addDate) <= new Date(params.toDate!)
      );
    }

    return orders;
  }

  async getNextOrderNumber(): Promise<{ nextNumber: number }> {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      let maxNumber = 0;
      
      ordersSnapshot.docs.forEach(doc => {
        const orderNumber = parseInt(doc.data().number);
        // Only consider valid sequential numbers (less than 1 million)
        // Ignore timestamp-based numbers (typically 13 digits)
        if (!isNaN(orderNumber) && orderNumber > maxNumber && orderNumber < 1000000) {
          maxNumber = orderNumber;
        }
      });
      
      return { nextNumber: maxNumber + 1 };
    } catch (error) {
      console.error('Error getting next order number:', error);
      return { nextNumber: 1 };
    }
  }

  // Migration function to fix old timestamp-based order numbers
  async migrateOldOrderNumbers(): Promise<void> {
    try {
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersToUpdate: Array<{id: string, currentNumber: string}> = [];
      
      // Find orders with timestamp-based numbers
      ordersSnapshot.docs.forEach(doc => {
        const orderNumber = doc.data().number;
        const numValue = parseInt(orderNumber);
        
        // If number is a timestamp (more than 6 digits), mark for update
        if (!isNaN(numValue) && numValue > 999999) {
          ordersToUpdate.push({
            id: doc.id,
            currentNumber: orderNumber
          });
        }
      });

      if (ordersToUpdate.length === 0) {
        console.log('No orders need migration');
        return;
      }

      // Get the highest valid sequential number
      let nextSequential = 0;
      ordersSnapshot.docs.forEach(doc => {
        const orderNumber = parseInt(doc.data().number);
        if (!isNaN(orderNumber) && orderNumber < 1000000 && orderNumber > nextSequential) {
          nextSequential = orderNumber;
        }
      });

      // Update orders with proper sequential numbers
      for (const order of ordersToUpdate) {
        nextSequential++;
        const orderRef = doc(db, 'orders', order.id);
        await updateDoc(orderRef, {
          number: nextSequential.toString(),
          updatedAt: Timestamp.now()
        });
        console.log(`Updated order ${order.id} from ${order.currentNumber} to ${nextSequential}`);
      }

      console.log(`Successfully migrated ${ordersToUpdate.length} orders`);
    } catch (error) {
      console.error('Error migrating order numbers:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
