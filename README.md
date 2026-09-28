# Pivovarská dílna — web

Statický web pro hospodu **Pivovarská dílna** (centrum Litoměřic). Žádný build,
čisté HTML + CSS + JS, s video úvodem a 3D sudem (Three.js) v hero sekci.

## Struktura

```
pivovarska-dilna/
├── index.html
├── assets/          styl, skripty (3D sud), video, obrázky
└── README.md
```

## Lokální spuštění

```bash
python -m http.server 5190 --directory pivovarska-dilna
```

Pak otevřít http://localhost:5190 (v `.claude/launch.json` konfigurace `pivovarska-dilna`).

## Polední menu

Poledový lístek se natahuje živě z [menicka.cz](https://www.menicka.cz/), ne z ručně
psaného textu — při změně dodavatele menu uprav zdroj v příslušném JS souboru.
Celý (nepolední) lístek je na stránce napevno.

## Nasazení

[Netlify Drop](https://app.netlify.com/drop) — přetáhnout celou složku `pivovarska-dilna/`.
