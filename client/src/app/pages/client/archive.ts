import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { ArchiveRow } from '../../core/models';

@Component({
  selector: 'app-archive',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
  <div class="card">
    <h1>Arhiva proizvoda</h1>
    <p class="muted">Isporučeni i primljeni proizvodi. Isporučene narudžbine možete označiti kao primljene, a primljene proizvode ocenite i komentarišite.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    @if (!rows().length) { <p class="muted">Nemate isporučenih ni primljenih proizvoda.</p> }
    @if (rows().length) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="sortBy('productName')">Proizvod</th>
              <th class="sortable" (click)="sortBy('quantity')">Količina</th>
              <th class="sortable" (click)="sortBy('printerName')">Štamparija</th>
              <th class="sortable" (click)="sortBy('orderedAt')">Datum naručivanja</th>
              <th>Faktura</th><th>Status</th><th>Akcije</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.itemId) {
              <tr>
                <td><a [routerLink]="['/products', r.productId]">{{ r.productName }}</a></td>
                <td>{{ r.quantity }}</td>
                <td>{{ r.printerName }} @if (r.city) { <span class="muted">({{ r.city }})</span> }</td>
                <td>{{ r.orderedAt | date:'dd.MM.yyyy.' }}</td>
                <td>{{ r.invoiceNumber }}</td>
                <td><span class="badge" [class]="r.status === 'primljeno' ? 'received' : 'delivered'">{{ r.status }}</span></td>
                <td>
                  <div class="actions">
                    @if (r.status === 'isporuceno') {
                      <button class="btn-sm btn-ok" (click)="markReceived(r)">Primljeno</button>
                    } @else {
                      <button class="btn-sm btn-ghost" (click)="openRate(r)">Oceni</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>

  @if (rating(); as r) {
    <div class="card" style="border-top:4px solid var(--accent)">
      <h2>Ocena proizvoda: {{ r.productName }}</h2>
      <div class="field">
        <label>Vaša ocena</label>
        <div class="actions">
          <button type="button" [class]="value === 'LIKE' ? 'btn-ok' : 'btn-ghost'" (click)="value = 'LIKE'">👍 Sviđa mi se</button>
          <button type="button" [class]="value === 'DISLIKE' ? 'btn-danger' : 'btn-ghost'" (click)="value = 'DISLIKE'">👎 Ne sviđa mi se</button>
        </div>
      </div>
      <div class="field">
        <label for="cm">Komentar</label>
        <textarea id="cm" name="comment" [(ngModel)]="comment" placeholder="Podelite iskustvo sa ovim proizvodom..."></textarea>
      </div>
      <div class="actions">
        <button (click)="submitRate()" [disabled]="!value">Pošalji ocenu</button>
        <button class="btn-ghost" (click)="rating.set(null)">Odustani</button>
      </div>
    </div>
  }`
})
export class Archive implements OnInit {
  private data = inject(DataService);
  rows = signal<ArchiveRow[]>([]);
  msg = signal(''); err = signal('');
  rating = signal<ArchiveRow | null>(null);
  value: 'LIKE' | 'DISLIKE' | '' = '';
  comment = '';
  private field = 'orderedAt'; private asc = false;

  ngOnInit() { this.load(); }
  load() { this.data.archive().subscribe(r => this.rows.set(r)); }

  sortBy(f: string) {
    this.asc = this.field === f ? !this.asc : true;
    this.field = f;
    const d = this.asc ? 1 : -1;
    this.rows.set([...this.rows()].sort((a: any, b: any) =>
      (a[f] > b[f] ? 1 : a[f] < b[f] ? -1 : 0) * d));
  }

  markReceived(r: ArchiveRow) {
    this.data.markReceived(r.invoiceId).subscribe({
      next: res => { this.msg.set(res.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }

  openRate(r: ArchiveRow) { this.rating.set(r); this.value = ''; this.comment = ''; }

  submitRate() {
    const r = this.rating();
    if (!r || !this.value) return;
    this.data.rate(r.productId, this.value, this.comment).subscribe({
      next: res => { this.msg.set(res.message); this.rating.set(null); },
      error: e => this.err.set(e.error?.message || 'Greška pri slanju ocene.')
    });
  }
}
