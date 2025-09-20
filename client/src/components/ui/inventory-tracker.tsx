import React, { useState, useEffect, useCallback } from 'react';
import { Package, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { inventoryService } from '../../services/api';
import { toast } from 'sonner';

interface InventoryTrackerProps {
  productId: string;
  initialStock?: number;
  onStockChange?: (stock: number) => void;
  className?: string;
}

export const InventoryTracker: React.FC<InventoryTrackerProps> = ({
  productId,
  initialStock,
  onStockChange,
  className = '',
}) => {
  const [stock, setStock] = useState<number>(initialStock ?? 0);
  const [isLoading, setIsLoading] = useState(!initialStock);
  const [, setLastUpdated] = useState<Date>(new Date());

  const fetchStock = useCallback(async () => {
    try {
      setIsLoading(true);
      const availableStock = await inventoryService.getAvailableStock(productId);
      setStock(availableStock);
      setLastUpdated(new Date());
      onStockChange?.(availableStock);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch stock information');
    } finally {
      setIsLoading(false);
    }
  }, [productId, onStockChange]);

  useEffect(() => {
    if (!initialStock) {
      fetchStock();
    }
  }, [fetchStock, initialStock]);

  const getStockStatus = () => {
    if (stock === 0) {
      return { status: 'out-of-stock', color: 'red', label: 'Out of Stock' };
    } else if (stock <= 5) {
      return { status: 'low-stock', color: 'yellow', label: 'Low Stock' };
    } else if (stock <= 10) {
      return { status: 'medium-stock', color: 'blue', label: 'Limited Stock' };
    } else {
      return { status: 'in-stock', color: 'green', label: 'In Stock' };
    }
  };

  const { status, color, label } = getStockStatus();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Stock Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="h-5 w-5 text-gray-600" />
          <span className="font-medium text-gray-900">
            {isLoading ? 'Loading...' : `${stock} in stock`}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={color === 'red' ? 'destructive' : color === 'yellow' ? 'secondary' : 'default'}
            className={
              color === 'green' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
              color === 'blue' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : ''
            }
          >
            {status === 'out-of-stock' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {status === 'low-stock' && <AlertTriangle className="h-3 w-3 mr-1" />}
            {status === 'in-stock' && <Check className="h-3 w-3 mr-1" />}
            {label}
          </Badge>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStock}
            disabled={isLoading}
            className="p-1 h-auto"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>


      {/* Last Updated */}
      {/* <p className="text-xs text-gray-500">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </p> */}
    </div>
  );
};

// Stock Status Badge Component
interface StockStatusProps {
  stock: number;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StockStatus: React.FC<StockStatusProps> = ({
  stock,
  showCount = false,
  size = 'md',
  className = '',
}) => {
  const getStockConfig = () => {
    if (stock === 0) {
      return { 
        variant: 'destructive' as const, 
        label: 'Out of Stock',
        icon: AlertTriangle 
      };
    } else if (stock <= 5) {
      return { 
        variant: 'secondary' as const, 
        label: 'Low Stock',
        icon: AlertTriangle 
      };
    } else if (stock <= 10) {
      return { 
        variant: 'default' as const, 
        label: 'Limited Stock',
        icon: Package,
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
      };
    } else {
      return { 
        variant: 'default' as const, 
        label: 'In Stock',
        icon: Check,
        className: 'bg-green-100 text-green-800 hover:bg-green-100'
      };
    }
  };

  const config = getStockConfig();
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  
  return (
    <Badge 
      variant={config.variant}
      className={`${config.className || ''} ${className}`}
    >
      <Icon className={`${iconSize} mr-1`} />
      {showCount ? `${stock} ${config.label}` : config.label}
    </Badge>
  );
};

// Bulk Stock Display Component
interface BulkStockDisplayProps {
  items: Array<{
    productId: string;
    productName: string;
    stock: number;
  }>;
  onRefresh?: () => void;
  className?: string;
}

export const BulkStockDisplay: React.FC<BulkStockDisplayProps> = ({
  items,
  onRefresh,
  className = '',
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('Stock information updated');
    } catch (error) {
      toast.error('Failed to refresh stock information');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getTotalStock = () => items.reduce((sum, item) => sum + item.stock, 0);
  const getOutOfStockCount = () => items.filter(item => item.stock === 0).length;
  const getLowStockCount = () => items.filter(item => item.stock > 0 && item.stock <= 5).length;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Stock Overview</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{getTotalStock()}</div>
            <div className="text-sm text-gray-600">Total Stock</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{getOutOfStockCount()}</div>
            <div className="text-sm text-red-600">Out of Stock</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="text-2xl font-bold text-yellow-600">{getLowStockCount()}</div>
            <div className="text-sm text-yellow-600">Low Stock</div>
          </div>
        </div>

        {/* Item List */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.productName}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">
                  {item.stock}
                </span>
                <StockStatus stock={item.stock} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};