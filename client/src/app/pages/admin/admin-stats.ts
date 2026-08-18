import { Component, inject, signal, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card">
    <h1>Statistike sistema</h1>
    @if (overview(); as o) {
      <div class="grid cols-4 mt">
        <div class="card center" style="margin:0;background:#eef3fb"><h3>Korisnika</h3><div style="font-size:28px;font-weight:700">{{ o.users }}</div></div>
        <div class="card center" style="margin:0;background:#fdf6e9"><h3>Štamparija</h3><div style="font-size:28px;font-weight:700">{{ o.printers }}</div></div>
        <div class="card center" style="margin:0;background:#f2edfb"><h3>Proizvoda</h3><div style="font-size:28px;font-weight:700">{{ o.products }}</div></div>
        <div class="card center" style="margin:0;background:#e9f6ee"><h3>Faktura</h3><div style="font-size:28px;font-weight:700">{{ o.invoices }}</div></div>
      </div>
    }
  </div>

  <div class="chart-box">
    <h2>Promet štamparija u poslednjem kvartalu (3 meseca)</h2>
    <p class="muted">Opadajuća lista štamparija po ostvarenom prometu ka klijentima.</p>
    <canvas #barCanvas></canvas>
    @if (!revenue().length) { <p class="muted center">Nema podataka za prikaz.</p> }
  </div>

  <div class="chart-box">
    <h2>Najčešće naručivani proizvodi (poslednjih mesec dana)</h2>
    <p class="muted">Procentualni udeo po naručenoj količini.</p>
    <canvas #pieCanvas></canvas>
    @if (!top().length) { <p class="muted center">Nema podataka za prikaz.</p> }
  </div>

  <div class="chart-box">
    <h2>Kretanje ocene proizvoda kroz vreme</h2>
    <p class="muted">Kumulativni skor (sviđanje +1, nesviđanje −1). Isključite proizvode iz prikaza čekiranjem.</p>
    @if (trend().length) {
      <div class="grid cols-4 mb">
        @for (t of trend(); track t.productName) {
          <label style="display:flex;align-items:center;gap:7px;font-weight:400">
            <input type="checkbox" style="width:auto" [checked]="visible[t.productName] !== false"
                   (change)="toggle(t.productName)">
            {{ t.productName }}
          </label>
        }
      </div>
    }
    <canvas #lineCanvas></canvas>
    @if (!trend().length) { <p class="muted center">Nema ocenjenih proizvoda.</p> }
  </div>`
})
export class AdminStats implements OnInit, AfterViewInit {
  private data = inject(DataService);
  @ViewChild('barCanvas') barCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('pieCanvas') pieCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('lineCanvas') lineCanvas!: ElementRef<HTMLCanvasElement>;

  overview = signal<any>(null);
  revenue = signal<{ printerName: string; revenue: number; orders: number }[]>([]);
  top = signal<{ productName: string; quantity: number; percentage: number }[]>([]);
  trend = signal<{ productName: string; points: { date: string; score: number }[] }[]>([]);
  visible: Record<string, boolean> = {};

  private barChart?: Chart; private pieChart?: Chart; private lineChart?: Chart;
  private palette = ['#2b4c7e','#e8a33d','#0a7d29','#c0392b','#7b4bbd','#17a2b8','#d4569b','#5a6b8c','#8a9a2b','#b5651d'];

  ngOnInit() {
    this.data.statsOverview().subscribe(o => this.overview.set(o));
  }

  ngAfterViewInit() {
    this.data.statsRevenue().subscribe(r => { this.revenue.set(r); this.drawBar(); });
    this.data.statsTopProducts().subscribe(t => { this.top.set(t); this.drawPie(); });
    this.data.statsRatingTrend().subscribe(t => {
      this.trend.set(t);
      t.forEach(x => this.visible[x.productName] = true);
      this.drawLine();
    });
  }

  private drawBar() {
    const rows = this.revenue();
    if (!rows.length || !this.barCanvas) return;
    this.barChart?.destroy();
    this.barChart = new Chart(this.barCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: rows.map(r => r.printerName),
        datasets: [{ label: 'Promet (RSD)', data: rows.map(r => r.revenue), backgroundColor: '#2b4c7e' }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, title: { display: true, text: 'RSD' } } }
      }
    });
  }

  private drawPie() {
    const rows = this.top();
    if (!rows.length || !this.pieCanvas) return;
    this.pieChart?.destroy();
    this.pieChart = new Chart(this.pieCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: rows.map(r => `${r.productName} (${r.percentage}%)`),
        datasets: [{ data: rows.map(r => r.quantity), backgroundColor: this.palette }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });
  }

  private drawLine() {
    const rows = this.trend().filter(t => this.visible[t.productName] !== false);
    if (!this.lineCanvas) return;
    this.lineChart?.destroy();
    const labels = Array.from(new Set(rows.flatMap(r => r.points.map(p => p.date)))).sort();
    this.lineChart = new Chart(this.lineCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: rows.map((r, i) => ({
          label: r.productName,
          data: labels.map(d => {
            const hits = r.points.filter(p => p.date <= d);
            return hits.length ? hits[hits.length - 1].score : null;
          }),
          borderColor: this.palette[i % this.palette.length],
          backgroundColor: this.palette[i % this.palette.length],
          tension: 0.25, spanGaps: true
        }))
      },
      options: {
        responsive: true,
        scales: { y: { title: { display: true, text: 'Kumulativni skor' } } }
      }
    });
  }

  toggle(name: string) {
    this.visible[name] = this.visible[name] === false;
    this.drawLine();
  }
}
