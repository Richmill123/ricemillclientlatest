import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { SubscriptionService, SubscriptionInfo } from '../../services/subscription.service';

declare var Razorpay: any;

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDividerModule
  ],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss']
})
export class SubscriptionComponent implements OnInit {
  info: SubscriptionInfo | null = null;
  loading = true;
  cancelling = false;
  reactivating = false;
  error: string | null = null;

  constructor(
    private subscriptionService: SubscriptionService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.subscriptionService.getStatus().subscribe({
      next: info => { this.info = info; this.loading = false; },
      error: err => {
        this.error = err.error?.message || 'Failed to load subscription info';
        this.loading = false;
      }
    });
  }

  get statusLabel(): string {
    const s = this.info?.live?.status || this.info?.subscription?.status;
    if (!s) return this.info?.active ? 'Active' : 'Inactive';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  get statusColor(): string {
    const s = this.info?.live?.status || this.info?.subscription?.status || '';
    if (s === 'active' || this.info?.active) return 'active';
    if (s === 'halted') return 'halted';
    return 'inactive';
  }

  get nextBilling(): string {
    const d = this.info?.live?.nextBilling || this.info?.subscription?.nextBillingAt;
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  cancel(): void {
    if (!confirm('Cancel subscription? Your account will be deactivated at the end of the current billing cycle.')) return;
    this.cancelling = true;
    this.subscriptionService.cancel().subscribe({
      next: () => {
        this.snackBar.open('Subscription cancelled. Account will be deactivated.', 'Close', { duration: 5000 });
        this.cancelling = false;
        this.load();
      },
      error: err => {
        this.snackBar.open(err.error?.message || 'Failed to cancel subscription', 'Close', { duration: 4000 });
        this.cancelling = false;
      }
    });
  }

  reactivate(): void {
    this.reactivating = true;
    this.loadRazorpayScript().then(() => {
      this.subscriptionService.createSubscription().subscribe({
        next: sub => {
          this.reactivating = false;
          this.openRazorpay(sub);
        },
        error: err => {
          this.reactivating = false;
          this.snackBar.open(err.error?.message || 'Failed to create subscription', 'Close', { duration: 4000 });
        }
      });
    }).catch(() => {
      this.reactivating = false;
      this.snackBar.open('Failed to load payment gateway', 'Close', { duration: 4000 });
    });
  }

  private openRazorpay(sub: any): void {
    const options = {
      key:             sub.keyId,
      subscription_id: sub.subscriptionId,
      name:            'Rice Mill Management',
      description:     '₹2,000/month Subscription',
      theme:           { color: '#4f46e5' },
      handler: (response: any) => {
        this.subscriptionService.verifyPayment({
          razorpay_payment_id:      response.razorpay_payment_id,
          razorpay_subscription_id: response.razorpay_subscription_id,
          razorpay_signature:       response.razorpay_signature,
        }).subscribe({
          next: () => {
            this.snackBar.open('Payment successful! Account reactivated.', 'Close', { duration: 5000 });
            this.load();
          },
          error: err => {
            this.snackBar.open(err.error?.message || 'Payment verification failed', 'Close', { duration: 5000 });
          }
        });
      }
    };
    const rzp = new Razorpay(options);
    rzp.open();
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
}
