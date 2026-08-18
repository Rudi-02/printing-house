import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { Tender } from '../../core/models';

@Component({
  selector: 'app-client-tenders',
  standalone: true,
  imports: [DatePipe],
  template: `
  <div class="card">
    <h1>Javne nabavke</h1>
    <p class="muted">Pregled raspisanih nabavki. Nabavke kojima je istekao rok se automatski zaključuju pri otvaranju ove strane, izborom najniže ponude.</p>
  </div>

  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  @if (!tenders().length) {
    <div class="card"><p class="muted">Niste raspisali nijednu javnu nabavku.</p></div>
  }

  @for (t of tenders(); track t._id) {
    <div class="card">
      <div class="spread">
        <h2 style="margin:0">{{ t.tenderNumber }}</h2>
        <span class="badge" [class]="t.status === 'OPEN' ? 'ordered' : t.status === 'CLOSED' ? 'received' : ''">
          {{ statusLabel(t.status) }}
        </span>
      </div>
      <p class="muted">
        Raspisana: {{ t.openedAt | date:'dd.MM.yyyy. HH:mm:ss' }} ·
        Zatvara se: {{ t.closesAt | date:'dd.MM.yyyy. HH:mm:ss' }}
      </p>

      <h3>Tražene stavke</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Proizvod</th><th>Količina</th><th>Boja</th><th>Tip štampe</th></tr></thead>
          <tbody>
            @for (it of t.items; track it._id; let i = $index) {
              <tr><td>{{ i + 1 }}</td><td>{{ it.productName }}</td><td>{{ it.quantity }}</td>
                  <td>{{ it.color }}</td><td>{{ it.serviceName || '—' }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      @if (t.status !== 'OPEN') {
        <h3 class="mt">Pristigle ponude</h3>
        @if (!t.bids?.length) { <p class="muted">Nije pristigla nijedna ponuda.</p> }
        @if (t.bids?.length) {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Štamparija</th><th>Ukupan iznos</th><th>Ishod</th></tr></thead>
              <tbody>
                @for (b of sortedBids(t); track b._id) {
                  <tr>
                    <td>{{ b.printerName }}</td>
                    <td>{{ b.total }} RSD</td>
                    <td>
                      @if (isWinner(t, b)) { <span class="badge received">Dobila nabavku</span> }
                      @else { <span class="muted">—</span> }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <div class="actions mt">
          <button class="btn-ghost btn-sm" (click)="report(t)">Preuzmi PDF izveštaj</button>
        </div>
      } @else {
        <div class="alert alert-info mt">Licitacija je u toku — sačekajte istek roka.</div>
      }
    </div>
  }`
})
export class ClientTenders implements OnInit {
  private data = inject(DataService);
  tenders = signal<Tender[]>([]);
  err = signal('');

  ngOnInit() { this.data.myTenders().subscribe({
    next: t => this.tenders.set(t),
    error: e => this.err.set(e.error?.message || 'Greška pri učitavanju.')
  }); }

  statusLabel(s: string) {
    return { OPEN: 'Licitacija u toku', CLOSED: 'Zaključena', FAILED: 'Bez ponuda' }[s] || s;
  }
  sortedBids(t: Tender) { return [...(t.bids ?? [])].sort((a, b) => a.total - b.total); }
  isWinner(t: any, b: any) { return t.winnerBidId && String(t.winnerBidId) === String(b._id); }

  report(t: Tender) {
    this.data.downloadTenderReport(t._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${t.tenderNumber}_izvestaj.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
