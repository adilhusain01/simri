"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledJobsService = void 0;
const cron = __importStar(require("node-cron"));
const cartAbandonmentService_1 = require("./cartAbandonmentService");
class ScheduledJobsService {
    constructor() {
        this.jobs = new Map();
    }
    /**
     * Initialize all scheduled jobs
     */
    startAllJobs() {
        this.startAbandonmentTracking();
        this.startReminderProcessing();
        this.startCleanupJob();
        console.log('✅ All scheduled jobs started successfully');
    }
    /**
     * Stop all scheduled jobs
     */
    stopAllJobs() {
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
    startAbandonmentTracking() {
        const job = cron.schedule('0 */2 * * *', async () => {
            try {
                console.log('🔍 Running cart abandonment detection...');
                const markedCount = await cartAbandonmentService_1.cartAbandonmentService.markAbandonedCarts();
                console.log(`✅ Marked ${markedCount} carts as abandoned`);
            }
            catch (error) {
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
    startReminderProcessing() {
        const job = cron.schedule('0 * * * *', async () => {
            try {
                console.log('📧 Processing cart abandonment reminders...');
                const result = await cartAbandonmentService_1.cartAbandonmentService.processAbandonmentReminders();
                console.log(`✅ Processed reminders: ${result.sent} sent, ${result.failed} failed`);
            }
            catch (error) {
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
    startCleanupJob() {
        const job = cron.schedule('0 2 * * *', async () => {
            try {
                console.log('🧹 Cleaning up old abandonment records...');
                const cleanedCount = await cartAbandonmentService_1.cartAbandonmentService.cleanupOldRecords(90); // Keep 90 days
                console.log(`✅ Cleaned up ${cleanedCount} old abandonment records`);
            }
            catch (error) {
                console.error('❌ Cleanup job error:', error);
            }
        });
        this.jobs.set('cleanup-old-records', job);
        console.log('📅 Cleanup job scheduled (daily at 2 AM)');
    }
    /**
     * Get job status
     */
    getJobStatus() {
        const status = [];
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
    startJob(jobName) {
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
    stopJob(jobName) {
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
    async runJobNow(jobName) {
        try {
            switch (jobName) {
                case 'abandonment-detection':
                    console.log('🔄 Running abandonment detection manually...');
                    const markedCount = await cartAbandonmentService_1.cartAbandonmentService.markAbandonedCarts();
                    return {
                        success: true,
                        message: `Marked ${markedCount} carts as abandoned`
                    };
                case 'reminder-processing':
                    console.log('🔄 Running reminder processing manually...');
                    const result = await cartAbandonmentService_1.cartAbandonmentService.processAbandonmentReminders();
                    return {
                        success: true,
                        message: `Processed reminders: ${result.sent} sent, ${result.failed} failed`
                    };
                case 'cleanup-old-records':
                    console.log('🔄 Running cleanup manually...');
                    const cleanedCount = await cartAbandonmentService_1.cartAbandonmentService.cleanupOldRecords(90);
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
        }
        catch (error) {
            console.error(`❌ Manual job execution error (${jobName}):`, error);
            return {
                success: false,
                message: `Error executing job: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
exports.scheduledJobsService = new ScheduledJobsService();
//# sourceMappingURL=scheduledJobsService.js.map