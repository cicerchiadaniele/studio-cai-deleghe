# Changelog v1.3.1 – 29/09/2026

- Fascia "Ti serve altro?": il pulsante dell'assistente diventa "Claudio – L'assistente virtuale dello Studio CAI".

# Changelog v1.3 – 29/09/2026

- Fascia "Ti serve altro?" in fondo alla pagina (`src/ServiziStudio.js`, identico in Segnalazioni, Deleghe, Anagrafe e Detrazioni): pulsanti Tutti i servizi (https://studio-cai-portali.vercel.app/), Assistente virtuale (https://studio-cai-chatbot.vercel.app/) e Numeri utili (pagina del portale), con telefono ed email dello studio chiamabili con un tocco.

## v1.1 – 23/09/2026

- Campo data su iPhone e iPad: Safari lo allargava oltre la colonna, più alto degli altri e con il testo centrato. Ora ha la stessa altezza e lo stesso allineamento degli altri campi.
- iPhone e iPad: campi a 16 px, così Safari non ingrandisce la pagina al tocco.
- Logo servito dall'app stessa (public/logo.jpg) invece che da Segnalazioni.
- Firma: il riquadro sulla pagina è bloccato e si attiva con un tocco. La firma si fa in una finestra a tutto schermo con "Cancella" e "Conferma firma": scorrere la pagina non lascia più segni involontari.

## v1.0 – 22/09/2026

Prima versione.

- Modulo di delega in 5 passaggi con la grafica di Segnalazioni 2.0 (bordeaux #8B1538, Fraunces + Manrope).
- Controllo del codice fiscale: formato, carattere di controllo, coerenza con nome e cognome.
- Firma grafica sullo schermo, ritagliata e inserita nel PDF.
- Dichiarazione di titolarità obbligatoria (art. 494 c.p.) e consenso privacy.
- Verifica dell'email con codice di 6 cifre, valido 10 minuti, massimo 5 tentativi, reinvio dopo 30 secondi.
- PDF della delega generato nel browser (jsPDF) con i dati di verifica.
- Blocco della delega all'amministratore e al delegante stesso.
- Tre scenari Make: invio codice, conferma e registrazione, revoca con pagina di conferma.
- Base Airtable DELEGHE ASSEMBLEE con stato (valida, sostituita, revocata), verifica del recapito e avvisi automatici.

# Changelog v1.2 – 29/09/2026

- Collegamento dall'assistente virtuale: il link può precompilare anche unità (`u`) ed email (`e`) oltre a condominio (`c`) e data dell'assemblea (`d`). L'email va comunque verificata con il codice.

# Changelog v1.1.1 – 29/09/2026

- Codice di verifica: la prima casella accetta il codice intero suggerito dalla tastiera di iPhone ("Da Mail") e lo distribuisce sulle sei caselle; etichette di accessibilità sulle caselle.
- Email con il codice (scenario Make 7552078) allineata al chatbot: mittente info@studiocai.it, Verdana, banda bordeaux, cifre in sei caselle, ora di scadenza, oggetto con il codice in testa.

# Changelog – Deleghe assemblea
