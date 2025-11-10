import axios from 'axios';

interface ShiprocketAuth {
  token: string;
  expires_at: Date;
}

class ShiprocketService {
  private baseURL = 'https://apiv2.shiprocket.in/v1/external';
  private auth: ShiprocketAuth | null = null;

  private async authenticate(): Promise<string> {
    if (this.auth && this.auth.expires_at > new Date()) {
      return this.auth.token;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD
      });

      if (response.data.token) {
        this.auth = {
          token: response.data.token,
          expires_at: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days
        };
        return this.auth.token;
      }

      throw new Error('Authentication failed');
    } catch (error) {
      console.error('Shiprocket authentication error:', error);
      throw new Error('Failed to authenticate with Shiprocket');
    }
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any) {
    const token = await this.authenticate();
    
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Shiprocket API error:', error);
      throw error;
    }
  }

  async createOrder(orderData: {
    order_id: string;
    order_date: string;
    pickup_location: string;
    channel_id?: string;
    comment?: string;
    billing_customer_name: string;
    billing_last_name: string;
    billing_address: string;
    billing_address_2?: string;
    billing_city: string;
    billing_pincode: string;
    billing_state: string;
    billing_country: string;
    billing_email: string;
    billing_phone: string;
    shipping_is_billing: boolean;
    shipping_customer_name?: string;
    shipping_last_name?: string;
    shipping_address?: string;
    shipping_address_2?: string;
    shipping_city?: string;
    shipping_pincode?: string;
    shipping_state?: string;
    shipping_country?: string;
    shipping_email?: string;
    shipping_phone?: string;
    order_items: Array<{
      name: string;
      sku: string;
      units: number;
      selling_price: number;
      discount?: number;
      tax?: number;
      hsn?: number;
    }>;
    payment_method: string;
    shipping_charges?: number;
    giftwrap_charges?: number;
    transaction_charges?: number;
    total_discount?: number;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
  }) {
    return this.makeRequest('/orders/create/adhoc', 'POST', orderData);
  }

  async trackShipment(shipmentId: string) {
    return this.makeRequest(`/courier/track/shipment/${shipmentId}`);
  }

  async trackByAWB(awb: string) {
    return this.makeRequest(`/courier/track/awb/${awb}`);
  }

  async getShipmentDetails(shipmentId: string) {
    return this.makeRequest(`/orders/show/${shipmentId}`);
  }

  async generateAWB(shipmentId: string, courierId: number) {
    return this.makeRequest('/courier/assign/awb', 'POST', {
      shipment_id: shipmentId,
      courier_id: courierId
    });
  }

  async getServiceability(pickup_postcode: string, delivery_postcode: string, weight: number, cod: boolean = false) {
    return this.makeRequest('/courier/serviceability', 'GET', {
      pickup_postcode,
      delivery_postcode,
      weight,
      cod: cod ? 1 : 0
    });
  }

  async generateManifest(shipmentIds: string[]) {
    return this.makeRequest('/manifests/generate', 'POST', {
      shipment_id: shipmentIds
    });
  }

  async generateInvoice(orderIds: string[]) {
    return this.makeRequest('/orders/print/invoice', 'POST', {
      ids: orderIds
    });
  }

  async cancelOrder(orderId: string) {
    return this.makeRequest('/orders/cancel', 'POST', {
      ids: [orderId]
    });
  }

  async generateLabel(shipmentIds: string[]) {
    return this.makeRequest('/orders/print', 'POST', {
      ids: shipmentIds
    });
  }

  async cancelShipment(awbs: string[]) {
    return this.makeRequest('/orders/cancel/shipment/awbs', 'POST', {
      awbs
    });
  }

  async createReturn(returnData: {
    order_id: string;
    order_date: string;
    channel_id?: string;
    pickup_customer_name: string;
    pickup_last_name: string;
    pickup_address: string;
    pickup_address_2?: string;
    pickup_city: string;
    pickup_state: string;
    pickup_country: string;
    pickup_pincode: string;
    pickup_email: string;
    pickup_phone: string;
    drop_customer_name: string;
    drop_last_name: string;
    drop_address: string;
    drop_address_2?: string;
    drop_city: string;
    drop_state: string;
    drop_country: string;
    drop_pincode: string;
    drop_email: string;
    drop_phone: string;
    order_items: Array<{
      name: string;
      sku: string;
      units: number;
      selling_price: number;
      discount?: number;
      tax?: number;
      hsn?: number;
    }>;
    payment_method: string;
    sub_total: number;
    length: number;
    breadth: number;
    height: number;
    weight: number;
  }) {
    return this.makeRequest('/orders/return', 'POST', returnData);
  }

  async getReturnStatus(returnId: string) {
    return this.makeRequest(`/orders/return/${returnId}`);
  }

  async getPickupLocations() {
    return this.makeRequest('/settings/company/pickup');
  }

  async getAllCouriers() {
    return this.makeRequest('/couriers');
  }
}

export const shiprocketService = new ShiprocketService();