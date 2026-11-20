export interface UserRole {
  id: number;
  name: string;
  isPrimary: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: UserRole[];
  activeRole: UserRole;
  permissions: string[];
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}
