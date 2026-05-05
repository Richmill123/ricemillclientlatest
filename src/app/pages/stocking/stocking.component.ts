import { Component, ElementRef, Inject, NgZone, OnInit, ViewChild } from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { StockService, Stock } from '../../services/stock.service';
import { PreferenceService } from '../../services/preference.service';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-stocking',
  standalone: true,
  imports: [
    AgGridModule,
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './stocking.component.html',
  styleUrls: ['./stocking.component.scss']
})
export class StockingComponent implements OnInit {
  private gridApi!: GridApi;

  rowData: any[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'itemType', headerName: 'Item Type', sortable: true, filter: true, flex: 1 },
    {
      field: 'availableQuantity', headerName: 'Available Quantity',
      sortable: true, filter: true, width: 180,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${p.value} Bags` : '0 Bags'
    },
    {
      field: 'updatedAt', headerName: 'Last Updated',
      sortable: true, width: 200,
      valueFormatter: (p: ValueFormatterParams) => p.value ? new Date(p.value).toLocaleString('en-IN') : 'N/A'
    },
    {
      headerName: 'Actions', field: 'actions', sortable: false, filter: false, width: 120,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';

        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEditClick(params.data._id); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.innerHTML = 'delete';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data._id); });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = { flex: 1, minWidth: 100, resizable: true };

  constructor(
    private stockService: StockService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar,
    private prefService: PreferenceService,
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.searchTerm = term;
      this.loadStocks();
    });
  }

  ngOnInit(): void {
    // Ensure preference output types are loaded
    if (!this.prefService.snapshot) this.prefService.load().subscribe();
    this.loadStocks();
  }

  private getClientId(): string {
    try {
      const raw = sessionStorage.getItem('user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return String(parsed?._id ?? parsed);
    } catch { return ''; }
  }

  onSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  onGridReady(params: GridReadyEvent): void { this.gridApi = params.api; }

  loadStocks(): void {
    this.loading = true;
    this.stockService.getStocks().subscribe({
      next: (data) => {
        let filtered = data || [];
        if (this.searchTerm) {
          const s = this.searchTerm.toLowerCase();
          filtered = filtered.filter((stock: Stock) => (stock.itemType || '').toLowerCase().includes(s));
        }
        this.rowData = filtered;
        if (this.gridApi) this.gridApi.setGridOption('rowData', filtered);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stocks:', error);
        this.snackBar.open('Error loading stocks', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const itemTypes = this.prefService.getOutputTypes();
    const dialogRef = this.dialog.open(StockFormAddDialogComponent, {
      width: '500px',
      data: { itemTypes },
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.stockService.createStock({ ...result, clientId: this.getClientId() }).subscribe({
        next: () => {
          this.snackBar.open('Stock added successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
          this.loadStocks();
        },
        error: (error) => {
          this.snackBar.open(error?.error?.message || 'Error adding stock', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        }
      });
    });
  }

  onEditClick(id: string): void {
    const stock = this.rowData.find(s => s._id === id);
    if (!stock) return;
    const itemTypes = this.prefService.getOutputTypes();
    this.zone.run(() => {
      const dialogRef = this.dialog.open(StockFormDialogComponent, {
        width: '500px',
        data: { stock: { ...stock }, itemTypes },
        autoFocus: false,
        restoreFocus: true
      });

      dialogRef.afterClosed().subscribe((result: any) => {
        if (!result) return;
        this.loading = true;
        this.stockService.updateStock(stock._id, {
          quantity: result.availableQuantity,
          clientId: this.getClientId()
        }).subscribe({
          next: () => {
            this.snackBar.open('Stock updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadStocks();
          },
          error: (error) => {
            this.snackBar.open(error?.error?.message || 'Error updating stock', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
            this.loading = false;
          }
        });
      });
    });
  }

  onDeleteClick(id: string): void {
    if (!confirm('Are you sure you want to delete this stock item? This action cannot be undone.')) return;
    this.loading = true;
    this.stockService.deleteStock(id).subscribe({
      next: () => {
        this.snackBar.open('Stock deleted successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadStocks();
      },
      error: (error) => {
        this.snackBar.open(error?.error?.message || 'Error deleting stock', 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }
}

@Component({
  selector: 'app-stock-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Edit Stock</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="formInnerWrap">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Item Type</mat-label>
            <mat-select formControlName="itemType">
              <mat-option *ngFor="let type of itemTypes" [value]="type">{{ type | titlecase }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Available Quantity (Bags)</mat-label>
            <input matInput type="number" formControlName="availableQuantity">
            <span matSuffix>Bags</span>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Update</button>
    </mat-dialog-actions>
  `
})
export class StockFormDialogComponent implements OnInit {
  readonly itemTypes: string[];
  form: FormGroup;

  @ViewChild('quantityInput') quantityInput?: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    public cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<StockFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { stock: Stock; itemTypes?: string[] }
  ) {
    this.itemTypes = data?.itemTypes?.length ? data.itemTypes : ['bran', 'husk', 'black rice', 'broken rice', 'Karika', 'others'];
    this.form = this.fb.group({
      itemType: [{ value: data?.stock?.itemType || '', disabled: true }, Validators.required],
      availableQuantity: [data?.stock?.availableQuantity ?? 0, [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.data?.stock) {
      this.form.patchValue({
        itemType: this.data.stock.itemType || '',
        availableQuantity: this.data.stock.availableQuantity ?? 0
      });
      this.cdr.detectChanges();
    }
  }

  onSave(): void { this.dialogRef.close(this.form.getRawValue()); }
  onCancel(): void { this.dialogRef.close(); }
}

@Component({
  selector: 'app-stock-form-add-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Add Stock</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <div class="formInnerWrap">
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Item Type</mat-label>
            <mat-select formControlName="itemType">
              <mat-option *ngFor="let type of itemTypes" [value]="type">{{ type | titlecase }}</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Available Quantity (Bags)</mat-label>
            <input matInput type="number" formControlName="availableQuantity">
            <span matSuffix>Bags</span>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class StockFormAddDialogComponent {
  readonly itemTypes: string[];
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<StockFormAddDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { itemTypes?: string[] }
  ) {
    this.itemTypes = data?.itemTypes?.length ? data.itemTypes : ['bran', 'husk', 'black rice', 'broken rice', 'Karika', 'others'];
    this.form = this.fb.group({
      itemType: ['', Validators.required],
      availableQuantity: [0, [Validators.required, Validators.min(0)]]
    });
  }

  onSave(): void { this.dialogRef.close(this.form.getRawValue()); }
  onCancel(): void { this.dialogRef.close(); }
}
