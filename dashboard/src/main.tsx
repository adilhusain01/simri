import { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { Toaster } from 'sonner'

// Layout components
import Dashboard from './pages/Dashboard'
import Login from './pages/auth/Login'
import Layout from './components/layout/Layout'

// Page components
import Products from './pages/Products'
import Orders from './pages/Orders'
import Customers from './pages/Customers'
import Categories from './pages/Categories'
import Coupons from './pages/Coupons'
import Newsletter from './pages/Newsletter'
import Analytics from './pages/Analytics'
import Payments from './pages/Payments'
import Shiprocket from './pages/Shiprocket'
import Reviews from './pages/Reviews'

import { TanStackQueryProvider } from './integrations/tanstack-query/root-provider'
import { useAuthStore } from './stores/authStore'

import './styles/globals.css'
import reportWebVitals from './reportWebVitals'

// Auth guard component
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore()

  useEffect(() => {
    // Only check auth if we're not already authenticated
    if (!isAuthenticated && !isLoading) {
      console.log('🛡️ AuthGuard: Not authenticated, checking auth');
      checkAuth()
    }
  }, [checkAuth, isAuthenticated, isLoading])

  useEffect(() => {
    console.log('🛡️ AuthGuard: Auth state changed:', { isAuthenticated, isLoading, userRole: user?.role });
  }, [isAuthenticated, isLoading, user])

  if (isLoading) {
    console.log('🛡️ AuthGuard: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('🛡️ AuthGuard: Not authenticated, redirecting to login');
    return <Navigate to="/login" />
  }

  console.log('🛡️ AuthGuard: Authenticated, rendering children');
  return <>{children}</>
}

// Root route
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      {import.meta.env.VITE_ENABLE_DEVTOOLS === 'true' && (
        <TanStackRouterDevtools />
      )}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'bg-white border shadow-lg',
          duration: 4000,
        }}
      />
    </>
  ),
})

// Auth routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: Login,
})

// Protected routes with layout
const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <AuthGuard>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGuard>
  ),
})

const dashboardIndexRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: Dashboard,
})

const productsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/products',
  component: Products,
})

const ordersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/orders',
  component: Orders,
})

const customersRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/customers',
  component: Customers,
})

const categoriesRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/categories',
  component: Categories,
})

const couponsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/coupons',
  component: Coupons,
})

const newsletterRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/newsletter',
  component: Newsletter,
})

const analyticsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/analytics',
  component: Analytics,
})

const paymentsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/payments',
  component: Payments,
})

const shiprocketRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/shiprocket',
  component: Shiprocket,
})

const reviewsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/reviews',
  component: Reviews,
})

// Index redirect
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Navigate to="/dashboard" />,
})

// Build route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  layoutRoute.addChildren([
    dashboardIndexRoute,
    productsRoute,
    ordersRoute,
    customersRoute,
    categoriesRoute,
    couponsRoute,
    newsletterRoute,
    analyticsRoute,
    paymentsRoute,
    shiprocketRoute,
    reviewsRoute,
  ]),
])

// Create router
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    // <StrictMode>
      <TanStackQueryProvider>
        <RouterProvider router={router} />
      </TanStackQueryProvider>
    // </StrictMode>,
  )
}

reportWebVitals()
