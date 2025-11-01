export interface AuthCredentials {
  email: string;
  password: string;
  token?: string;
}

export interface LoginResponse {
  token: string;
  role?: string;
  userId?: string;
}

export interface DecodedToken {
  email: string;
  userId: string;
  role: string;
  iat: number;
  exp: number;
}
