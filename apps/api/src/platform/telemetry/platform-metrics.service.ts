import { Injectable } from '@nestjs/common';

@Injectable()
export class PlatformMetricsService {
  private readonly counters = new Map<string, number>();
  private readonly durations = new Map<string, number[]>();

  increment(name: string, value = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + value);
  }

  observe(name: string, durationMs: number): void {
    this.durations.set(name, [...(this.durations.get(name) ?? []), durationMs]);
  }

  snapshot(): Readonly<{
    counters: Map<string, number>;
    durations: Map<string, number[]>;
  }> {
    return { counters: this.counters, durations: this.durations };
  }
}
