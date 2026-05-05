import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, Observable } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/** Endpoints that must never receive the Authorization header */
const PUBLIC_ENDPOINTS = ['/admins/login', '/admins/refresh-token'];

function isPublic(url: string): boolean {
  return PUBLIC_ENDPOINTS.some((e) => url.includes(e));
}

function addBearerToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router
): Observable<any> {
  if (!auth.getRefreshToken()) {
    auth.clearSession();
    router.navigate(['/login']);
    return throwError(() => new Error('Session expired'));
  }

  if (auth.isRefreshing) {
    // Another request is already refreshing — wait for the new token
    return auth.refreshDone$.pipe(
      filter((token): token is string => token !== null && token.length > 0),
      take(1),
      switchMap((token) => next(addBearerToken(req, token)))
    );
  }

  // Kick off the refresh
  return auth.refreshAccessToken().pipe(
    switchMap((res) => next(addBearerToken(req, res.accessToken))),
    catchError((err) => {
      auth.clearSession();
      router.navigate(['/login']);
      return throwError(() => err);
    })
  );
}

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // Skip auth header for public endpoints
  const outgoing = isPublic(req.url)
    ? req
    : auth.getAccessToken()
      ? addBearerToken(req, auth.getAccessToken()!)
      : req;

  return next(outgoing).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isPublic(req.url)) {
        return handle401(req, next, auth, router);
      }
      return throwError(() => error);
    })
  );
};
