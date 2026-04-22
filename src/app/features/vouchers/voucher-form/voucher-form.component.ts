import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

import { VouchersService, VoucherSeriesService, LedgersService } from '../../../core/services/api.services';
import { Voucher, VoucherSeries, Ledger } from '../../../core/models';

@Component({
  selector: 'app-voucher-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DatePickerModule],
  templateUrl: './voucher-form.component.html',
})
export class VoucherFormComponent implements OnInit {

  /** Pass a Voucher to edit; undefined → create mode. */
  readonly row = input<Voucher | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc       = inject(VouchersService);
  private readonly seriesSvc = inject(VoucherSeriesService);
  private readonly ledSvc    = inject(LedgersService);
  private readonly fb        = inject(FormBuilder);

  saving         = false;
  series         = signal<VoucherSeries[]>([]);
  ledgers        = signal<Ledger[]>([]);
  selectedSeries = signal<VoucherSeries | null>(null);
  nextNoPreview  = signal<string>("");

  showVouNo = () => {
    const m = this.selectedSeries()?.Numbering_Method;
    return m === "SEMI" || m === "MANUAL";
  };

  form = this.fb.group({
    SeriesSno: [0, Validators.required],
    Vou_No:    [""],
    Vou_Date:  [new Date(), Validators.required],
    LedSno:    [0, Validators.required],
    Amount:    [0, [Validators.required, Validators.min(0.01)]],
    Narration: [""],
  });

  ngOnInit() {
    this.seriesSvc.list().subscribe(r => this.series.set(r.data ?? []));
    this.ledSvc.list().subscribe(r => this.ledgers.set(r.data ?? []));
    
    const r = this.row();
    if (r) {
      this.form.patchValue({
        SeriesSno: 0,
        Vou_No: r.Vou_No,
        Vou_Date: new Date(r.Vou_Date),
        LedSno: r.LedSno,
        Amount: r.Amount,
        Narration: r.Narration,
      });
    }
  }

  onSeriesChange() {
    const seriesSno = this.form.controls.SeriesSno.value ?? 0;
    const s = this.series().find(x => x.SeriesSno === seriesSno) ?? null;
    this.selectedSeries.set(s);
    if (!s) return;
    
    if (s.Numbering_Method === "SEMI") {
      this.seriesSvc.getNextNumber(seriesSno).subscribe(r => {
        const preview = r.data?.PreviewVouNo ?? "";
        this.nextNoPreview.set(preview);
        this.form.patchValue({ Vou_No: preview });
      });
    } else if (s.Numbering_Method === "AUTO") {
      this.seriesSvc.getNextNumber(seriesSno).subscribe(r => {
        this.nextNoPreview.set(r.data?.PreviewVouNo ?? "");
      });
    }
  }

  save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();

    // Additional validations
    if (!this.row()) {
      if (v.SeriesSno === 0 || v.SeriesSno === null) {
        this.form.controls.SeriesSno.setErrors({ 'required': true });
      }
    }
    if (v.LedSno === 0 || v.LedSno === null) {
      this.form.controls.LedSno.setErrors({ 'required': true });
    }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving = true;
    const dateStr = (v.Vou_Date as unknown as Date).toISOString().split("T")[0];
    const r = this.row();

    if (r) {
      this.svc.update(r.VouSno, {
        Vou_Date: dateStr, 
        LedSno: v.LedSno!,
        Amount: v.Amount!, 
        Narration: v.Narration ?? undefined,
        CurrentRowVer: r.CurrentRowVer,
      }).subscribe({
        next: () => { this.saving = false; this.saved.emit(); },
        error: () => { this.saving = false; },
      });
    } else {
      this.svc.create({
        SeriesSno: v.SeriesSno!, 
        Vou_Date: dateStr,
        LedSno: v.LedSno!, 
        Amount: v.Amount!,
        Narration: v.Narration ?? undefined,
        Vou_No: this.showVouNo() ? (v.Vou_No ?? undefined) : undefined,
      }).subscribe({
        next: () => {
          this.saving = false; this.saved.emit();
        },
        error: () => { this.saving = false; },
      });
    }
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }
}
