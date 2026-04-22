import { Component, inject, input, output, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { VoucherSeriesService, VoucherTypesService } from '../../../core/services/api.services';
import { VoucherSeries, VoucherType, NumberingMethod } from '../../../core/models';

@Component({
  selector: 'app-voucher-series-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voucher-series-form.component.html',
})
export class VoucherSeriesFormComponent implements OnInit {

  /** Pass a VoucherSeries to edit; undefined → create mode. */
  readonly row = input<VoucherSeries | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc     = inject(VoucherSeriesService);
  private readonly typeSvc = inject(VoucherTypesService);
  private readonly fb      = inject(FormBuilder);

  saving = false;
  types  = signal<VoucherType[]>([]);

  form = this.fb.group({
    Series_Name:      ['', Validators.required],
    VouTypeSno:       [0 as number, Validators.required],
    Prefix:           ['', Validators.required],
    Width:            [5, [Validators.required, Validators.min(1), Validators.max(10)]],
    Numbering_Method: ['AUTO' as NumberingMethod, Validators.required],
    Current_No:       [0],
  });

  ngOnInit(): void {
    // Load voucher types for the dropdown
    this.typeSvc.list().subscribe({
      next: r => this.types.set(r.data ?? []),
    });

    const r = this.row();
    if (r) {
      this.form.patchValue({
        Series_Name:      r.Series_Name,
        VouTypeSno:       r.VouTypeSno,
        Prefix:           r.Prefix,
        Width:            r.Width,
        Numbering_Method: r.Numbering_Method as NumberingMethod,
        Current_No:       r.Current_No ?? 0,
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    // Additional validation for type selection
    if (this.form.controls.VouTypeSno.value === 0) {
      this.form.controls.VouTypeSno.setErrors({ 'required': true });
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const v = this.form.getRawValue();
    const body = {
      Series_Name:      v.Series_Name!,
      VouTypeSno:       v.VouTypeSno!,
      Prefix:           v.Prefix!,
      Width:            v.Width!,
      Numbering_Method: v.Numbering_Method as NumberingMethod,
      Current_No:       v.Current_No ?? 0,
    };
    
    const r = this.row();
    const obs = r
      ? this.svc.update(r.SeriesSno, { ...body, CurrentRowVer: r.CurrentRowVer })
      : this.svc.create(body);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: () => { this.saving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }
}
