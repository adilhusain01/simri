import React, { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const { isLoading } = useAuthStore();
  const [status, setStatus] = React.useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Extract URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const redirect = urlParams.get('redirect');
        const error = urlParams.get('error');

        console.log('Callback URL params:', { success, redirect, error });
        console.log('Full URL:', window.location.href);

        if (error) {
          throw new Error(error === 'access_denied' ? 'Access denied' : 'Authentication failed');
        }

        if (success === 'true') {
          // OAuth was successful, user is already authenticated on the backend
          setStatus('success');
          toast.success('Successfully signed in with Google!');

          // Redirect after a short delay
          setTimeout(() => {
            const redirectTo = redirect ? decodeURIComponent(redirect) : '/';
            console.log('Redirecting to:', redirectTo);
            navigate({ to: redirectTo });
          }, 2000);
        } else {
          throw new Error('Authentication was not successful');
        }

      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        toast.error(error.message || 'Authentication failed');

        // Redirect to login after error
        setTimeout(() => {
          navigate({ to: '/auth/login', search: { redirect: '/' } });
        }, 3000);
      }
    };

    processCallback();
  }, [navigate]);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div {...fadeInUp}>
          <Card className="card-elegant text-center p-8">
            <CardContent className="pt-6">

              {status === 'loading' && (
                <>
                  <div className="spinner w-8 h-8 mx-auto mb-4"></div>
                  <h2 className="font-heading text-2xl font-bold text-royal-black mb-2">
                    Completing Sign In
                  </h2>
                  <p className="text-gray-600">
                    Please wait while we finish setting up your account...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="font-heading text-2xl font-bold text-royal-black mb-2">
                    Welcome to Simri!
                  </h2>
                  <p className="text-gray-600">
                    You've successfully signed in. Redirecting you now...
                  </p>
                </>
              )}

              {status === 'error' && (
                <>
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="font-heading text-2xl font-bold text-royal-black mb-2">
                    Authentication Failed
                  </h2>
                  <p className="text-gray-600">
                    Something went wrong during sign in. Redirecting you back to login...
                  </p>
                </>
              )}

              {/* Loading indicator for visual feedback */}
              {(status === 'loading' || isLoading) && (
                <div className="mt-8">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-2 h-2 bg-royal-gold rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-royal-gold rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-royal-gold rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Callback;