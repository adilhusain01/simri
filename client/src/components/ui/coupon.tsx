import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Check, X, AlertCircle, Gift, Percent, DollarSign } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { couponService } from '../../services/api';
import type { Coupon } from '../../types';
import { toast } from 'sonner';

interface CouponValidationProps {
  orderAmount: number;
  onCouponApplied?: (coupon: Coupon) => void;
  onCouponRemoved?: () => void;
  appliedCoupon?: Coupon | null;
  className?: string;
}

export const CouponValidation: React.FC<CouponValidationProps> = ({
  orderAmount,
  onCouponApplied,
  onCouponRemoved,
  appliedCoupon,
  className = '',
}) => {
  const [couponCode, setCouponCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [bestCoupon, setBestCoupon] = useState<Coupon | null>(null);
  const [isFetchingBest, setIsFetchingBest] = useState(false);

  const validateCoupon = useCallback(async (code: string) => {
    if (!code || !code.trim()) return;

    setIsValidating(true);
    try {
      const response = await couponService.validateCoupon(code.trim().toUpperCase(), orderAmount);
      console.log('Validated coupon:', response); // Debug log
      const couponWithDiscount = {
        ...response.coupon,
        discount_amount: response.discount_amount,
        final_amount: response.final_amount
      };
      onCouponApplied?.(couponWithDiscount);
      toast.success(`Coupon "${response.coupon.code}" applied! You saved ₹${response.discount_amount?.toFixed(2) || '0.00'}`);
      setCouponCode('');
    } catch (error: any) {
      // Error toast will be handled by axios interceptor
      console.error('Coupon validation failed:', error.message);
    } finally {
      setIsValidating(false);
    }
  }, [orderAmount, onCouponApplied]);

  const removeCoupon = useCallback(() => {
    onCouponRemoved?.();
    toast.success('Coupon removed');
  }, [onCouponRemoved]);

  const fetchBestCoupon = useCallback(async () => {
    if (appliedCoupon || orderAmount <= 0) return;

    setIsFetchingBest(true);
    try {
      const response = await couponService.getBestCoupon(orderAmount);
      console.log('Best coupon response:', response);
      
      if (response?.coupon) {
        const bestCouponWithDiscount = {
          ...response.coupon,
          discount_amount: response.discount_amount,
          savings_message: response.savings_message
        };
        setBestCoupon(bestCouponWithDiscount);
      } else {
        setBestCoupon(null);
      }
    } catch (error) {
      // Silently fail for best coupon suggestions
    } finally {
      setIsFetchingBest(false);
    }
  }, [orderAmount, appliedCoupon]);

  const applyBestCoupon = useCallback(async () => {
    if (!bestCoupon || !bestCoupon.code) return;
    await validateCoupon(bestCoupon.code);
    setBestCoupon(null);
  }, [bestCoupon, validateCoupon]);

  useEffect(() => {
    fetchBestCoupon();
  }, [fetchBestCoupon]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Applied Coupon Display */}
      {appliedCoupon && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  {appliedCoupon.code}
                </p>
                <p className="text-sm text-green-700">
                  {appliedCoupon.type === 'percentage' 
                    ? `${appliedCoupon.value}% off` 
                    : `₹${appliedCoupon.value} off`
                  }
                </p>
                <p className="text-xs text-green-600">
                  You saved ₹{appliedCoupon.discount_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeCoupon}
              className="text-green-700 hover:text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Best Coupon Suggestion */}
      {!appliedCoupon && bestCoupon && bestCoupon.code && !isFetchingBest && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-royal-black">
                Best Available Coupon
              </p>
              <p className="text-sm text-gray-600">
                {bestCoupon.savings_message || `Use "${bestCoupon.code}" to save ₹${bestCoupon.discount_amount?.toFixed(2) || '0.00'}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={applyBestCoupon}
              className="border-royal-gold text-royal-gold hover:bg-gray-50"
            >
              Apply
            </Button>
          </div>
        </div>
      )}

      {/* Coupon Input */}
      {!appliedCoupon && (
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Enter coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="pl-10"
            />
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Button
            onClick={() => validateCoupon(couponCode)}
            disabled={!couponCode.trim() || isValidating}
            className="btn-primary"
          >
            {isValidating ? 'Validating...' : 'Apply'}
          </Button>
        </div>
      )}
    </div>
  );
};

// Active Coupons Display Component
interface ActiveCouponsProps {
  orderAmount?: number;
  onCouponSelect?: (coupon: Coupon) => void;
  showOnlyApplicable?: boolean;
  className?: string;
}

export const ActiveCoupons: React.FC<ActiveCouponsProps> = ({
  orderAmount = 0,
  onCouponSelect,
  showOnlyApplicable = false,
  className = '',
}) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCoupons = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeCoupons = await couponService.getActiveCoupons();
      
      let filteredCoupons = activeCoupons;
      if (showOnlyApplicable && orderAmount > 0) {
        filteredCoupons = activeCoupons.filter(coupon => 
          orderAmount >= (coupon.minimum_order_amount || 0)
        );
      }
      
      setCoupons(filteredCoupons);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  }, [orderAmount, showOnlyApplicable]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const getCouponIcon = (type: string) => {
    switch (type) {
      case 'percentage':
        return Percent;
      case 'fixed':
        return DollarSign;
      default:
        return Gift;
    }
  };

  const getCouponColor = (type: string) => {
    switch (type) {
      case 'percentage':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fixed':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-royal-gold text-royal-black border-royal-gold';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <div className="animate-spin mx-auto h-8 w-8 border-2 border-royal-gold border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading available coupons...</p>
        </CardContent>
      </Card>
    );
  }

  if (coupons.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {showOnlyApplicable 
              ? 'No coupons available for your current order amount'
              : 'No active coupons available'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Gift className="h-5 w-5" />
          <span>Available Coupons</span>
          <Badge variant="secondary">{coupons.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const Icon = getCouponIcon(coupon.type);
            const isApplicable = orderAmount >= (coupon.minimum_order_amount || 0);
            
            return (
              <div
                key={coupon.code}
                className={`border rounded-lg p-4 transition-colors ${
                  isApplicable 
                    ? 'border-royal-gold bg-white hover:bg-gray-50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50'
                }`}
                onClick={() => isApplicable && onCouponSelect?.(coupon)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getCouponColor(coupon.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-royal-black">
                        {coupon.code}
                      </p>
                      <p className="text-sm text-gray-600">
                        {coupon.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        Min order: ₹${coupon.minimum_order_amount || 0}
                        {coupon.maximum_discount_amount && (
                          <span className="ml-2">
                            Max discount: ₹${coupon.maximum_discount_amount}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-royal-gold">
                      {coupon.type === 'percentage' 
                        ? `₹{coupon.value}% OFF`
                        : `₹${coupon.value} OFF`
                      }
                    </div>
                    {!isApplicable && (
                      <Badge variant="secondary" className="mt-1">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not applicable
                      </Badge>
                    )}
                    {isApplicable && onCouponSelect && (
                      <Badge className="mt-1 bg-royal-gold text-royal-black hover:bg-yellow-500">
                        Click to apply
                      </Badge>
                    )}
                  </div>
                </div>
                
                {coupon.valid_until && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Expires: {new Date(coupon.valid_until).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Coupon Display Component (for showing individual coupon details)
interface CouponDisplayProps {
  coupon: Coupon;
  orderAmount?: number;
  showApplyButton?: boolean;
  onApply?: (coupon: Coupon) => void;
  className?: string;
}

export const CouponDisplay: React.FC<CouponDisplayProps> = ({
  coupon,
  orderAmount = 0,
  showApplyButton = false,
  onApply,
  className = '',
}) => {
  const Icon = coupon.type === 'percentage' ? Percent : DollarSign;
  const isApplicable = orderAmount >= (coupon.minimum_order_amount || 0);

  return (
    <Card className={`${className} ${isApplicable ? 'border-royal-gold' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-full ${
              coupon.type === 'percentage' 
                ? 'bg-blue-100' 
                : 'bg-green-100'
            }`}>
              <Icon className={`h-6 w-6 ${
                coupon.type === 'percentage' 
                  ? 'text-blue-600' 
                  : 'text-green-600'
              }`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-royal-black">
                {coupon.code}
              </h3>
              <p className="text-gray-600">
                {coupon.description}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Min: ₹${coupon.minimum_order_amount || 0}</span>
                {coupon.maximum_discount_amount && (
                  <span>Max discount: ₹${coupon.maximum_discount_amount}</span>
                )}
                {coupon.valid_until && (
                  <span>
                    Expires: {new Date(coupon.valid_until).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-royal-gold">
              {coupon.type === 'percentage' 
                ? `${coupon.value}%`
                : `₹${coupon.value}`
              } OFF
            </div>
            {showApplyButton && (
              <Button
                className="mt-2"
                disabled={!isApplicable}
                onClick={() => onApply?.(coupon)}
                variant={isApplicable ? 'default' : 'secondary'}
              >
                {isApplicable ? 'Apply Coupon' : 'Not Applicable'}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};