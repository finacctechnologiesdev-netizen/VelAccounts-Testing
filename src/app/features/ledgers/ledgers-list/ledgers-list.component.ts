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

import { LedgersService } from '../../../core/services/api.services';
import { Ledger } from '../../../core/models';
import { LedgerFormComponent } from '../ledger-form/ledger-form.component';

interface ColDef {
  field: string;
  header: string;
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

@Component({
  selector: 'app-ledgers-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, TooltipModule,
    TagModule, DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, SelectModule,
    LedgerFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ledgers-list.component.html',
})
export class LedgersListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc     = inject(LedgersService);
  private readonly toast   = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading = signal(true);
  items   = signal<Ledger[]>([]);

  readonly skeletonRows = Array.from({ length: 8 });
  readonly rowsOptions  = [
    { label: '10 rows', value: 10 },
    { label: '25 rows', value: 25 },
    { label: '50 rows', value: 50 },
  ];

  // ── Column definitions (drives header, export & body) ──────────
  readonly cols: ColDef[] = [
    { field: 'Led_Code', header: 'Code',  exportHeader: 'Ledger Code', sortable: true, width: '130px' },
    { field: 'Led_Name', header: 'Name',  exportHeader: 'Ledger Name', sortable: true },
    { field: 'Grp_Name', header: 'Group', exportHeader: 'Group Name',  sortable: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: Ledger | undefined;

  ngOnInit(): void { this.load(); }

  // ── CRUD ───────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next:  r  => { this.items.set(r.data ?? []); this.loading.set(false); console.log(r); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void {
    this.editRow     = undefined;
    this.formVisible = true;
  }

  openEdit(row: Ledger): void {
    // Spread to a fresh object so form patch doesn't mutate the table row reference
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Ledger saved successfully.' });
  }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: Ledger): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete ledger "<strong>${row.Led_Name}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.LedSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `"${row.Led_Name}" has been deleted.`, icon: 'pi pi-trash' });
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
