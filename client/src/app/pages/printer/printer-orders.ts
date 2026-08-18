import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { Invoice } from '../../core/models';

@Component({
  selector: 'app-printer-orders',
  standalone: true,
  imports: [DatePipe],
  template: `
  <div class="card">
    <h1>Naručeni proizvodi</h1>
    <p class="muted">Status možete pomerati iz „naručeno“ u „u štampi“, a zatim u „isporučeno“.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    @if (!orders().length) { <p class="muted">Nemate nijednu narudžbinu.</p> }
    @if (orders().length) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="sortBy('invoiceNumber')">Faktura</th>
              <th>Klijent</th><th>Proizvodi</th>
              <th class="sortable" (click)="sortBy('total')">Iznos</th>
              <th class="sortable" (click)="sortBy('orderedAt')">Datum</th>
              <th class="sortable" (click)="sortBy('status')">Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o._id) {
              <tr>
                <td>{{ o.invoiceNumber }}</td>
                <td>
                  {{ clientName(o) }}
                  <div class="muted" style="font-size:12px">{{ o.client?.username }}</div>
                </td>
                <td>
                  <ol style="margin:0;padding-left:18px">
                    @for (it of o.items; track it._id) {
                      <li>{{ it.productName }} ({{ it.quantity }})
                        @if (it.serviceName) { <span class="muted">— {{ it.serviceName }}</span> }
                      </li>
                    }
                  </ol>
                </td>
                <td><strong>{{ o.total }} RSD</strong></td>
                <td>{{ o.orderedAt | date:'dd.MM.yyyy.' }}</td>
                <td><span class="badge" [class]="badge(o.status)">{{ o.status }}</span></td>
                <td>
                  @if (canAdvance(o.status)) {
                    <button class="btn-sm" (click)="advance(o)">{{ nextLabel(o.status) }}</button>
                  } @else { <span class="muted">—</span> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class PrinterOrders implements OnInit {
  private data = inject(DataService);
  orders = signal<Invoice[]>([]);
  msg = signal(''); err = signal('');
  private field = 'orderedAt'; private asc = false;

  ngOnInit() { this.load(); }
  load() { this.data.printerOrders().subscribe(o => this.orders.set(o)); }

  clientName(o: any) {
    const c = o.client;
    if (!c) return '—';
    return c.institutionName || `${c.firstName} ${c.lastName}`;
  }
  badge(s: string) {
    return { 'naruceno': 'ordered', 'placeno': 'paid', 'u stampi': 'printing',
             'isporuceno': 'delivered', 'primljeno': 'received' }[s] || '';
  }
  canAdvance(s: string) { return ['naruceno', 'placeno', 'u stampi'].includes(s); }
  nextLabel(s: string) { return s === 'u stampi' ? 'Prebaci u „isporučeno“' : 'Prebaci u „u štampi“'; }

  sortBy(f: string) {
    this.asc = this.field === f ? !this.asc : true;
    this.field = f;
    const d = this.asc ? 1 : -1;
    this.orders.set([...this.orders()].sort((a: any, b: any) =>
      (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * d));
  }

  advance(o: Invoice) {
    this.msg.set(''); this.err.set('');
    this.data.advanceOrder(o._id).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Promena statusa nije uspela.')
    });
  }
}
