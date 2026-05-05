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
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaymentMethod, PaymentStatus, Sale, SaleItem, SaleItemType } from '../../../services/sales.service';

export type SalesDialogResult = {
  name: string;
  phoneNumber: string;
  address: string;
  items: SaleItem[];
  totalAmount: number;
  mydebt: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
};

@Component({
  selector: 'app-sales-form-dialog',
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
  templateUrl: './sales-form-dialog.component.html',
  styleUrls: ['./sales-form-dialog.component.scss']
})
export class SalesFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  private readonly defaultItemTypes: SaleItemType[] = ['bran', 'husk', 'black rice', 'broken rice', 'Karika', 'others'];
  /** Populated from preference.output passed via dialog data */
  itemTypes: SaleItemType[] = [];
  readonly paymentStatuses: PaymentStatus[] = ['Paid', 'Pending', 'Partially Paid'];
  readonly paymentMethods: PaymentMethod[] = ['Cash', 'UPI', 'Bank Transfer', 'Other'];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SalesFormDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { isEdit: boolean; sale?: Sale; itemTypes?: string[] }
  ) {
    this.itemTypes = (data?.itemTypes?.length ? data.itemTypes : this.defaultItemTypes) as SaleItemType[];
    this.form = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      address: ['', Validators.required],
      items: this.fb.array([]),
      totalAmount: [{ value: 0, disabled: true }, [Validators.required]],
      mydebt: [{ value: 0, }],
      paymentStatus: ['Pending' as PaymentStatus, Validators.required],
      paymentMethod: ['Cash' as PaymentMethod, Validators.required]
    });
    this.dialogRef.afterOpened().subscribe(() => {
        this.ngOnInit();
    });
  }

  ngOnInit(): void {
    if (this.data?.isEdit && this.data.sale) {
      const sale = this.data.sale;
      this.form.patchValue({
        name: sale.name,
        phoneNumber: sale.phoneNumber,
        address: sale.address,
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod,
        mydebt: sale.mydebt
      });

      this.clearItems();
      (sale.items || []).forEach(i => this.addItem(i));
      if (!sale.items || sale.items.length === 0) this.addItem();
      this.recalculateTotals();
      return;
    }

    this.addItem();
  }

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  private clearItems(): void {
    while (this.itemsArray.length) this.itemsArray.removeAt(0);
  }

  private createItemGroup(item?: Partial<SaleItem>): FormGroup {
    const quantity = Number(item?.quantity ?? 0);
    const rate = Number(item?.rate ?? 0);
    const amount = Number(item?.amount ?? quantity * rate);

    return this.fb.group({
      itemType: [item?.itemType ?? 'bran', Validators.required],
      quantity: [quantity, [Validators.required, Validators.min(0)]],
      rate: [rate, [Validators.required, Validators.min(0)]],
      amount: [{ value: amount, disabled: true }, [Validators.required, Validators.min(0)]]
    });
  }

  addItem(item?: Partial<SaleItem>): void {
    this.itemsArray.push(this.createItemGroup(item));
    this.recalculateTotals();
  }

  removeItem(index: number): void {
    if (this.itemsArray.length <= 1) return;
    this.itemsArray.removeAt(index);
    this.recalculateTotals();
  }

  onItemValueChange(index: number): void {
    const group = this.itemsArray.at(index) as FormGroup;
    const quantity = Number(group.get('quantity')?.value ?? 0);
    const rate = Number(group.get('rate')?.value ?? 0);
    const amount = quantity * rate;
    group.get('amount')?.setValue(amount, { emitEvent: false });
    this.recalculateTotals();
  }

  private recalculateTotals(): void {
    const items = this.itemsArray.getRawValue() as SaleItem[];
    const total = (items || []).reduce((sum, i) => sum + Number(i.amount || 0), 0);
    this.form.get('totalAmount')?.setValue(total, { emitEvent: false });
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields correctly', 'OK', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }

    if (this.itemsArray.length === 0) {
      this.snackBar.open('Please add at least one item', 'OK', { duration: 3000, panelClass: ['error-snackbar'] });
      return;
    }

    this.loading = true;

    const raw = this.form.getRawValue();
    const items = (raw.items as SaleItem[]).map((i) => {
      const quantity = Number(i.quantity);
      const rate = Number(i.rate);
      const amount = Number(i.amount ?? quantity * rate);
      return {
        itemType: i.itemType,
        quantity,
        rate,
        amount
      } as SaleItem;
    });

    const result: SalesDialogResult = {
      name: String(raw.name).trim(),
      phoneNumber: String(raw.phoneNumber).trim(),
      address: String(raw.address).trim(),
      items,
      totalAmount: Number(raw.totalAmount ?? 0),
      mydebt: Number(raw.mydebt ?? 0),
      paymentStatus: raw.paymentStatus as PaymentStatus,
      paymentMethod: raw.paymentMethod as PaymentMethod
    };

    setTimeout(() => {
      this.dialogRef.close(result);
      this.loading = false;
    }, 100);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
