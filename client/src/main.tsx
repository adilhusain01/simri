import ReactDOM from 'react-dom/client'
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import TanStackQueryDemo from './routes/demo.tanstack-query.tsx'
import StoreDemo from './routes/demo.store.tsx'

import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import EmailVerification from './pages/auth/EmailVerification'
import Callback from './pages/auth/Callback'
import Products from './pages/Products'
import Cart from './pages/Cart'
import Wishlist from './pages/Wishlist'
import Profile from './pages/Profile'
import OrderHistory from './pages/OrderHistory'
import Checkout from './pages/Checkout'
import ProductDetails from './pages/ProductDetails'
import SearchResults from './pages/SearchResults'
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe'

import * as TanStackQueryProvider from './integrations/tanstack-query/root-provider.tsx'

import './styles/globals.css'
import reportWebVitals from './reportWebVitals.ts'

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Layout />
      <TanStackRouterDevtools />
    </>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
})

// Authentication routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/login',
  component: Login,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || '/',
  }),
})

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/signup',
  component: Signup,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: (search.redirect as string) || '/',
  }),
})

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/forgot-password',
  component: ForgotPassword,
})

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/reset-password',
  component: ResetPassword,
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string,
  }),
})

const emailVerificationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/verify-email',
  component: EmailVerification,
  validateSearch: (search: Record<string, unknown>) => ({
    token: search.token as string,
  }),
})

const callbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/callback',
  component: Callback,
})

// Main app routes
const productsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products',
  component: Products,
  validateSearch: (search: Record<string, unknown>) => ({
    category: (search.category as string) || '',
    q: (search.q as string) || '',
    sortBy: (search.sortBy as string) || 'relevance',
    minPrice: search.minPrice ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
    inStock: search.inStock === 'true',
    featured: search.featured === 'true',
  }),
})

const cartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/cart',
  component: Cart,
})

const wishlistRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/wishlist',
  component: Wishlist,
})

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: Profile,
})

const orderHistoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/orders',
  component: OrderHistory,
})

const checkoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/checkout',
  component: Checkout,
})

const productDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/products/$productId',
  component: ProductDetails,
})

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: SearchResults,
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || '',
    category: (search.category as string) || '',
    sortBy: (search.sortBy as string) || 'relevance',
    minPrice: search.minPrice ? Number(search.minPrice) : undefined,
    maxPrice: search.maxPrice ? Number(search.maxPrice) : undefined,
    inStock: search.inStock === 'true',
    featured: search.featured === 'true',
  }),
})

const newsletterUnsubscribeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/newsletter/unsubscribe',
  component: NewsletterUnsubscribe,
  validateSearch: (search: Record<string, unknown>) => ({
    email: (search.email as string) || '',
  }),
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  emailVerificationRoute,
  callbackRoute,
  productsRoute,
  productDetailsRoute,
  searchRoute,
  newsletterUnsubscribeRoute,
  cartRoute,
  wishlistRoute,
  profileRoute,
  orderHistoryRoute,
  checkoutRoute,
  TanStackQueryDemo(rootRoute),
  StoreDemo(rootRoute),
])

const TanStackQueryProviderContext = TanStackQueryProvider.getContext()
const router = createRouter({
  routeTree,
  context: {
    ...TanStackQueryProviderContext,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
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
      <TanStackQueryProvider.Provider {...TanStackQueryProviderContext}>
        <RouterProvider router={router} />
      </TanStackQueryProvider.Provider>
    // </StrictMode>,
  )
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals()
