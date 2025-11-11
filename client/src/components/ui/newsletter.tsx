import React, { useState } from 'react';
import { Mail, Check, X } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { newsletterService } from '../../services/api';
import { toast } from 'sonner';

interface NewsletterProps {
  variant?: 'compact' | 'full';
  className?: string;
  title?: string;
  description?: string;
}

export const Newsletter: React.FC<NewsletterProps> = ({
  variant = 'full',
  className = '',
  title = 'Stay Updated',
  description = 'Get the latest updates on new products, exclusive offers, and gift ideas delivered to your inbox.',
}) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState({
    product_updates: true,
    promotions: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await newsletterService.subscribe(email, name || undefined, preferences);
      setIsSubscribed(true);
      toast.success('Successfully subscribed to our newsletter!');
      setEmail('');
      setName('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to subscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubscribed) {
    return (
      <Card className={`bg-gradient-to-br from-gray-50 to-white border-gray-200 ${className}`}>
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="bg-green-100 p-2 sm:p-3 rounded-full">
              <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Thank You!</h3>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
            You've successfully subscribed to our newsletter. Check your inbox for a confirmation email.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-royal-black to-gray-800 rounded-lg p-3 sm:p-4 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-white space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="font-medium text-xs sm:text-sm">Get exclusive offers</span>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Input
              type="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder-white/70 text-xs sm:text-sm w-full sm:w-40 lg:w-48 h-9"
              required
            />
            <Button
              type="submit"
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="bg-white text-royal-black hover:bg-gray-50 h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
            >
              {isLoading ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="text-center pb-4 sm:pb-6">
        <div className="mx-auto bg-royal-gold p-2 sm:p-3 rounded-full w-fit mb-3 sm:mb-4">
          <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-royal-black" />
        </div>
        <CardTitle className="text-lg sm:text-xl font-heading text-royal-black">{title}</CardTitle>
        <p className="text-gray-800 text-xs sm:text-sm mt-2 leading-relaxed">{description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-8 sm:h-12 text-sm sm:text-base focus:border-royal-gold"
              required
            />
            <Input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 sm:h-12 text-sm sm:text-base focus:border-royal-gold"
            />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm font-medium text-gray-700">What would you like to receive?</p>
            <div className="space-y-2">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.product_updates}
                  onChange={(e) => setPreferences(prev => ({ ...prev, product_updates: e.target.checked }))}
                  className="rounded border-gray-300 text-royal-gold focus:ring-royal-gold mt-0.5 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">New product updates and gift ideas</span>
              </label>
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={preferences.promotions}
                  onChange={(e) => setPreferences(prev => ({ ...prev, promotions: e.target.checked }))}
                  className="rounded border-gray-300 text-royal-gold focus:ring-royal-gold mt-0.5 flex-shrink-0"
                />
                <span className="text-xs sm:text-sm text-gray-600 leading-relaxed">Exclusive promotions and discounts</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary h-10 sm:h-12 text-sm sm:text-base"
          >
            {isLoading ? 'Subscribing...' : 'Subscribe to Newsletter'}
          </Button>

          <p className="text-xs text-gray-500 text-center leading-relaxed">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </form>
      </CardContent>
    </Card>
  );
};

interface UnsubscribeProps {
  email?: string;
  onUnsubscribe?: () => void;
  className?: string;
}

export const Unsubscribe: React.FC<UnsubscribeProps> = ({
  email: initialEmail = '',
  onUnsubscribe,
  className = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnsubscribed, setIsUnsubscribed] = useState(false);

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await newsletterService.unsubscribe(email);
      setIsUnsubscribed(true);
      toast.success('Successfully unsubscribed from newsletter.');
      onUnsubscribe?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unsubscribe. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isUnsubscribed) {
    return (
      <Card className={`max-w-sm sm:max-w-md mx-auto ${className}`}>
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="bg-green-100 p-2 sm:p-3 rounded-full">
              <Check className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Unsubscribed</h3>
          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
            You've been successfully unsubscribed from our newsletter.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`max-w-sm sm:max-w-md mx-auto ${className}`}>
      <CardHeader className="text-center pb-4 sm:pb-6">
        <div className="mx-auto bg-red-100 p-2 sm:p-3 rounded-full w-fit mb-3 sm:mb-4">
          <X className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
        </div>
        <CardTitle className="text-lg sm:text-xl font-heading text-gray-900">Unsubscribe</CardTitle>
        <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
          We're sorry to see you go. Enter your email to unsubscribe from our newsletter.
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleUnsubscribe} className="space-y-4 sm:space-y-5">
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-gray-200 focus:border-red-500 h-10 sm:h-11 text-sm"
            required
          />
          <Button
            type="submit"
            disabled={isLoading}
            variant="destructive"
            className="w-full h-10 sm:h-12 text-sm sm:text-base"
          >
            {isLoading ? 'Unsubscribing...' : 'Unsubscribe'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};