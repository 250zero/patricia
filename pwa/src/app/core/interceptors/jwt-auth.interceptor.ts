import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const jwtAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const activeRole = auth.activeRole();

  if (!token || req.url.includes('/auth/login')) {
    return next(req);
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (activeRole) {
    headers['X-Active-Role'] = String(activeRole.id);
  }

  return next(req.clone({ setHeaders: headers }));
};
