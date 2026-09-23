# Studio CAI – Deleghe per l'assemblea v1.0

Modulo online che sostituisce la delega cartacea della convocazione. Si raggiunge dal QR stampato sulla convocazione ed è valido anche per chi delega all'ultimo momento.

Versione 1.0 del 22/09/2026.

## Percorso del condomino (circa 1 minuto)

1. Scrive condominio, data dell'assemblea, scala e interno.
2. Inserisce i suoi dati: nome, cognome, codice fiscale (controllato contro nome e cognome e sul carattere di controllo), qualità ed email (obbligatoria).
3. Indica il delegato, con email facoltativa per inviargli copia e istruzioni di voto facoltative.
4. Firma con il dito.
5. Spunta la dichiarazione di titolarità (art. 494 c.p.) e la privacy.
6. Riceve un codice di 6 cifre via email (valido 10 minuti, massimo 5 tentativi) e lo inserisce.
7. La delega viene registrata. Il PDF arriva a lui, al delegato e in copia nascosta allo studio.

Blocchi già nel modulo: delega all'amministratore (art. 67 disp. att. c.c.), delegato uguale al delegante, data dell'assemblea già passata, codice fiscale incoerente.

Il link può precompilare condominio e data: `?c=Via%20Roma%2023&d=2026-10-15`. Il QR generico non lo usa.

## Cosa succede dietro (Make, cartella Studio CAI)

| Scenario | ID | Webhook |
|---|---|---|
| Studio CAI – Deleghe: invio codice di verifica | 7552078 | hook.eu1.make.com/fejmi9wawtx9l4mcrnfmt4kqh5rlbns2 |
| Studio CAI – Deleghe: conferma e registrazione | 7552129 | hook.eu1.make.com/a66hokl5a55nagoie3z1h1953kbsa336 |
| Studio CAI – Deleghe: revoca | 7552106 | hook.eu1.make.com/4bshn94r0p6npazhnwuqhk6adkdixqqq |

Data store dei codici: "Deleghe – codici di verifica" (195160). Ogni codice viene cancellato appena usato.

Alla conferma, Make esegue in automatico:
- **Abbinamento del condominio** all'elenco delle cartelle Dropbox scritti_cai, con lo stesso motore degli interventi. Se il condominio non viene trovato, arriva un avviso Telegram.
- **Verifica del recapito**: 🟢 RICONOSCIUTA se l'email compare nelle segnalazioni inviate allo studio (foglio della webapp Segnalazioni) o in deleghe precedenti; 🟡 NUOVO RECAPITO altrimenti.
- **Sostituzione**: una nuova delega per la stessa unità e assemblea marca la precedente come SOSTITUITA.
- **Limite del delegato**: dalla terza delega allo stesso delegato per la stessa assemblea compare un avviso sull'art. 67.
- **Archivio**: il PDF viene salvato in Dropbox `/STUDIO CAI/Deleghe Assemblee/<Condominio>/<data assemblea>/` e la delega registrata su Airtable, base **DELEGHE ASSEMBLEE**, tabella Deleghe.
- **Ricevuta**: email con PDF allegato, pulsante di revoca e avviso "non l'ha compilata lei?".

La revoca passa sempre da una pagina di conferma, così i controlli automatici dei link nelle caselle email non possono revocare la delega da soli. Si può revocare fino al giorno dell'assemblea.

## Il giorno dell'assemblea

Su Airtable, base DELEGHE ASSEMBLEE, si filtra per CONDOMINIO e DATA ASSEMBLEA con STATO = VALIDA. Le colonne VERIFICA e AVVISI mostrano cosa controllare all'appello. I PDF sono nella cartella Dropbox dell'assemblea.

## Testo per il modello di convocazione (CED House Suite)

Nella sezione DELEGA del modello, sopra la delega cartacea, inserire l'immagine `QR_Deleghe_con_didascalia.png` e questo testo:

> **Delega online.** Può delegare anche dallo smartphone, fino all'inizio dell'assemblea: inquadri il QR, compili i dati, firmi con il dito e confermi con il codice che riceve via email. Riceverà subito la ricevuta in PDF, inviata anche al delegato. In alternativa può usare il modulo cartaceo qui sotto. Deleghe inviate per semplice email senza firma non potranno essere accettate.

## Sviluppo e pubblicazione

```bash
npm install
npm start        # anteprima locale
npm run build    # cartella build/ da pubblicare
```

Pubblicare su Vercel con il nome di progetto **studio-cai-deleghe**: il QR punta a `https://studio-cai-deleghe.vercel.app`. Se il nome cambia, va rigenerato il QR.

Stack: React 18 (CRA), Tailwind CSS 3, Framer Motion, Lucide React, jsPDF (il PDF si genera nel browser, senza servizi a pagamento). Il logo è quello già pubblicato con la webapp Segnalazioni (`studio-cai-messenger.vercel.app/logo.jpg`).
