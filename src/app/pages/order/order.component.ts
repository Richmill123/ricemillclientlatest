import { Component, OnInit, ViewChild } from '@angular/core';
import { ColDef, GridReadyEvent, GridApi, ICellRendererParams, ModuleRegistry } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { AllCommunityModule } from 'ag-grid-community';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OrderFormDialogComponent } from './order-form-dialog/order-form-dialog.component';
import { OrderService, Order } from '../../services/order.service';
import { PreferenceService } from '../../services/preference.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

ModuleRegistry.registerModules([AllCommunityModule]);

@Component({
  selector: 'app-order',
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
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {
  private gridApi!: GridApi;

  public columnDefs: ColDef[] = [
    {
      field: 'name',
      headerName: 'Name',
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 130
    },
    {
      field: 'villageName',
      headerName: 'Village',
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 120
    },
    {
      field: 'phoneNumber',
      headerName: 'Phone',
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 130
    },
    {
      field: 'typeOfPaddy',
      headerName: 'Paddy Type',
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 130
    },
    {
      field: 'numberOfBags',
      headerName: 'Bags',
      filter: 'agNumberColumnFilter',
      sortable: true,
      resizable: true,
      minWidth: 90
    },
    {
      field: 'totalAmount',
      headerName: 'Total Amount',
      filter: 'agNumberColumnFilter',
      valueFormatter: this.currencyFormatter,
      sortable: true,
      resizable: true,
      minWidth: 130
    },
    {
      field: 'advanceAmount',
      headerName: 'Advance',
      filter: 'agNumberColumnFilter',
      valueFormatter: this.currencyFormatter,
      sortable: true,
      resizable: true,
      minWidth: 110
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      filter: 'agDateColumnFilter',
      valueFormatter: this.dateFormatter,
      sortable: true,
      resizable: true,
      minWidth: 200
    },
    {
      field: 'status',
      headerName: 'Status',
      filter: true,
      sortable: true,
      resizable: true,
      minWidth: 110,
      cellStyle: (params) => this.statusCellStyle(params)
    },

    this.createActionColumn()
  ];

  public defaultColDef: ColDef = {
    sortable: true,
    filter: true,
    resizable: true
  };

  public rowData: Order[] = [];
  public loading = false;
  public searchText = '';

  constructor(
    private orderService: OrderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private prefService: PreferenceService,
  ) { }

  ngOnInit(): void {
    if (!this.prefService.snapshot) this.prefService.load().subscribe();
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;

    this.orderService.getOrders().subscribe({
      next: (data) => {
        this.rowData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loading = false;
      }
    });
  }

  addNewOrder(): void {
    const dialogRef = this.dialog.open(OrderFormDialogComponent, {
      width: '842px',
      maxWidth: '97vw',
      height: '87vh',
      disableClose: true,
      autoFocus: false,
      data: { isEdit: false, stages: this.prefService.snapshot?.stages ?? [] }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Order created successfully!');
        this.loadOrders();
      }
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  currencyFormatter(params: any): string {
    return '₹' + params.value.toLocaleString('en-IN');
  }

  dateFormatter(params: any) {
    const date = new Date(params.value);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    };
    return date.toLocaleString('en-IN', options).replace('GMT+5:30', 'IST');
  }

  statusCellStyle(params: any): any {
    if (params.value === 'COMPLETED') {
      return { color: 'green', 'font-weight': 'bold' };
    } else if (params.value === 'CANCELLED') {
      return { color: 'red', 'font-weight': 'bold' };
    }
    return { 'font-weight': 'bold' };
  }

  private createActionColumn(): ColDef {
    return {
      headerName: 'Actions',
      field: 'actions',
      minWidth: 130,
      sortable: false,
      filter: false,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';

        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.style.color = '#3f51b5';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.editOrder(params.data);
        });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.innerHTML = 'delete';

        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.deleteOrder(params.data);
        });

        div.appendChild(editBtn);
        div.appendChild(deleteBtn);

        return div;
      }
    };
  }

  onGridReady(params: GridReadyEvent): void {
    this.gridApi = params.api;

    this.gridApi.addEventListener('cellClicked', (event: any) => {
      const target = event.event?.target as HTMLElement;
      const button = target?.closest('.action-btn');

      if (button) {
        const action = button.getAttribute('data-action');
        const id = button.getAttribute('data-id');

        if (action && id) {
          event.event.preventDefault();
          event.event.stopPropagation();

          if (action === 'edit') {
            const order = this.rowData.find(o => o._id === id);
            if (order) {
              this.editOrder(order);
            }
          } else if (action === 'delete') {
            const order = this.rowData.find(o => o._id === id);
            if (order) {
              this.deleteOrder(order);
            }
          }
        }
      }
    });
  }

  onSearch(): void {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', this.searchText);
    }
  }

  clearSearch(): void {
    this.searchText = '';
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', '');
    }
  }

  editOrder(order: Order): void {
    const dialogRef = this.dialog.open(OrderFormDialogComponent, {
      width: '842px',
      maxWidth: '97vw',
      height: '87vh',
      disableClose: true,
      autoFocus: false,
      data: {
        isEdit: true,
        orderData: order,
        stages: this.prefService.snapshot?.stages ?? [],
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.showSuccess('Order updated successfully!');
        this.loadOrders();
      }
    });
  }

  private deleteOrder(order: Order): void {
    if (confirm(`Are you sure you want to delete order for ${order.name}?`)) {
      this.orderService.deleteOrder(order._id).subscribe({
        next: () => {
          this.showSuccess('Order deleted successfully!');
          this.loadOrders();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          this.snackBar.open(
            error.error?.message || 'Failed to delete order. Please try again.',
            'Close',
            { duration: 5000, panelClass: ['error-snackbar'] }
          );
        }
      });
    }
  }
}