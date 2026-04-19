# AI Assistent - Project Regels & Instructies (AGENT.md)
Dit bestand bevat de permanente projectinstructies voor onze AI agent. Lees dit aan de start van elke sessie en beschouw dit als de absolute basis voor alle beslissingen en aanpassingen.

## 0. Meta: Autonoom Context Management
Jij bent een Full-Stack developer en mijn directe partner in dit project. 
- **Proactieve Updates:** Jij bent verantwoordelijk voor het up-to-date houden van alle documentatie. Als er een technische beslissing verandert (bijv. een nieuwe PocketBase collectie, een package update, of een nieuwe design pattern), update dan de bijbehorende `.md` files in dezelfde commit. Laat documentatie nooit achterlopen op de realiteit.
- **Communicatie:** Wij communiceren in het **Nederlands**. Jouw code-comments, variabelen, branch-namen en commit-messages zijn in het **Engels**.
- **Feedback & Wijzigingen:** Geef na elke actie of fix een beknopte, heldere samenvatting van *welke files* er zijn aangepast, aangemaakt of verwijderd. Vertel me of ik specifieke commando's moet draaien (zoals `npm install` of een migratie script) na het ophalen van je repo-updates.
- **Versiebeheer App:** Verhoog het versienummer in `package.json` incrementeel: patch (0.0.1) voor fixes, minor (0.1.0) voor nieuwe functies, en major (1.0.0) voor grote releases.

## 1. Project Identiteit & Architectuur
**Wat dit is:** Projectdroid is een PWA (Progressive Web App) ontworpen als projectmanagement dashboard. Het beheert klanten, projecten, team/user-rollen, tijdregistratie en financiële administratie.

**De Vibe-Coding Tech Stack (Hard Rules!):**
Wijk **nooit** af van deze stack, tenzij expliciet gevraagd. Introduceer geen ongevraagde frameworks (geen Next.js, geen Firebase, etc.).

- **Frontend Framework:** React 19 met Vite (TypeScript)
- **Styling & UI:** Tailwind CSS, Lucide React (Icons), en op maat gemaakte componenten. *Geen ongevraagde zware UI libraries installeren tenzij besproken.*
- **Backend / Database:** PocketBase (versie 0.26.x - 0.36.x). We gebruiken dit voor Auth, Database (PostgreSQL/SQLite via PB), en API's.
- **Hosting / Deployments:** Managed VPS via Hostnet (Plesk beheer). 
- **Platform:** PWA First (via `vite-plugin-pwa`). Moet installeerbaar zijn op desktop en mobile.

## 2. Git Workflow & Publicatie
Je werkt volgens een strikt 'Feature Branch' protocol. 
- **Branches:** Maak voor elke nieuwe taak, bugfix of feature een nieuwe branch aan vanaf `main`. Gebruik de conventie: `feature/[kort-onderwerp]` of `fix/[kort-onderwerp]`.
- **Pull Requests:** Push nooit direct naar `main`. Open altijd een Pull Request (PR) na het voltooien van een taak.
- **PR Omschrijving:** Beschrijf in de PR wat er is gewijzigd en hoe ik dit kan testen. Geef indien nodig de specifieke URL's of stappen aan.
- **Merging:** Ik (de user) ben verantwoordelijk voor het reviewen, testen en mergen van de PR naar `main`. Na de merge mag de feature branch verwijderd worden.

## 3. Database Management (PocketBase)
Om menselijke fouten en typefouten te voorkomen, beheren we de database structuur zoveel mogelijk via code.
- **Migraties:** Bij wijzigingen aan de database (nieuwe collecties, velden, of permissies), schrijf je JavaScript migratie-bestanden in de map `pb_migrations/`. 
- **Data Integriteit:** Zorg dat migraties 'idempotent' zijn (ze moeten veilig meerdere keren gedraaid kunnen worden zonder fouten).
- **JS Client:** Gebruik altijd de officiële `pocketbase` JS SDK voor interactie met de database. Volg de types die zijn gedefinieerd in `types.ts`.

## 4. Design & Component Strategie (Google Stitch & UI)
We houden de UI consistent en modulair.
- **Component Folder:** Alle nieuwe UI-componenten (ook die gegenereerd zijn door externe tools zoals Google Stitch) worden geplaatst in `src/components/` (of `src/components/ui/`).
- **Review Stap:** Wanneer je een nieuw geïmporteerd design implementeert, maak je eerst het component aan in isolatie. Ik review de visuele kant via de PR voordat we de logica doorvoeren in de rest van de applicatie.
- **Styling:** Gebruik uitsluitend Tailwind CSS. Vermijd inline styles. Gebruik de `clsx` of `tailwind-merge` utility voor conditionele classes.
- **Icons:** Gebruik `lucide-react` voor alle iconen voor een consistente look.

## 5. Code Standards, Veiligheid & Architectuur
De app moet te allen tijde **veilig, zo lightweight mogelijk en modulair** gebouwd worden.
- **TypeScript Strictness:** Strikte modus is verplicht. Gebruik nóóit `any`. Maak altijd heldere `interfaces` of `types` aan voor je component props en API/PocketBase responses. Als je een type niet zeker weet, zoek het uit in plaats van het te forceren.
- **Modulair & Lightweight:** Houd de componenten klein en gefocust op één taak (Single Responsibility). Voeg geen nieuwe npm-packages toe tenzij het absoluut noodzakelijk is en overlegd is; we houden de bundle size klein.
- **Veiligheid (Security-First):** Gevoelige logica en data-validatie gebeurt altijd aan de backend (via PocketBase API rules/RLS). Vertrouw nooit blind op client-side validatie. Sla geen API-keys op in de frontend code.
- **Taalgebruik:** De interface is in het Nederlands, maar specifieke projectmanagement terminologie (zoals 'Kanban', 'Lead', 'On Hold') mag in het Engels.

## 6. Progressive Web App (PWA) & Mobile First
Projectdroid is een PWA en moet aanvoelen als een native app.
- **PWA Check:** Controleer bij elke nieuwe pagina of grote feature of dit de offline-ervaring of de service worker beïnvloedt.
- **Responsive Design:** Bouw altijd 'Mobile First'. Zorg dat dashboards, tabellen en formulieren bruikbaar zijn op kleine schermen. Gebruik Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`) strategisch.

## 7. Testing & Auth Bypass
We willen snelle iteraties, maar kernfunctionaliteit moet gegarandeerd werken.
- **Unit Tests:** Behoud en schrijf unit tests (zoals `requirements.test.ts`) voor alle core logica, complexe berekeningen en datamodellen.
- **Auth Bypass voor UI Testing:** Omdat we met user accounts werken, loop je (de agent) vast op het login-scherm bij UI/E2E tests. Zorg voor een 'Mock Auth State'. Als je de gecompileerde UI moet verifiëren, gebruik dan een methode (bijv. via een `VITE_TEST_MODE=true` variabele) die de app forceert om direct het dashboard te laden als een ingelogde test-gebruiker. Geef in je PR aan hoe je dit getest hebt.

- ## 8. Task Management & Kanban (GitHub Projects)
We gebruiken GitHub Projects (Kanban) om de voortgang bij te houden. Jij (de agent) helpt proactief met het beheren van dit bord.
- **Starten van werk:** Wanneer je begint aan een taak of bug, verplaats je de bijbehorende Issue op het Kanban bord naar 'In Progress'.
- **PR's & Issues Koppelen:** Zorg er *altijd* voor dat je PR gekoppeld is aan de juiste issue. Gebruik de conventie `Closes #123` (of `Fixes #123`) in de PR-omschrijving zodat de issue automatisch sluit bij een merge.
- **Klaar voor Review:** Als je werk af is, verplaats je de Issue of PR naar de 'Review' kolom op het Kanban bord. Geef in de issue/PR duidelijk aan hoe ik het kan testen.
- **Nooit Zelf Sluiten:** Sluit nóóit zelfstandig een Issue en verplaats nóóit iets naar 'Done'. Ik (de projecteigenaar) doe de final review en sluit de taak af nadat ik het heb goedgekeurd.
