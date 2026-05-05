import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';

export interface Income {
  _id?: string;
  clientId: string;
  item: string;
  description?: string;
  amount: number;
  category?: string;
  date: string;
  paymentMethod: PaymentMethod;
  receiptNumber?: string;
  recordedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type IncomeCreateRequest = Omit<Income, '_id' | 'createdAt' | 'updatedAt'>;
export type IncomeUpdateRequest = Partial<Omit<Income, '_id' | 'createdAt' | 'updatedAt'>> & { clientId: string };

@Injectable({ providedIn: 'root' })
export class IncomeService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  getIncome(): Observable<Income[]> {
    const clientId = this.getClientId();
    return this.http.get<Income[]>(`${this.apiUrl}/income?clientId=${encodeURIComponent(clientId)}`);
  }

  createIncome(payload: IncomeCreateRequest): Observable<Income> {
    return this.http.post<Income>(`${this.apiUrl}/income`, payload);
  }

  updateIncome(id: string, payload: IncomeUpdateRequest): Observable<Income> {
    return this.http.put<Income>(`${this.apiUrl}/income/${id}`, payload);
  }

  deleteIncome(id: string): Observable<unknown> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/income/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
