/**
 * In-memory access-token holder.
 * Refresh tokens live only in HttpOnly cookies — never here, never in storage.
 */
let accessToken: string | null = null;
let challengeToken: string | null = null;
let loggingOut = false;

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },

  setAccessToken(token: string | null): void {
    accessToken = token;
  },

  clearAccessToken(): void {
    accessToken = null;
  },

  getChallengeToken(): string | null {
    return challengeToken;
  },

  setChallengeToken(token: string | null): void {
    challengeToken = token;
  },

  clearChallengeToken(): void {
    challengeToken = null;
  },

  beginLogout(): void {
    loggingOut = true;
  },

  endLogout(): void {
    loggingOut = false;
  },

  isLoggingOut(): boolean {
    return loggingOut;
  },

  clearAll(): void {
    accessToken = null;
    challengeToken = null;
  },
};
