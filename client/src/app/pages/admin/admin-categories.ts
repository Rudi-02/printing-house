import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/data.service';
import { Category } from '../../core/models';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule],
  template: `
  <div class="card">
    <h1>Kategorije štamparskih proizvoda</h1>
    <p class="muted">Dodajte novu kategoriju, a unutar nje i potkategorije.</p>
  </div>

  @if (msg()) { <div class="alert alert-ok">{{ msg() }}</div> }
  @if (err()) { <div class="alert alert-error">{{ err() }}</div> }

  <div class="card">
    <h2>Nova kategorija</h2>
    <form class="grid cols-2" (ngSubmit)="add()">
      <div class="field">
        <label for="nc">Naziv kategorije</label>
        <input id="nc" name="newCat" [(ngModel)]="newCat" placeholder="npr. Štampa malih formata" required>
      </div>
      <div class="field" style="display:flex;align-items:flex-end">
        <button type="submit" [disabled]="!newCat.trim()">Dodaj kategoriju</button>
      </div>
    </form>
  </div>

  @for (c of categories(); track c._id) {
    <div class="card">
      <div class="spread">
        <h2 style="margin:0">{{ c.name }}</h2>
        <button class="btn-sm btn-danger" (click)="remove(c)">Obriši kategoriju</button>
      </div>

      @if (!c.subcategories.length) { <p class="muted">Nema definisanih potkategorija.</p> }
      @if (c.subcategories.length) {
        <ul>
          @for (s of c.subcategories; track s._id) { <li>{{ s.name }}</li> }
        </ul>
      }

      <form class="grid cols-2" (ngSubmit)="addSub(c)">
        <div class="field">
          <label [for]="'sub' + c._id">Nova potkategorija</label>
          <input [id]="'sub' + c._id" [(ngModel)]="subInput[c._id]" [ngModelOptions]="{standalone:true}"
                 placeholder="npr. Olovke, Vizit karte, Flajeri">
        </div>
        <div class="field" style="display:flex;align-items:flex-end">
          <button type="submit" class="btn-ghost" [disabled]="!subInput[c._id]">Dodaj potkategoriju</button>
        </div>
      </form>
    </div>
  }`
})
export class AdminCategories implements OnInit {
  private data = inject(DataService);
  categories = signal<Category[]>([]);
  newCat = '';
  subInput: Record<string, string> = {};
  msg = signal(''); err = signal('');

  ngOnInit() { this.load(); }
  load() { this.data.categories().subscribe(c => this.categories.set(c)); }

  add() {
    this.msg.set(''); this.err.set('');
    this.data.createCategory(this.newCat.trim()).subscribe({
      next: () => { this.msg.set('Kategorija je dodata.'); this.newCat = ''; this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
  addSub(c: Category) {
    const name = (this.subInput[c._id] || '').trim();
    if (!name) return;
    this.msg.set(''); this.err.set('');
    this.data.addSubcategory(c._id, name).subscribe({
      next: () => { this.msg.set('Potkategorija je dodata.'); this.subInput[c._id] = ''; this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
  remove(c: Category) {
    if (!confirm(`Obrisati kategoriju "${c.name}"?`)) return;
    this.data.deleteCategory(c._id).subscribe({
      next: r => { this.msg.set(r.message); this.load(); },
      error: e => this.err.set(e.error?.message || 'Greška.')
    });
  }
}
