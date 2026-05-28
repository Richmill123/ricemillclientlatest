import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SubscriptionInfo {
  active: boolean;
  subscription: {
    razorpaySubscriptionId?: string;
    status?: string;
    nextBillingAt?: string;
    paymentId?: string;
  } | null;
  live: {
    status: string;
    currentEnd: string | null;
    nextBilling: string | null;
  } | null;
  amount: number;
  currency: string;
  createdAt: string;
  keyId: string;
}

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getAdminId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  getStatus(): Observable<SubscriptionInfo> {
    return this.http.get<SubscriptionInfo>(`${this.apiUrl}/admins/${this.getAdminId()}/subscription`);
  }

  cancel(): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/admins/razorpay/cancel`,
      { adminId: this.getAdminId() }
    );
  }

  createSubscription(): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/admins/razorpay/create-subscription`,
      { adminId: this.getAdminId() }
    );
  }

  verifyPayment(payload: {
    razorpay_payment_id: string;
    razorpay_subscription_id: string;
    razorpay_signature: string;
  }): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(
      `${this.apiUrl}/admins/razorpay/verify-payment`,
      { adminId: this.getAdminId(), ...payload }
    );
  }
}
