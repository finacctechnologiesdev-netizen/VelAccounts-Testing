import { Component, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { VoucherTypesService } from '../../../core/services/api.services';
import { VoucherType, CashType } from '../../../core/models';

@Component({
  selector: 'app-voucher-type-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './voucher-type-form.component.html',
})
export class VoucherTypeFormComponent implements OnInit {

  /** Pass a VoucherType to edit; undefined → create mode. */
  readonly row = input<VoucherType | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc = inject(VoucherTypesService);
  private readonly fb  = inject(FormBuilder);

  saving = false;

  form = this.fb.nonNullable.group({
    VTyp_Code:  ['', [Validators.required, Validators.maxLength(20)]],
    VTyp_Name:  ['', [Validators.required, Validators.maxLength(100)]],
    Cash_Type:  ['OUT' as CashType, Validators.required],
  });

  ngOnInit(): void {
    const r = this.row();
    if (r) {
      this.form.patchValue({
        VTyp_Code: r.VTyp_Code,
        VTyp_Name: r.VTyp_Name,
        Cash_Type: r.Cash_Type.trim() as CashType,
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving = true;
    const v = this.form.getRawValue();
    const body = {
      VTyp_Code: v.VTyp_Code,
      VTyp_Name: v.VTyp_Name,
      Cash_Type: v.Cash_Type as CashType,
    };
    
    const r = this.row();
    const obs = r
      ? this.svc.update(r.VouTypeSno, { ...body, CurrentRowVer: r.CurrentRowVer })
      : this.svc.create(body);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: () => { this.saving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }
}
