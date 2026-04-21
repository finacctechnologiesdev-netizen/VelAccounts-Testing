import { Component, inject, signal, OnInit, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Table (patched — ChangeDetectionStrategy.Eager → Default)
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

import { LedgerGroupsService } from '../../../core/services/api.services';
import { LedgerGroup } from '../../../core/models';
import { LedgerGroupFormComponent } from '../ledger-group-form/ledger-group-form.component';

interface ColDef {
  field: string;
  header: string;
  exportHeader?: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
}

@Component({
  selector: 'app-ledger-groups-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    TableModule, ButtonModule, InputTextModule,
    IconFieldModule, InputIconModule, TooltipModule,
    TagModule, DialogModule, ConfirmDialogModule, ToastModule,
    SkeletonModule, SelectModule,
    LedgerGroupFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './ledger-groups-list.component.html',
  styleUrl:    './ledger-groups-list.component.scss',
})
export class LedgerGroupsListComponent implements OnInit {

  @ViewChild('dt') table!: Table;

  private readonly svc     = inject(LedgerGroupsService);
  private readonly toast   = inject(MessageService);
  private readonly confirm = inject(ConfirmationService);

  // ── Data ───────────────────────────────────────────────────────
  loading = signal(true);
  items   = signal<LedgerGroup[]>([]);

  readonly skeletonRows = Array.from({ length: 8 });
  readonly rowsOptions  = [
    { label: '10 rows', value: 10 },
    { label: '25 rows', value: 25 },
    { label: '50 rows', value: 50 },
  ];

  // ── Column definitions (drives header, export & body) ──────────
  readonly cols: ColDef[] = [
    { field: 'Grp_Code', header: 'Code',    exportHeader: 'Group Code', sortable: true, width: '130px' },
    { field: 'Grp_Name', header: 'Name',    exportHeader: 'Group Name', sortable: true },
    { field: 'Remarks',  header: 'Remarks', exportHeader: 'Remarks',    sortable: true, hideOnMobile: true },
  ];

  // ── Dialog ─────────────────────────────────────────────────────
  formVisible = false;
  editRow: LedgerGroup | undefined;

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

  openEdit(row: LedgerGroup): void {
    // Spread to a fresh object so form patch doesn't mutate the table row reference
    this.editRow     = { ...row };
    this.formVisible = true;
  }

  onFormSaved(): void {
    this.formVisible = false;
    this.load();
    this.toast.add({ severity: 'success', summary: 'Success', detail: 'Ledger group saved successfully.' });
  }

  /** Close dialog when user clicks the backdrop mask */
  // @HostListener('document:click', ['$event'])
  // onDocumentClick(event: MouseEvent): void {
  //   if (!this.formVisible) return;
  //   const target = event.target as HTMLElement;
  //   // PrimeNG appends the mask as .p-dialog-mask to <body>
  //   if (target.classList.contains('p-dialog-mask') ||
  //       target.classList.contains('p-overlay-mask')) {
  //     this.onFormCancelled();
  //   }
  // }

  onFormCancelled(): void {
    this.formVisible = false;
    this.editRow     = undefined;
  }

  deleteRow(row: LedgerGroup): void {
    this.confirm.confirm({
      header:  'Confirm Delete',
      message: `Delete ledger group "<strong>${row.Grp_Name}</strong>"? This cannot be undone.`,
      icon:    'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Yes, Delete', severity: 'danger', icon: 'pi pi-trash' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        this.svc.delete(row.GrpSno, row.CurrentRowVer).subscribe({
          next:  () => {
            this.toast.add({ severity: 'warn', summary: 'Deleted', detail: `"${row.Grp_Name}" has been deleted.`, icon: 'pi pi-trash' });
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
