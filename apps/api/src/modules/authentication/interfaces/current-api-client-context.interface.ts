// The request-scoped context attached to request.apiClient by ApiClientGuard.
// Extracted by the @CurrentApiClient() decorator in machine-authenticated routes.
export interface CurrentApiClientContext {
  clientId: string;
  tenantId: string;
  serviceName: string;
  permissions: string[]; // the client's granted scopes, used for RBAC evaluation
  scopes: string[];      // raw scopes from DB (same data, kept for semantic clarity)
}
