**Ja, Ronald. Er bestaan opensourceplatforms die een groot deel van PuntQuiz al bieden. Mijn eerste keuze om te testen is QuizDock, gevolgd door ClassQuiz en Fuiz.** Ik heb geen complete match kunnen bevestigen voor alle eisen, vooral het specifieke teamspel en de gescheiden rechten voor quizmaster en presentator.

Ik heb de officiële documentatie en repositories bekeken; de applicaties zijn nog niet door mij geïnstalleerd of praktisch getest.

**De interessantste kandidaten**

|Platform|Aansluiting op jouw voorstel|Belangrijkste aandachtspunt|
|---|---|---|
|**[QuizDock](https://quizdock.github.io/?utm_source=chatgpt.com)**|Quizbouwer, spelers op telefoon, aparte bediening en projectie, media, scores en beheer|Teamstemming niet bevestigd; maken en presenteren vallen onder dezelfde rol|
|**[ClassQuiz](https://classquiz.de/?utm_source=chatgpt.com)**|Quizeditor, verschillende vraagtypen, live spelen, resultaten en bediening vanaf een ander apparaat|Jouw teammodel en aparte rollen niet bevestigd|
|**[Fuiz](https://fuiz.org/?utm_source=chatgpt.com)**|Live quizzen met expliciete samenwerkingsmodus en eigen hosting|Teammodus werkt anders dan jouw meerderheidsstemming|
|**[Claper](https://claper.co/)**|Interactieve presentaties met quizzen en publieksdeelname|Minder passend bij een vraaggestuurde pubquizavond|

Deze vergelijking is gebaseerd op de beschreven mogelijkheden van de projecten. “Niet bevestigd” betekent dat ik de functionaliteit niet in de geraadpleegde documentatie heb aangetroffen, niet dat deze aantoonbaar onmogelijk is. [GitHub](https://github.com/quizdock/quizdock?utm_source=chatgpt.com)

**1. QuizDock — de beste kandidaat voor een proefopstelling**

QuizDock heeft al veel van de onderdelen uit ons voorstel:

- Spelers doen mee met een **PIN of QR-code**, zonder verplicht account.
- Een **afzonderlijk bedieningsvenster en projectiescherm**.
- Een quizbouwer met onder andere meerkeuze, meerdere juiste antwoorden, tekst, numerieke antwoorden en volgordevragen.
- Afbeeldingen, audio, video en tussenslides.
- Handmatige of automatische voortgang.
- Scores, klassementen en meerdere quizzen achter elkaar in dezelfde lobby.
- Aanpasbare naam, logo en CSS.

Het project gebruikt **React en NestJS/Node.js**, met PostgreSQL, Redis en Socket.IO, en biedt Docker-images. De licentie is **MIT**. Daarmee sluit de backend behoorlijk aan op de voorgestelde architectuur; de frontend gebruikt React in plaats van Vue. [GitHub](https://github.com/quizdock/quizdock?utm_source=chatgpt.com)

De belangrijkste afwijking is het rechtenmodel: de rol **Host** mag zowel quizzen maken als presenteren. Er is daarnaast een beheerdersrol. Dat zijn dus niet de afzonderlijke quizmaster- en presentatorrechten die jij beschreef. [QuizDock](https://quizdock.github.io/docs/admin/accounts-and-roles/?utm_source=chatgpt.com)

Voor een publiek toegankelijke installatie zou ik de gedocumenteerde **OIDC-inlogmodus** gebruiken. De eenvoudige lokale modus identificeert de host alleen met diens naam en is volgens de documentatie bedoeld voor vertrouwde netwerken. [QuizDock](https://quizdock.github.io/docs/host/getting-started/?utm_source=chatgpt.com)

**Mijn oordeel:** de sterkste kandidaat om eerst praktisch te beoordelen, voordat je zelf een volledig platform bouwt.

**2. ClassQuiz — een bruikbaar alternatief voor de klassieke livequiz**

ClassQuiz biedt een quizeditor, live deelname, klassementen, downloadbare resultaten, meertaligheid en een donkere modus. Het platform is zelf te hosten. [Home](https://classquiz.de/?utm_source=chatgpt.com)

De documentatie beschrijft meerkeuze, tekstvragen, volgordevragen, schattingsbereiken en vragen waarbij meerdere antwoorden geselecteerd moeten worden. Een aparte _Remote Control_-functie laat de presentator de quiz vanaf bijvoorbeeld een telefoon bedienen terwijl het hoofdscherm op de beamer staat. [classquiz.de](https://classquiz.de/docs/quiz/question-types?utm_source=chatgpt.com)

Technisch gebruikt ClassQuiz **Svelte/SvelteKit en Python/FastAPI**. De repository vermeldt **MPL-2.0** als licentie. Het is daardoor een andere technische basis dan de voorgestelde Vue/Node.js-combinatie. [GitHub](https://github.com/mawoka-myblock/ClassQuiz?utm_source=chatgpt.com)

**Mijn oordeel:** een goede tweede kandidaat voor een gewone pubquiz. De gewenste teamstemming, individuele teamstatistieken en fijnmazige rolverdeling blijven punten om te onderzoeken.

**3. Fuiz — vooral interessant vanwege het teamspel**

Fuiz heeft daadwerkelijk een **Teamwork Mode**. Daarbij krijgt ieder teamlid slechts een deel van de antwoordmogelijkheden, zodat spelers moeten overleggen om het juiste antwoord te vinden. Het project vermeldt ook een Nederlandse vertaling. [Live Quiz Platform](https://fuiz.org/php-info?utm_source=chatgpt.com)

Dat verschilt van jouw model:

|Jouw gewenste teamspel|Fuiz Teamwork Mode|
|---|---|
|Iedereen krijgt de antwoordmogelijkheden|Antwoordmogelijkheden worden over teamleden verdeeld|
|Iedereen stemt individueel|Overleg is nodig vanwege de verdeelde informatie|
|Meeste stemmen bepalen het teamantwoord|Deze specifieke meerderheidsregel is niet bevestigd|

Fuiz heeft een Docker Compose-opstelling voor eigen hosting. De frontend gebruikt Svelte en de spelbackend Rust; de repositories vermelden **AGPL-3.0**. [GitHub](https://github.com/fuiz?utm_source=chatgpt.com)

**Mijn oordeel:** interessant wanneer je flexibel bent in de spelregels en samenwerking belangrijker vindt dan het exact uitvoeren van het huidige PuntQuiz-model.

**4. Claper — minder geschikt voor jouw hoofdscenario**

Claper is vooral gericht op interactie tijdens presentaties. De quizdocumentatie beschrijft maximaal tien vragen per quizonderdeel en laat deelnemers zelfstandig door de vragen navigeren. Dat wijkt af van jouw opzet waarin de presentator iedere vraag centraal opent en sluit. [Claper documentation](https://docs.claper.co/usage/quizzes.html?utm_source=chatgpt.com)

**Mijn oordeel:** bruikbaar voor presentaties met quizonderdelen, maar ik zou het niet als eerste basis voor PuntQuiz kiezen.

**Waar waarschijnlijk nog maatwerk nodig is**

Voor de onderstaande combinatie heb ik bij deze kandidaten geen volledige ondersteuning kunnen bevestigen:

|PuntQuiz-eis|Wat nog moet worden vastgesteld of gebouwd|
|---|---|
|Individuele deelname binnen een team|Persoonlijke antwoorden én teamresultaat bewaren|
|Meerderheidsstemming|Inclusief de afgesproken regel bij gelijke stemmen|
|Quizmaster en presentator scheiden|Afzonderlijke rechten voor inhoud en uitvoering|
|Open antwoorden beoordelen|Een beoordelingsscherm vóór publicatie van de score|
|Scores corrigeren|Reden vastleggen en klassement opnieuw berekenen|
|Vaste quizversie per sessie|Wijzigingen mogen een lopende quiz niet beïnvloeden|
|Herstel na verbindingsverlies|Antwoorden, identiteit en deadlines correct herstellen|

**Mijn advies: begin met een korte pilot van QuizDock.** Test daarin één volledige quiz met twee rondes, een afbeelding, een open vraag, losse telefoons en een apart presentatiescherm. Controleer daarnaast reconnect, scorecorrectie en het presenteren van een quiz die iemand anders heeft gemaakt.

Als **één telefoon per team** voorlopig acceptabel is, kun je waarschijnlijk sneller een bruikbare pubquizavond realiseren: ieder team speelt dan als één deelnemer. Dat is een praktische vereenvoudiging, maar levert geen individuele teamstatistieken op.

Wil je vanaf het begin **iedere speler afzonderlijk laten antwoorden met automatische teamstemming**, dan zou ik rekening houden met maatwerk. De keuze is dan vooral of QuizDock voldoende bruikbare basis biedt om uit te breiden. **Op basis van deze documentatie zou ik dat eerst onderzoeken, vóór een volledige nieuwbouw van PuntQuiz.**