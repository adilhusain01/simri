import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { authService } from '../../services/api';
import { toast } from 'sonner';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<string>('');
  const [resendTimer, setResendTimer] = useState(0);
  const [canResend, setCanResend] = useState(true);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeInOut" as const }
  } as const;

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  // Timer effect for resend button
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval as any);
    };
  }, [resendTimer]);

  const startResendTimer = () => {
    setCanResend(false);
    setResendTimer(60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrors('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setErrors('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setErrors('');

    try {
      await authService.forgotPassword(email);
      setIsSubmitted(true);
      startResendTimer();
      toast.success('Password reset instructions sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to send reset instructions';
      setErrors(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !canResend) return;
    
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      startResendTimer();
      toast.success('Instructions resent to your email');
    } catch (error: any) {
      toast.error('Failed to resend instructions');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-sm sm:max-w-md">
          <motion.div {...fadeInUp}>
            {/* Header */}
        
            <Card className="card-elegant text-center">
              <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8">
                <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4 sm:mb-6" />

                <h1 className="font-heading text-xl sm:text-2xl font-bold text-royal-black mb-3 sm:mb-4">
                  Check Your Email
                </h1>

                <p className="text-gray-600 mb-2 text-sm sm:text-base">
                  We've sent password reset instructions to:
                </p>
                <p className="font-medium text-royal-black mb-4 sm:mb-6 text-sm sm:text-base break-words">
                  {email}
                </p>

                <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
                  Didn't receive the email? Check your spam folder or click below to resend.
                </p>

                <div className="space-y-3 sm:space-y-4">
                  <Button
                    onClick={handleResend}
                    variant="outline"
                    className="w-full border-gray-200 hover:border-royal-gold hover:bg-gray-50 disabled:opacity-50 h-10 sm:h-12 text-sm sm:text-base"
                    disabled={isLoading || !canResend}
                  >
                    {isLoading ? (
                      <>
                        <div className="spinner w-3 h-3 sm:w-4 sm:h-4 mr-2"></div>
                        Resending...
                      </>
                    ) : !canResend ? (
                      `Resend Instructions (${resendTimer}s)`
                    ) : (
                      'Resend Instructions'
                    )}
                  </Button>

                  <Link to="/auth/login" search={{ redirect: '/' }}>
                    <Button variant="ghost" className="w-full text-royal-gold hover:text-royal-black h-10 sm:h-12 text-sm sm:text-base">
                      <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <motion.div {...fadeInUp}>
          {/* Header */}

          {/* Forgot Password Card */}
          <Card className="card-elegant">
            <CardHeader className="text-center pb-3 sm:pb-4">
              <CardTitle className="font-heading text-lg sm:text-xl lg:text-2xl text-royal-black">Reset Password</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-royal-black mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrors('');
                      }}
                      className={`pl-9 sm:pl-10 h-10 sm:h-12 text-sm sm:text-base ${errors ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="Enter your email address"
                      disabled={isLoading}
                    />
                  </div>
                  {errors && (
                    <p className="text-red-500 text-xs sm:text-sm mt-2">{errors}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary h-10 sm:h-12 group text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner w-4 h-4 sm:w-5 sm:h-5 mr-2"></div>
                      Sending Instructions...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                <Link
                  to="/auth/login"
                  search={{ redirect: '/' }}
                  className="inline-flex items-center text-royal-gold hover:text-royal-black font-medium transition-colors text-sm sm:text-base"
                >
                  <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="text-center mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm text-gray-500">
              Remember your password?{' '}
              <Link to="/auth/login" search={{ redirect: '/' }} className="text-royal-gold hover:text-royal-black transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;