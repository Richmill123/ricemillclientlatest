import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../../services/order.service';

export const ORDER_STATUS = {
  CREATED: 'CREATED',
  INITIAL_STOCKING: 'INITIAL STOCKING',
  BOILING_PROCESS_COMPLETED: 'BOILING PROCESS COMPLETED',
  SPLITTING_PROCESS_COMPLETED: 'SPLITTING PROCESS COMPLETED',
  PACKED_READY: 'PACKED & READY',
  PAID_CLOSE: 'PAID & CLOSE'
} as const;

type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

@Component({
  selector: 'app-order-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './order-form-dialog.component.html',
  styleUrls: ['./order-form-dialog.component.scss']
})
export class OrderFormDialogComponent implements OnInit {
  orderForm: FormGroup;
  loading = false;
  error: string | null = null;

  statusOptions: Array<{ value: string; label: string }> = [];

  submitted = false;

  isEdit = false;
  orderId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private orderService: OrderService,
    public dialogRef: MatDialogRef<OrderFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.isEdit = data?.isEdit || false;

    if (this.isEdit && data?.orderData) {
      this.orderId = data.orderData._id;
    }
    const today = new Date().toISOString().slice(0, 10);
    this.orderForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      villageName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      address: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      phoneNumber: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{10}$')
      ]],
      typeOfPaddy: ['', [Validators.required]],
      numberOfBags: ['', [
        Validators.required,
        Validators.min(1),
        Validators.max(10000),
        Validators.pattern('^[0-9]*$')
      ]],
      totalAmount: ['', [
        Validators.required,
        Validators.min(0),
        Validators.pattern('^[0-9]+(\.[0-9]{1,2})?$')
      ]],
      advanceAmount: ['', [
        Validators.required,
        Validators.min(0),
        Validators.pattern('^[0-9]+(\.[0-9]{1,2})?$')
      ]],
      splittingincome: [''],
       createdAt: [today, [Validators.required]],
      status: [ORDER_STATUS.CREATED, [Validators.required]]
    }, {
      validators: [this.advanceLessThanTotalValidator],
      updateOn: 'blur'
    });
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  private normalizeDateForInput(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      return value.length >= 10 ? value.slice(0, 10) : value;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  ngOnInit() {
    // Build status options: CREATED → each preference stage → PAID & CLOSE
    const stages: string[] = this.data?.stages ?? [
      'Initial Stocking', 'Boiling Process Completed', 'Splitting Process Completed', 'Packed & Ready'
    ];
    this.statusOptions = [
      { value: ORDER_STATUS.CREATED, label: 'Created' },
      ...stages.map(s => ({ value: s.toUpperCase(), label: s })),
      { value: ORDER_STATUS.PAID_CLOSE, label: 'Paid & Close' },
    ];

    if (this.isEdit && this.data?.orderData) {
      const orderData = this.data.orderData;
      this.orderForm.patchValue({
        name: orderData.name,
        villageName: orderData.villageName,
        address: orderData.address,
        phoneNumber: orderData.phoneNumber,
        typeOfPaddy: orderData.typeOfPaddy,
        numberOfBags: orderData.numberOfBags,
        totalAmount: orderData.totalAmount,
        advanceAmount: orderData.advanceAmount,
        splittingincome: orderData.splittingincome,
        createdAt: this.normalizeDateForInput(orderData.createdAt),
        status: orderData.status
      });
    }

    Object.keys(this.orderForm.controls).forEach(key => {
      const control = this.orderForm.get(key);
      control?.markAsUntouched();
    });
  }

  isFieldInvalid(field: string): boolean {
    const control = this.orderForm.get(field);
    return !!control && control.invalid && (control.touched || this.submitted);
  }

  getErrorMessage(field: string): string {
    const control = this.orderForm.get(field);

    if (!control || !control.errors) return '';

    if (control.hasError('required')) {
      return 'This field is required';
    } else if (control.hasError('minlength')) {
      return `Minimum length is ${control.getError('minlength').requiredLength} characters`;
    } else if (control.hasError('maxlength')) {
      return `Maximum length is ${control.getError('maxlength').requiredLength} characters`;
    } else if (control.hasError('min')) {
      return `Minimum value is ${control.getError('min').min}`;
    } else if (control.hasError('max')) {
      return `Maximum value is ${control.getError('max').max}`;
    } else if (control.hasError('pattern')) {
      if (field === 'phoneNumber') return 'Please enter a valid 10-digit phone number';
      if (field === 'numberOfBags') return 'Please enter a whole number';
      return 'Invalid format';
    } else if (field === 'advanceAmount' && this.orderForm.hasError('advanceExceedsTotal')) {
      return 'Advance cannot be greater than total amount';
    }

    return '';
  }

  private advanceLessThanTotalValidator(group: AbstractControl): ValidationErrors | null {
    const total = group.get('totalAmount')?.value;
    const advance = group.get('advanceAmount')?.value;

    if (total === null || advance === null) {
      return null;
    }

    return advance > total ? { 'advanceExceedsTotal': true } : null;
  }

  onSubmit(): void {
    this.submitted = true;

    Object.keys(this.orderForm.controls).forEach(key => {
      const control = this.orderForm.get(key);
      control?.markAsTouched();
    });

    if (this.orderForm.invalid) {
      const invalidField = Object.keys(this.orderForm.controls).find(key => this.orderForm.get(key)?.invalid);
      if (invalidField) {
        const invalidControl = document.querySelector(`[formControlName="${invalidField}"]`);
        if (invalidControl) {
          (invalidControl as HTMLElement).focus();
        }
      }
      return;
    }

    this.loading = true;
    this.error = null;

    const orderData = {
      ...this.orderForm.value,
      clientId: this.getClientId()
    };

    const request = this.isEdit
      ? this.orderService.updateOrder(this.orderId!, orderData)
      : this.orderService.createOrder(orderData);

    request.subscribe({
      next: (response: any) => {
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        console.error('Error in order operation:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error
        });
        this.error = error.error?.message || `Failed to ${this.isEdit ? 'update' : 'create'} order. Please try again.`;
        this.loading = false;

        setTimeout(() => {
          const errorElement = document.querySelector('.error-message');
          errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
