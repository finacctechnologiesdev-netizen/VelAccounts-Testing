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
import { MessageService, ConfirmationService } from 'primeng/api';

import { AccountsService } from '../../../core/services/api.services';
import { Account } from '../../../core/models';
import { AccountFormComponent } from '../account-form/account-form.component';

interface ColDef {
  field: string;
  header: string;
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

@Component({
  selector: 'app-accounts-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, TooltipModule,
    DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, AccountFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './accounts-list.component.html',
})
export class AccountsListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc     = inject(AccountsService);
  private readonly toast   = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading  = signal(true);
  accounts = signal<Account[]>([]);

  readonly skeletonRows = Array.from({ length: 8 });

  // ── Column definitions (drives header, export & body) ──────────
  readonly cols: ColDef[] = [
    { field: 'Acc_Code', header: 'Code',    exportHeader: 'Account Code', sortable: true, width: '130px' },
    { field: 'Acc_Name', header: 'Name',    exportHeader: 'Account Name', sortable: true },
    { field: 'Remarks',  header: 'Remarks', exportHeader: 'Remarks',      sortable: false, hideOnMobile: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: Account | undefined;

  ngOnInit(): void { this.load(); }

  // ── CRUD ───────────────────────────────────────────────────────
  load(): void {
    this.loading.set(true);
    this.svc.list().subscribe({
      next:  r  => { this.accounts.set(r.data ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openNew(): void {
    this.editRow     = undefined;
    this.formVisible = true;
  }

  openEdit(row: Account): void {
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Account saved successfully.' });
  }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: Account): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete account "<strong>${row.Acc_Name}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.AccSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `"${row.Acc_Name}" has been deleted.`, icon: 'pi pi-trash' });
            this.load();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Error', detail: 'Could not delete account. Please try again.' }),
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
