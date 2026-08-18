import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { Tender } from '../../core/models';

@Component({
  selector: 'app-printer-tenders',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="card">
    <h1>Licitacije</h1>
    <p class="muted">Za svaku otvorenu javnu nabavku možete poslati tačno jednu ponudu, sa cenom za sve tražene proizvode.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    <h2>Otvorene javne nabavke ({{ tenders().length }})</h2>
    @if (!tenders().length) { <p class="muted">Trenutno nema otvorenih javnih nabavki.</p> }
  </div>

  @for (t of tenders(); track t._id) {
    <div class="card">
      <div class="spread">
        <h2 style="margin:0">{{ t.tenderNumber }} — {{ t.clientName }}</h2>
        @if (t.alreadyBid) { <span class="badge received">Ponuda poslata</span> }
      </div>
      <p class="muted">
        Raspisana: {{ t.openedAt | date:'dd.MM.yyyy. HH:mm:ss' }} ·
        Rok za ponude: {{ t.closesAt | date:'dd.MM.yyyy. HH:mm:ss' }}
      </p>

      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Proizvod</th><th>Količina</th><th>Tip štampe</th>
                <th>Cena po komadu</th><th>Imam na stanju</th><th>Ukupno</th></tr>
          </thead>
          <tbody>
            @for (it of t.items; track it._id; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td>
                <td><strong>{{ it.productName }}</strong></td>
                <td>{{ it.quantity }}</td>
                <td>{{ it.serviceName || '—' }}</td>
                <td style="max-width:150px">
                  <input type="number" min="0" [disabled]="!!t.alreadyBid"
                         [(ngModel)]="bid[t._id + '_' + it._id].unitPrice" [ngModelOptions]="{standalone:true}">
                </td>
                <td class="center">
                  <input type="checkbox" style="width:auto" [disabled]="!!t.alreadyBid"
                         [(ngModel)]="bid[t._id + '_' + it._id].available" [ngModelOptions]="{standalone:true}">
                </td>
                <td><strong>{{ lineTotal(t, it) }} RSD</strong></td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr><td colspan="6" class="right"><strong>Ukupna ponuda:</strong></td>
                <td><strong>{{ bidTotal(t) }} RSD</strong></td></tr>
          </tfoot>
        </table>
      </div>

      @if (!t.alreadyBid) {
        <div class="actions mt">
          <button (click)="submit(t)">Pošalji ponudu</button>
        </div>
      } @else {
        <div class="alert alert-info mt">Već ste poslali ponudu za ovu javnu nabavku.</div>
      }
    </div>
  }

  <div class="card">
    <h2>Moje ponude</h2>
    @if (!bids().length) { <p class="muted">Niste poslali nijednu ponudu.</p> }
    @if (bids().length) {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nabavka</th><th>Naručilac</th><th>Moja ponuda</th><th>Status</th><th>Ishod</th></tr></thead>
          <tbody>
            @for (b of bids(); track b._id) {
              <tr>
                <td>{{ b.tenderNumber }}</td>
                <td>{{ b.clientName }}</td>
                <td>{{ b.myTotal }} RSD</td>
                <td><span class="badge">{{ statusLabel(b.status) }}</span></td>
                <td>
                  @if (b.status === 'OPEN') { <span class="muted">U toku</span> }
                  @else if (b.won) { <span class="badge received">Dobili ste nabavku</span> }
                  @else { <span class="muted">Nije izabrana</span> }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class PrinterTenders implements OnInit {
  private data = inject(DataService);
  tenders = signal<Tender[]>([]);
  bids = signal<any[]>([]);
  bid: Record<string, { unitPrice: number; available: boolean }> = {};
  msg = signal(''); err = signal('');

  ngOnInit() { this.load(); }

  load() {
    this.data.openTenders().subscribe(t => {
      t.forEach(x => x.items.forEach(it => {
        const k = `${x._id}_${it._id}`;
        if (!this.bid[k]) this.bid[k] = { unitPrice: 0, available: true };
      }));
      this.tenders.set(t);
    });
    this.data.myBids().subscribe(b => this.bids.set(b));
  }

  lineTotal(t: Tender, it: any) {
    const b = this.bid[`${t._id}_${it._id}`];
    return b ? (Number(b.unitPrice) || 0) * it.quantity : 0;
  }
  bidTotal(t: Tender) { return t.items.reduce((s, it) => s + this.lineTotal(t, it), 0); }
  statusLabel(s: string) {
    return { OPEN: 'U toku', CLOSED: 'Zaključena', FAILED: 'Bez ponuda' }[s] || s;
  }

  submit(t: Tender) {
    this.msg.set(''); this.err.set('');
    const lines = t.items.map(it => {
      const b = this.bid[`${t._id}_${it._id}`];
      return { tenderItemId: it._id, unitPrice: Number(b.unitPrice) || 0, available: !!b.available };
    });
    if (lines.some(l => l.unitPrice <= 0)) {
      this.err.set('Unesite cenu po komadu za sve tražene proizvode.'); return;
    }
    this.data.submitBid(t._id, lines).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Slanje ponude nije uspelo.')
    });
  }
}
