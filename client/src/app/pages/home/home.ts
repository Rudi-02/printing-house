import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { productImg } from '../../core/api';
import { Category, ProductRow, PublicStats } from '../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
  <div class="card">
    <h1>Dobrodošli u Printing House</h1>
    <p class="muted">Platforma koja povezuje klijente sa štamparijama širom Srbije.</p>
    <div class="grid cols-2 mt">
      <div class="card" style="margin:0;background:#eef3fb">
        <h3>Registrovanih štamparija</h3>
        <div style="font-size:36px;font-weight:700;color:var(--brand)">{{ stats()?.printersCount ?? 0 }}</div>
      </div>
      <div class="card" style="margin:0;background:#fdf6e9">
        <h3>Postanite naš klijent</h3>
        <p class="muted" style="margin-top:0">Registrujte se kao fizičko ili pravno lice i naručite štampu.</p>
        <a class="btn" routerLink="/register">Registruj se</a>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>TOP 5 najbolje ocenjenih proizvoda</h2>
    @if (!stats()?.topProducts?.length) { <p class="muted">Trenutno nema ocenjenih proizvoda.</p> }
    <div class="grid cols-4">
      @for (p of stats()?.topProducts ?? []; track p._id) {
        <div class="product-card">
          <img [src]="img(p.mainImage)" [alt]="p.name">
          <div class="body">
            <strong>{{ p.name }}</strong>
            <div class="muted" style="font-size:13px">{{ p.printerName }}@if(p.city){, {{ p.city }}}</div>
            <div class="mt">👍 {{ p.likes }} &nbsp; 👎 {{ p.dislikes }}</div>
            <a class="btn btn-sm mt" [routerLink]="['/products', p._id]">DETALJI</a>
          </div>
        </div>
      }
    </div>
  </div>

  <div class="card">
    <h2>Pretraga štampanih proizvoda</h2>
    <form class="grid cols-3" (ngSubmit)="search()">
      <div class="field">
        <label for="q">Naziv proizvoda</label>
        <input id="q" name="q" [(ngModel)]="name" placeholder="npr. Hemijska olovka, Polo majica">
      </div>
      <div class="field">
        <label for="cat">Kategorija</label>
        <select id="cat" name="cat" [(ngModel)]="category">
          <option value="">Sve kategorije</option>
          @for (c of categories(); track c._id) { <option [value]="c._id">{{ c.name }}</option> }
        </select>
      </div>
      <div class="field" style="display:flex;align-items:flex-end">
        <button type="submit">Pretraži</button>
      </div>
    </form>

    @if (searched()) {
      @if (!results().length) {
        <div class="alert alert-info">Nema proizvoda koji odgovaraju kriterijumima pretrage.</div>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="sortable" (click)="toggleSort()">
                  Naziv proizvoda {{ dir === 'asc' ? '▲' : '▼' }}
                </th>
                <th>Kategorija</th><th>Štamparija</th><th>Grad</th><th>👍 / 👎</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of results(); track r._id) {
                <tr>
                  <td><strong>{{ r.name }}</strong></td>
                  <td>{{ r.categoryName }}</td>
                  <td>{{ r.printerName }}</td>
                  <td>{{ r.city }}</td>
                  <td>{{ r.likes }} / {{ r.dislikes }}</td>
                  <td><a class="btn btn-sm" [routerLink]="['/products', r._id]">DETALJI</a></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    }
  </div>`
})
export class Home implements OnInit {
  private data = inject(DataService);
  img = productImg;

  stats = signal<PublicStats | null>(null);
  categories = signal<Category[]>([]);
  results = signal<ProductRow[]>([]);
  searched = signal(false);
  name = '';
  category = '';
  dir: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    this.data.publicStats().subscribe(s => this.stats.set(s));
    this.data.activeCategories().subscribe(c => this.categories.set(c));
  }
  search() {
    this.data.searchProducts({ name: this.name, category: this.category, sort: 'name', dir: this.dir })
      .subscribe(r => { this.results.set(r); this.searched.set(true); });
  }
  toggleSort() { this.dir = this.dir === 'asc' ? 'desc' : 'asc'; this.search(); }
}
