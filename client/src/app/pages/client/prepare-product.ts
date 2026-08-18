import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { productImg } from '../../core/api';
import { ProductDetails } from '../../core/models';

@Component({
  selector: 'app-prepare-product',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  @if (p(); as prod) {
    <div class="card spread">
      <h1 style="margin:0">Priprema proizvoda — {{ prod.name }}</h1>
      <a class="btn btn-ghost btn-sm" [routerLink]="['/products', prod._id]">NAZAD</a>
    </div>

    @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
    @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

    <div class="grid cols-2">
      <div class="card">
        <h2>Pregled otiska</h2>
        <div class="preview-stage">
          <img class="base" [src]="img(prod.mainImage)" [alt]="prod.name">
          @if (text) {
            <div class="overlay-text"
                 [style.left.%]="posX" [style.top.%]="posY"
                 [style.color]="textColor" [style.font-size.px]="fontSize">{{ text }}</div>
          }
          @if (motifPreview()) {
            <img class="overlay-img" [src]="motifPreview()" alt="Motiv"
                 [style.left.%]="posX" [style.top.%]="posY">
          }
        </div>
        <div class="hint mt">Tekst i motiv se prikazuju preko slike proizvoda (CSS preklapanje).</div>
      </div>

      <div class="card">
        <h2>Parametri štampe</h2>
        <div class="field">
          <label for="color">Boja proizvoda</label>
          <select id="color" name="color" [(ngModel)]="color">
            @for (c of prod.colors ?? ['bela']; track c) { <option [value]="c">{{ c }}</option> }
          </select>
        </div>

        <div class="field">
          <label for="svc">Vrsta štampe</label>
          <select id="svc" name="svc" [(ngModel)]="serviceId">
            <option value="">Bez dodatne štampe (+0 RSD)</option>
            @for (s of prod.services ?? []; track s._id) {
              <option [value]="s._id">{{ s.name }} (maks. {{ s.maxWidth }}×{{ s.maxHeight }} mm, +{{ s.extraPrice }} RSD)</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="txt">Tekst na proizvodu</label>
          <input id="txt" name="txt" [(ngModel)]="text" maxlength="60" placeholder="npr. Naziv firme">
        </div>

        <div class="grid cols-2">
          <div class="field">
            <label for="tc">Boja teksta</label>
            <input id="tc" name="tc" type="color" [(ngModel)]="textColor">
          </div>
          <div class="field">
            <label for="fs">Veličina teksta ({{ fontSize }} px)</label>
            <input id="fs" name="fs" type="range" min="10" max="60" [(ngModel)]="fontSize">
          </div>
          <div class="field">
            <label for="px">Pozicija X ({{ posX }}%)</label>
            <input id="px" name="px" type="range" min="5" max="95" [(ngModel)]="posX">
          </div>
          <div class="field">
            <label for="py">Pozicija Y ({{ posY }}%)</label>
            <input id="py" name="py" type="range" min="5" max="95" [(ngModel)]="posY">
          </div>
        </div>

        <div class="field">
          <label for="motif">Sličica / motiv (JPG, PNG, GIF)</label>
          <input id="motif" name="motif" type="file" accept="image/jpeg,image/png,image/gif" (change)="onMotif($event)">
        </div>

        <div class="field">
          <label for="qty">Količina (kom)</label>
          <input id="qty" name="qty" type="number" min="1" [max]="prod.quantity" [(ngModel)]="quantity">
          <div class="hint">Trenutno na stanju: {{ prod.quantity }} kom.</div>
        </div>

        <div class="alert alert-info">
          Ukupna cena: <strong>{{ totalPrice() }} RSD</strong>
          ({{ unitPrice() }} RSD × {{ quantity }} kom)
        </div>

        <div class="actions">
          <button class="btn-accent" (click)="addToCart()" [disabled]="loading()">DODAJ U KORPU</button>
          <button class="btn-ghost" type="button" (click)="resetForm()">PONIŠTI</button>
          <a class="btn btn-ghost" [routerLink]="['/products', prod._id]">NAZAD</a>
        </div>
      </div>
    </div>
  }`
})
export class PrepareProduct implements OnInit {
  @Input() id = '';
  private data = inject(DataService);
  private router = inject(Router);
  img = productImg;

  p = signal<ProductDetails | null>(null);
  motifFile: File | null = null;
  motifPreview = signal('');
  msg = signal(''); err = signal(''); loading = signal(false);

  color = 'bela'; serviceId = ''; text = ''; textColor = '#ffffff';
  fontSize = 24; posX = 50; posY = 50; quantity = 1;

  ngOnInit() {
    this.data.productDetails(this.id).subscribe(d => {
      this.p.set(d);
      this.color = (d.colors && d.colors[0]) || 'bela';
    });
  }

  unitPrice() {
    const d = this.p();
    if (!d) return 0;
    const svc = (d.services ?? []).find(s => s._id === this.serviceId);
    return (d.price ?? 0) + (svc ? svc.extraPrice : 0);
  }
  totalPrice() { return this.unitPrice() * (this.quantity || 0); }

  onMotif(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    this.err.set('');
    if (!f) { this.motifFile = null; this.motifPreview.set(''); return; }
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(f.type)) {
      this.err.set('Dozvoljeni su samo JPG, PNG i GIF formati.'); return;
    }
    this.motifFile = f;
    this.motifPreview.set(URL.createObjectURL(f));
  }

  resetForm() {
    const d = this.p();
    this.color = (d?.colors && d.colors[0]) || 'bela';
    this.serviceId = ''; this.text = ''; this.textColor = '#ffffff';
    this.fontSize = 24; this.posX = 50; this.posY = 50; this.quantity = 1;
    this.motifFile = null; this.motifPreview.set('');
    this.msg.set(''); this.err.set('');
  }

  addToCart() {
    const d = this.p();
    if (!d) return;
    this.msg.set(''); this.err.set('');
    if (!this.quantity || this.quantity < 1) { this.err.set('Količina mora biti bar 1.'); return; }
    if (this.quantity > (d.quantity ?? 0)) { this.err.set('Nema dovoljno proizvoda trenutno na stanju'); return; }

    const fd = new FormData();
    fd.append('productId', d._id);
    fd.append('quantity', String(this.quantity));
    fd.append('color', this.color);
    if (this.serviceId) fd.append('serviceId', this.serviceId);
    fd.append('customText', this.text);
    fd.append('previewX', String(this.posX));
    fd.append('previewY', String(this.posY));
    if (this.motifFile) fd.append('customImage', this.motifFile);

    this.loading.set(true);
    this.data.addToCart(fd).subscribe({
      next: r => { this.loading.set(false); this.msg.set(r.message); setTimeout(() => this.router.navigateByUrl('/client/cart'), 900); },
      error: e => { this.loading.set(false); this.err.set(e.error?.message || 'Dodavanje nije uspelo.'); }
    });
  }
}
