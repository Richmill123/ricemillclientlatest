import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SuspenseRecord } from '../../../services/suspense.service';

export type SuspenseDialogResult = {
  employeeId: string;
  employeeName: string;
  totalDebt: number;
  totalAdvance: number;
  date: string;
  createdAt?: string;
};

@Component({
  selector: 'app-suspense-form-dialog',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './suspense-form-dialog.component.html',
  styleUrls: ['./suspense-form-dialog.component.scss']
})
export class SuspenseFormDialogComponent implements OnInit {
  form: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SuspenseFormDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { isEdit: boolean; record?: SuspenseRecord }
  ) {
    const today = new Date().toISOString().slice(0, 10);
    this.form = this.fb.group({
      employeeId: ['', [Validators.required]],
      employeeName: ['', [Validators.required, Validators.minLength(2)]],
      totalDebt: [null, [Validators.min(0)]],
      totalAdvance: [null, [Validators.min(0)]],
      date: [today, [Validators.required]]
    });

    this.dialogRef.afterOpened().subscribe(() => {
      this.ngOnInit();
    });
  }

  ngOnInit(): void {
    if (this.data?.isEdit && this.data.record) {
      const r = this.data.record;
      this.form.patchValue({
        employeeId: r.employeeId ?? '',
        employeeName: r.employeeName ?? '',
        totalDebt: r.totalDebt == null || r.totalDebt === 0 ? null : Number(r.totalDebt),
        totalAdvance: r.totalAdvance == null || r.totalAdvance === 0 ? null : Number(r.totalAdvance),
        date: (r.date ?? '').slice(0, 10)
      });
    }
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Please fill all required fields correctly', 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.loading = true;
    const raw = this.form.getRawValue();

    const result: SuspenseDialogResult = {
      employeeId: String(raw.employeeId).trim(),
      employeeName: String(raw.employeeName).trim(),
      totalDebt: Number(raw.totalDebt ?? 0) || 0,
      totalAdvance: Number(raw.totalAdvance ?? 0) || 0,
      date: String(raw.date).trim(),
      createdAt: String(raw.date).trim()
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
