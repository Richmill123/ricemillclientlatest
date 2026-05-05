import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';

export interface Expense {
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

export type ExpenseCreateRequest = Omit<Expense, '_id' | 'createdAt' | 'updatedAt'>;
export type ExpenseUpdateRequest = Partial<Omit<Expense, '_id' | 'createdAt' | 'updatedAt'>> & { clientId: string };

@Injectable({ providedIn: 'root' })
export class ExpenseService {
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

  getExpenses(): Observable<Expense[]> {
    const clientId = this.getClientId();
    return this.http.get<Expense[]>(`${this.apiUrl}/expenses?clientId=${encodeURIComponent(clientId)}`);
  }

  createExpense(payload: ExpenseCreateRequest): Observable<Expense> {
    return this.http.post<Expense>(`${this.apiUrl}/expenses`, payload);
  }

  updateExpense(id: string, payload: ExpenseUpdateRequest): Observable<Expense> {
    return this.http.put<Expense>(`${this.apiUrl}/expenses/${id}`, payload);
  }

  deleteExpense(id: string): Observable<unknown> {
    const clientId = this.getClientId();
    return this.http.delete(`${this.apiUrl}/expenses/${id}?clientId=${encodeURIComponent(clientId)}`);
  }
}
