import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      console.log('🔐 Attempting login with:', data.email);
      await login(data.email, data.password);
      console.log('✅ Login successful, navigating to dashboard');
      toast.success('Login successful!');
      navigate({ to: '/dashboard' });
    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ivory-white to-royal-gold/10">
      <div className="w-full max-w-md space-y-8">

        <Card className="card-elegant hover-lift bg-ivory-white">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img
                src="/src/assets/simri_black.png"
                alt="Simri"
                className="h-12 w-auto object-contain"
              />
            </div>
            <CardTitle className="text-xl font-heading text-royal-black">Admin Login</CardTitle>
            <CardDescription className="font-body">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium font-body text-royal-black">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="admin@simri.com"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-body focus:border-royal-gold focus:outline-none focus:ring-2 focus:ring-royal-gold/20 focus:ring-offset-2 transition-all"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-admin-red font-body">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium font-body text-royal-black">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm font-body focus:border-royal-gold focus:outline-none focus:ring-2 focus:ring-royal-gold/20 focus:ring-offset-2 transition-all"
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-admin-red font-body">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full btn-primary font-body"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    <span className="font-body">Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="h-4 w-4" />
                    <span className="font-body">Sign in</span>
                  </div>
                )}
              </Button>
            </form>

          </CardContent>
        </Card>
      </div>
    </div>
  );
}