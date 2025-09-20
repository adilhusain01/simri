import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { authService } from '../../services/api';
import { toast } from 'sonner';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useSearch({ from: '/auth/reset-password' });
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" as const }
  };

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        return;
      }

      try {
        await authService.verifyResetToken(token);
        setIsValidToken(true);
      } catch (error) {
        setIsValidToken(false);
        toast.error('Invalid or expired reset token');
      }
    };

    validateToken();
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      await authService.resetPassword(token!, formData.password);
      
      setIsSubmitted(true);
      toast.success('Password reset successfully! Please sign in with your new password.');
      
      // Redirect to login after a delay
      setTimeout(() => {
        navigate({ to: '/auth/login', search: { redirect: '/' } });
      }, 3000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      toast.error(errorMessage);
      if (error.response?.status === 400) {
        setIsValidToken(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show invalid token message
  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div {...fadeInUp}>

            <Card className="card-elegant text-center">
              <CardContent className="pt-8 pb-8">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
                
                <h1 className="font-heading text-2xl font-bold text-charcoal mb-4">
                  Invalid Reset Link
                </h1>
                
                <p className="text-gray-600 mb-8">
                  This password reset link is invalid or has expired. Please request a new one.
                </p>

                  <Link to="/auth/login" search={{ redirect: '/' }}>
                    <Button variant="ghost" className="w-full text-purple-600 hover:text-purple-800">
                      Back to Login
                    </Button>
                  </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show success message
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <motion.div {...fadeInUp}>

            <Card className="card-elegant text-center">
              <CardContent className="pt-8 pb-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
                
                <h1 className="font-heading text-2xl font-bold text-charcoal mb-4">
                  Password Reset Complete
                </h1>
                
                <p className="text-gray-600 mb-8">
                  Your password has been successfully reset. You can now sign in with your new password.
                </p>

                <Link to="/auth/login" search={{ redirect: '/' }}>
                  <Button className="w-full btn-primary">
                    Continue to Login
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show loading while validating token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="card-elegant text-center">
            <CardContent className="pt-8 pb-8">
              <div className="spinner w-8 h-8 mx-auto mb-4"></div>
              <p className="text-gray-600">Validating reset link...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-purple-100 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div {...fadeInUp}>
          {/* Header */}

          {/* Reset Password Card */}
          <Card className="card-elegant">
            <CardHeader className="text-center pb-4">
              <CardTitle className="font-heading text-xl text-charcoal">Set New Password</CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`pl-10 pr-10 h-12 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="Enter your new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-red-500 text-sm mt-2">{errors.password}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-charcoal mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className={`pl-10 pr-10 h-12 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder="Confirm your new password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-2">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full btn-primary h-12 group"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="spinner w-5 h-5 mr-2"></div>
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <div className="text-center mt-6 pt-6 border-t border-gray-200">
                <Link
                  to="/auth/login"
                  search={{ redirect: '/' }}
                  className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;