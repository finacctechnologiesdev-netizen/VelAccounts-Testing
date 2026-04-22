import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// PrimeNG 
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';

import { VouchersService, LedgersService } from '../../../core/services/api.services';
import { Ledger, LedgerStatementLine, LedgerStatementSummary } from '../../../core/models';

interface ColDef {
  field: string;
  header: string;
  sortable?: boolean;
  width?: string;
  hideOnMobile?: boolean;
  alignRight?: boolean;
}

@Component({
  selector: 'app-ledger-statement',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, SkeletonModule,
    SelectModule, DatePickerModule, ToastModule
  ],
  templateUrl: './ledger-statement.component.html',
  styleUrl: './ledger-statement.component.scss'
})
export class LedgerStatementComponent implements OnInit {

  private readonly svc    = inject(VouchersService);
  private readonly ledSvc = inject(LedgersService);
  private readonly fb     = inject(FormBuilder);

  // ── State ──────────────────────────────────────────────────────
  loading = signal(false);
  ledgers = signal<Ledger[]>([]);
  lines   = signal<LedgerStatementLine[]>([]);
  summary = signal<LedgerStatementSummary | null>(null);

  readonly skeletonRows = Array.from({ length: 6 });

  // ── Computed / Helpers ─────────────────────────────────────────
  totalDebit  = () => this.lines().reduce((a, l) => a + (l.Debit || 0),  0);
  totalCredit = () => this.lines().reduce((a, l) => a + (l.Credit || 0), 0);

  // ── Columns ────────────────────────────────────────────────────
  readonly cols: ColDef[] = [
    { field: 'Vou_Date',       header: 'Date',      width: '100px' },
    { field: 'Vou_No',         header: 'Voucher No' },
    { field: 'VoucherType',    header: 'Type',      hideOnMobile: true },
    { field: 'Narration',      header: 'Narration', hideOnMobile: true },
    { field: 'Debit',          header: 'Debit',     alignRight: true },
    { field: 'Credit',         header: 'Credit',    alignRight: true },
    { field: 'RunningBalance', header: 'Balance',   alignRight: true }
  ];

  // ── Form ───────────────────────────────────────────────────────
  filterForm = this.fb.group({
    LedSno:   [0, [Validators.required, Validators.min(1)]],
    fromDate: [null as Date | null, Validators.required],
    toDate:   [null as Date | null, Validators.required],
  });

  ngOnInit(): void {
    // Load ledgers for dropdown
    this.ledSvc.list().subscribe({
      next: r => this.ledgers.set(r.data ?? [])
    });
  }

  load(): void {
    if (this.filterForm.invalid) { 
      this.filterForm.markAllAsTouched(); 
      return; 
    }
    
    // Custom validation: verify actual selection (PrimeNG select might retain initialized 0 value)
    if (this.filterForm.controls.LedSno.value === 0) {
      this.filterForm.controls.LedSno.setErrors({ 'required': true });
      this.filterForm.markAllAsTouched();
      return;
    }

    const v = this.filterForm.getRawValue();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    
    this.loading.set(true);
    // Clear old data while loading for a clean visual transition
    this.lines.set([]);
    this.summary.set(null);
    const date = new Date(v.toDate!);
    date.setDate(date.getDate() + 1);
    v.toDate = date;
    this.svc.getLedgerStatement(
      v.LedSno!,
      fmt(v.fromDate!),
      fmt(v.toDate!)
    ).subscribe({
      next: res => {
        this.lines.set(res.data);
        this.summary.set(res.summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get f() { return this.filterForm.controls; }

}
