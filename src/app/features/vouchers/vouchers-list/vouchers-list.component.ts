import { Component, inject, signal, computed, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Table & Common
import { Table, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';

import { VouchersService, VoucherSeriesService } from '../../../core/services/api.services';
import { Voucher, VoucherSeries } from '../../../core/models';
import { VoucherFormComponent } from '../voucher-form/voucher-form.component';

interface ColDef {
  field: string;
  header: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
  alignRight?: boolean;
}

@Component({
  selector: 'app-vouchers-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, TooltipModule,
    DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, SelectModule, DatePickerModule,
    VoucherFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './vouchers-list.component.html',
})
export class VouchersListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc       = inject(VouchersService);
  private readonly seriesSvc = inject(VoucherSeriesService);
  private readonly toast     = inject(MessageService);
  private readonly confirm   = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading = signal(true);
  items   = signal<Voucher[]>([]);
  series  = signal<VoucherSeries[]>([]);
  seriesOptions = computed(() => [
    { SeriesSno: null, Series_Name: 'All Series' },
    ...this.series()
  ]);

  readonly skeletonRows = Array.from({ length: 8 });

  // ── Filters State ──────────────────────────────────────────────
  filterState = {
    seriesSno: null as number | null,
    fromDate: null as Date | null,
    toDate: null as Date | null
  };

  // ── Column definitions ──────────────────────────────────────────
  readonly cols: ColDef[] = [
    { field: 'Vou_Date',    header: 'Date',      sortable: true, width: '110px' },
    { field: 'Vou_No',      header: 'Voucher No', sortable: true },
    { field: 'VoucherType', header: 'Type',      sortable: true, hideOnMobile: true },
    { field: 'Led_Name',    header: 'Ledger',    sortable: true },
    { field: 'Amount',      header: 'Amount',    sortable: true, alignRight: true },
    { field: 'Narration',   header: 'Narration', sortable: false, hideOnMobile: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: Voucher | undefined;

  ngOnInit(): void {
    this.seriesSvc.list().subscribe(r => this.series.set(r.data ?? []));
    this.load();
  }

  // ── CRUD ───────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    const fmt = (d: Date | null) => d ? d.toISOString().split("T")[0] : undefined;
    
    this.svc.list({
      seriesSno: this.filterState.seriesSno ?? undefined,
      fromDate:  fmt(this.filterState.fromDate),
      toDate:    fmt(this.filterState.toDate),
    }).subscribe({
      next:  r  => { this.items.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetFilters(): void {
    this.filterState = { seriesSno: null, fromDate: null, toDate: null };
    this.load();
  }

  openNew(): void {
    this.editRow     = undefined;
    this.formVisible = true;
  }

  openEdit(row: Voucher): void {
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Voucher saved successfully.' });
  }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: Voucher): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete voucher "<strong>${row.Vou_No}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.VouSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `Voucher ${row.Vou_No} has been deleted.`, icon: 'pi pi-trash' });
            this.load();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete voucher.' }),
        });
      },
    });
  }

}
