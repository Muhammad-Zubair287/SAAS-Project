import type { Processor, Worker } from 'bullmq';
import { WorkerRuntimeService } from './worker-runtime.service';

export abstract class AbstractWorker<T> {
  protected constructor(private readonly runtime: WorkerRuntimeService) {}

  protected start(queueName: string, processor: Processor<T>): Worker<T> {
    return this.runtime.register(queueName, processor);
  }
}
