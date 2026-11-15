# Meewerken aan PuntQuiz

Fijn dat je meekijkt. PuntQuiz is een klein hobbyproject van één persoon, dus houd de verwachtingen bescheiden: reageren en mergen kan even duren, en sommige ideeën wijs ik vriendelijk af om het project gericht te houden. Issues en pull requests zijn welkom.

## Taal

Voorlopig is het project geheel Nederlands: de app, de documentatie, issues en pull requests. Meertaligheid staat op de roadmap (zie de README). Schrijf teksten die gebruikers zien dus in het Nederlands. De bestaande code gebruikt Engelse namen en commentaar; volg dat in code die je aanpast.

## Voordat je begint

- **Open eerst een issue** voor alles wat groter is dan een kleine fix, zodat we de aanpak kunnen afspreken voordat jij er tijd in steekt.
- Lees de specificatie, `PuntQuiz - Consolidated Product Reference.md`, en vooral Appendix C (wat gebouwd is, afwijkingen, ideeën die er nog niet zijn). Veel keuzes staan daar opgeschreven. Bijvoorbeeld: een teamantwoord is de meerderheid van de stemmen, scores en timers bepaalt de server, en door AI gemaakte inhoud moet altijd door een mens worden goedgekeurd.

## Opzetten

```bash
docker compose up -d --build     # http://localhost:8088
npm ci
```

Zie de README voor alle commando's.

## Voor je een pull request opent

Draai dit allemaal; de CI doet het ook.

```bash
npm run lint
npm run typecheck
npm test
node tests/e2e.mjs               # alleen tegen je lokale stack, nooit tegen een echte server
node tests/sw.test.mjs
npm run design                   # Impeccable-ontwerpcontrole (webbronnen)
```

Daarnaast:

- **Bouw opnieuw en kijk ernaar.** `docker compose up -d --build` mislukt bij fouten in de frontend soms zonder veel ophef, dus lees de buildmeldingen en probeer de interface. Een draaiende container betekent niet dat de app werkt.
- **Voeg tests toe of werk ze bij** bij wijzigingen in de logica. Regels van het live spel (scores, beoordelen, toestandsovergangen) horen in de unittests en in `tests/e2e.mjs`.
- **Houd de gedeelde types in `packages/contracts` gelijk** als een API-antwoord verandert.
- **Databasewijzigingen** hebben een Prisma-migratie nodig. Migraties lopen automatisch bij het starten van de api-container.

## Ontwerp

Het ontwerpsysteem is Impeccable (de tokens staan in `apps/web/app/assets/css/main.css` en zijn beschreven in Appendix B van de specificatie, in `PRODUCT.md` en in `DESIGN.md`). Gebruik de bestaande tokens en componenten in plaats van eigen opmaak, houd tekstcontrast op WCAG AA en bedieningselementen groot genoeg voor een telefoon, en controleer de donkere modus. Staat een ontwerpbehoefte er niet in, zeg dat dan in je pull request in plaats van stilletjes af te wijken. Eigen thema's per quiz komen later op de roadmap. De favicon- en app-icoonset in `assets/favicon` is definitief: gebruik die, maak geen nieuwe iconen.

## Pull requests

- Eén gerichte wijziging per pull request, met een korte beschrijving van wat en waarom.
- Kleine, leesbare commits met duidelijke berichten.
- Zet er geen geheimen, persoonsgegevens of servergegevens in. Echte instellingen staan in `.env` en `scripts/deploy.local.env`, die git negeert.
- Door bij te dragen ga je ermee akkoord dat je bijdrage onder de [MIT-licentie](LICENSE) valt.

## Beveiliging

Meld beveiligingsproblemen niet in een openbaar issue. Mail liever naar ronald.punt@mac.com, met genoeg gegevens om het na te kunnen bouwen. Het is een hobbyproject: er is geen beloning en geen gegarandeerde reactietijd, maar meldingen worden serieus genomen.

## Omgangsvormen

Wees vriendelijk en ga uit van goede wil. Pesten en persoonlijke aanvallen zijn niet welkom en worden verwijderd.
