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
import { Purchase, PurchaseItem } from '../../../services/purchase.service';

export type PurchaseDialogResult = Omit<Purchase, '_id' | 'clientId' | 'createdAt' | 'updatedAt'>;

@Component({
  selector: 'app-purchase-form-dialog',
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
  templateUrl: './purchase-form-dialog.component.html',
  styleUrls: ['./purchase-form-dialog.component.scss']
})
export class PurchaseFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  readonly paymentStatuses = ['paid', 'pending', 'partial'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PurchaseFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isEdit: boolean; purchase?: Purchase }
  ) {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      supplier: ['', [Validators.required, Validators.minLength(2)]],
      date: [today, Validators.required],
      paymentStatus: ['pending', Validators.required],
      items: this.fb.array([this.createItemGroup()])
    });
  }

  ngOnInit(): void {
    if (this.data?.isEdit && this.data.purchase) {
      const p = this.data.purchase;
      this.form.patchValue({
        supplier: p.supplier ?? '',
        date: (p.date ?? '').slice(0, 10),
        paymentStatus: p.paymentStatus ?? 'pending'
      });
      const itemsArray = this.form.get('items') as FormArray;
      itemsArray.clear();
      (p.items ?? []).forEach(item => itemsArray.push(this.createItemGroup(item)));
      if (itemsArray.length === 0) itemsArray.push(this.createItemGroup());
    }
  }

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  createItemGroup(item?: PurchaseItem): FormGroup {
    return this.fb.group({
      description: [item?.description ?? '', Validators.required],
      quantity: [item?.quantity ?? 1, [Validators.required, Validators.min(0.01)]],
      unitPrice: [item?.unitPrice ?? 0, [Validators.required, Validators.min(0)]],
      totalPrice: [{ value: item?.totalPrice ?? 0, disabled: true }]
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
    const price = Number(group.get('unitPrice')?.value ?? 0);
    group.get('totalPrice')?.setValue((qty * price).toFixed(2));
    this.updateTotal();
  }

  get totalAmount(): number {
    return this.items.controls.reduce((sum, ctrl) => {
      const g = ctrl as FormGroup;
      return sum + Number(g.get('quantity')?.value ?? 0) * Number(g.get('unitPrice')?.value ?? 0);
    }, 0);
  }

  updateTotal(): void {}

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const raw = this.form.getRawValue();
    const result: PurchaseDialogResult = {
      supplier: String(raw.supplier).trim(),
      date: String(raw.date),
      paymentStatus: raw.paymentStatus,
      totalAmount: this.totalAmount,
      items: (raw.items as any[]).map(i => ({
        description: String(i.description).trim(),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        totalPrice: Number(i.quantity) * Number(i.unitPrice)
      }))
    };
    setTimeout(() => { this.dialogRef.close(result); this.loading = false; }, 100);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
