import express from 'express';
import { query, param } from 'express-validator';
import { handleValidation } from '../middleware/validation';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { cartAbandonmentService } from '../services/cartAbandonmentService';

const router = express.Router();

// Track cart activity (called when user interacts with cart)
router.post('/track', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    await cartAbandonmentService.trackCartActivity(userId);

    res.json({
      success: true,
      message: 'Cart activity tracked'
    });
  } catch (error) {
    console.error('Track cart activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking cart activity'
    });
  }
});

// Mark cart as recovered (called when user completes purchase)
router.post('/recover', requireAuth, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    await cartAbandonmentService.markCartRecovered(userId);

    res.json({
      success: true,
      message: 'Cart marked as recovered'
    });
  } catch (error) {
    console.error('Mark cart recovered error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking cart as recovered'
    });
  }
});

// Admin routes - Get abandonment analytics
router.get('/admin/analytics', requireAdmin, [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const days = parseInt(req.query.days) || 30;
    
    const analytics = await cartAbandonmentService.getAbandonmentAnalytics(days);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get abandonment analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching abandonment analytics'
    });
  }
});

// Admin routes - Get abandoned carts for manual intervention
router.get('/admin/abandoned-carts', requireAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const abandonedCarts = await cartAbandonmentService.getAbandonedCartsForReminders();
    
    // Paginate results
    const paginatedCarts = abandonedCarts.slice(offset, offset + limit);
    const total = abandonedCarts.length;

    res.json({
      success: true,
      data: {
        abandoned_carts: paginatedCarts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get abandoned carts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching abandoned carts'
    });
  }
});

// Admin routes - Manually send reminder to specific user
router.post('/admin/send-reminder/:userId', requireAdmin, [
  param('userId').isUUID().withMessage('Valid user ID is required'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    
    // Get the specific abandoned cart
    const abandonedCarts = await cartAbandonmentService.getAbandonedCartsForReminders();
    const userCart = abandonedCarts.find(cart => cart.user_id === userId);
    
    if (!userCart) {
      return res.status(404).json({
        success: false,
        message: 'No abandoned cart found for this user'
      });
    }

    const success = await cartAbandonmentService.sendAbandonmentReminder(userCart);

    if (success) {
      res.json({
        success: true,
        message: 'Reminder sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send reminder'
      });
    }
  } catch (error) {
    console.error('Send manual reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reminder'
    });
  }
});

// Admin routes - Process all pending reminders
router.post('/admin/process-reminders', requireAdmin, async (req: any, res: any) => {
  try {
    const result = await cartAbandonmentService.processAbandonmentReminders();

    res.json({
      success: true,
      data: result,
      message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`
    });
  } catch (error) {
    console.error('Process reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing reminders'
    });
  }
});

// Admin routes - Mark abandoned carts (manual trigger)
router.post('/admin/mark-abandoned', requireAdmin, async (req: any, res: any) => {
  try {
    const markedCount = await cartAbandonmentService.markAbandonedCarts();

    res.json({
      success: true,
      data: { marked_count: markedCount },
      message: `Marked ${markedCount} carts as abandoned`
    });
  } catch (error) {
    console.error('Mark abandoned carts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking abandoned carts'
    });
  }
});

// Admin routes - Cleanup old records
router.delete('/admin/cleanup', requireAdmin, [
  query('days').optional().isInt({ min: 30, max: 365 }).withMessage('Days must be between 30 and 365'),
  handleValidation
], async (req: any, res: any) => {
  try {
    const days = parseInt(req.query.days) || 90;
    
    const cleanedCount = await cartAbandonmentService.cleanupOldRecords(days);

    res.json({
      success: true,
      data: { cleaned_count: cleanedCount },
      message: `Cleaned up ${cleanedCount} old abandonment records`
    });
  } catch (error) {
    console.error('Cleanup abandonment records error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cleaning up old records'
    });
  }
});

// Get abandonment statistics for dashboard
router.get('/admin/stats', requireAdmin, async (req: any, res: any) => {
  try {
    const [recentAnalytics, todayStats] = await Promise.all([
      cartAbandonmentService.getAbandonmentAnalytics(7), // Last 7 days
      cartAbandonmentService.getAbandonmentAnalytics(1)  // Today only
    ]);

    // Calculate some quick stats
    const weeklyTrend = recentAnalytics.daily_abandonment.length > 1 ? 
      ((recentAnalytics.daily_abandonment[0]?.abandoned_count || 0) - 
       (recentAnalytics.daily_abandonment[1]?.abandoned_count || 0)) : 0;

    res.json({
      success: true,
      data: {
        overview: {
          total_abandoned_this_week: recentAnalytics.total_abandoned_carts,
          recovery_rate_this_week: recentAnalytics.recovery_rate,
          lost_revenue_this_week: recentAnalytics.total_lost_revenue,
          today_abandoned: todayStats.total_abandoned_carts,
          weekly_trend: weeklyTrend
        },
        recent_daily_data: recentAnalytics.daily_abandonment.slice(0, 7)
      }
    });
  } catch (error) {
    console.error('Get abandonment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching abandonment statistics'
    });
  }
});

export default router;