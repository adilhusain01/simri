"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shiprocketService = void 0;
const axios_1 = __importDefault(require("axios"));
class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
        this.auth = null;
    }
    async authenticate() {
        if (this.auth && this.auth.expires_at > new Date()) {
            return this.auth.token;
        }
        try {
            const response = await axios_1.default.post(`${this.baseURL}/auth/login`, {
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
        }
        catch (error) {
            console.error('Shiprocket authentication error:', error);
            throw new Error('Failed to authenticate with Shiprocket');
        }
    }
    async makeRequest(endpoint, method = 'GET', data) {
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
            const response = await (0, axios_1.default)(config);
            return response.data;
        }
        catch (error) {
            console.error('Shiprocket API error:', error);
            throw error;
        }
    }
    async createOrder(orderData) {
        return this.makeRequest('/orders/create/adhoc', 'POST', orderData);
    }
    async trackShipment(shipmentId) {
        return this.makeRequest(`/courier/track/shipment/${shipmentId}`);
    }
    async trackByAWB(awb) {
        return this.makeRequest(`/courier/track/awb/${awb}`);
    }
    async getShipmentDetails(shipmentId) {
        return this.makeRequest(`/orders/show/${shipmentId}`);
    }
    async generateAWB(shipmentId, courierId) {
        return this.makeRequest('/courier/assign/awb', 'POST', {
            shipment_id: shipmentId,
            courier_id: courierId
        });
    }
    async getServiceability(pickup_postcode, delivery_postcode, weight, cod = false) {
        return this.makeRequest('/courier/serviceability', 'GET', {
            pickup_postcode,
            delivery_postcode,
            weight,
            cod: cod ? 1 : 0
        });
    }
    async generateManifest(shipmentIds) {
        return this.makeRequest('/manifests/generate', 'POST', {
            shipment_id: shipmentIds
        });
    }
    async generateInvoice(orderIds) {
        return this.makeRequest('/orders/print/invoice', 'POST', {
            ids: orderIds
        });
    }
    async cancelOrder(orderId) {
        return this.makeRequest('/orders/cancel', 'POST', {
            ids: [orderId]
        });
    }
    async generateLabel(shipmentIds) {
        return this.makeRequest('/orders/print', 'POST', {
            ids: shipmentIds
        });
    }
    async cancelShipment(awbs) {
        return this.makeRequest('/orders/cancel/shipment/awbs', 'POST', {
            awbs
        });
    }
    async createReturn(returnData) {
        return this.makeRequest('/orders/return', 'POST', returnData);
    }
    async getReturnStatus(returnId) {
        return this.makeRequest(`/orders/return/${returnId}`);
    }
    async getPickupLocations() {
        return this.makeRequest('/settings/company/pickup');
    }
    async getAllCouriers() {
        return this.makeRequest('/couriers');
    }
}
exports.shiprocketService = new ShiprocketService();
//# sourceMappingURL=shiprocketService.js.map