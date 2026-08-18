# Printing House — projekat iz Programiranja internet aplikacija (2025/26)

Veb sistem (platforma) za štamparije. Tri kategorije korisnika: **klijenti** (fizička i pravna lica),
**štampari** i **administrator** sistema.

**Tehnologije (opcija 2 iz postavke):** Angular 20 (standalone, signals) + Express/NodeJS + MongoDB.
Baza podataka: **`printing-house-db`** (kolekcije se kreiraju automatski kroz Mongoose šeme —
skripte za kolekcije nisu deo isporuke, po zahtevu).

---

## Struktura

```
printing-house/
├── server/                      # Express + Mongoose (REST API, port 4000)
│   ├── src/
│   │   ├── config/              # konekcija na bazu, konstante, regularni izrazi
│   │   ├── models/              # User, Category, Product, Cart, Invoice, Tender,
│   │   │                        # Comment, Rating, PasswordReset
│   │   ├── middleware/          # JWT autentikacija/autorizacija, FileUpload, greške
│   │   ├── utils/               # validatori, nodemailer, PDFKit generatori
│   │   ├── controllers/         # auth, user, category, product, cart, order, tender, admin
│   │   ├── routes/index.js      # sve REST rute
│   │   └── server.js            # ulazna tačka
│   ├── uploads/                 # profiles / products / prints / pdf
│   ├── lager-lista-primer.json  # primer JSON fajla za uvoz (Prilog 1)
│   └── .env.example
└── client/                      # Angular 20 (standalone komponente, lazy rute)
    └── src/app/
        ├── core/                # modeli, AuthService, DataService, interceptor, guards
        └── pages/               # home, auth, product-details, client, printer, admin
```

## Pokretanje

**1) Baza** — pokrenuti MongoDB lokalno (baza `printing-house-db` se kreira sama).

**2) Server**
```bash
cd server
npm install
cp .env.example .env      # po potrebi izmeniti SMTP / Stripe podatke
npm run dev               # http://localhost:4000
```

**3) Klijent**
```bash
cd client
npm install
npm start                 # http://localhost:4200
```

**Napomena o administratoru:** registracija administratora se, po postavci, ne realizuje.
Administratorski nalog se ubacuje direktno u bazu (`role: "ADMIN"`, `status: "APPROVED"`,
lozinka bcrypt-hash). Prijava je na posebnoj, javno nevidljivoj ruti **`/admin-login`**.

**Podrazumevane slike:** u `server/uploads/profiles/` postaviti `default_profile_image.jpg`,
a u `server/uploads/products/` `default_product.jpg`.

---

## Realizovane funkcionalnosti

### Autentifikacija i registracija
- Prijava korisničkim imenom/lozinkom, poruka o grešci pri pogrešnim podacima.
- Zaboravljena lozinka → link ispod forme → unos korisničkog imena ili i-mejla →
  privremeni link poslat na i-mejl, **važi 5 minuta** (TTL indeks u bazi + provera na serveru).
- Odvojena, javno nevidljiva forma za administratora (`/admin-login`).
- Registracija fizičkih lica (odmah aktivni) i pravnih lica / štamparija
  (status `PENDING`, čekaju odobrenje administratora).
- Validacija lozinke regularnim izrazom (8–12 karaktera, počinje slovom, bar 1 veliko slovo,
  1 broj, 1 specijalni karakter) na klijentu (JavaScript) **i** na serveru; lozinka se čuva bcrypt-kriptovana.
- Matični broj: tačno 8 cifara i jedinstven. PIB: 9 cifara, ne počinje nulom, jedinstven.
  Korisničko ime i i-mejl jedinstveni na nivou sistema.
- Profilna slika isključivo preko FileUpload prozora; dimenzije 100×100 – 250×250 px,
  JPG/PNG/GIF — provera i u pregledaču i na serveru (`image-size`); u suprotnom `default_profile_image.jpg`.

### Neregistrovani korisnik
- Ukupan broj registrovanih štamparija i **TOP 5** proizvoda po broju sviđanja.
- Pretraga po nazivu i/ili kategoriji; padajuća lista inicijalno „Sve kategorije“ i sadrži
  samo kategorije sa aktivnim proizvodima na stanju.
- Rezultati u tabeli sa dugmetom **DETALJI**; abecedno sortiranje (rastuće/opadajuće) klikom na zaglavlje.
- Strana sa detaljima: naziv, štamparija, grad, broj sviđanja/nesviđanja i galerija
  (glavna slika + do 3 thumbnail-a); izabrana glavna slika se **pamti u kolačiću** pregledača.

### Klijenti
- **Profil:** pregled i ažuriranje podataka (korisničko ime zaključano) i promena profilne slike.
  Ispod — tabela svih narudžbina sa sortiranjem: ID fakture, štamparija, grad, numerisani
  proizvodi sa količinom, ukupan iznos u dinarima i dugme **Otkaži** samo za status „naručeno“.
- **Pretraživanje proizvoda:** proširena strana sa detaljima (opis, cena po komadu, izbor boje —
  podrazumevano bela, vrste štampe sa maksimalnim dimenzijama i dodatnom cenom) i **mapom** lokacije štamparije.
- **Priprema proizvoda** (dugme DALJE): unos teksta i/ili postavljanje sličice koja se renderuje
  preko slike proizvoda (CSS preklapanje, pomeranje po X/Y osi, boja i veličina teksta),
  unos količine, dugmad **DODAJ U KORPU**, **PONIŠTI** i **NAZAD**.
  Proizvodi kojih nema na stanju se ne prikazuju; kod prevelike količine → „Nema dovoljno proizvoda trenutno na stanju“.
- **E-korpa:** stavke grupisane po štamparijama; potvrdom se formira zasebna faktura po štampariji.
  PDF fakture se generišu (PDFKit) i šalju klijentu na i-mejl (nodemailer).
- **Plaćanje:** forma sa tipom kartice, brojem kartice, CVC kodom i datumom isteka (MM/GG),
  uz Luhn i validaciju datuma; uspehom se uvodi međustatus „plaćeno“, neuspehom se ispisuje poruka i korak ponavlja.
- **Javne nabavke** (samo pravno lice): potvrda korpe ne pravi fakture nego raspisuje licitaciju
  u trajanju od 10 minuta; svim štamparijama stiže i-mejl sa listom potrebnih proizvoda.
  Nabavka se zaključuje pri sledećoj prijavi naručioca (bez tajmera/WebSocket-a) izborom
  najniže ukupne ponude uz dovoljne količine na stanju; formira se faktura sa statusom „u štampi“.
- **Arhiva proizvoda:** isporučeni i primljeni proizvodi, sortirani po datumu naručivanja i po
  nazivu / količini / štampariji; prelazak „isporučeno“ → „primljeno“; sviđanje/nesviđanje i
  komentar za primljene proizvode. Sopstveni komentari su uokvireni **narandžastom isprekidanom linijom**.

### Štampari
- **Profil** sa istim pravilima ažuriranja.
- **Proizvodi i usluge:** dodavanje/izmena/brisanje proizvoda u predefinisane kategorije i
  potkategorije, jedinična cena, boje, glavna slika i do 3 dodatne, plus usluge
  (naziv, maksimalne dimenzije, dodatna cena po komadu).
- **Ažuriranje količina** za sve postojeće proizvode.
- **Dodavanje iz fajla:** uvoz lager liste iz JSON fajla, pa u drugom koraku dodavanje slika po proizvodu.
- **Naručeni proizvodi:** prelazak „naručeno/plaćeno“ → „u štampi“ → „isporučeno“.
- **Licitacije:** jedna ponuda po javnoj nabavci, sa cenom za sve tražene proizvode i naznakom raspoloživosti.
- **Izveštavanje:** PDF izveštaj o svim pristiglim ponudama i pobedničkoj ponudi.

### Administrator
- Pregled, ažuriranje i brisanje svih korisničkih naloga, uz filtriranje i pretragu.
- Poseban tabelarni pregled neodobrenih korisnika sa prihvatanjem/odbacivanjem zahteva (uz i-mejl obaveštenje).
- Upravljanje kategorijama i potkategorijama proizvoda.
- **Statistike (Chart.js):** stubičasti grafikon prometa štamparija u poslednjem kvartalu;
  pita grafikon najčešće naručivanih proizvoda u poslednjih mesec dana (količina/procenat);
  linijski grafikon kretanja ocene proizvoda kroz vreme, sa isključivanjem pojedinih proizvoda iz prikaza.

### Ostalo
- Uniforman izgled kroz jedan CSS fajl, header/footer i meni na svakoj strani,
  link „Izloguj se“ i povratak na početni ekran.
- **Responsive** dizajn (mobilni meni, prelamanje mreže, horizontalno skrolovanje tabela).
- Otpornost na neispravan unos: validacija na klijentu i, obavezno, na serveru;
  centralizovano rukovanje greškama i jedinstveni format poruka.
- Autorizacija po ulogama preko JWT-a, uz zaštitu ruta na klijentu (guards) i na serveru (middleware).

## Statusi narudžbine
`naruceno` → [`placeno`] → `u stampi` → `isporuceno` → `primljeno`

## Pregled API ruta
| Metoda | Ruta | Opis |
|---|---|---|
| POST | `/api/auth/register` | registracija (multipart, profilna slika) |
| POST | `/api/auth/login` · `/api/auth/admin/login` | prijava korisnika / administratora |
| POST | `/api/auth/forgot-password` · `/api/auth/reset-password` | poništavanje lozinke (link 5 min) |
| GET | `/api/public/stats` · `/api/public/products` · `/api/public/products/:id` | javna početna strana i pretraga |
| GET/PUT | `/api/profile` | profil i ažuriranje |
| GET/POST/PUT/PATCH/DELETE | `/api/printer/products...` | proizvodi, količine, slike, uvoz JSON-a |
| GET/PATCH | `/api/printer/orders...` | narudžbine i promena statusa |
| GET/POST | `/api/printer/tenders...` | otvorene nabavke i slanje ponuda |
| GET/POST/DELETE | `/api/cart...` | e-korpa |
| POST | `/api/orders/checkout` · `/api/orders/pay` | formiranje faktura i plaćanje |
| GET | `/api/orders/:id/pdf` | PDF fakture |
| GET/PATCH/POST | `/api/archive` · `/api/orders/:id/received` · `/api/ratings` | arhiva, prijem, ocene |
| GET/POST | `/api/tenders...` | javne nabavke pravnog lica i PDF izveštaj |
| GET/PATCH/PUT/DELETE | `/api/admin/users...` | upravljanje korisnicima i zahtevima |
| GET | `/api/admin/stats/...` | podaci za tri grafikona |
