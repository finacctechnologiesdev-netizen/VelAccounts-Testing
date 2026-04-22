import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Table
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';

import { VoucherSeriesService } from '../../../core/services/api.services';
import { VoucherSeries } from '../../../core/models';
import { VoucherSeriesFormComponent } from '../voucher-series-form/voucher-series-form.component';

interface ColDef {
  field: string;
  header: string;
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

@Component({
  selector: 'app-voucher-series-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, TooltipModule,
    DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, SelectModule,
    VoucherSeriesFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './voucher-series-list.component.html',
})
export class VoucherSeriesListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc     = inject(VoucherSeriesService);
  private readonly toast   = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading = signal(true);
  items   = signal<VoucherSeries[]>([]);

  readonly skeletonRows = Array.from({ length: 8 });
  readonly rowsOptions  = [
    { label: '10 rows', value: 10 },
    { label: '25 rows', value: 25 },
    { label: '50 rows', value: 50 },
  ];

  // ── Column definitions (drives header, export & body) ──────────
  readonly cols: ColDef[] = [
    { field: 'Series_Name',      header: 'Series',      exportHeader: 'Series Name',      sortable: true },
    { field: 'VTyp_Name',        header: 'Type',        exportHeader: 'Voucher Type',     sortable: true },
    { field: 'Prefix',           header: 'Prefix',      exportHeader: 'Prefix',           sortable: true },
    { field: 'Numbering_Method', header: 'Method',      exportHeader: 'Numbering Method', sortable: true },
    { field: 'Current_No',       header: 'Curr No',     exportHeader: 'Current No',       sortable: true, hideOnMobile: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: VoucherSeries | undefined;

  ngOnInit(): void { this.load(); }

  // ── CRUD ───────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next:  r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void {
    this.editRow     = undefined;
    this.formVisible = true;
  }

  openEdit(row: VoucherSeries): void {
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Voucher Series saved successfully.' });
  }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: VoucherSeries): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete voucher series "<strong>${row.Series_Name}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.SeriesSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `"${row.Series_Name}" has been deleted.`, icon: 'pi pi-trash' });
            this.load();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete. Please try again.' }),
        });
      },
    });
  }

  // ── PrimeNG Table built-in export (uses table's exportCSV()) ───
  exportCSV(): void {
    this.table.exportCSV();
  }

  // ── Global search via PrimeNG filterGlobal ─────────────────────
  onGlobalFilter(event: Event): void {
    this.table.filterGlobal((event.target as HTMLInputElement).value, 'contains');
  }

  clearSearch(input: HTMLInputElement): void {
    input.value = '';
    this.table.filterGlobal('', 'contains');
  }
}
