interface TaxBreakdown {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
}
interface TaxCalculation {
    subtotal: number;
    taxBreakdown: TaxBreakdown;
    taxTotal: number;
    grandTotal: number;
    taxRate: number;
}
interface Address {
    state: string;
    country: string;
}
declare class TaxService {
    private readonly GST_RATES;
    private readonly STATE_CODES;
    private readonly COMPANY_STATE;
    /**
     * Calculate GST for a purchase
     * @param subtotal - Total amount before tax
     * @param billingAddress - Customer's billing address
     * @param category - Product category (optional, defaults to 'gifts')
     * @returns Tax calculation breakdown
     */
    calculateGST(subtotal: number, billingAddress: Address, category?: string): TaxCalculation;
    /**
     * Calculate tax for multiple items with different categories
     */
    calculateTaxForItems(items: Array<{
        amount: number;
        category?: string;
    }>, billingAddress: Address): TaxCalculation;
    /**
     * Check if transaction is interstate
     */
    private isInterstateTransaction;
    /**
     * Get GST rate for a product category
     */
    getGSTRateForCategory(category: string): number;
    /**
     * Get all available GST rates
     */
    getAvailableGSTRates(): typeof this.GST_RATES;
    /**
     * Validate Indian state name
     */
    isValidIndianState(stateName: string): boolean;
    /**
     * Get state code from state name
     */
    getStateCode(stateName: string): string | null;
    /**
     * Generate tax invoice data
     */
    generateTaxInvoiceData(calculation: TaxCalculation, orderDetails: any): {
        invoice: {
            type: string;
            gstType: string;
            taxBreakdown: TaxBreakdown;
            subtotal: number;
            taxTotal: number;
            grandTotal: number;
        };
        compliance: {
            hsnCode: string;
            placeOfSupply: any;
            taxRate: number;
            isReverseCharge: boolean;
            exemptionReason: null;
        };
        business: {
            gstin: string;
            state: string;
            address: string;
        };
    };
    /**
     * Calculate reverse tax (for returns/refunds)
     */
    calculateReverseGST(amountIncludingTax: number, billingAddress: Address, category?: string): {
        amountBeforeTax: number;
        taxAmount: number;
    };
    /**
     * Check if order qualifies for tax exemption
     */
    checkTaxExemption(orderAmount: number, category: string): {
        exempt: boolean;
        reason?: string;
    };
}
export declare const taxService: TaxService;
export {};
