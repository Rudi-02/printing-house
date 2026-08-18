import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { printImg } from '../../core/api';
import { CartView, Invoice } from '../../core/models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card spread">
    <h1 style="margin:0">Trenutna e-korpa</h1>
    @if (cart()?.groups?.length) {
      <button class="btn-ghost btn-sm" (click)="clear()">Isprazni korpu</button>
    }
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  @if (!cart()?.groups?.length && !invoices().length) {
    <div class="card"><p class="muted">Vaša e-korpa je prazna.</p></div>
  }

  @for (g of cart()?.groups ?? []; track g.printerId) {
    <div class="card">
      <h2>{{ g.printerName }} @if (g.city) { <span class="muted">— {{ g.city }}</span> }</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Proizvod</th><th>Boja</th><th>Tip štampe</th><th>Motiv</th><th>Količina</th><th>Cena/kom</th><th>Ukupno</th><th></th></tr>
          </thead>
          <tbody>
            @for (it of g.items; track it._id) {
              <tr>
                <td><strong>{{ it.productName }}</strong>
                  @if (it.customText) { <div class="muted" style="font-size:12px">Tekst: "{{ it.customText }}"</div> }
                </td>
                <td>{{ it.color }}</td>
                <td>{{ it.serviceName || '—' }}</td>
                <td>
                  @if (it.customImage) {
                    <img [src]="pimg(it.customImage)" alt="Motiv" style="width:44px;height:44px;object-fit:cover;border-radius:5px">
                  } @else { <span class="muted">—</span> }
                </td>
                <td>{{ it.quantity }}</td>
                <td>{{ it.unitPrice }} RSD</td>
                <td><strong>{{ it.totalPrice }} RSD</strong></td>
                <td><button class="btn-sm btn-danger" (click)="remove(it._id)">Ukloni</button></td>
              </tr>
            }
          </tbody>
          <tfoot>
            <tr><td colspan="6" class="right"><strong>Ukupno za ovu štampariju:</strong></td>
                <td colspan="2"><strong>{{ g.subtotal }} RSD</strong></td></tr>
          </tfoot>
        </table>
      </div>
    </div>
  }

  @if (cart()?.groups?.length) {
    <div class="card">
      <div class="spread">
        <h2 style="margin:0">Ukupno: {{ cart()!.total }} RSD</h2>
        <button class="btn-accent" (click)="confirm()" [disabled]="loading()">POTVRDI</button>
      </div>
      @if (auth.isLegal()) {
        <p class="hint mt">Kao pravno lice, potvrdom se raspisuje javna nabavka i licitacija u trajanju od 10 minuta.</p>
      } @else {
        <p class="hint mt">Formiraće se posebna faktura za svaku štampariju, a PDF fakture stižu na Vaš i-mejl.</p>
      }
    </div>
  }

  @if (invoices().length) {
    <div class="card">
      <h2>Plaćanje faktura</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Faktura</th><th>Štamparija</th><th>Iznos</th><th>Status</th></tr></thead>
          <tbody>
            @for (i of invoices(); track i._id) {
              <tr><td>{{ i.invoiceNumber }}</td><td>{{ i.printerName }}</td>
                  <td>{{ i.total }} RSD</td><td><span class="badge ordered">{{ i.status }}</span></td></tr>
            }
          </tbody>
        </table>
      </div>

      <h3 class="mt">Podaci o kartici (test režim)</h3>
      @if (payErr()) { <div class="alert alert-error">{{ payErr() }}</div> }
      <form class="grid cols-2" (ngSubmit)="pay()">
        <div class="field">
          <label for="ct">Tip kartice</label>
          <select id="ct" name="cardType" [(ngModel)]="card.cardType" required>
            <option value="">— izaberite —</option>
            <option value="VISA">Visa</option>
            <option value="MASTERCARD">MasterCard</option>
            <option value="MAESTRO">Maestro</option>
            <option value="AMEX">American Express</option>
          </select>
        </div>
        <div class="field">
          <label for="cn">Broj kartice</label>
          <input id="cn" name="cardNumber" [(ngModel)]="card.cardNumber" placeholder="4242 4242 4242 4242" required>
        </div>
        <div class="field">
          <label for="cvc">CVC kod</label>
          <input id="cvc" name="cvc" [(ngModel)]="card.cvc" maxlength="4" placeholder="123" required>
        </div>
        <div class="field">
          <label for="exp">Datum isteka (MM/GG)</label>
          <input id="exp" name="expiry" [(ngModel)]="card.expiry" maxlength="5" placeholder="12/28" required>
        </div>
        <div class="field" style="grid-column:1/-1">
          <button type="submit" [disabled]="paying()">{{ paying() ? 'Obrada plaćanja...' : 'PLATI' }}</button>
        </div>
      </form>
      <p class="hint">Test kartica koja prolazi validaciju: 4242 4242 4242 4242.</p>
    </div>
  }`
})
export class CartPage implements OnInit {
  private data = inject(DataService);
  private router = inject(Router);
  auth = inject(AuthService);
  pimg = printImg;

  cart = signal<CartView | null>(null);
  invoices = signal<Invoice[]>([]);
  msg = signal(''); err = signal(''); payErr = signal('');
  loading = signal(false); paying = signal(false);
  card: any = { cardType: '', cardNumber: '', cvc: '', expiry: '' };

  ngOnInit() { this.load(); }
  load() { this.data.cart().subscribe(c => this.cart.set(c)); }

  remove(itemId: string) {
    this.data.removeCartItem(itemId).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
  clear() {
    if (!confirm('Isprazniti e-korpu?')) return;
    this.data.clearCart().subscribe(r => { this.msg.set(r.message); this.load(); });
  }

  confirm() {
    this.msg.set(''); this.err.set(''); this.loading.set(true);
    if (this.auth.isLegal()) {
      this.data.openTender().subscribe({
        next: r => { this.loading.set(false); this.msg.set(r.message); this.load();
                     setTimeout(() => this.router.navigateByUrl('/client/tenders'), 1400); },
        error: e => { this.loading.set(false); this.err.set(e.error?.message || 'Greška.'); }
      });
    } else {
      this.data.checkout().subscribe({
        next: r => { this.loading.set(false); this.msg.set(r.message); this.invoices.set(r.invoices); this.load(); },
        error: e => { this.loading.set(false); this.err.set(e.error?.message || 'Greška.'); }
      });
    }
  }

  pay() {
    this.payErr.set(''); this.paying.set(true);
    this.data.pay({ ...this.card, invoiceIds: this.invoices().map(i => i._id) }).subscribe({
      next: r => { this.paying.set(false); this.msg.set(r.message); this.invoices.set([]);
                   setTimeout(() => this.router.navigateByUrl('/client/profile'), 1400); },
      error: e => { this.paying.set(false); this.payErr.set(e.error?.message || 'Plaćanje nije uspelo.'); }
    });
  }
}
