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
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { MessageService, ConfirmationService } from 'primeng/api';

import { VoucherTypesService } from '../../../core/services/api.services';
import { VoucherType } from '../../../core/models';
import { VoucherTypeFormComponent } from '../voucher-type-form/voucher-type-form.component';

interface ColDef {
  field: string;
  header: string;
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

@Component({
  selector: 'app-voucher-types-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, TooltipModule,
    TagModule, DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, SelectModule,
    VoucherTypeFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './voucher-types-list.component.html',
})
export class VoucherTypesListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc     = inject(VoucherTypesService);
  private readonly toast   = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading = signal(true);
  items   = signal<VoucherType[]>([]);

  readonly skeletonRows = Array.from({ length: 8 });
  readonly rowsOptions  = [
    { label: '10 rows', value: 10 },
    { label: '25 rows', value: 25 },
    { label: '50 rows', value: 50 },
  ];

  // ── Column definitions (drives header, export & body) ──────────
  readonly cols: ColDef[] = [
    { field: 'VTyp_Code', header: 'Code',      exportHeader: 'Type Code', sortable: true, width: '130px' },
    { field: 'VTyp_Name', header: 'Name',      exportHeader: 'Type Name', sortable: true },
    { field: 'Cash_Type', header: 'Cash Type', exportHeader: 'Cash Type', sortable: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: VoucherType | undefined;

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

  openEdit(row: VoucherType): void {
    // Spread to a fresh object so form patch doesn't mutate the table row reference
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Voucher Type saved successfully.' });
  }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: VoucherType): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete voucher type "<strong>${row.VTyp_Name}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.VouTypeSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `"${row.VTyp_Name}" has been deleted.`, icon: 'pi pi-trash' });
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
