import { Link, useLocation } from '@tanstack/react-router';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Tags, 
  Ticket, 
  Mail, 
  BarChart3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Products',
    href: '/dashboard/products',
    icon: Package,
  },
  {
    label: 'Orders',
    href: '/dashboard/orders',
    icon: ShoppingCart,
    badge: '12',
  },
  {
    label: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    label: 'Categories',
    href: '/dashboard/categories',
    icon: Tags,
  },
  {
    label: 'Coupons',
    href: '/dashboard/coupons',
    icon: Ticket,
  },
  {
    label: 'Newsletter',
    href: '/dashboard/newsletter',
    icon: Mail,
  },
  {
    label: 'Analytics',
    href: '/dashboard/analytics',
    icon: BarChart3,
  },
];

export function Sidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={cn(
      "relative flex flex-col border-r bg-background transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background shadow-md"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      {/* Sidebar Content */}
      <div className="flex flex-col h-full">
        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground",
                  isCollapsed && "justify-center space-x-0"
                )}
              >
                <Icon className={cn("h-5 w-5", isCollapsed && "h-6 w-6")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t p-4">
            <div className="text-xs text-muted-foreground">
              <p>© 2024 Simri</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}