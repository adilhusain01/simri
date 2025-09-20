import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import { authService } from '../../services/api';

const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/auth/verify-email' });
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }
  };

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setVerificationStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        setVerificationStatus('verifying');
        await authService.verifyEmail(token);
        setVerificationStatus('success');
        setMessage('Email verified successfully! You can now log in to your account.');
        toast.success('Email verified successfully!');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate({ to: '/auth/login', search: { redirect: '/' } });
        }, 3000);
      } catch (error: any) {
        setVerificationStatus('error');
        setMessage(error.message || 'Email verification failed. The link may be expired or invalid.');
        toast.error('Email verification failed');
      }
    };

    verifyEmail();
  }, [token, navigate]);

  const handleResendVerification = async () => {
    // This would require the user's email - for now just redirect to signup
    toast.info('Please register again to receive a new verification email.');
    navigate({ to: '/auth/signup', search: { redirect: '/' } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div {...fadeInUp}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-heading text-3xl font-bold text-charcoal mb-2">
              Email Verification
            </h1>
            <p className="text-gray-600">
              Verifying your email address
            </p>
          </div>

          {/* Verification Card */}
          <Card className="card-elegant">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-heading text-xl text-charcoal">
                {verificationStatus === 'verifying' && 'Verifying...'}
                {verificationStatus === 'success' && 'Verification Complete'}
                {verificationStatus === 'error' && 'Verification Failed'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="text-center">
              {/* Status Icon */}
              <div className="mb-6">
                {verificationStatus === 'verifying' && (
                  <RefreshCw className="h-16 w-16 mx-auto text-purple-600 animate-spin" />
                )}
                {verificationStatus === 'success' && (
                  <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
                )}
                {verificationStatus === 'error' && (
                  <XCircle className="h-16 w-16 mx-auto text-red-600" />
                )}
              </div>

              {/* Message */}
              <div className="mb-6">
                <p className={`text-lg ${
                  verificationStatus === 'success' ? 'text-green-700' :
                  verificationStatus === 'error' ? 'text-red-700' : 'text-gray-600'
                }`}>
                  {message}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {verificationStatus === 'success' && (
                  <Link to="/auth/login" search={{ redirect: '/' }}>
                    <Button className="w-full btn-primary">
                      Continue to Login
                    </Button>
                  </Link>
                )}

                {verificationStatus === 'error' && (
                  <>
                    <Button
                      onClick={handleResendVerification}
                      className="w-full btn-primary mb-3"
                    >
                      Get New Verification Email
                    </Button>
                    <Link to="/auth/login" search={{ redirect: '/' }}>
                      <Button variant="outline" className="w-full">
                        Back to Login
                      </Button>
                    </Link>
                  </>
                )}

                {verificationStatus === 'verifying' && (
                  <div className="text-sm text-gray-500">
                    Please wait while we verify your email address...
                  </div>
                )}
              </div>

              {verificationStatus === 'success' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    Redirecting to login page in a few seconds...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default EmailVerification;