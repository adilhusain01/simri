import * as cron from 'node-cron';
import { cartAbandonmentService } from './cartAbandonmentService';

class ScheduledJobsService {
  private jobs: Map<string, any> = new Map();

  /**
   * Initialize all scheduled jobs
   */
  startAllJobs(): void {
    this.startAbandonmentTracking();
    this.startReminderProcessing();
    this.startCleanupJob();
    
    console.log('✅ All scheduled jobs started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped scheduled job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Start cart abandonment detection job
   * Runs every 2 hours to mark carts as abandoned
   */
  private startAbandonmentTracking(): void {
    const job = cron.schedule('0 */2 * * *', async () => {
      try {
        console.log('🔍 Running cart abandonment detection...');
        const markedCount = await cartAbandonmentService.markAbandonedCarts();
        console.log(`✅ Marked ${markedCount} carts as abandoned`);
      } catch (error) {
        console.error('❌ Cart abandonment detection error:', error);
      }
    });

    this.jobs.set('abandonment-detection', job);
    console.log('📅 Cart abandonment detection job scheduled (every 2 hours)');
  }

  /**
   * Start reminder email processing job
   * Runs every hour to send abandonment reminders
   */
  private startReminderProcessing(): void {
    const job = cron.schedule('0 * * * *', async () => {
      try {
        console.log('📧 Processing cart abandonment reminders...');
        const result = await cartAbandonmentService.processAbandonmentReminders();
        console.log(`✅ Processed reminders: ${result.sent} sent, ${result.failed} failed`);
      } catch (error) {
        console.error('❌ Reminder processing error:', error);
      }
    });

    this.jobs.set('reminder-processing', job);
    console.log('📅 Reminder processing job scheduled (every hour)');
  }

  /**
   * Start cleanup job for old abandonment records
   * Runs daily at 2 AM to clean up old records
   */
  private startCleanupJob(): void {
    const job = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Cleaning up old abandonment records...');
        const cleanedCount = await cartAbandonmentService.cleanupOldRecords(90); // Keep 90 days
        console.log(`✅ Cleaned up ${cleanedCount} old abandonment records`);
      } catch (error) {
        console.error('❌ Cleanup job error:', error);
      }
    });

    this.jobs.set('cleanup-old-records', job);
    console.log('📅 Cleanup job scheduled (daily at 2 AM)');
  }

  /**
   * Get job status
   */
  getJobStatus(): Array<{name: string; running: boolean}> {
    const status: Array<{name: string; running: boolean}> = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: job.running
      });
    });

    return status;
  }

  /**
   * Start a specific job
   */
  startJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job && !job.running) {
      job.start();
      console.log(`▶️ Started job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job && job.running) {
      job.stop();
      console.log(`⏸️ Stopped job: ${jobName}`);
      return true;
    }
    return false;
  }

  /**
   * Run a job immediately (for testing/manual trigger)
   */
  async runJobNow(jobName: string): Promise<{ success: boolean; message: string }> {
    try {
      switch (jobName) {
        case 'abandonment-detection':
          console.log('🔄 Running abandonment detection manually...');
          const markedCount = await cartAbandonmentService.markAbandonedCarts();
          return { 
            success: true, 
            message: `Marked ${markedCount} carts as abandoned` 
          };

        case 'reminder-processing':
          console.log('🔄 Running reminder processing manually...');
          const result = await cartAbandonmentService.processAbandonmentReminders();
          return { 
            success: true, 
            message: `Processed reminders: ${result.sent} sent, ${result.failed} failed` 
          };

        case 'cleanup-old-records':
          console.log('🔄 Running cleanup manually...');
          const cleanedCount = await cartAbandonmentService.cleanupOldRecords(90);
          return { 
            success: true, 
            message: `Cleaned up ${cleanedCount} old records` 
          };

        default:
          return { 
            success: false, 
            message: `Unknown job: ${jobName}` 
          };
      }
    } catch (error) {
      console.error(`❌ Manual job execution error (${jobName}):`, error);
      return { 
        success: false, 
        message: `Error executing job: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
}

export const scheduledJobsService = new ScheduledJobsService();