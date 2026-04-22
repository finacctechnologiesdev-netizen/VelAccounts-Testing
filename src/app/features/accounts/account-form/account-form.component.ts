import { Component, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { AccountsService } from '../../../core/services/api.services';
import { Account } from '../../../core/models';

@Component({
  selector: 'app-account-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent implements OnInit {

  /** Pass an Account to edit; undefined → create mode. */
  readonly row = input<Account | undefined>(undefined);

  readonly saved     = output<void>();
  readonly cancelled = output<void>();

  private readonly svc = inject(AccountsService);
  private readonly fb  = inject(FormBuilder);

  saving = false;

  form = this.fb.nonNullable.group({
    Acc_Code: ['', Validators.required],
    Acc_Name: ['', Validators.required],
    Remarks:  [''],
  });

  ngOnInit(): void {
    const r = this.row();
    if (r) {
      this.form.patchValue({
        Acc_Code: r.Acc_Code,
        Acc_Name: r.Acc_Name,
        Remarks: r.Remarks,
      });
    }
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.saving = true;
    const v = this.form.getRawValue();
    const body = {
      Acc_Code: v.Acc_Code,
      Acc_Name: v.Acc_Name,
      Remarks: v.Remarks ?? undefined,
    };
    
    const r = this.row();
    const obs = r
      ? this.svc.update(r.AccSno, { ...body, CurrentRowVer: r.CurrentRowVer })
      : this.svc.create(body);

    obs.subscribe({
      next:  () => { this.saving = false; this.saved.emit(); },
      error: () => { this.saving = false; },
    });
  }

  cancel(): void { this.cancelled.emit(); }

  get f() { return this.form.controls; }
}
