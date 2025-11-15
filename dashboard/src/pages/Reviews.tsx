import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal,
  Eye,
  Check,
  X,
  Flag,
  MessageSquare,
  Star,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';


import { formatDate } from '@/lib/utils';
import Pagination from '@/components/ui/pagination';

interface Review {
  id: string;
  user_id: string;
  product_id: string;
  order_id?: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: string[];
  is_verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  product_name: string;
}

interface ReviewReport {
  id: string;
  review_id: string;
  reporter_id: string;
  reason: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  review_title?: string;
  review_comment?: string;
  rating: number;
  reviewer_name: string;
  reviewer_email: string;
  product_name: string;
  reporter_name: string;
}



const Reviews = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReviewReport | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const itemsPerPage = 20;

  // Fetch review statistics
  const { data: stats } = useQuery({
    queryKey: ['review-stats'],
    queryFn: async () => {
      const response = await fetch('/api/reviews/admin/stats', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  // Fetch pending reviews
  const { data: pendingReviews } = useQuery({
    queryKey: ['pending-reviews', currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
      });

      const response = await fetch(`/api/reviews/admin/pending?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch pending reviews');
      return response.json();
    }
  });

  // Fetch review reports
  const { data: reports } = useQuery({
    queryKey: ['review-reports', currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        status: 'pending'
      });

      const response = await fetch(`/api/reviews/admin/reports?${params}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch reports');
      return response.json();
    }
  });

  // Approve/Reject review mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const response = await fetch(`/api/reviews/admin/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ approved })
      });
      if (!response.ok) throw new Error('Failed to update review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      toast.success('Review status updated');
    }
  });

  // Bulk approve/reject mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ reviewIds, approved }: { reviewIds: string[]; approved: boolean }) => {
      const response = await fetch('/api/reviews/admin/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reviewIds, approved })
      });
      if (!response.ok) throw new Error('Failed to bulk update reviews');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      setSelectedReviews([]);
      toast.success('Reviews updated successfully');
    }
  });

  // Update report status mutation
  const reportStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/reviews/admin/reports/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update report status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-reports'] });
      queryClient.invalidateQueries({ queryKey: ['review-stats'] });
      toast.success('Report status updated');
    }
  });

  const handleBulkAction = () => {
    if (!bulkAction || selectedReviews.length === 0) return;
    bulkMutation.mutate({
      reviewIds: selectedReviews,
      approved: bulkAction === 'approve'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading text-royal-black">Review Management</h1>
          <p className="text-muted-foreground font-body">Moderate reviews and handle user reports</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-heading text-royal-black">Total Reviews</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.reviewStats.total_reviews}</div>
              <p className="text-xs text-muted-foreground font-body">
                {stats.data.reviewStats.approved_reviews} approved
              </p>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-heading text-royal-black">Pending Reviews</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.reviewStats.pending_reviews}</div>
              <p className="text-xs text-muted-foreground font-body">
                Need moderation
              </p>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-heading text-royal-black">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.data.reviewStats.average_rating?.toFixed(1) || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground font-body">
                Out of 5 stars
              </p>
            </CardContent>
          </Card>

          <Card className="card-elegant hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-heading text-royal-black">Pending Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.data.reportStats.pending_reports}</div>
              <p className="text-xs text-muted-foreground font-body">
                User reports to review
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
          <TabsTrigger value="reports">User Reports</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {/* Bulk Actions */}
          {selectedReviews.length > 0 && (
            <Card className="card-elegant hover-lift">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium font-body">
                    {selectedReviews.length} reviews selected
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="btn-primary"
                      onClick={() => setBulkAction('approve')}
                      disabled={bulkMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve All
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setBulkAction('reject')}
                      disabled={bulkMutation.isPending}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Reviews Table */}
          <Card className="card-elegant hover-lift">
            <CardHeader>
              <CardTitle className="font-heading text-royal-black">Pending Reviews</CardTitle>
              <CardDescription className="font-body">
                Reviews flagged for moderation or spam detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedReviews(pendingReviews?.data?.map((r: Review) => r.id) || []);
                          } else {
                            setSelectedReviews([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Review</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReviews?.data?.map((review: Review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedReviews.includes(review.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedReviews([...selectedReviews, review.id]);
                            } else {
                              setSelectedReviews(selectedReviews.filter(id => id !== review.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{review.product_name}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{review.user_name}</div>
                          <div className="text-sm text-muted-foreground">{review.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(review.rating)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {review.title && (
                            <div className="font-medium truncate">{review.title}</div>
                          )}
                          {review.comment && (
                            <div className="text-sm text-muted-foreground truncate">
                              {review.comment}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(review.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReview(review);
                                setShowReviewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => approveMutation.mutate({ id: review.id, approved: true })}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => approveMutation.mutate({ id: review.id, approved: false })}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pendingReviews?.data?.length > 0 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil((pendingReviews?.total || pendingReviews?.data?.length || 0) / itemsPerPage)}
                    totalItems={pendingReviews?.total || pendingReviews?.data?.length || 0}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          {/* User Reports Table */}
          <Card className="card-elegant hover-lift">
            <CardHeader>
              <CardTitle className="font-heading text-royal-black">User Reports</CardTitle>
              <CardDescription className="font-body">
                Reviews reported by users for moderation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported Review</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports?.data?.map((report: ReviewReport) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium">{report.product_name}</div>
                          <div className="text-sm text-muted-foreground">
                            by {report.reviewer_name}
                          </div>
                          {renderStars(report.rating)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{report.reporter_name}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.reason}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(report.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedReport(report);
                                setShowReportDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => reportStatusMutation.mutate({ id: report.id, status: 'reviewed' })}
                            >
                              Mark Reviewed
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => reportStatusMutation.mutate({ id: report.id, status: 'resolved' })}
                            >
                              Resolve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => reportStatusMutation.mutate({ id: report.id, status: 'dismissed' })}
                            >
                              Dismiss
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {/* Recent Activity */}
          <Card className="card-elegant hover-lift">
            <CardHeader>
              <CardTitle className="font-heading text-royal-black">Recent Activity</CardTitle>
              <CardDescription className="font-body">
                Latest review submissions and moderation actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.data?.recentActivity?.map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="flex-shrink-0">
                      {activity.type === 'review' ? (
                        <MessageSquare className="h-8 w-8 text-blue-500" />
                      ) : (
                        <Flag className="h-8 w-8 text-orange-500" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium">
                        {activity.title || 'Review'} by {activity.user_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {activity.product_name}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-sm text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </div>
                    <div className="flex-shrink-0">
                      {activity.is_approved ? (
                        <Badge variant="default">Approved</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Review Details Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Details</DialogTitle>
            <DialogDescription>
              Review by {selectedReview?.user_name} for {selectedReview?.product_name}
            </DialogDescription>
          </DialogHeader>

          {selectedReview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {renderStars(selectedReview.rating)}
                <span className="text-sm text-muted-foreground">
                  {selectedReview.is_verified_purchase && (
                    <Badge variant="outline" className="ml-2">Verified Purchase</Badge>
                  )}
                </span>
              </div>

              {selectedReview.title && (
                <div>
                  <Label className="font-medium">Title</Label>
                  <p className="mt-1">{selectedReview.title}</p>
                </div>
              )}

              {selectedReview.comment && (
                <div>
                  <Label className="font-medium">Comment</Label>
                  <Textarea
                    value={selectedReview.comment}
                    readOnly
                    className="mt-1"
                    rows={4}
                  />
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Helpful: {selectedReview.helpful_count}</span>
                <span>Submitted: {formatDate(selectedReview.created_at)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
              className="font-body"
            >
              Close
            </Button>
            {selectedReview && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    approveMutation.mutate({ id: selectedReview.id, approved: false });
                    setShowReviewDialog(false);
                  }}
                  className="font-body"
                >
                  Reject
                </Button>
                <Button
                  className="btn-primary font-body"
                  onClick={() => {
                    approveMutation.mutate({ id: selectedReview.id, approved: true });
                    setShowReviewDialog(false);
                  }}
                >
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Details Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>
              Report by {selectedReport?.reporter_name}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label className="font-medium">Reason</Label>
                <Badge variant="outline" className="ml-2">{selectedReport.reason}</Badge>
              </div>

              {selectedReport.description && (
                <div>
                  <Label className="font-medium">Description</Label>
                  <Textarea
                    value={selectedReport.description}
                    readOnly
                    className="mt-1"
                    rows={3}
                  />
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="font-medium">Reported Review</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {renderStars(selectedReport.rating)}
                    <span className="text-sm text-muted-foreground">
                      by {selectedReport.reviewer_name}
                    </span>
                  </div>
                  {selectedReport.review_title && (
                    <div className="font-medium mb-1">{selectedReport.review_title}</div>
                  )}
                  {selectedReport.review_comment && (
                    <div className="text-sm">{selectedReport.review_comment}</div>
                  )}
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Reported on: {formatDate(selectedReport.created_at)}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReportDialog(false)}
              className="font-body"
            >
              Close
            </Button>
            {selectedReport && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    reportStatusMutation.mutate({ id: selectedReport.id, status: 'dismissed' });
                    setShowReportDialog(false);
                  }}
                  className="font-body"
                >
                  Dismiss
                </Button>
                <Button
                  className="btn-primary font-body"
                  onClick={() => {
                    reportStatusMutation.mutate({ id: selectedReport.id, status: 'resolved' });
                    setShowReportDialog(false);
                  }}
                >
                  Resolve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation */}
      {bulkAction && (
        <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {bulkAction === 'approve' ? 'Approve' : 'Reject'} {selectedReviews.length} Reviews?
              </DialogTitle>
              <DialogDescription>
                This action will {bulkAction === 'approve' ? 'approve' : 'reject'} all selected reviews.
                This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkAction(null)} className="font-body">
                Cancel
              </Button>
              <Button
                className={`font-body ${bulkAction === 'approve' ? 'btn-primary' : ''}`}
                variant={bulkAction === 'approve' ? 'default' : 'destructive'}
                onClick={handleBulkAction}
                disabled={bulkMutation.isPending}
              >
                {bulkMutation.isPending ? 'Processing...' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Reviews;