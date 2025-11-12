import { useState, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, Search, User, LogOut, Settings, Menu, X, Package, Users, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { adminService, productService } from '@/services/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Search functionality
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return { products: [], orders: [], users: [] };

      const [products, orders, users] = await Promise.all([
        productService.getAll({ search: searchQuery, limit: 5 }),
        adminService.getOrders({ search: searchQuery, limit: 5 }),
        adminService.getUsers({ search: searchQuery, limit: 5 })
      ]);

      return {
        products: products.data?.products || [],
        orders: orders.data || [],
        users: users.data || []
      };
    },
    enabled: searchQuery.length > 2,
  });

  // Mock notifications - in real app, this would be from an API
  const notifications = [
    { id: 1, title: 'New order received', message: 'Order #ORD1762882997058867 from husainadil202@gmail.com', time: '2 minutes ago', unread: true },
    { id: 2, title: 'Low stock alert', message: 'Luxury Chocolate Box is running low (2 items left)', time: '1 hour ago', unread: true },
    { id: 3, title: 'Payment confirmed', message: 'Payment of ₹1,532.82 confirmed', time: '3 hours ago', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate({ to: '/login' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleProfileClick = () => {
    // Navigate to profile page when implemented
    console.log('Navigate to profile page');
  };

  const handleSettingsClick = () => {
    // Navigate to settings page when implemented
    console.log('Navigate to settings page');
  };

  const handleNotificationClick = (notificationId: number) => {
    // Mark notification as read and navigate to relevant page
    console.log('Handle notification click:', notificationId);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length > 2) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  const navigateToResult = (type: string, _id: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');

    switch (type) {
      case 'product':
        navigate({ to: '/dashboard/products' });
        break;
      case 'order':
        navigate({ to: '/dashboard/orders' });
        break;
      case 'user':
        navigate({ to: '/dashboard/customers' });
        break;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
              <img
                src="/src/assets/simri_black.png"
                alt="Simri"
                className="h-10 w-auto object-contain"
              />
          </div>

          {/* Search Bar - Hidden on mobile */}
          <div className="flex-1 max-w-md mx-8 hidden md:block" ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products, orders, customers..."
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />

              {/* Search Results Dropdown */}
              {isSearchOpen && searchResults && (
                <div className="absolute top-full mt-1 w-full bg-background border border-input rounded-lg shadow-lg max-h-96 overflow-y-auto z-10">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                  ) : (
                    <div className="p-2">
                      {/* Products */}
                      {searchResults.products.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Products</p>
                          {searchResults.products.map((product) => (
                            <div
                              key={product.id}
                              className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => navigateToResult('product', product.id)}
                            >
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground">₹{product.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Orders */}
                      {searchResults.orders.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Orders</p>
                          {searchResults.orders.map((order) => (
                            <div
                              key={order.id}
                              className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => navigateToResult('order', order.id)}
                            >
                              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">#{order.order_number}</p>
                                <p className="text-xs text-muted-foreground">₹{order.total_amount}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Users */}
                      {searchResults.users.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Customers</p>
                          {searchResults.users.map((user) => (
                            <div
                              key={user.id}
                              className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                              onClick={() => navigateToResult('user', user.id)}
                            >
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* No results */}
                      {searchResults.products.length === 0 && searchResults.orders.length === 0 && searchResults.users.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No results found for "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Mobile Search Button */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Search className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex-col items-start p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => handleNotificationClick(notification.id)}
                    >
                      <div className="flex w-full justify-between">
                        <p className="text-sm font-medium">{notification.title}</p>
                        {notification.unread && (
                          <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-center justify-center">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-sm font-medium">{user?.name || 'Admin'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'Admin'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    <p className="text-xs leading-none text-muted-foreground capitalize">Role: {user?.role || 'admin'}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed top-16 left-0 right-0 bg-background border-b shadow-lg p-4">
            {/* Mobile Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search products, orders, customers..."
                  className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate({ to: '/dashboard/products' }); setIsMobileMenuOpen(false); }}>
                <Package className="mr-2 h-4 w-4" />
                Products
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate({ to: '/dashboard/orders' }); setIsMobileMenuOpen(false); }}>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Orders
              </Button>
              <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate({ to: '/dashboard/customers' }); setIsMobileMenuOpen(false); }}>
                <Users className="mr-2 h-4 w-4" />
                Customers
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}