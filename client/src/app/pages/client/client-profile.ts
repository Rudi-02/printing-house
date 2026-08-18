import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { profileImg } from '../../core/api';
import { Invoice, User } from '../../core/models';

@Component({
  selector: 'app-client-profile',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
  <div class="card">
    <h1>Moj profil</h1>
    @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
    @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

    <div class="grid cols-2">
      <div>
        <img [src]="preview() || img(m.profileImage)" alt="Profilna slika"
             style="width:140px;height:140px;object-fit:cover;border-radius:10px;border:2px solid var(--accent)">
        <div class="field mt">
          <label for="pi">Promeni profilnu sliku</label>
          <input id="pi" type="file" accept="image/jpeg,image/png,image/gif" (change)="onFile($event)">
          <div class="hint">JPG/PNG/GIF, 100x100 – 250x250 px.</div>
          @if (imgErr()) { <div class="error-text">{{ imgErr() }}</div> }
        </div>
      </div>

      <form (ngSubmit)="save()">
        <div class="field">
          <label for="un">Korisničko ime</label>
          <input id="un" [value]="m.username" disabled>
          <div class="hint">Korisničko ime nije moguće promeniti.</div>
        </div>
        <div class="grid cols-2">
          <div class="field"><label for="fn">Ime</label><input id="fn" name="firstName" [(ngModel)]="m.firstName" required></div>
          <div class="field"><label for="ln">Prezime</label><input id="ln" name="lastName" [(ngModel)]="m.lastName" required></div>
          <div class="field"><label for="ph">Telefon</label><input id="ph" name="phone" [(ngModel)]="m.phone" required></div>
          <div class="field"><label for="em">I-mejl</label><input id="em" name="email" type="email" [(ngModel)]="m.email" required></div>
        </div>
        @if (auth.isLegal()) {
          <div class="grid cols-2">
            <div class="field"><label for="inst">Naziv institucije</label><input id="inst" name="institutionName" [(ngModel)]="m.institutionName"></div>
            <div class="field"><label for="ad">Adresa sedišta</label><input id="ad" name="address" [(ngModel)]="m.address"></div>
            <div class="field"><label for="ci">Grad</label><input id="ci" name="city" [(ngModel)]="m.city"></div>
            <div class="field"><label for="pib">PIB / Matični broj</label>
              <input id="pib" [value]="m.pib + ' / ' + m.companyNumber" disabled></div>
          </div>
        }
        <button type="submit">Sačuvaj izmene</button>
      </form>
    </div>
  </div>

  <div class="card">
    <h2>Moje narudžbine</h2>
    @if (!orders().length) { <p class="muted">Nemate nijednu narudžbinu.</p> }
    @if (orders().length) {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="sortBy('invoiceNumber')">ID fakture</th>
              <th class="sortable" (click)="sortBy('printerName')">Štamparija</th>
              <th class="sortable" (click)="sortBy('city')">Grad</th>
              <th>Naručeni proizvodi</th>
              <th class="sortable" (click)="sortBy('total')">Ukupan iznos</th>
              <th class="sortable" (click)="sortBy('status')">Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (o of orders(); track o._id) {
              <tr>
                <td>{{ o.invoiceNumber }}<div class="muted" style="font-size:12px">{{ o.orderedAt | date:'dd.MM.yyyy.' }}</div></td>
                <td>{{ o.printerName }}</td>
                <td>{{ o.city }}</td>
                <td>
                  <ol style="margin:0;padding-left:18px">
                    @for (it of o.items; track it._id) {
                      <li>{{ it.productName }} ({{ it.quantity }})</li>
                    }
                  </ol>
                </td>
                <td><strong>{{ o.total }} RSD</strong></td>
                <td><span class="badge" [class]="badgeClass(o.status)">{{ o.status }}</span></td>
                <td>
                  <div class="actions">
                    <button class="btn-sm btn-ghost" (click)="downloadPdf(o)">PDF</button>
                    @if (o.status === 'naruceno') {
                      <button class="btn-sm btn-danger" (click)="cancel(o)">Otkaži</button>
                    }
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class ClientProfile implements OnInit {
  private data = inject(DataService);
  auth = inject(AuthService);
  img = profileImg;

  m: any = {};
  file: File | null = null;
  preview = signal(''); imgErr = signal('');
  msg = signal(''); err = signal('');
  orders = signal<Invoice[]>([]);
  private sortField = 'orderedAt'; private asc = false;

  ngOnInit() {
    this.data.getProfile().subscribe(u => this.m = { ...u });
    this.load();
  }
  load() { this.data.myOrders().subscribe(o => this.orders.set(o)); }

  badgeClass(s: string) {
    return { 'naruceno': 'ordered', 'placeno': 'paid', 'u stampi': 'printing',
             'isporuceno': 'delivered', 'primljeno': 'received' }[s] || '';
  }

  sortBy(field: string) {
    this.asc = this.sortField === field ? !this.asc : true;
    this.sortField = field;
    const dir = this.asc ? 1 : -1;
    this.orders.set([...this.orders()].sort((a: any, b: any) =>
      (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * dir));
  }

  onFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.imgErr.set(''); this.file = null; this.preview.set('');
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
      this.imgErr.set('Dozvoljeni su samo JPG, PNG i GIF formati.'); return;
    }
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      if (im.width < 100 || im.height < 100 || im.width > 250 || im.height > 250)
        this.imgErr.set(`Slika mora biti između 100x100 i 250x250 px (izabrana je ${im.width}x${im.height}).`);
      else { this.file = f; this.preview.set(url); }
    };
    im.src = url;
  }

  save() {
    this.msg.set(''); this.err.set('');
    const fd = new FormData();
    ['firstName','lastName','phone','email','institutionName','address','city']
      .forEach(k => { if (this.m[k]) fd.append(k, this.m[k]); });
    if (this.file) fd.append('profileImage', this.file);
    this.data.updateProfile(fd).subscribe({
      next: r => { this.msg.set(r.message); this.auth.setUser(r.user); this.m = { ...r.user }; this.preview.set(''); },
      error: e => this.err.set(e.error?.message || 'Ažuriranje nije uspelo.')
    });
  }

  cancel(o: Invoice) {
    if (!confirm(`Otkazati narudžbinu ${o.invoiceNumber}?`)) return;
    this.data.cancelOrder(o._id).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Otkazivanje nije uspelo.')
    });
  }

  downloadPdf(o: Invoice) {
    this.data.downloadInvoice(o._id).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${o.invoiceNumber}.pdf`; a.click();
      URL.revokeObjectURL(url);
    });
  }
}
