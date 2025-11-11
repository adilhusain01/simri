import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  Menu,
  X,
  LogOut,
  Package,
  Settings,
} from 'lucide-react';
import { Button } from '../ui/button';
import simriLogo from '../../assets/simri-no-bg.png';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '../ui/sheet';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { useWishlistStore } from '../../stores/wishlistStore';

const Header: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cart } = useCartStore();
  const { wishlist } = useWishlistStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({
        to: '/search',
        search: {
          q: searchQuery,
          category: '',
          sortBy: 'relevance',
          minPrice: undefined,
          maxPrice: undefined,
          inStock: false,
          featured: false
        },
      });
      setIsSearchOpen(false);
      setSearchQuery('');
      setIsMobileMenuOpen(false); // Close mobile menu after search
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };


  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-royal-gold shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={simriLogo} alt="Simri" className="h-12 w-auto hover:opacity-90 transition-opacity" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href as "/"}
                className="text-royal-black hover:text-black font-medium transition-colors duration-200 relative group"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-royal-black group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="search"
                placeholder="Search for perfect gifts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-white border-gray-300 focus:border-gray-400 focus:ring-gray-400"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-royal-black hover:bg-gray-50"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Wishlist */}
            {isAuthenticated && (
              <Link to="/wishlist">
                <Button variant="ghost" size="sm" className="relative hover-lift text-royal-black hover:bg-gray-50">
                  <Heart className="h-5 w-5" />
                  {wishlist && wishlist.totalItems > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-royal-black text-white min-w-5 h-5 flex items-center justify-center text-xs">
                      {wishlist.totalItems}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* Shopping Cart */}
            <Link to="/cart">
              <Button variant="ghost" size="sm" className="relative hover-lift text-royal-black hover:bg-gray-50">
                <ShoppingBag className="h-5 w-5" />
                {cart && cart.item_count > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-royal-black text-white min-w-5 h-5 flex items-center justify-center text-xs">
                    {cart.item_count}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className='md:block hidden'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user?.avatar} alt={user?.name} />
                      <AvatarFallback className="bg-royal-black text-white">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center">
                      <Package className="mr-2 h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <a href="https://admin.simri.com" target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </a>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth/login" search={{ redirect: location.pathname }}>
                  <Button variant="ghost" size="sm" className="hover:bg-gray-50">
                    Sign In
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden text-royal-black hover:bg-gray-50">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-80 !bg-gradient-to-b !from-royal-gold !via-yellow-200 !to-yellow-100 border-l-0 shadow-2xl">
                <div className="flex flex-col space-y-6 p-6 h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-royal-black/20">
                    <h2 className="text-xl font-bold text-royal-black">Menu</h2>
                  </div>

                  {/* Mobile Search */}
                  <form onSubmit={handleSearch} className="relative">
                    <Input
                      type="search"
                      placeholder="Search for gifts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 bg-white border-gray-300 focus:border-royal-black focus:ring-royal-black rounded-lg shadow-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  </form>

                  {/* Mobile Navigation */}
                  <nav className="flex flex-col space-y-2">
                    {navigation.map((item) => (
                      <SheetClose key={item.name} asChild>
                        <Link
                          to={item.href as any}
                          className="text-royal-black hover:text-gray-800 font-medium transition-colors duration-200 py-3 px-4 rounded-lg hover:bg-white/80 border border-transparent hover:border-royal-black/20"
                        >
                          {item.name}
                        </Link>
                      </SheetClose>
                    ))}

                    {/* Additional Quick Links for Authenticated Users */}
                    {isAuthenticated && (
                      <>
                        <SheetClose asChild>
                          <Link
                            to="/profile"
                            className="text-royal-black hover:text-gray-800 font-medium transition-colors duration-200 py-3 px-4 rounded-lg hover:bg-white/80 border border-transparent hover:border-royal-black/20 flex items-center"
                          >
                            <User className="mr-3 h-4 w-4" />
                            Profile
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link
                            to="/orders"
                            className="text-royal-black hover:text-gray-800 font-medium transition-colors duration-200 py-3 px-4 rounded-lg hover:bg-white/80 border border-transparent hover:border-royal-black/20 flex items-center"
                          >
                            <Package className="mr-3 h-4 w-4" />
                            Orders
                          </Link>
                        </SheetClose>
                      </>
                    )}
                  </nav>

                  {/* Mobile User Actions */}
                  <div className="mt-auto pt-6 border-t border-royal-black/20">
                    {isAuthenticated ? (
                      <div className="flex flex-col space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-white/90 rounded-lg border border-royal-black/20 backdrop-blur-sm">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user?.avatar} alt={user?.name} />
                            <AvatarFallback className="bg-royal-black text-white text-sm">
                              {user?.name?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold text-royal-black text-sm">{user?.name}</p>
                            <p className="text-gray-600 text-xs truncate">{user?.email}</p>
                          </div>
                        </div>
                        <SheetClose asChild>
                          <Button
                            onClick={() => {
                              logout();
                              closeMobileMenu();
                            }}
                            variant="outline"
                            className="w-full border-royal-black text-royal-black hover:bg-royal-black hover:text-white transition-colors"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                          </Button>
                        </SheetClose>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3">
                        <SheetClose asChild>
                          <Link to="/auth/login" search={{ redirect: location.pathname }}>
                            <Button variant="outline" className="w-full border-royal-black text-royal-black hover:bg-royal-black hover:text-white transition-colors">
                              Sign In
                            </Button>
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link to="/auth/signup" search={{ redirect: location.pathname }}>
                            <Button className="btn-primary w-full shadow-lg">
                              <User className="mr-2 h-4 w-4" />
                              Get Started
                            </Button>
                          </Link>
                        </SheetClose>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
              onClick={() => setIsSearchOpen(false)}
            />

            {/* Search Modal */}
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="lg:hidden fixed top-20 left-4 right-4 bg-white rounded-lg shadow-xl border z-50 max-w-md mx-auto"
            >
              <div className="p-4">
                <form onSubmit={handleSearch} className="relative">
                  <Input
                    type="search"
                    placeholder="Search for perfect gifts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-12 py-3 text-base sm:text-lg bg-white border-gray-300 focus:border-royal-gold focus:ring-royal-gold rounded-lg"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setIsSearchOpen(false)}
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </form>

                {/* Quick Search Suggestions */}
                <div className="mt-3 text-xs text-gray-500">
                  <p>Try searching for: "gifts", "birthday", "anniversary"</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header> 
  );
};

export default Header;