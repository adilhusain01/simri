import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  User,
  ArrowLeft,
  Edit,
  MapPin,
  Shield,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Star,
  MessageSquare,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui/loading';
import { ImageModal } from '../components/ui/image-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { useAuthStore } from '../stores/authStore';
import { userService, reviewService } from '../services/api';
import type { Address, UpdateProfileRequest, AddressFormRequest, Review } from '../types';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateUser } = useAuthStore();

  // State
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Image modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalInitialIndex, setModalInitialIndex] = useState(0);
  const [modalTitle, setModalTitle] = useState('');

  // Form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrent: false,
    showNew: false,
    showConfirm: false,
  });

  const [addressForm, setAddressForm] = useState<AddressFormRequest>({
    type: 'shipping',
    first_name: '',
    last_name: '',
    company: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    phone: '',
    is_default: false,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/auth/login', search: { redirect: '/profile' } });
      return;
    }
  }, [isAuthenticated, navigate]);

  // Function to open image modal
  const openImageModal = (images: string[], initialIndex: number, title: string) => {
    const fullImageUrls = images.map(image => 
      image.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${image}` : image
    );
    setModalImages(fullImageUrls);
    setModalInitialIndex(initialIndex);
    setModalTitle(title);
    setImageModalOpen(true);
  };

  // Load addresses
  const loadAddresses = async () => {
    try {
      setAddressesLoading(true);
      const userAddresses = await userService.getAddresses();
      setAddresses(userAddresses);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setAddressesLoading(false);
    }
  };

  // Load user reviews
  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await reviewService.getUserReviews({ page: 1, limit: 20 });
      setReviews(response.data || []);
    } catch (error) {
      console.error('Failed to load reviews:', error);
      toast.error('Failed to load reviews');
      setReviews([]); // Set empty array on error
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
      loadReviews();
    }
  }, [isAuthenticated]);

  // Handlers
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);
      const updateData: UpdateProfileRequest = {};
      
      if (profileForm.name !== user.name) {
        updateData.name = profileForm.name;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info('No changes to save');
        setEditMode(false);
        return;
      }

      const updatedUser = await userService.updateProfile(updateData);
      updateUser(updatedUser);
      toast.success('Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await userService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      toast.success('Password changed successfully');
      setShowPasswordDialog(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        showCurrent: false,
        showNew: false,
        showConfirm: false,
      });
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      if (editingAddress) {
        // Update address
        const updated = await userService.updateAddress(editingAddress.id, addressForm);
        setAddresses(prev => prev.map(addr => addr.id === editingAddress.id ? updated : addr));
        toast.success('Address updated successfully');
      } else {
        // Add new address
        const newAddress = await userService.addAddress(addressForm);
        setAddresses(prev => [...prev, newAddress]);
        toast.success('Address added successfully');
      }
      
      setShowAddressDialog(false);
      setEditingAddress(null);
      resetAddressForm();
    } catch (error) {
      console.error('Failed to save address:', error);
      toast.error('Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    try {
      await userService.deleteAddress(addressId);
      setAddresses(prev => prev.filter(addr => addr.id !== addressId));
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Failed to delete address:', error);
      toast.error('Failed to delete address');
    }
  };

  const resetAddressForm = () => {
    setAddressForm({
      type: 'shipping',
      first_name: '',
      last_name: '',
      company: '',
      address_line_1: '',
      address_line_2: '',
      city: '',
      state: '',
      country: 'India',
      postal_code: '',
      phone: '',
      is_default: false,
    });
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (deletingReviewId) return; // Prevent multiple deletions
    
    try {
      setDeletingReviewId(reviewId);
      await reviewService.deleteReview(reviewId);
      setReviews(prev => prev.filter(review => review.id !== reviewId));
      toast.success('Review deleted successfully');
    } catch (error) {
      console.error('Failed to delete review:', error);
      toast.error('Failed to delete review');
    } finally {
      setDeletingReviewId(null);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const openEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressForm({
      type: address.type,
      first_name: address.first_name,
      last_name: address.last_name,
      company: address.company || '',
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || '',
      city: address.city,
      state: address.state,
      country: address.country,
      postal_code: address.postal_code,
      phone: address.phone || '',
      is_default: address.is_default,
    });
    setShowAddressDialog(true);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="addresses">Addresses</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Profile Information
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (editMode) {
                            setProfileForm({
                              name: user.name,
                              email: user.email,
                            });
                          }
                          setEditMode(!editMode);
                        }}
                      >
                        {editMode ? <X className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                        {editMode ? 'Cancel' : 'Edit'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="flex items-start gap-6">
                      <div className="flex-shrink-0">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xl border-2 border-gray-200">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-xl font-semibold text-charcoal">
                          {user.name}
                        </h3>
                        <p className="text-gray-600">{user.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={user.is_verified ? 'default' : 'secondary'}>
                            {user.is_verified ? 'Verified' : 'Unverified'}
                          </Badge>
                          <Badge variant="outline">
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Profile Form */}
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <Input
                            value={profileForm.name}
                            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            disabled={!editMode}
                            className={!editMode ? 'bg-gray-50' : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <Input
                            type="email"
                            value={profileForm.email}
                            disabled={true}
                            className="bg-gray-50"
                            title="Email cannot be changed here. Use the dedicated email change section for verified updates."
                          />
                          <p className="text-xs text-gray-500">
                            Email changes require verification. Use the email change feature below.
                          </p>
                        </div>
                      </div>

                      {editMode && (
                        <div className="flex gap-2 pt-4">
                          <Button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Addresses Tab */}
            <TabsContent value="addresses">
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        Saved Addresses
                      </CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetAddressForm();
                          setEditingAddress(null);
                          setShowAddressDialog(true);
                        }}
                        className="btn-primary"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Address
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {addressesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                        <span className="ml-2 text-gray-600">Loading addresses...</span>
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-medium text-gray-600 mb-2">No addresses saved</h3>
                        <p className="text-sm text-gray-500">Add an address for faster checkout</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {addresses.map((address) => (
                          <Card key={address.id} className="border-2 hover:border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant={address.type === 'shipping' ? 'default' : 'secondary'}>
                                    {address.type}
                                  </Badge>
                                  {(address.is_default || address.isDefault) && (
                                    <Badge variant="outline">Default</Badge>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditAddress(address)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteAddress(address.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-1 text-sm">
                                <p className="font-medium">
                                  {address.first_name || address.name} {address.last_name || ''}
                                </p>
                                {address.company && (
                                  <p className="text-gray-600 font-medium">{address.company}</p>
                                )}
                                <p className="text-gray-600">
                                  {address.address_line_1 || address.street}
                                </p>
                                {address.address_line_2 && (
                                  <p className="text-gray-600">{address.address_line_2}</p>
                                )}
                                <p className="text-gray-600">
                                  {address.city}, {address.state} {address.postal_code || address.postalCode}
                                </p>
                                <p className="text-gray-600">{address.country}</p>
                                {address.phone && (
                                  <p className="text-gray-600">{address.phone}</p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      My Reviews
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <LoadingSpinner size="md" />
                        <span className="ml-2 text-gray-600">Loading reviews...</span>
                      </div>
                    ) : !reviews || reviews.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="font-medium text-gray-600 mb-2">No reviews yet</h3>
                        <p className="text-sm text-gray-500">Start shopping to leave your first review!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews?.map((review) => (
                          <Card key={review.id} className="border-2 hover:border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="flex items-center gap-1">
                                      {renderStars(review.rating)}
                                    </div>
                                    <span className="text-sm text-gray-500">
                                      {new Date(review.created_at || review.createdAt || '').toLocaleDateString()}
                                    </span>
                                  </div>
                                  {review.title && (
                                    <h4 className="font-medium text-gray-900 mb-1">{review.title}</h4>
                                  )}
                                  <p className="text-gray-700 mb-2">{review.comment}</p>
                                  {(review.product_name) && (
                                    <p className="text-sm text-gray-500">
                                      Product: <span className="font-medium">{review.product_name}</span>
                                    </p>
                                  )}
                                  {(review.is_verified_purchase || review.isVerified) && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      Verified Purchase
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteReview(review.id)}
                                    disabled={deletingReviewId === review.id}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    {deletingReviewId === review.id ? (
                                      <LoadingSpinner size="sm" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Review Images */}
                              {review.images && review.images.length > 0 && (
                                <div className="flex gap-2 mt-3">
                                  {review.images.map((image, index) => (
                                    <button
                                      key={index}
                                      onClick={() => openImageModal(
                                        review.images!, 
                                        index, 
                                        `Your review for ${review.product_name}`
                                      )}
                                      className="relative overflow-hidden rounded-lg border hover:border-blue-500 transition-colors cursor-pointer group"
                                    >
                                      <img
                                        src={image.startsWith('/uploads') ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${image}` : image}
                                        alt={`Review image ${index + 1}`}
                                        className="w-16 h-16 object-cover group-hover:scale-105 transition-transform"
                                        onError={(e) => {
                                          console.log('Image failed to load:', image);
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      {review.images!.length > 1 && index === 0 && (
                                        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                          +{review.images!.length - 1}
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {review.helpful_count && review.helpful_count > 0 && (
                                <p className="text-xs text-gray-500 mt-2">
                                  {review.helpful_count} people found this helpful
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <motion.div {...fadeInUp}>
                <Card className="card-elegant">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Password</h4>
                          <p className="text-sm text-gray-600">
                            Last changed: Never
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPasswordDialog(true)}
                        >
                          Change Password
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Two-Factor Authentication</h4>
                          <p className="text-sm text-gray-600">
                            Add an extra layer of security to your account
                          </p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Coming Soon
                        </Button>
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">Login Sessions</h4>
                          <p className="text-sm text-gray-600">
                            Manage your active sessions
                          </p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          View Sessions
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>

          {/* Password Change Dialog */}
          <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Change Password</DialogTitle>
                <DialogDescription>
                  Enter your current password and choose a new one.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <div className="relative">
                    <Input
                      type={passwordForm.showCurrent ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() => setPasswordForm(prev => ({ ...prev, showCurrent: !prev.showCurrent }))}
                    >
                      {passwordForm.showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Input
                      type={passwordForm.showNew ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() => setPasswordForm(prev => ({ ...prev, showNew: !prev.showNew }))}
                    >
                      {passwordForm.showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <Input
                      type={passwordForm.showConfirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-auto p-1"
                      onClick={() => setPasswordForm(prev => ({ ...prev, showConfirm: !prev.showConfirm }))}
                    >
                      {passwordForm.showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setShowPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="btn-primary">
                    Change Password
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Address Dialog */}
          <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingAddress ? 'Edit Address' : 'Add New Address'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={addressForm.type}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, type: e.target.value as 'shipping' | 'billing' }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="shipping">Shipping</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">First Name</label>
                      <Input
                        value={addressForm.first_name}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, first_name: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Last Name</label>
                      <Input
                        value={addressForm.last_name}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, last_name: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company (Optional)</label>
                  <Input
                    value={addressForm.company}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, company: e.target.value }))}
                    placeholder="Company name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Street Address</label>
                  <Input
                    value={addressForm.address_line_1}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_1: e.target.value }))}
                    placeholder="123 Main Street"
                    required
                  />
                  <Input
                    value={addressForm.address_line_2}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, address_line_2: e.target.value }))}
                    placeholder="Apartment, suite, etc. (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">City</label>
                    <Input
                      value={addressForm.city}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, city: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">State</label>
                    <Input
                      value={addressForm.state}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, state: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postal Code</label>
                    <Input
                      value={addressForm.postal_code}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, postal_code: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, is_default: e.target.checked }))}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isDefault" className="text-sm font-medium">
                    Set as default address
                  </label>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setShowAddressDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="btn-primary">
                    {editingAddress ? 'Update' : 'Add'} Address
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* Image Modal */}
      <ImageModal
        images={modalImages}
        initialIndex={modalInitialIndex}
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title={modalTitle}
      />
    </div>
  );
};

export default Profile;