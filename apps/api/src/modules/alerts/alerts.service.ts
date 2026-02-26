import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ALERT_QUEUE_NAME, ALERT_JOB_NAMES } from './constants/alerts.constants';

/**
 * AlertsService — public facade for the alerts module.
 *
 * Allows other modules to imperatively enqueue alert checks or
 * trigger notifications without importing BullMQ internals.
 * The three processors are the primary consumers; this service
 * is an escape hatch for on-demand triggering.
 */
@Injectable()
export class AlertsService {
  constructor(@InjectQueue(ALERT_QUEUE_NAME) private readonly alertQueue: Queue) {}

  /** Enqueue an immediate meta-shift check at highest priority. */
  async triggerMetaShiftCheck(threshold = 0.03): Promise<void> {
    await this.alertQueue.add(
      ALERT_JOB_NAMES.CHECK_META_SHIFT,
      { threshold },
      { priority: 1, attempts: 1, jobId: `meta-shift-manual-${Date.now()}` }
    );
  }

  /** Enqueue an immediate new-comp scan at highest priority. */
  async triggerNewCompCheck(): Promise<void> {
    await this.alertQueue.add(
      ALERT_JOB_NAMES.CHECK_NEW_COMP,
      {},
      { priority: 1, attempts: 1, jobId: `new-comp-manual-${Date.now()}` }
    );
  }

  /** Enqueue an immediate patch-drop check at highest priority. */
  async triggerPatchDropCheck(): Promise<void> {
    await this.alertQueue.add(
      ALERT_JOB_NAMES.CHECK_PATCH_DROP,
      {},
      { priority: 1, attempts: 1, jobId: `patch-drop-manual-${Date.now()}` }
    );
  }
}
