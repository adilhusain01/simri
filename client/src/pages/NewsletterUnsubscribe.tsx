import { useState, useEffect } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Mail, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { newsletterService } from '../services/api';

interface UnsubscribeState {
  loading: boolean;
  success: boolean;
  error: string | null;
}

const NewsletterUnsubscribe = () => {
  const navigate = useNavigate();
  const search = useSearch({ from: '/newsletter/unsubscribe' });
  const [email, setEmail] = useState('');
  const [state, setState] = useState<UnsubscribeState>({
    loading: false,
    success: false,
    error: null
  });

  // Get email from URL parameters
  useEffect(() => {
    if (search.email) {
      setEmail(decodeURIComponent(search.email));
    }
  }, [search.email]);

  const handleUnsubscribe = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setState({ loading: true, success: false, error: null });

    try {
      await newsletterService.unsubscribe(email);
      setState({ loading: false, success: true, error: null });
      toast.success('Successfully unsubscribed from newsletter');
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred while unsubscribing';
      setState({ loading: false, success: false, error: errorMessage });
      toast.error(errorMessage);
    }
  };

  const handleGoHome = () => {
    navigate({ to: '/' });
  };

  if (state.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center sm:px-6 lg:px-8">

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="py-6">
            {/* <CheckCircle className="h-6 w-6 text-green-600" /> */}
              <div className="text-center">
                <p className="mt-2 text-center text-sm text-gray-600">
                  You have been successfully unsubscribed from our newsletter.
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  Email: <span className="font-medium">{email}</span>
                </p>
                <Button onClick={handleGoHome} className="w-full">
                  Return to Homepage
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Confirm Unsubscription</CardTitle>
            <CardDescription className="text-center">
              Enter your email address to unsubscribe from our newsletter
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="mt-1"
                />
              </div>

              {state.error && (
                <div className="flex items-center space-x-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{state.error}</span>
                </div>
              )}

              <div className="space-y-4">
                <Button
                  onClick={handleUnsubscribe}
                  disabled={state.loading || !email}
                  className="w-full"
                  variant="destructive"
                >
                  {state.loading ? 'Unsubscribing...' : 'Unsubscribe'}
                </Button>
                
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  You can resubscribe at any time by visiting our website.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsletterUnsubscribe;