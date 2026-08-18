import { Component, inject, signal, OnInit, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DataService } from '../../core/data.service';
import { AuthService } from '../../core/auth.service';
import { productImg } from '../../core/api';
import { ProductDetails as PD } from '../../core/models';

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
  @if (p(); as prod) {
    <div class="card">
      <div class="spread">
        <h1 style="margin:0">{{ prod.name }}</h1>
        <a class="btn btn-ghost btn-sm" [routerLink]="backLink()">Nazad</a>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <img class="gallery-main" [src]="img(selected())" [alt]="prod.name">
        @if (allImages().length > 1) {
          <div class="thumbs">
            @for (im of allImages(); track im) {
              <img [src]="img(im)" [class.selected]="im === selected()"
                   (click)="select(im)" alt="Sličica proizvoda">
            }
          </div>
          <div class="hint">Izabrana slika se pamti u kolačiću ovog pregledača.</div>
        }
      </div>

      <div class="card">
        <h2>Osnovni podaci</h2>
        <table>
          <tbody>
            <tr><th>Štamparija</th><td>{{ prod.printerName }}</td></tr>
            <tr><th>Grad</th><td>{{ prod.city }}</td></tr>
            <tr><th>Kategorija</th><td>{{ prod.categoryName }}@if(prod.subcategoryName){ / {{ prod.subcategoryName }}}</td></tr>
            <tr><th>Sviđanja</th><td>👍 {{ prod.likes }} &nbsp;&nbsp; 👎 {{ prod.dislikes }}</td></tr>
            @if (prod.extended) {
              <tr><th>Cena po komadu</th><td><strong>{{ prod.price }} RSD</strong></td></tr>
              <tr><th>Na stanju</th><td>{{ prod.quantity }} kom</td></tr>
            }
          </tbody>
        </table>

        @if (prod.extended) {
          <h3 class="mt">Opis</h3>
          <p>{{ prod.description || 'Nema detaljnog opisa.' }}</p>

          <h3>Dostupne boje</h3>
          <p>{{ (prod.colors ?? ['bela']).join(', ') }}</p>

          <h3>Vrste štampe</h3>
          @if (!prod.services?.length) { <p class="muted">Štamparija nije definisala dodatne usluge.</p> }
          @if (prod.services?.length) {
            <div class="table-wrap">
              <table>
                <thead><tr><th>Vrsta štampe</th><th>Maks. dimenzije</th><th>Dodatna cena/kom</th></tr></thead>
                <tbody>
                  @for (s of prod.services!; track s._id) {
                    <tr><td>{{ s.name }}</td><td>{{ s.maxWidth }} × {{ s.maxHeight }} mm</td><td>+{{ s.extraPrice }} RSD</td></tr>
                  }
                </tbody>
              </table>
            </div>
          }

          <h3 class="mt">Lokacija štamparije</h3>
          <p class="muted" style="margin-top:0">{{ prod.address }}, {{ prod.city }}</p>
          <iframe [src]="mapUrl()" style="width:100%;height:230px;border:1px solid var(--line);border-radius:8px"
                  title="Mapa štamparije" loading="lazy"></iframe>

          <div class="actions mt">
            <a class="btn btn-accent" [routerLink]="['/client/prepare', prod._id]">DALJE</a>
          </div>
        } @else {
          <div class="alert alert-info mt">
            Prijavite se kao klijent da biste videli cenu, opis, boje, vrste štampe i naručili proizvod.
          </div>
          <a class="btn" routerLink="/login">Prijavi se</a>
        }
      </div>
    </div>

    <div class="card">
      <h2>Poslednjih 5 komentara</h2>
      @if (!prod.comments.length) { <p class="muted">Još uvek nema komentara za ovaj proizvod.</p> }
      @for (c of prod.comments; track c._id) {
        <div class="comment" [class.mine]="c.mine">
          <div class="meta">
            <strong>{{ c.username }}</strong> · {{ c.createdAt | date:'dd.MM.yyyy. HH:mm' }}
            @if (c.reaction === 'LIKE') { · 👍 } @if (c.reaction === 'DISLIKE') { · 👎 }
          </div>
          <div>{{ c.text }}</div>
        </div>
      }
    </div>
  } @else {
    <div class="card"><p class="muted">Učitavanje podataka o proizvodu...</p></div>
  }`
})
export class ProductDetails implements OnInit {
  @Input() id = '';
  private data = inject(DataService);
  auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  img = productImg;

  p = signal<PD | null>(null);
  selected = signal('');

  ngOnInit() {
    this.data.productDetails(this.id).subscribe(d => {
      this.p.set(d);
      const cookie = this.readCookie(`main_img_${this.id}`);
      const imgs = [d.mainImage, ...(d.images || [])];
      this.selected.set(cookie && imgs.includes(cookie) ? cookie : d.mainImage);
    });
  }

  allImages() {
    const d = this.p();
    return d ? [d.mainImage, ...(d.images || [])] : [];
  }
  select(im: string) {
    this.selected.set(im);
    document.cookie = `main_img_${this.id}=${im};path=/;max-age=${60 * 60 * 24 * 30}`;
  }
  private readCookie(name: string): string {
    const hit = document.cookie.split('; ').find(c => c.startsWith(name + '='));
    return hit ? decodeURIComponent(hit.split('=')[1]) : '';
  }
  backLink() { return this.auth.isClient() ? '/client/search' : '/'; }
  mapUrl(): SafeResourceUrl {
    const d = this.p();
    const q = d?.lat && d?.lng ? `${d.lat},${d.lng}` : encodeURIComponent(`${d?.address ?? ''}, ${d?.city ?? ''}`);
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://maps.google.com/maps?q=${q}&output=embed`);
  }
}
