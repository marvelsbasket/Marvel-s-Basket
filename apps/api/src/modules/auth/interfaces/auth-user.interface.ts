export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  tokenFamilyId?: string;
}
