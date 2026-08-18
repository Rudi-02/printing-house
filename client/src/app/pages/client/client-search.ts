import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { Category, ProductRow } from '../../core/models';

@Component({
  selector: 'app-client-search',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
  <div class="card">
    <h1>Pretraga proizvoda</h1>
    <form class="grid cols-3" (ngSubmit)="search()">
      <div class="field">
        <label for="q">Naziv proizvoda</label>
        <input id="q" name="q" [(ngModel)]="name" placeholder="npr. Polo majica">
      </div>
      <div class="field">
        <label for="cat">Kategorija</label>
        <select id="cat" name="cat" [(ngModel)]="category">
          <option value="">Sve kategorije</option>
          @for (c of categories(); track c._id) { <option [value]="c._id">{{ c.name }}</option> }
        </select>
      </div>
      <div class="field" style="display:flex;align-items:flex-end;gap:8px">
        <button type="submit">Pretraži</button>
        <button type="button" class="btn-ghost" (click)="reset()">Poništi</button>
      </div>
    </form>
  </div>

  <div class="card">
    <h2>Rezultati pretrage ({{ results().length }})</h2>
    @if (!results().length) {
      <p class="muted">Nema proizvoda koji odgovaraju kriterijumima. Proizvodi kojih nema na stanju se ne prikazuju.</p>
    } @else {
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" (click)="toggleSort()">Naziv proizvoda {{ dir === 'asc' ? '▲' : '▼' }}</th>
              <th>Kategorija</th><th>Štamparija</th><th>Grad</th>
              <th>Cena</th><th>Na stanju</th><th>👍/👎</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of results(); track r._id) {
              <tr>
                <td><strong>{{ r.name }}</strong></td>
                <td>{{ r.categoryName }}</td>
                <td>{{ r.printerName }}</td>
                <td>{{ r.city }}</td>
                <td>{{ r.price }} RSD</td>
                <td>{{ r.quantity }}</td>
                <td>{{ r.likes }} / {{ r.dislikes }}</td>
                <td><a class="btn btn-sm" [routerLink]="['/products', r._id]">DETALJI</a></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  </div>`
})
export class ClientSearch implements OnInit {
  private data = inject(DataService);
  categories = signal<Category[]>([]);
  results = signal<ProductRow[]>([]);
  name = ''; category = ''; dir: 'asc' | 'desc' = 'asc';

  ngOnInit() {
    this.data.activeCategories().subscribe(c => this.categories.set(c));
    this.search();
  }
  search() {
    this.data.searchProducts({ name: this.name, category: this.category, sort: 'name', dir: this.dir })
      .subscribe(r => this.results.set(r));
  }
  toggleSort() { this.dir = this.dir === 'asc' ? 'desc' : 'asc'; this.search(); }
  reset() { this.name = ''; this.category = ''; this.dir = 'asc'; this.search(); }
}
