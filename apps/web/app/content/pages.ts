// Dutch content for the legal/help pages. Source of truth: Reference Appendix A (concept texts).
// `[PLACEHOLDER — …]` marks facts only the owner can supply: never invent them. They render highlighted.

export interface Section { h?: string; p?: string[]; ul?: string[] }
export interface InfoPage {
  title: string
  /** Legal concept: shows the "not legally reviewed" banner. */
  concept?: boolean
  intro?: string
  sections: Section[]
  table?: { head: string[]; rows: string[][] }
  after?: Section[]
}

export const INFO: Record<string, InfoPage> = {
  'over-ons': {
    title: 'Over PuntQuiz',
    concept: true,
    sections: [
      { p: [
        'PuntQuiz is een **hobbyproject** van Ronald Punt (Puntuale, www.ronaldpunt.nl): niet-commercieel, zonder winstoogmerk en gemaakt voor gezellige quizavonden. Het is een live pubquiz-platform met één simpel uitgangspunt: **elke speler telt, ook in een team.** Waar de meeste pubquiz-apps één telefoon per team gebruiken, logt bij PuntQuiz iedere deelnemer individueel in, beantwoordt individueel mee en bouwt een eigen score en statistieken op — ook als je onderdeel bent van een team.',
        'Handig voor een pubquiz-avond met vrienden, in een café, bij een vereniging of tijdens een bedrijfsuitje. Omdat het een hobbyproject is, zijn er geen garanties en geen betaalde ondersteuning (zie de disclaimer).',
      ] },
      { h: 'Belangrijkste uitgangspunten', ul: [
        '**De server bepaalt altijd de score, de tijd en de ranglijst** — nooit de telefoon van een speler.',
        '**Een gemiste vraag door een lege batterij of wankele verbinding is normaal, geen fraude.** Spelers krijgen 60 seconden om opnieuw te verbinden voordat een vraag als onbeantwoord telt.',
        '**AI helpt de quizmaster, maar neemt nooit het laatste woord.** Door AI gegenereerde vragen, hints of media gaan pas live na goedkeuring door een quizmaster (zie de AI-verklaring).',
      ] },
      { p: ['Gemaakt door Ronald Punt (Puntuale, www.ronaldpunt.nl) in zijn vrije tijd. Vragen of feedback? Mail naar ronald.punt@mac.com.'] },
    ],
  },

  privacy: {
    title: 'Privacybeleid',
    concept: true,
    intro: 'PuntQuiz is een niet-commercieel hobbyproject. Dit beleid is in goed vertrouwen opgesteld, beschrijft hoe het project echt werkt, en is niet juridisch beoordeeld.',
    sections: [
      { h: '1. Wie is verantwoordelijk voor je gegevens', p: ['PuntQuiz is een hobbyproject van Ronald Punt (Puntuale, www.ronaldpunt.nl). Hij is als privépersoon verantwoordelijk voor de verwerking van je gegevens; er is geen bedrijf of KVK-nummer. Je bereikt hem via ronald.punt@mac.com'] },
      { h: '2. Welke gegevens verzamelen we', ul: [
        '**Accountgegevens:** je e-mailadres (bij registratie), wachtwoord (versleuteld opgeslagen bij onze identiteitsdienst) of gastnaam (bij gastmodus zonder account). Log je in via Google, Microsoft, GitHub of Facebook (alleen als dat is ingeschakeld), dan ontvangen we je naam en e-mailadres van die aanbieder.',
        '**Profielgegevens:** weergavenaam, gekozen avatar, teamnaam/-badge (indien van toepassing).',
        '**Spelgegevens:** quizgeschiedenis, antwoorden per vraag, scores, ranglijstposities, prestaties per categorie, achievements.',
        '**Technische gegevens:** sessie-informatie die nodig is om je verbinding en antwoorden te kunnen toewijzen tijdens een live quiz, en — optioneel, als anti-cheat-maatregel — apparaatherkenning om dubbele deelname aan dezelfde quiz te detecteren.',
        '**E-mail:** als je je aanmeldt sturen we een welkomstmail; uitslagen per ronde en de eindstand alleen als je dat per quiz zelf aanvinkt. Voor wachtwoordherstel sturen we een herstelmail.',
        '**Berichten:** wat je typt in de shoutbox of teamchat, als die functies actief zijn voor de quiz die je speelt.',
        '**Cookies:** we gebruiken alleen functionele cookies (je inlogsessie en tijdelijke inlogstappen). We gebruiken geen tracking- of advertentiecookies.',
      ], p: ['We verzamelen bewust **geen** gegevens die niet nodig zijn om mee te spelen, te scoren of achteraf je eigen geschiedenis te kunnen laten zien.'] },
      { h: '3. Waarom we deze gegevens gebruiken', p: ['Om je te laten inloggen en deelnemen, om scores en ranglijsten eerlijk en server-side te kunnen bepalen, om je persoonlijke statistieken en geschiedenis te tonen, en om misbruik (dubbele deelname, gemanipuleerde antwoorden) te kunnen herkennen.'] },
      { h: '4. Hoe lang we gegevens bewaren', p: ['**Spelgegevens** (deelname, antwoorden, scores, teams, power-ups, beoordelingen) en **logbestanden** (ook van verzonden e-mails) bewaren we **90 dagen** nadat een quiz is afgelopen. Daarna worden ze automatisch verwijderd. Gastaccounts zonder gegevens worden dan ook verwijderd. Je **account** (naam en e-mailadres) blijft bestaan totdat je vraagt om verwijdering. De vragen en rondes die een quizmaster zelf heeft gemaakt blijven bestaan zolang dat account bestaat.'] },
      { h: '5. Met wie we gegevens delen', p: ['We delen geen gegevens met derden voor marketingdoeleinden. Gegevens kunnen wel verwerkt worden door partijen die de techniek achter PuntQuiz draaiend houden (hosting, en het versturen van e-mail, momenteel via Gmail van Google). E-mail met uitslagen krijg je alleen als je dat zelf aanzet. Concreet: de gegevens staan op een server (Oracle Cloud) die door Puntuale wordt beheerd, in de regio Amsterdam (Nederland); e-mail (welkom, uitslagen, wachtwoordherstel) wordt verstuurd via Gmail van Google; de inlogdienst (Authentik) draait op diezelfde server.'] },
      { h: '6. Jouw rechten', p: ['Je kunt op elk moment per e-mail (ronald.punt@mac.com) vragen om:'], ul: [
        'je eigen gegevens **in te zien en te exporteren**;',
        'je **account en gegevens te laten verwijderen**;',
        'je gegevens te laten **corrigeren** of de verwerking te laten **beperken**.',
      ] },
      { p: ['Zelfbedieningsknoppen hiervoor in de app zijn er nog niet; we handelen je verzoek zo snel mogelijk af, uiterlijk binnen een maand. Vragen over je gegevens? Mail ronald.punt@mac.com.'] },
      { h: '7. Wijzigingen in dit beleid', p: ['We passen dit beleid aan wanneer het product verandert. Wijzigingen worden vermeld op de Over-pagina.'] },
    ],
  },

  disclaimer: {
    title: 'Disclaimer',
    concept: true,
    sections: [
      { h: 'Inhoud van vragen', p: ['We doen ons best om vragen, antwoorden en toelichtingen correct te houden, maar kunnen niet garanderen dat elke vraag foutloos is — ook niet na goedkeuring door een quizmaster. Zie je een fout? Laat het ons weten via een mail naar ronald.punt@mac.com.'] },
      { h: 'Door AI gegenereerde content', p: ['Sommige vragen, hints, afleiders of toelichtingen kunnen (deels) door AI zijn gegenereerd. Dit gebeurt nooit ongecontroleerd: een quizmaster keurt AI-gegenereerde content altijd goed voordat die live gaat. Ondanks die controle blijft de kans op een fout net als bij door mensen geschreven vragen aanwezig — zie ook onze AI-verklaring.'] },
      { h: 'Media van derden', p: ['Vragen kunnen afbeeldingen, muziekfragmenten, video\'s of externe links bevatten die door de quizmaster zijn toegevoegd. De quizmaster is verantwoordelijk voor het rechtmatig gebruik van dat materiaal. YouTube-video\'s worden ingesloten via youtube-nocookie.com; bij het afspelen gelden ook de voorwaarden van YouTube; PuntQuiz faciliteert het invoegen ervan maar controleert niet vooraf op auteursrecht.'] },
      { h: 'Beschikbaarheid', p: ['PuntQuiz streeft naar een stabiele, realtime ervaring, maar kan — zoals elk live systeem — te maken krijgen met verbindingsproblemen of storingen. Omdat dit een hobbyproject is, geven we geen garantie op beschikbaarheid, snelheid of ondersteuning. (Als noodplan kan de presentator antwoordformulieren op papier printen.)'] },
      { h: 'Aansprakelijkheid', p: ['PuntQuiz is een hobbyproject en wordt aangeboden zoals het is, zonder garanties op juistheid, beschikbaarheid of geschiktheid voor een bepaald doel. Gebruik is voor eigen risico. Voor zover de wet dat toestaat is de maker niet aansprakelijk voor schade die voortkomt uit het gebruik van PuntQuiz (zoals een uitgevallen quiz of een foutieve vraag).'] },
    ],
  },

  spelregels: {
    title: 'Spelregels — hoe werkt PuntQuiz?',
    intro: 'De algemene spelregels van het platform. Per quiz kunnen instellingen verschillen: die zie je op de spelregels-pagina in de lobby van de quiz.',
    sections: [
      { h: 'Meedoen', p: ['Je vult een quizcode in, opent een uitnodigingslink of scant een QR-code. Daarna doe je mee als gast of log je in met je PuntQuiz-account, en kies je (bij een teamquiz) een team. Dat duurt normaal gesproken minder dan 15 seconden. De QR-code is alleen een sneltoets: de code en de link werken altijd.'] },
      { h: 'Individueel of in een team', p: ['Bij een individuele quiz speel je los; je score en ranglijstpositie zijn helemaal van jou. Bij een teamquiz log je nog steeds zelf in en beantwoord je zelf de vragen — je team-antwoord wordt bepaald door **meerderheid van stemmen** onder de teamleden die daadwerkelijk hebben geantwoord. Je hoeft dus niet te wachten tot iedereen in je team heeft geantwoord, en als een teamgenoot een keer niet antwoordt (lege batterij, geen zin, geen verbinding), telt de rest van het team gewoon door. Bij een gelijke stand binnen het team wint het antwoord dat het eerst definitief is gekozen. Een team heeft minimaal 3 spelers. Eenmaal gestart, kun je niet meer van team wisselen.'] },
      { h: 'Antwoorden', p: ['Je mag je antwoord zo vaak veranderen als je wilt, zolang de vraag nog openstaat. Zodra de tijd om is of de presentator de vraag sluit, telt je laatste keuze. De klok en de score worden altijd door de server bepaald — nooit door je eigen telefoon.'] },
      { h: 'Verbinding kwijt?', p: ['Geen paniek. Als je verbinding wegvalt, heb je 60 seconden om opnieuw te verbinden; een antwoord dat je vóór het sluiten hebt gegeven, wordt dan alsnog meegeteld. Een gemiste vraag is een normale uitkomst, geen verdacht gedrag.'] },
      { h: 'Beeldrondes', p: ['Een beeldronde (bijvoorbeeld een fotoronde) blijft langer open dan een gewone ronde. Alle foto\'s en vragen staan tegelijk op je telefoon, zonder timer, terwijl de quiz gewoon doorgaat met de volgende ronde(s). Je kunt er tussendoor antwoorden invullen en wijzigen. Na een bij de quiz ingestelde aantal rondes (1 tot 3) sluit de beeldronde; daarna onthult de presentator de uitslag. Open antwoorden worden dan, net als altijd, door anderen beoordeeld.'] },
      { h: 'Beeld- en muziekvragen', p: ['Bij sommige vragen zie je een afbeelding of video op je telefoon. Bij een muziekvraag hoor je het fragment meestal via de speakers van de presentator en vul je **artiest**, **titel** en soms het **jaar** in. Die delen scoren los van elkaar, dus je mag ook maar één ding invullen en je kunt halve punten verdienen. Hoofdletters, accenten, lidwoorden ("the") en kleine tikfouten tellen niet mee.'] },
      { h: 'Open vragen en beoordelen', p: ['Bij een open vraag typ je zelf het antwoord. Staat je antwoord (op hoofdletters, accenten en leestekens na) gelijk aan een geaccepteerd antwoord, dan is het meteen goed. Alle andere antwoorden beoordeelt een ander team (of een andere speler) met alleen **goed of fout**, zonder te weten van wie het antwoord is en zonder dat jij die van hen kent. De uitslag verschijnt pas als alles is beoordeeld; de presentator kan een beoordeling altijd corrigeren. Bij een teamquiz wordt het teamantwoord bepaald door meerderheid van de ingetypte antwoorden.'] },
      { h: 'Scores en ranglijst', p: ['Na elke ronde (of, afhankelijk van de instelling van de quiz, na elke vraag) worden de antwoorden onthuld en de scores bijgewerkt. Sta je samen met iemand anders op de eerste plek? Dan blijven jullie allebei #1 — die wordt nooit kunstmatig uit elkaar getrokken. Jouw eigen rij (of die van je team) is in de ranglijst gemarkeerd.'] },
      { h: 'Power-ups', p: ['Sommige quizzen hebben power-ups die je tijdens een open vraag kunt inzetten: **50/50** (twee foute opties verdwijnen), **verdubbelaar** (goed = dubbele punten, fout kost niets), **dubbel risico** (goed = dubbele punten, fout = je verliest de helft van de vraagpunten), **extra tijd** (15 seconden erbij) en **hint**. Wat er aan staat en hoe vaak je ze mag gebruiken zie je in de spelregels van de quiz. Per vraag kun je maar één verdubbelaar of dubbel risico inzetten. Bij een teamquiz zijn power-ups van het hele team: iedereen kan ze activeren, het effect geldt voor het team. Een overgeslagen vraag geeft je power-ups terug.'] },
    ],
  },

  'ai-verklaring': {
    title: 'Hoe PuntQuiz AI gebruikt',
    concept: true,
    sections: [
      { p: ['We zijn open over waar en hoe we AI inzetten. Het uitgangspunt is simpel: **AI stelt voor, een mens beslist.** Niets dat door AI is gegenereerd gaat live zonder dat een quizmaster het heeft goedgekeurd.', 'In de huidige versie van PuntQuiz is er nog geen AI-functionaliteit actief.'] },
      { h: 'Waar we AI voor gaan gebruiken', ul: [
        'Het genereren van vragen, hele quizzen, hints, afleiders (foute antwoordopties) en toelichtingen bij het juiste antwoord.',
        'Het balanceren van moeilijkheidsgraad binnen een ronde of quiz.',
        'Het genereren van afbeeldingen, audiofragmenten en avatar-varianten.',
      ] },
      { h: 'Waar we AI mogelijk later voor gaan gebruiken', ul: [
        'Het (fuzzy-matchend) mee laten beoordelen van open antwoorden — ook dan blijft een menselijke goedkeuring vereist.',
        'Een AI-stem voor de quizmaster/presentator.',
      ] },
      { h: 'Wat we niet doen', p: ['AI-gegenereerde content automatisch en ongecontroleerd publiceren, of AI laten bepalen wie een quizvraag goed of fout heeft zonder dat een quizmaster dat proces heeft ingesteld en goedgekeurd.', 'Vragen over ons AI-gebruik? Mail naar ronald.punt@mac.com.'] },
    ],
  },

  presentator: {
    title: 'Handleiding presentator',
    intro: 'Korte uitleg van de bediening op het presentator-dashboard. Dezelfde uitleg staat ook als tooltip en inklapbare hulp op het dashboard zelf.',
    sections: [],
    table: {
      head: ['Actie', 'Wat het doet', 'Wanneer gebruiken'],
      rows: [
        ['Quiz starten', 'Zet de quiz van gepubliceerd naar live en opent de eerste vraag. Bij een teamquiz worden de teams vergrendeld; teams onder het minimum geven eerst een waarschuwing.', 'Zodra genoeg spelers (en teams) in de lobby staan.'],
        ['Vraag heropenen', 'Zet een gesloten vraag weer open voor antwoorden, met de volledige tijd opnieuw. Kan tot je de uitslag onthult.', 'Als een vraag per ongeluk te vroeg is gesloten.'],
        ['Vraag overslaan', 'Slaat de vraag over: hij telt niet mee voor de scores en verdwijnt uit de onthulling.', 'Bij een vraag die achteraf ongeschikt blijkt (fout, onduidelijk).'],
        ['Vraag sluiten', 'Sluit de vraag voor nieuwe antwoorden, ook al loopt de timer nog. De timer sluit de vraag ook zelf, op de server.', 'Als iedereen zichtbaar al heeft geantwoord.'],
        ['Onthul ronde / vraag', 'Toont de juiste antwoorden en telt de scores mee. Standaard onthul je per ronde; dat stel je in bij de quiz.', 'Na het sluiten van de laatste vraag van een ronde (of van elke vraag, bij per-vraag onthullen).'],
        ['Forceer onthulling', 'Sluit een open vraag en onthult direct, ongeacht de timer.', 'Zelden nodig; noodgreep bij een vastgelopen sessie.'],
        ['Antwoord corrigeren', 'Bij een onthulde vraag: kies het juiste antwoord opnieuw. De scores worden opnieuw berekend; je geeft een reden die in het auditlog komt.', 'Bij een dispuut of een fout in de vraagdata.'],
        ['Volgende vraag', 'Opent de volgende vraag; de timer start automatisch. Na de laatste vraag rondt het de quiz af.', 'Na het sluiten (en eventueel onthullen).'],
        ['Toon / verberg tussenstand', 'Laat de ranglijst aan alle spelers zien. Standaard verschijnt de tussenstand automatisch halverwege.', 'Voor een tussenstand-moment of een shout-out bij een gedeelde eerste plek.'],
        ['Beeldronde sluiten / onthullen', 'Een beeldronde staat open naast de lopende ronde(s). Hij sluit vanzelf; met "Sluit nu" kun je hem eerder sluiten. "Onthul" toont de antwoorden (open antwoorden worden eerst beoordeeld) en telt de scores mee. Onthullen kan zodra de huidige vraag gesloten is; de quiz kan niet eindigen voordat alle beeldrondes onthuld zijn.', 'Na de rondes waarin de beeldronde openstond.'],
        ['Beoordeling afronden', 'Bij open vragen krijgt de onthulling eerst een beoordelingsronde: spelers/teams beoordelen elkaars antwoorden. Hier zie je de voortgang en kun je elke beoordeling corrigeren. Afronden met open beoordelingen laat die als fout meetellen.', 'Zodra iedereen heeft beoordeeld, of als je niet langer wilt wachten.'],
        ['Onderbreking', 'Lichte, korte pauze tussen twee vragen (drankje/toilet). Spelers zien een pauzescherm.', 'Standaard tussen rondes; niet bedoeld als noodstop.'],
        ['Quiz pauzeren / hervatten', 'Bevriest de hele quiz, ook de timer van een open vraag. Hervatten gaat verder met de resterende tijd.', 'Bij een langere onderbreking of een technisch incident.'],
        ['Quiz beëindigen', 'Sluit de quiz af, onthult alles en toont de eindstand.', 'Na de laatste ronde, of als noodstop.'],
      ],
    },
    after: [
      { h: 'Papieren noodplan', p: ['Via "Formulieren printen" (op het dashboard, in de quizlijst en in de editor) maak je printklare antwoordformulieren (per team of blanco, per ronde), een antwoordsleutel voor jezelf en een scoreformulier. Je kunt ze ook vooraf printen, voordat er teams zijn: typ teamnamen in of print genummerde formulieren (Team 1, Team 2…), kies of je per team of per ronde wilt stapelen en gebruik "Alles vooraf printen" voor één complete set. Print ze vóór de quiz als voorbereiding: valt de app uit, dan ga je op papier verder. Papieren formulieren kennen geen meerderheidsstemming: laat een team één antwoord invullen.'] },
    ],
  },

  quizmaster: {
    title: 'Handleiding quizmaster',
    intro: 'Een naslagwerk voor het bouwen van quizzen. Bouwen gebeurt buiten live tijdsdruk, dus hier mag het uitgebreider.',
    sections: [
      { h: 'Een quiz opzetten', p: ['Een standaardquiz bestaat uit 10 rondes van elk 10 vragen; dat is geen harde eis, maar wel wat spelers en presentatoren gewend zijn. Geef elke ronde een eigen thema (Sport, Algemene Kennis, Eten & Drinken, …) — dat thema geldt voor de ronde als geheel. Kies vooraf: individuele quiz of teamquiz; dat bepaalt welke teaminstellingen zichtbaar zijn. Kies ook of je per ronde of per vraag onthult. Publiceer de quiz om de quizcode te krijgen; daarna kun je hem presenteren. Een quiz die gestart is kan niet meer worden bewerkt.'] },
      { h: 'Vraagtypen die nu beschikbaar zijn', p: ['Je kunt bouwen met **Meerkeuze** (één juist antwoord), **Meerdere juist** (alle juiste opties moeten gekozen zijn) en **Open vraag** en **Muziekvraag**. Bij een muziekvraag geef je de geaccepteerde artiesten en titels (één per regel), optioneel een jaar, en kies je zelf de punten per onderdeel (bijvoorbeeld 0,5 + 0,5, met één extra punt voor het jaar). Aan elke vraag kun je tot drie bijlagen hangen: een afbeelding (uploaden of https-link), audio (uploaden of link) of een YouTube-video met begin- en eindtijd. Audio staat standaard alleen op de presentator-pc, voor de speakers; afbeeldingen en video zie je ook op de telefoons. Foto\'s worden bij het uploaden verkleind. Bij een open vraag geef je één of meer geaccepteerde antwoorden (één per regel). Een exact gelijk antwoord is automatisch goed; de rest wordt door spelers beoordeeld (peer-review, alleen goed/fout). Waar/onwaar, schatting, marge, numeriek, volgorde en koppelen staan gepland. Punten mogen decimalen bevatten (bijvoorbeeld 0,5).'] },
      { h: 'Teaminstellingen (alleen bij een teamquiz)', p: ['Een team moet minimaal 3 spelers hebben — kleiner dan dat werkt "meerderheid" niet meer als meerderheid. Het maximum stel je zelf in (standaard 5). Spelers kunnen op dit moment vrij een team joinen of maken; op uitnodiging of na goedkeuring door een aanvoerder volgt later. De teamantwoordmodus staat vast op **meerderheid van stemmen**, met het eerst definitief gekozen antwoord als tie-break.'] },
      { h: 'Beeldrondes', p: ['Zet bij een ronde "Soort ronde" op Beeldronde en kies hoeveel volgende rondes hij open blijft (1 tot 3). Alle vragen van de beeldronde verschijnen dan tegelijk op de telefoons zodra de quiz voorbij die ronde komt (een beeldronde heeft dus geen eigen timer en kan niet de laatste ronde zijn); hang de foto\'s als bijlage aan de vragen. De ronde sluit vanzelf zodra de quiz voorbij de laatste openstaande ronde is, of eerder met "Sluit nu". Onthul hem via het dashboard; de quiz kan niet eindigen zolang een beeldronde nog niet onthuld is. Power-ups gelden niet voor beeldronde-vragen.'] },
      { h: 'Power-ups', p: ['Onder "Power-ups" in de quiz-editor zet je per quiz aan welke power-ups spelers mogen gebruiken (50/50, verdubbelaar, dubbel risico, extra tijd, hint) en hoe vaak per type (1 tot 3). Bij een teamquiz delen de teamleden één voorraad. 50/50 werkt alleen bij meerkeuzevragen met drie of meer opties; een hint vul je per vraag in. Een verdubbelaar telt voor het teamscore (bij een teamquiz) of de persoonlijke score (individueel). "Overslaan" is er nog niet.'] },
      { h: 'Je vragenbank hergebruiken', p: ['In de vragenbank bewaar je vragen met categorie, moeilijkheid en tags. Bij elke vraag zie je in welke quiz hij eerder is gebruikt en hoe vaak (bijvoorbeeld "Laatst gebruikt: Oudejaarsquiz (31-12-2025) · 3× gebruikt"), handig voor een vast publiek. In de quiz-editor voeg je vragen toe met "Uit vragenbank"; met "Bewaar in vragenbank" bewaar je de vragen van een quiz. Een gebruikte vraag is een kopie: wijzigen in de bank verandert een bestaande quiz niet.'] },
      { h: 'Importeren en exporteren', p: ['Vragen importeer je uit CSV (komma of puntkomma), Excel of JSON, met kolommen als vraag, optie1…optie8, juist, categorie, moeilijkheid, tags, punten, seconden, toelichting en bron. Bij "juist" vul je het optienummer in (2, of 1|3 voor meerdere) of de tekst van de optie. Je ziet eerst een voorbeeld met eventuele fouten; vragen met dezelfde tekst als een bestaande vraag worden overgeslagen. Exporteren kan als CSV, Excel of JSON; een hele quiz exporteer en importeer je als JSON.'] },
      { h: 'Binnenkort', ul: ['Muziekrondes met aparte punten voor artiest en titel (en jaartal-bonus).', 'AI-hulp bij het maken van vragen. Niets daarvan gaat live zonder jouw goedkeuring; zie de AI-verklaring.'] },
    ],
  },
}

export const LEGAL_SLUGS = ['over-ons', 'privacy', 'disclaimer', 'spelregels', 'ai-verklaring']
export const MANUAL_SLUGS = ['spelregels', 'presentator', 'quizmaster']
