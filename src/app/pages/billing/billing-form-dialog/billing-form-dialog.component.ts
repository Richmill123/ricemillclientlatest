import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Billing, BillingItem } from '../../../services/billing.service';

export type BillingDialogResult = Omit<Billing, '_id' | 'clientId' | 'invoiceNo' | 'createdAt' | 'updatedAt'>;

@Component({
  selector: 'app-billing-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './billing-form-dialog.component.html',
  styleUrls: ['./billing-form-dialog.component.scss']
})
export class BillingFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;
  /** Shown read-only in edit mode */
  existingInvoiceNo = '';

  readonly statuses = ['draft', 'sent', 'paid'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BillingFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isEdit: boolean; billing?: Billing }
  ) {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      customerName: ['', [Validators.required, Validators.minLength(2)]],
      date: [today, Validators.required],
      status: ['draft', Validators.required],
      notes: [''],
      items: this.fb.array([this.createItemGroup()])
    });
  }

  ngOnInit(): void {
    if (this.data?.isEdit && this.data.billing) {
      const b = this.data.billing;
      this.existingInvoiceNo = b.invoiceNo ?? '';
      this.form.patchValue({
        customerName: b.customerName ?? '',
        date: (b.date ?? '').slice(0, 10),
        status: b.status ?? 'draft',
        notes: b.notes ?? ''
      });
      const arr = this.form.get('items') as FormArray;
      arr.clear();
      (b.items ?? []).forEach(item => arr.push(this.createItemGroup(item)));
      if (arr.length === 0) arr.push(this.createItemGroup());
    }
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: BillingItem): FormGroup {
    return this.fb.group({
      description: [item?.description ?? '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      rate: [item?.rate ?? 0, [Validators.required, Validators.min(0)]],
      amount: [{ value: item?.amount ?? 0, disabled: true }]
    });
  }

  addItem(): void {
    this.items.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    if (this.items.length > 1) this.items.removeAt(index);
  }

  onItemChange(index: number): void {
    const group = this.items.at(index) as FormGroup;
    const qty = Number(group.get('quantity')?.value ?? 0);
    const rate = Number(group.get('rate')?.value ?? 0);
    group.get('amount')?.setValue((qty * rate).toFixed(2));
  }

  get totalAmount(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const g = ctrl as FormGroup;
      return sum + Number(g.get('quantity')?.value ?? 0) * Number(g.get('rate')?.value ?? 0);
    }, 0);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    const result: BillingDialogResult = {
      customerName: String(raw.customerName).trim(),
      date: String(raw.date),
      status: raw.status,
      notes: raw.notes ? String(raw.notes).trim() : undefined,
      totalAmount: this.totalAmount,
      items: (raw.items as any[]).map(i => ({
        description: String(i.description).trim(),
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        amount: Number(i.quantity) * Number(i.rate)
      }))
    };
    setTimeout(() => { this.dialogRef.close(result); this.loading = false; }, 100);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
