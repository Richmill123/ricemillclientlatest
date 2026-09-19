import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface SuspenseRecord {
  _id?: string;
  clientId: string;
  employeeId: string;
  employeeName: string;
  totalDebt: number;
  totalAdvance: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SuspenseCreateRequest = Omit<SuspenseRecord, '_id' | 'createdAt' | 'updatedAt'>;
export type SuspenseUpdateRequest = Partial<Omit<SuspenseRecord, '_id' | 'createdAt' | 'updatedAt'>> & { clientId: string };

@Injectable({ providedIn: 'root' })
export class SuspenseService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private auth: AuthService) {}

  getSuspense(): Observable<SuspenseRecord[]> {
    const clientId = this.auth.getClientId();
    return this.http.get<SuspenseRecord[]>(`${this.apiUrl}/suspense?clientId=${encodeURIComponent(clientId)}`);
  }

  createSuspense(payload: SuspenseCreateRequest): Observable<SuspenseRecord> {
    return this.http.post<SuspenseRecord>(`${this.apiUrl}/suspense`, payload);
  }

  updateSuspense(id: string, payload: SuspenseUpdateRequest): Observable<SuspenseRecord> {
    return this.http.put<SuspenseRecord>(`${this.apiUrl}/suspense/${id}`, payload);
  }

  deleteSuspense(id: string): Observable<unknown> {
    const clientId = this.auth.getClientId();
    return this.http.delete(`${this.apiUrl}/suspense/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
