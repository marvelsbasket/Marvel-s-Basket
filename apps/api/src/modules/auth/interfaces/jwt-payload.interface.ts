export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  tokenFamilyId?: string;
  iat?: number;
  exp?: number;
}

export interface JwtTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // in seconds
}
