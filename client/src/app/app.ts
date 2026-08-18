import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from './core/auth.service';
import { profileImg } from './core/api';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="app-shell">
    <header class="site">
      <div class="container header-inner">
        <a class="logo" routerLink="/">PRINTING<span>HOUSE</span></a>
        <button class="burger" (click)="menuOpen.set(!menuOpen())">☰ Meni</button>

        <nav class="main" [class.open]="menuOpen()" (click)="menuOpen.set(false)">
          @if (!auth.isLoggedIn()) {
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">Početna</a>
            <a routerLink="/login" routerLinkActive="active">Prijava</a>
            <a routerLink="/register" routerLinkActive="active">Registracija</a>
          }
          @if (auth.isClient()) {
            <a routerLink="/client/profile" routerLinkActive="active">Profil</a>
            <a routerLink="/client/search" routerLinkActive="active">Pretraga proizvoda</a>
            <a routerLink="/client/cart" routerLinkActive="active">E-korpa</a>
            <a routerLink="/client/archive" routerLinkActive="active">Arhiva proizvoda</a>
            @if (auth.isLegal()) { <a routerLink="/client/tenders" routerLinkActive="active">Javne nabavke</a> }
          }
          @if (auth.isPrinter()) {
            <a routerLink="/printer/profile" routerLinkActive="active">Profil</a>
            <a routerLink="/printer/products" routerLinkActive="active">Proizvodi i usluge</a>
            <a routerLink="/printer/stock" routerLinkActive="active">Ažuriranje količina</a>
            <a routerLink="/printer/import" routerLinkActive="active">Dodavanje iz fajla</a>
            <a routerLink="/printer/orders" routerLinkActive="active">Naručeni proizvodi</a>
            <a routerLink="/printer/tenders" routerLinkActive="active">Licitacije</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin/users" routerLinkActive="active">Korisnici</a>
            <a routerLink="/admin/requests" routerLinkActive="active">Zahtevi za registraciju</a>
            <a routerLink="/admin/categories" routerLinkActive="active">Kategorije</a>
            <a routerLink="/admin/stats" routerLinkActive="active">Statistike</a>
          }
        </nav>

        @if (auth.isLoggedIn()) {
          <div class="user-box">
            <img [src]="img(auth.user()!.profileImage)" alt="Profilna slika">
            <span>{{ auth.user()!.username }}</span>
            <button class="btn-sm btn-accent" (click)="auth.logout()">Izloguj se</button>
          </div>
        }
      </div>
    </header>

    <main><div class="container"><router-outlet /></div></main>

    <footer class="site">
      <div class="container footer-inner">
        <div>© {{ year }} Printing House — platforma za štamparije</div>
        <div>
          @if (auth.isLoggedIn()) {
            <a [routerLink]="auth.homeRoute()" style="color:#e8a33d">Početni ekran</a>
          } @else {
            <a routerLink="/login" style="color:#e8a33d">Prijava</a>
          }
        </div>
      </div>
    </footer>
  </div>`
})
export class App {
  auth = inject(AuthService);
  menuOpen = signal(false);
  year = new Date().getFullYear();
  img = profileImg;
}
