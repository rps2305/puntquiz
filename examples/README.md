# Voorbeeldbestanden

## Vragenset van 100 vragen

Een voorbeeldset voor de vragenbank, in twee uitvoeringen met dezelfde vragen:

- `vragenset-100-open.json`: open vragen. Elk antwoord heeft een paar geaccepteerde varianten (bijvoorbeeld "De huid" en "Huid"); een exact goed antwoord is meteen goed, de rest beoordelen spelers of teams.
- `vragenset-100-meerkeuze.json`: dezelfde vragen als meerkeuze met drie foute opties, zodat de score automatisch gaat.

Tien categorieën (Algemeen, Sport, Geschiedenis, Eten & drinken, Aardrijkskunde, Literatuur, Kunst & cultuur, Taal & spreekwoorden, Wetenschap, Natuur & dieren). Elke vraag heeft een hint en een uitleg die bij de onthulling getoond wordt.

### Importeren

Log in als presentator, ga naar **Vragenbank**, kies **Importeren** en kies het JSON-bestand. Eerst volgt een controle ("dry run"); vragen die al in je bank staan worden overgeslagen. Het formaat is `puntquiz.bank.v1`; je kunt het ook zelf exporteren uit je vragenbank.

De vragen zijn zelf geschreven en vrij te gebruiken (MIT, zoals de rest van de repo). Controleer feiten altijd even voordat je ze in een echte quiz gebruikt.

## Vragenset vliegtuigen met afbeeldingen

`vragenset-vliegtuigen-met-afbeeldingen.json` heeft 11 meerkeuzevragen "Welk vliegtuig is dit?" met een foto. De foto's komen van Wikimedia Commons en zijn publiek domein of CC0, dus vrij te gebruiken zonder naamsvermelding. Ze worden via de link geladen (niet kopie in de repo); de bronpagina staat per vraag in het veld `source`. Als een link ooit verdwijnt, vervang je de afbeelding in de vragenbank.

## Vragenset rivieren

`vragenset-rivieren.json` heeft 39 meerkeuzevragen over rivieren per werelddeel (langste, grensrivieren, landen, bekende bouwwerken en natuurverschijnselen). De lengtes komen uit de CIA World Factbook en zijn bij benadering; bij de Nijl en de Amazone hangt de "langste" af van hoe je meet, dus daar noemt de uitleg dat.

## Vragenset muziek

`vragenset-muziek.json` heeft 48 muziekvragen: 22 echte muziekvragen met een YouTube-fragment (artiest, titel en jaar scoren los; de video is voor de presentator en niet voor de spelers zichtbaar) en 26 meerkeuzevragen over muziek. Alle video-ID's zijn gecontroleerd op bestaan en insluitbaarheid. De fragmenten beginnen aan het begin van de video; de presentator stopt de muziek zelf.
