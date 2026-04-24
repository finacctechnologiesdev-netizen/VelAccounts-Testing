import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  TooltipComponent, GridComponent, LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, TooltipComponent, GridComponent, LegendComponent, CanvasRenderer]);

import { ActiveAccountService } from '../../core/services/active-account.service';
import { AuthService } from '../../core/services/auth.service';
import { VouchersService, LedgersService } from '../../core/services/api.services';
import { Voucher } from '../../core/models';

type FilterKey = 'TODAY' | '7DAYS' | 'ALL';
type ChartType = 'bar' | 'line';

// Brand palette from styles.scss
const C_PRIMARY   = '#1565c0';
const C_PRIMARY_L = '#1e88e5';
const C_RECEIPT   = '#0ba04b'; // --color-success / green
const C_PAYMENT   = '#ef4444'; // --color-error / red

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  readonly account = inject(ActiveAccountService);
  readonly user    = inject(AuthService).currentUser;

  private readonly vouchersSvc = inject(VouchersService);
  private readonly ledgersSvc  = inject(LedgersService);

  /* ── State ── */
  allVouchers  = signal<Voucher[]>([]);
  totalLedgers = signal<number>(0);
  loading      = signal<boolean>(true);

  selectedFilter = signal<FilterKey>('ALL');
  chartType      = signal<ChartType>('bar');
  readonly currentYear = new Date().getFullYear();

  /* ── Helpers: use VoucherType as the reliable discriminator ── */
  private isReceipt = (v: Voucher) => v.VoucherType?.trim() === 'Receipt';
  private isPayment = (v: Voucher) => v.VoucherType?.trim() === 'Payment';

  /* ── Derived ── */
  filteredVouchers = computed(() => {
    const src = this.allVouchers();
    const f   = this.selectedFilter();
    if (f === 'ALL') return src;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    if (f === 'TODAY') return src.filter(v => new Date(v.Vou_Date) >= startOfToday);

    const d7 = new Date(startOfToday);
    d7.setDate(d7.getDate() - 7);
    return src.filter(v => new Date(v.Vou_Date) >= d7);
  });

  receipts      = computed(() => this.filteredVouchers().filter(v => this.isReceipt(v)));
  payments      = computed(() => this.filteredVouchers().filter(v => this.isPayment(v)));

  receiptCount  = computed(() => this.receipts().length);
  paymentCount  = computed(() => this.payments().length);
  totalVouchers = computed(() => this.filteredVouchers().length);

  receiptTotal  = computed(() => this.receipts().reduce((s, v) => s + v.Amount, 0));
  paymentTotal  = computed(() => this.payments().reduce((s, v) => s + v.Amount, 0));

  recentVouchers = computed(() =>
    [...this.filteredVouchers()]
      .sort((a, b) => new Date(b.Vou_Date).getTime() - new Date(a.Vou_Date).getTime() || b.VouSno - a.VouSno)
      .slice(0, 5)
  );

  /* ── ECharts — 12-month current-year bucketing (ported from reference) ── */
  chartOptions = computed<any>(() => {
    const vouchers    = this.filteredVouchers();
    const cType       = this.chartType();
    const currentYear = new Date().getFullYear();

    // Pre-allocate 12 monthly slots (index 0 = Jan … 11 = Dec)
    const collections = new Array(12).fill(0);
    const payouts     = new Array(12).fill(0);

    vouchers.forEach(v => {
      if (!v.Vou_Date) return;
      const d = new Date(v.Vou_Date);
      if (isNaN(d.getMonth()) || d.getFullYear() !== currentYear) return;
      const m = d.getMonth();
      if (this.isReceipt(v)) collections[m] += Number(v.Amount) || 0;
      if (this.isPayment(v)) payouts[m]     += Number(v.Amount) || 0;
    });

    const months  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const isLine  = cType === 'line';

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: isLine ? 'line' : 'shadow', lineStyle: { color: 'rgba(21,101,192,.15)' } },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#1e293b', fontSize: 12 },
        formatter: (params: any[]) => {
          const month = params[0]?.axisValue ?? '';
          let html = `<b>${month} ${currentYear}</b><br/>`;
          params.forEach(p => {
            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:5px"></span>`;
            html += `${dot}${p.seriesName}: ₹${Number(p.value).toLocaleString('en-IN')}<br/>`;
          });
          return html;
        },
      },
      legend: {
        bottom: 0,
        icon: isLine ? 'circle' : 'roundRect',
        itemWidth: 12, itemHeight: 12,
        textStyle: { color: '#64748b', fontSize: 12 },
        data: ['Receipts', 'Payments'],
      },
      grid: { left: '1%', right: '1%', top: '8%', bottom: '18%', containLabel: true },
      xAxis: {
        type: 'category',
        data: months,
        boundaryGap: !isLine,
        axisLine: { lineStyle: { color: '#cbd5e1' } },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#64748b', fontSize: 11,
          formatter: (val: number) => val >= 1000 ? `₹${(val/1000).toFixed(0)}k` : `₹${val}`,
        },
        splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          name: 'Receipts',
          type: cType,
          data: collections,
          color: C_RECEIPT,
          ...(isLine
            ? { smooth: true, symbol: 'circle', symbolSize: 6,
                lineStyle: { width: 2.5, color: C_RECEIPT },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(11,160,75,.18)' }, { offset: 1, color: 'rgba(11,160,75,0)' }] } } }
            : { itemStyle: { borderRadius: [4, 4, 0, 0], color: C_RECEIPT }, barMaxWidth: 32 }),
        },
        {
          name: 'Payments',
          type: cType,
          data: payouts,
          color: C_PAYMENT,
          ...(isLine
            ? { smooth: true, symbol: 'circle', symbolSize: 6,
                lineStyle: { width: 2.5, color: C_PAYMENT },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                  colorStops: [{ offset: 0, color: 'rgba(239,68,68,.18)' }, { offset: 1, color: 'rgba(239,68,68,0)' }] } } }
            : { itemStyle: { borderRadius: [4, 4, 0, 0], color: C_PAYMENT }, barMaxWidth: 32 }),
        },
      ],
    };
  });

  /* ── Methods ── */
  setFilter(f: FilterKey)   { this.selectedFilter.set(f); }
  setChartType(t: ChartType) { this.chartType.set(t); }

  ngOnInit() { this.loadData(); }

  private loadData() {
    this.loading.set(true);
    this.ledgersSvc.list().subscribe(r => this.totalLedgers.set(r.data?.length ?? 0));
    this.vouchersSvc.list().subscribe(r => {
      this.allVouchers.set(r.data ?? []);
      this.loading.set(false);
    });
  }
}
