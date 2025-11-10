"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taxService = void 0;
class TaxService {
    constructor() {
        // GST rates for different product categories
        this.GST_RATES = {
            default: 18,
            essential: 5,
            luxury: 28,
            books: 0,
            food: 5,
            electronics: 18,
            clothing: 12,
            gifts: 18
        };
        // State codes for GST calculation
        this.STATE_CODES = {
            'Andhra Pradesh': 'AP',
            'Arunachal Pradesh': 'AR',
            'Assam': 'AS',
            'Bihar': 'BR',
            'Chhattisgarh': 'CG',
            'Goa': 'GA',
            'Gujarat': 'GJ',
            'Haryana': 'HR',
            'Himachal Pradesh': 'HP',
            'Jharkhand': 'JH',
            'Karnataka': 'KA',
            'Kerala': 'KL',
            'Madhya Pradesh': 'MP',
            'Maharashtra': 'MH',
            'Manipur': 'MN',
            'Meghalaya': 'ML',
            'Mizoram': 'MZ',
            'Nagaland': 'NL',
            'Odisha': 'OR',
            'Punjab': 'PB',
            'Rajasthan': 'RJ',
            'Sikkim': 'SK',
            'Tamil Nadu': 'TN',
            'Telangana': 'TS',
            'Tripura': 'TR',
            'Uttar Pradesh': 'UP',
            'Uttarakhand': 'UK',
            'West Bengal': 'WB',
            'Delhi': 'DL',
            'Jammu and Kashmir': 'JK',
            'Ladakh': 'LA',
            'Chandigarh': 'CH',
            'Dadra and Nagar Haveli and Daman and Diu': 'DN',
            'Lakshadweep': 'LD',
            'Puducherry': 'PY',
            'Andaman and Nicobar Islands': 'AN'
        };
        // Company's state (where business is registered)
        this.COMPANY_STATE = 'Maharashtra'; // Simri is based in Maharashtra
    }
    /**
     * Calculate GST for a purchase
     * @param subtotal - Total amount before tax
     * @param billingAddress - Customer's billing address
     * @param category - Product category (optional, defaults to 'gifts')
     * @returns Tax calculation breakdown
     */
    calculateGST(subtotal, billingAddress, category = 'gifts') {
        // Get GST rate for the category
        const gstRate = this.GST_RATES[category] || this.GST_RATES.default;
        // Check if it's interstate or intrastate transaction
        const isInterstate = this.isInterstateTransaction(billingAddress.state);
        let taxBreakdown;
        if (isInterstate) {
            // Interstate transaction - IGST applies
            const igst = (subtotal * gstRate) / 100;
            taxBreakdown = {
                cgst: 0,
                sgst: 0,
                igst: Math.round(igst * 100) / 100,
                total: Math.round(igst * 100) / 100
            };
        }
        else {
            // Intrastate transaction - CGST + SGST applies
            const cgst = (subtotal * (gstRate / 2)) / 100;
            const sgst = (subtotal * (gstRate / 2)) / 100;
            taxBreakdown = {
                cgst: Math.round(cgst * 100) / 100,
                sgst: Math.round(sgst * 100) / 100,
                igst: 0,
                total: Math.round((cgst + sgst) * 100) / 100
            };
        }
        return {
            subtotal: Math.round(subtotal * 100) / 100,
            taxBreakdown,
            taxTotal: taxBreakdown.total,
            grandTotal: Math.round((subtotal + taxBreakdown.total) * 100) / 100,
            taxRate: gstRate
        };
    }
    /**
     * Calculate tax for multiple items with different categories
     */
    calculateTaxForItems(items, billingAddress) {
        let totalSubtotal = 0;
        let totalCGST = 0;
        let totalSGST = 0;
        let totalIGST = 0;
        items.forEach(item => {
            const calculation = this.calculateGST(item.amount, billingAddress, item.category);
            totalSubtotal += calculation.subtotal;
            totalCGST += calculation.taxBreakdown.cgst;
            totalSGST += calculation.taxBreakdown.sgst;
            totalIGST += calculation.taxBreakdown.igst;
        });
        const taxBreakdown = {
            cgst: Math.round(totalCGST * 100) / 100,
            sgst: Math.round(totalSGST * 100) / 100,
            igst: Math.round(totalIGST * 100) / 100,
            total: Math.round((totalCGST + totalSGST + totalIGST) * 100) / 100
        };
        return {
            subtotal: Math.round(totalSubtotal * 100) / 100,
            taxBreakdown,
            taxTotal: taxBreakdown.total,
            grandTotal: Math.round((totalSubtotal + taxBreakdown.total) * 100) / 100,
            taxRate: 0 // Mixed rates
        };
    }
    /**
     * Check if transaction is interstate
     */
    isInterstateTransaction(customerState) {
        return customerState !== this.COMPANY_STATE;
    }
    /**
     * Get GST rate for a product category
     */
    getGSTRateForCategory(category) {
        return this.GST_RATES[category] || this.GST_RATES.default;
    }
    /**
     * Get all available GST rates
     */
    getAvailableGSTRates() {
        return { ...this.GST_RATES };
    }
    /**
     * Validate Indian state name
     */
    isValidIndianState(stateName) {
        return Object.keys(this.STATE_CODES).includes(stateName);
    }
    /**
     * Get state code from state name
     */
    getStateCode(stateName) {
        return this.STATE_CODES[stateName] || null;
    }
    /**
     * Generate tax invoice data
     */
    generateTaxInvoiceData(calculation, orderDetails) {
        const isInterstate = this.isInterstateTransaction(orderDetails.billingAddress.state);
        return {
            invoice: {
                type: isInterstate ? 'INTERSTATE' : 'INTRASTATE',
                gstType: isInterstate ? 'IGST' : 'CGST + SGST',
                taxBreakdown: calculation.taxBreakdown,
                subtotal: calculation.subtotal,
                taxTotal: calculation.taxTotal,
                grandTotal: calculation.grandTotal
            },
            compliance: {
                hsnCode: '9505', // HSN code for gift items
                placeOfSupply: orderDetails.billingAddress.state,
                taxRate: calculation.taxRate,
                isReverseCharge: false,
                exemptionReason: null
            },
            business: {
                gstin: process.env.COMPANY_GSTIN || 'DUMMY1234567890Z',
                state: this.COMPANY_STATE,
                address: process.env.COMPANY_ADDRESS || 'Business Address'
            }
        };
    }
    /**
     * Calculate reverse tax (for returns/refunds)
     */
    calculateReverseGST(amountIncludingTax, billingAddress, category = 'gifts') {
        const gstRate = this.GST_RATES[category] || this.GST_RATES.default;
        // Calculate amount before tax: Amount = Total / (1 + (GST Rate / 100))
        const amountBeforeTax = amountIncludingTax / (1 + (gstRate / 100));
        const taxAmount = amountIncludingTax - amountBeforeTax;
        return {
            amountBeforeTax: Math.round(amountBeforeTax * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100
        };
    }
    /**
     * Check if order qualifies for tax exemption
     */
    checkTaxExemption(orderAmount, category) {
        // Small trader exemption (simplified)
        if (orderAmount < 500) {
            return {
                exempt: true,
                reason: 'Small order exemption'
            };
        }
        // Books are tax-free
        if (category === 'books') {
            return {
                exempt: true,
                reason: 'Educational material exemption'
            };
        }
        return { exempt: false };
    }
}
exports.taxService = new TaxService();
//# sourceMappingURL=taxService.js.map