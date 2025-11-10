declare class ScheduledJobsService {
    private jobs;
    /**
     * Initialize all scheduled jobs
     */
    startAllJobs(): void;
    /**
     * Stop all scheduled jobs
     */
    stopAllJobs(): void;
    /**
     * Start cart abandonment detection job
     * Runs every 2 hours to mark carts as abandoned
     */
    private startAbandonmentTracking;
    /**
     * Start reminder email processing job
     * Runs every hour to send abandonment reminders
     */
    private startReminderProcessing;
    /**
     * Start cleanup job for old abandonment records
     * Runs daily at 2 AM to clean up old records
     */
    private startCleanupJob;
    /**
     * Get job status
     */
    getJobStatus(): Array<{
        name: string;
        running: boolean;
    }>;
    /**
     * Start a specific job
     */
    startJob(jobName: string): boolean;
    /**
     * Stop a specific job
     */
    stopJob(jobName: string): boolean;
    /**
     * Run a job immediately (for testing/manual trigger)
     */
    runJobNow(jobName: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
export declare const scheduledJobsService: ScheduledJobsService;
export {};
