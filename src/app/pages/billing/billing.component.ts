import { Component, NgZone, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ColDef, GridApi, GridReadyEvent, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';
import { AgGridModule } from 'ag-grid-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Billing, BillingService } from '../../services/billing.service';
import { BillingDialogResult, BillingFormDialogComponent } from './billing-form-dialog/billing-form-dialog.component';
import { DEFAULT_PREFERENCE, MillPreference, PreferenceService } from '../../services/preference.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    AgGridModule,
    CommonModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './billing.component.html',
  styleUrls: ['./billing.component.scss']
})
export class BillingComponent implements OnInit {
  private gridApi!: GridApi;
  public clientId = this.getClientId();

  rowData: Billing[] = [];
  loading = false;
  searchTerm = '';
  private searchSubject = new Subject<string>();

  columnDefs: ColDef[] = [
    { field: 'invoiceNo', headerName: 'Invoice #', sortable: true, filter: true, width: 110 },
    { field: 'customerName', headerName: 'Customer', sortable: true, filter: true, flex: 1, minWidth: 140 },
    {
      field: 'date', headerName: 'Date', sortable: true, filter: true, width: 130,
      valueFormatter: (p: ValueFormatterParams) => this.dateFormatter(p?.value)
    },
    {
      field: 'items', headerName: 'Items', sortable: false, filter: false, flex: 1, minWidth: 160,
      valueFormatter: (p: ValueFormatterParams) => {
        const items = p.value;
        if (!Array.isArray(items) || items.length === 0) return '-';
        return items.map((i: any) => `${i.description} (${i.quantity})`).join(', ');
      }
    },
    {
      field: 'totalAmount', headerName: 'Total Amount', sortable: true, filter: true, width: 150,
      valueFormatter: (p: ValueFormatterParams) => `₹${Number(p.value ?? 0).toLocaleString('en-IN')}`
    },
    {
      field: 'status', headerName: 'Status', sortable: true, filter: true, width: 120,
      cellRenderer: (p: ICellRendererParams) => {
        const status = String(p.value ?? '').toLowerCase();
        const colorMap: Record<string, { bg: string; text: string }> = {
          paid: { bg: '#e8f5e9', text: '#2e7d32' },
          sent: { bg: '#e3f2fd', text: '#1565c0' },
          draft: { bg: '#fff8e1', text: '#f57f17' }
        };
        const c = colorMap[status] ?? { bg: '#f5f5f5', text: '#666' };
        return `<span style="background:${c.bg};color:${c.text};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;text-transform:capitalize">${status}</span>`;
      }
    },
    {
      headerName: 'Actions', field: 'actions', sortable: false, filter: false, width: 160,
      cellRenderer: (params: ICellRendererParams) => {
        const div = document.createElement('div');
        div.className = 'gridActionBtnWrap';

        const printBtn = document.createElement('button');
        printBtn.className = 'mat-icon-button gridAction-print';
        printBtn.innerHTML = 'Print / Download';
        printBtn.title = 'Print or Download Invoice';
        printBtn.addEventListener('click', (e) => { e.stopPropagation(); this.printBill(params.data); });

        const editBtn = document.createElement('button');
        editBtn.className = 'mat-icon-button gridAction-edit';
        editBtn.style.color = '#3f51b5';
        editBtn.innerHTML = 'edit';
        editBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEditClick(params.data?._id); });

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mat-icon-button gridAction-delete';
        deleteBtn.style.color = '#f44336';
        deleteBtn.innerHTML = 'delete';
        deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); this.onDeleteClick(params.data?._id, params.data?.customerName); });

        div.appendChild(printBtn);
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        return div;
      }
    }
  ];

  defaultColDef: ColDef = { flex: 1, minWidth: 100, resizable: true };

  constructor(
    private billingService: BillingService,
    private dialog: MatDialog,
    private zone: NgZone,
    private snackBar: MatSnackBar,
    private prefService: PreferenceService,
  ) {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(term => {
      this.searchTerm = term;
      this.loadBillings();
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

  private getApiErrorMessage(error: any, fallback: string): string {
    const msg = error?.error?.message || error?.message;
    return typeof msg === 'string' && msg.trim() ? msg : fallback;
  }

  ngOnInit(): void {
    // Ensure preference snapshot is populated so printBill has mill info
    if (!this.prefService.snapshot) this.prefService.load().subscribe();
    this.loadBillings();
  }

  onGridReady(params: GridReadyEvent): void { this.gridApi = params.api; }

  onSearchChange(event: Event): void {
    this.searchSubject.next((event.target as HTMLInputElement).value);
  }

  loadBillings(): void {
    this.loading = true;
    this.billingService.getBillings().subscribe({
      next: (data) => {
        let filtered = data || [];
        if (this.searchTerm) {
          const s = this.searchTerm.toLowerCase();
          filtered = filtered.filter((b: Billing) =>
            (b.customerName || '').toLowerCase().includes(s) ||
            (b.invoiceNo || '').toLowerCase().includes(s) ||
            (b.status || '').toLowerCase().includes(s) ||
            String(b.totalAmount ?? '').includes(this.searchTerm)
          );
        }
        this.rowData = filtered;
        if (this.gridApi) this.gridApi.setGridOption('rowData', filtered);
        this.loading = false;
      },
      error: (error) => {
        this.snackBar.open(this.getApiErrorMessage(error, 'Error loading bills'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] });
        this.loading = false;
      }
    });
  }

  onAddClick(): void {
    const dialogRef = this.dialog.open(BillingFormDialogComponent, {
      width: '820px', maxWidth: '96vw', disableClose: true, autoFocus: false,
      data: { isEdit: false }
    });
    dialogRef.afterClosed().subscribe((result?: BillingDialogResult) => {
      if (!result) return;
      this.billingService.createBilling({ ...result, clientId: this.clientId }).subscribe({
        next: () => { this.snackBar.open('Bill created successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadBillings(); },
        error: (error) => this.snackBar.open(this.getApiErrorMessage(error, 'Error creating bill'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
      });
    });
  }

  onEditClick(id?: string): void {
    if (!id) return;
    const billing = this.rowData.find(b => b._id === id);
    if (!billing) return;
    this.zone.run(() => {
      const dialogRef = this.dialog.open(BillingFormDialogComponent, {
        width: '820px', maxWidth: '96vw', disableClose: true, autoFocus: false,
        data: { isEdit: true, billing: { ...billing } }
      });
      dialogRef.afterClosed().subscribe((result?: BillingDialogResult) => {
        if (!result) return;
        this.billingService.updateBilling(id, { ...result, clientId: this.clientId }).subscribe({
          next: () => { this.snackBar.open('Bill updated successfully', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadBillings(); },
          error: (error) => this.snackBar.open(this.getApiErrorMessage(error, 'Error updating bill'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] })
        });
      });
    });
  }

  onDeleteClick(id?: string, customerName?: string): void {
    if (!id) return;
    if (!confirm(`Delete bill for "${customerName}"? This cannot be undone.`)) return;
    this.loading = true;
    this.billingService.deleteBilling(id).subscribe({
      next: () => { this.snackBar.open('Bill deleted', 'Close', { duration: 3000, panelClass: ['success-snackbar'] }); this.loadBillings(); },
      error: (error) => { this.snackBar.open(this.getApiErrorMessage(error, 'Error deleting bill'), 'Close', { duration: 3000, panelClass: ['error-snackbar'] }); this.loading = false; }
    });
  }

  printBill(billing: Billing): void {
    if (!billing) return;

    const pref: Partial<MillPreference> = this.prefService.snapshot ?? {};
    const millName      = pref.name          || DEFAULT_PREFERENCE.name;
    const millAddr      = pref.address       || '';
    const millPhone     = pref.phoneNumber   || '';
    const millLogo      = pref.logo          || '';
    const gstPct        = pref.gstPercentage ?? 0;
    const gstin         = pref.gstin         || '';
    const millEmail     = pref.email         || '';
    const placeOfSupply = pref.placeOfSupply || '';
    const bankName      = pref.bankName      || '';
    const bankAccount   = pref.bankAccount   || '';
    const bankIfsc      = pref.bankIfsc      || '';
    const bankBranch    = pref.bankBranch    || '';
    const signature     = pref.signature     || '';

    const doc    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();
    const M      = 12; // margin

    const BLACK: [number, number, number] = [20, 20, 20];
    const GRAY:  [number, number, number] = [90, 90, 90];
    const LGRAY: [number, number, number] = [200, 200, 200];

    let y = M;

    // ── Logo (top-left) ────────────────────────────────────────────────────
    const logoW = 22; const logoH = 22;
    if (millLogo && millLogo.startsWith('data:image')) {
      try {
        doc.addImage(millLogo, millLogo.includes('png') ? 'PNG' : 'JPEG', M, y, logoW, logoH);
      } catch { /* skip */ }
    }

    // ── Company info (next to logo) ────────────────────────────────────────
    const compX = millLogo ? M + logoW + 4 : M;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BLACK);
    doc.text(millName, compX, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    let hy = y + 12;
    if (gstin)     { doc.text(`GSTIN: ${gstin}`, compX, hy); hy += 4.5; }
    if (millAddr)  { const wrapped = doc.splitTextToSize(millAddr, 90); doc.text(wrapped, compX, hy); hy += wrapped.length * 4.5; }
    const contact = [millPhone ? `Ph: ${millPhone}` : '', millEmail].filter(Boolean).join('  |  ');
    if (contact)   { doc.text(contact, compX, hy); }

    // ── "ORIGINAL FOR RECIPIENT" box (top-right) ───────────────────────────
    const boxW = 52; const boxH = 14;
    const boxX = pageW - M - boxW;
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.roundedRect(boxX, y, boxW, boxH, 2, 2);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...BLACK);
    doc.text('ORIGINAL FOR RECIPIENT', boxX + boxW / 2, y + 5.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text('Tax Invoice / Bill of Supply', boxX + boxW / 2, y + 10, { align: 'center' });

    y += Math.max(logoH, hy - (y + 12)) + 6;

    // ── Divider + "BILL OF SUPPLY" title ──────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.4);
    doc.line(M, y, pageW - M, y);
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...BLACK);
    doc.text('BILL OF SUPPLY', pageW / 2, y, { align: 'center' });
    y += 6;

    // ── Invoice meta row ───────────────────────────────────────────────────
    const billNo   = billing.invoiceNo || billing._id?.slice(-6).toUpperCase() || 'N/A';
    const billDate = billing.date
      ? new Date(billing.date).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);

    // Left column
    doc.text('Invoice No:', M, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
    doc.text(billNo, M + 24, y);

    // Right column
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
    doc.text('Invoice Date:', pageW / 2, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
    doc.text(billDate, pageW / 2 + 26, y);
    y += 6;

    if (placeOfSupply) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
      doc.text('Place of Supply:', M, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
      doc.text(placeOfSupply, M + 36, y);
      y += 6;
    }

    // ── Divider ────────────────────────────────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 5;

    // ── Bill To ────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('BILL TO', M, y);
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(billing.customerName || '-', M, y);
    y += 8;

    // ── Divider ────────────────────────────────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.line(M, y, pageW - M, y);
    y += 4;

    // ── Items table ────────────────────────────────────────────────────────
    const tableRows = (billing.items || []).map((item, idx) => ({
      no:   String(idx + 1),
      desc: item.description,
      rate: `Rs. ${Number(item.rate ?? 0).toLocaleString('en-IN')}`,
      qty:  String(item.quantity ?? 0),
      amt:  `Rs. ${Number(item.amount ?? 0).toLocaleString('en-IN')}`,
    }));

    autoTable(doc, {
      startY: y,
      columns: [
        { header: '#',           dataKey: 'no' },
        { header: 'Description', dataKey: 'desc' },
        { header: 'Rate / Item', dataKey: 'rate' },
        { header: 'Qty',         dataKey: 'qty' },
        { header: 'Amount',      dataKey: 'amt' },
      ],
      body: tableRows,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 } },
      headStyles: { fillColor: [245, 245, 245], textColor: BLACK, fontStyle: 'bold', lineWidth: 0.25, lineColor: LGRAY },
      bodyStyles: { lineWidth: 0.25, lineColor: LGRAY, textColor: BLACK },
      alternateRowStyles: { fillColor: [251, 251, 251] },
      columnStyles: {
        no:   { cellWidth: 10, halign: 'center' },
        rate: { cellWidth: 36, halign: 'right' },
        qty:  { cellWidth: 18, halign: 'right' },
        amt:  { cellWidth: 36, halign: 'right' },
      },
      margin: { left: M, right: M },
    });

    y = (doc as any).lastAutoTable.finalY + 5;

    // ── Totals ─────────────────────────────────────────────────────────────
    const subtotal   = Number(billing.totalAmount || 0);
    const halfGst    = gstPct / 2;
    const cgstAmt    = gstPct > 0 ? +(subtotal * halfGst / 100).toFixed(2) : 0;
    const sgstAmt    = gstPct > 0 ? +(subtotal * halfGst / 100).toFixed(2) : 0;
    const grandTotal = +(subtotal + cgstAmt + sgstAmt).toFixed(2);

    const totW  = 78;
    const totX  = pageW - M - totW;
    const totVX = pageW - M;
    let   ty    = y;

    const drawTotRow = (label: string, value: string, bold = false, shade = false) => {
      if (shade) { doc.setFillColor(242, 242, 248); doc.rect(totX - 2, ty - 4.5, totW + 4, 8, 'F'); }
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 9.5 : 8.5);
      doc.setTextColor(...(bold ? BLACK : GRAY));
      doc.text(label, totX, ty);
      doc.text(value, totVX, ty, { align: 'right' });
      ty += 7;
    };

    if (gstPct > 0) {
      drawTotRow('Taxable Value:', `Rs. ${subtotal.toLocaleString('en-IN')}`);
      drawTotRow(`CGST @ ${halfGst}%:`, `Rs. ${cgstAmt.toLocaleString('en-IN')}`);
      drawTotRow(`SGST @ ${halfGst}%:`, `Rs. ${sgstAmt.toLocaleString('en-IN')}`);
    }
    drawTotRow('Total Amount:', `Rs. ${grandTotal.toLocaleString('en-IN')}`, true, true);

    y = Math.max(y, ty) + 4;

    // ── Divider ────────────────────────────────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(M, y, pageW - M, y);
    y += 5;

    // ── Amount in words ────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text('Amount in Words:', M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BLACK);
    const wordsText = doc.splitTextToSize(this.amountInWords(grandTotal), pageW - M * 2 - 38);
    doc.text(wordsText, M + 38, y);
    y += wordsText.length * 5 + 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(`Amount Payable: Rs. ${grandTotal.toLocaleString('en-IN')}`, M, y);
    y += 10;

    // ── Divider ────────────────────────────────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.line(M, y, pageW - M, y);
    y += 5;

    // ── Bank details (left) + Authorized signatory (right) ────────────────
    const sigColX = pageW / 2 + 5;
    let bankY = y;

    const hasBankDetails = bankName || bankAccount || bankIfsc || bankBranch;
    if (hasBankDetails) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      doc.text('BANK DETAILS', M, bankY);
      bankY += 5;

      const bankRows: [string, string][] = [];
      if (bankName)    bankRows.push(['Bank:', bankName]);
      if (bankAccount) bankRows.push(['A/c No:', bankAccount]);
      if (bankBranch)  bankRows.push(['Branch:', bankBranch]);
      if (bankIfsc)    bankRows.push(['IFSC:', bankIfsc]);

      doc.setFontSize(8);
      bankRows.forEach(([lbl, val]) => {
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY);
        doc.text(lbl, M, bankY);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLACK);
        doc.text(val, M + 20, bankY);
        bankY += 5;
      });
    }

    // Signatory box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(`For ${millName}`, sigColX, y);
    const sigBoxY  = y + 4;
    const sigBoxH  = 22;
    const sigBoxW  = pageW - M - sigColX;
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.rect(sigColX, sigBoxY, sigBoxW, sigBoxH);

    // Embed signature image if available
    if (signature && signature.startsWith('data:image')) {
      try {
        const fmt = signature.includes('png') ? 'PNG' : 'JPEG';
        const imgW = sigBoxW - 8;
        const imgH = sigBoxH - 8;
        doc.addImage(signature, fmt, sigColX + 4, sigBoxY + 2, imgW, imgH);
      } catch { /* skip bad image */ }
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Authorized Signatory', sigColX + sigBoxW / 2, sigBoxY + sigBoxH - 2.5, { align: 'center' });

    // ── Footer line ────────────────────────────────────────────────────────
    const footerY = pageH - 8;
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(M, footerY - 4, pageW - M, footerY - 4);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(`Thank you for your business — ${millName}`, pageW / 2, footerY, { align: 'center' });

    // Trigger browser print dialog; fall back to download if popup is blocked
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const printWin = window.open(blobUrl, '_blank');
    if (printWin) {
      this.snackBar.open('Opening print dialog…', 'Close', { panelClass: ['success-snackbar'] });
      // Revoke blob URL after a short delay to free memory
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    } else {
      // Popup blocked — fall back to download
      URL.revokeObjectURL(blobUrl);
      doc.save(`Invoice_${billNo}_${(billing.customerName || 'Customer').replace(/\s+/g, '_')}.pdf`);
      this.snackBar.open('Popup blocked — PDF downloaded instead', 'Close', { panelClass: ['error-snackbar'] });
    }
  }

  /** Convert a number to Indian-style words (Rupees ... Only) */
  private amountInWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const numToWords = (n: number): string => {
      if (n === 0) return '';
      if (n < 20)  return ones[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' ';
      if (n < 1000)      return ones[Math.floor(n / 100)] + ' Hundred ' + numToWords(n % 100);
      if (n < 100000)    return numToWords(Math.floor(n / 1000)) + 'Thousand ' + numToWords(n % 1000);
      if (n < 10000000)  return numToWords(Math.floor(n / 100000)) + 'Lakh ' + numToWords(n % 100000);
      return numToWords(Math.floor(n / 10000000)) + 'Crore ' + numToWords(n % 10000000);
    };

    const rupees = Math.floor(amount);
    const paise  = Math.round((amount - rupees) * 100);
    let words = numToWords(rupees).trim() + ' Rupees';
    if (paise > 0) words += ' and ' + numToWords(paise).trim() + ' Paise';
    return words + ' Only';
  }

  private dateFormatter(value: unknown): string {
    if (!value) return '';
    const d = new Date(String(value));
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-IN');
  }
}
