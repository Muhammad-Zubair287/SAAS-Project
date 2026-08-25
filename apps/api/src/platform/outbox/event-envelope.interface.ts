export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  tenantId?: string | null;
  correlationId?: string;
  causationId?: string;
  occurredAt: string;
  payload: TPayload;
}
