// ── Deleghe assemblea: controlli automatici e preparazione della registrazione ──
// Input: elenco (condomini Airtable), segnalazioni (Google Sheet webapp Segnalazioni),
// deleghe (Airtable: stessa email o stessa data assemblea), dati del modulo.

const IN = (typeof input !== "undefined") ? input : {};
const leggiJson = (v, d) => { try { return typeof v === "string" ? JSON.parse(v) : (v || d); } catch (e) { return d; } };
const txt = (v) => String(v == null ? "" : v).trim();

// ── Abbinamento condominio → elenco (stesso motore di "Interventi: abbinamento condominio all'elenco") ──
const base = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/\bs\.?\s*m\.?\s+/g, "sm ")
  .replace(/\bs(an)?ta?\.?\s*maria\b/g, "sm")
  .replace(/\bcirc\.?(onvallazion)?e?\b|\bcic\.?ne\b|\bcirc\.ne\b/g, " ")
  .replace(/([a-z])(\d)/g, "$1 $2").replace(/(\d)([a-z])/g, "$1 $2")
  .replace(/[^a-z0-9]+/g, " ").trim();
const STOP = new Set(("via viale vle v piazza piazzale pza p pzza largo lgo vicolo corso circonvallazione ne cne " +
  "condominio cond civico civ n nr num numero int interno scala sc italia lotto palazzina pal isolato " +
  "e ed a al alla i de di del della da dal padre san santa santo m").split(" "));
const parole = (s) => base(s).split(" ").filter((w) => w && !/^\d/.test(w) && !STOP.has(w) && w.length >= 3);
const numeri = (s) => {
  const out = new Set();
  (base(s).match(/\d{1,4}/g) || []).map(Number).forEach((n) => out.add(n));
  (String(s || "").match(/(\d{1,4})\s*[-–\/]\s*(\d{1,4})/g) || []).forEach((r) => {
    const [a, b] = r.split(/[-–\/]/).map((x) => Number(x.trim()));
    if (b > a && b - a <= 30) for (let i = a; i <= b; i++) out.add(i);
  });
  return out;
};
const lev = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const simili = (a, b) => {
  if (a === b) return 2;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return 1;
  const L = Math.min(a.length, b.length);
  if (L >= 5 && lev(a, b) <= 1) return 1;
  if (L >= 8 && lev(a, b) <= 2) return 1;
  return 0;
};
const REGOLE = [
  [/oppido/, "Appia Archeologica I"],
  [/crisopoli/, "Begonie"],
  [/peperino/, "Dalie"],
  [/anicio|paolino|palino/, "Tor Fiscale"],
  [/\ba?c?qui\b|\bacqui\b/, "Acqui 11"],
  [/san ?remo 1 3\b/, "San Remo 1-3"],
  [/san ?remo/, "San Remo 1"],
  [/monte ?grimano|comparto ed|comparto edificio/, "Comparto Z1B Edificio 1"],
  [/genzano|appia nuova 555/, "Appia Nuova 555 - Genzano 12"],
  [/bragadin|cipro/, "Cipro 47-53 - M.Bragadin 50"],
  [/nomentum/, "Nomentum 49-61"],
  [/(ugo )?da como/, "Da Como 1-2-3"],
  [/magna ?grecia/, "Magna Grecia 20-26"],
  [/fidene/, "Fidene 19"],
  [/piagge supercondomin/, "Comparto R1 - Piagge 92-94"],
  [/piagge (7[5-9]|8[0-9])\b/, "Piagge 75-89"],
  [/piagge 9[24]\b/, (sc, t) => {
    if (/\bd ?e\b|\b92 d\b/.test(t)) return "Piagge92 DE";
    if (/\bf ?g ?h\b/.test(t)) return "Piagge92 FGH";
    const s = base(sc).replace(/^scala /, "");
    if (/^[de]\b/.test(s)) return "Piagge92 DE";
    if (/^[fgh]\b/.test(s)) return "Piagge92 FGH";
    return "Comparto R1 - Piagge 92-94";
  }],
];
function abbina(testo, scala, elenco) {
  const t = base(testo);
  if (!t) return "";
  const esiste = (n) => elenco.find((e) => e === n);
  for (const [re, dest] of REGOLE) {
    if (re.test(t)) {
      const n = typeof dest === "function" ? dest(scala, t) : dest;
      if (esiste(n)) return n;
    }
  }
  const P = parole(testo), N = numeri(testo);
  if (!P.length) return "";
  const cand = elenco.map((e) => {
    const pe = parole(e), ne = numeri(e);
    let sp = 0;
    P.forEach((x) => { let m = 0; pe.forEach((y) => { m = Math.max(m, simili(x, y)); }); sp += m; });
    if (!sp) return null;
    let sn = 0;
    if (N.size && ne.size) { for (const n of N) if (ne.has(n)) sn++; if (!sn) return null; }
    const esatto = N.size && ne.size && N.size === ne.size && [...N].every((n) => ne.has(n)) ? 1 : 0;
    return { e, punti: sp * 10 + sn * 3 + esatto * 2 - (N.size ? 0 : ne.size ? 1 : 0) };
  }).filter(Boolean).sort((a, b) => b.punti - a.punti);
  if (!cand.length) return "";
  if (cand.length > 1 && cand[0].punti === cand[1].punti) return "";
  return cand[0].e;
}

// ── Dati del modulo ──
const d = {
  codice: txt(IN.codiceDelega),
  condominio: txt(IN.condominio),
  data: txt(IN.dataAssemblea),            // YYYY-MM-DD
  unita: txt(IN.unita),
  nome: txt(IN.nome), cognome: txt(IN.cognome),
  cf: txt(IN.cf).toUpperCase(),
  qualita: txt(IN.qualita),
  email: txt(IN.email).toLowerCase(),
  delegato: txt(IN.delegato),
  emailDelegato: txt(IN.emailDelegato).toLowerCase(),
  istruzioni: txt(IN.istruzioni),
  ip: txt(IN.ip), dispositivo: txt(IN.dispositivo).slice(0, 250),
  versione: txt(IN.versione),
  quando: txt(IN.timestamp) || new Date().toISOString(),
};
const delegante = `${d.nome} ${d.cognome}`.trim();

const elenco = leggiJson(IN.elenco, []).map((r) => txt((r.fields || {}).Condominio)).filter(Boolean);
const nomeCondominio = elenco.length ? abbina(d.condominio, d.unita, elenco) : "";
const condominio = nomeCondominio || d.condominio;

// ── Verifica recapito: email già nota allo studio? ──
const norm = (s) => base(s).replace(/\s+/g, "");
const deleghe = leggiJson(IN.deleghe, []);
const precedentiStessaEmail = deleghe.filter((r) => txt((r.fields || {}).EMAIL).toLowerCase() === d.email);

let inSegnalazioni = false;
const foglio = leggiJson(IN.segnalazioni, {});
const righe = Array.isArray(foglio.values) ? foglio.values : [];
if (righe.length && d.email) {
  const intest = (righe[0] || []).map((h) => String(h || "").toLowerCase());
  let col = intest.findIndex((h) => /mail/.test(h));
  const cerca = (r) => col >= 0
    ? String(r[col] || "").trim().toLowerCase() === d.email
    : r.some((c) => String(c || "").trim().toLowerCase() === d.email);
  inSegnalazioni = righe.slice(1).some(cerca);
}
const motivi = [];
if (precedentiStessaEmail.length) motivi.push("deleghe precedenti");
if (inSegnalazioni) motivi.push("segnalazioni allo studio");
const verifica = motivi.length ? "🟢 RICONOSCIUTA" : "🟡 NUOVO RECAPITO";

// ── Stessa assemblea: sostituzioni e deleghe allo stesso delegato ──
const stessaAssemblea = deleghe.filter((r) => {
  const f = r.fields || {};
  return txt(f.STATO) === "VALIDA" && txt(f["DATA ASSEMBLEA"]) === d.data && norm(f.CONDOMINIO) === norm(condominio);
});
const unitaN = norm(d.unita);
const daSostituire = stessaAssemblea.filter((r) => {
  const f = r.fields || {};
  return norm(f["UNITÀ"]) === unitaN || (d.cf && txt(f["CODICE FISCALE"]).toUpperCase() === d.cf && norm(f["UNITÀ"]) === unitaN);
});
const idSost = new Set(daSostituire.map((r) => r.id));
const stessoDelegato = stessaAssemblea.filter((r) => !idSost.has(r.id) && norm((r.fields || {}).DELEGATO) === norm(d.delegato));

const avvisi = [];
if (!nomeCondominio) avvisi.push(`Condominio "${d.condominio}" non trovato nell'elenco: correggere il campo CONDOMINIO.`);
if (daSostituire.length) avvisi.push(`Sostituisce la delega ${daSostituire.map((r) => txt((r.fields || {}).CODICE)).join(", ")} della stessa unità.`);
if (stessoDelegato.length >= 2) avvisi.push(`${d.delegato} ha ${stessoDelegato.length + 1} deleghe per questa assemblea: verificare il limite dell'art. 67 disp. att. c.c. (oltre 20 condòmini, max 1/5 dei condòmini e del valore).`);
if (/cicerchia|studio ?cai|amministrator/i.test(d.delegato)) avvisi.push("Il delegato sembra essere l'amministratore: delega non ammessa (art. 67 disp. att. c.c.).");

// ── Token di revoca ──
const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
let token = "";
for (let i = 0; i < 24; i++) token += alfabeto[Math.floor(Math.random() * alfabeto.length)];

// ── Registrazione Airtable ──
const record = {
  typecast: true,
  records: [{ fields: {
    "CODICE": d.codice, "STATO": "VALIDA", "VERIFICA": verifica,
    "CONDOMINIO": condominio, "CONDOMINIO SEGNALATO": d.condominio,
    "DATA ASSEMBLEA": d.data, "UNITÀ": d.unita, "DELEGANTE": delegante,
    "CODICE FISCALE": d.cf, "QUALITÀ": d.qualita, "EMAIL": d.email,
    "DELEGATO": d.delegato, "EMAIL DELEGATO": d.emailDelegato || null,
    "ISTRUZIONI DI VOTO": d.istruzioni, "AVVISI": avvisi.join("\n"),
    "DATA E ORA": d.quando, "IP": d.ip, "DISPOSITIVO": d.dispositivo,
    "PDF": "", "TOKEN REVOCA": token, "VERSIONE APP": d.versione,
  } }],
};
const sostituzione = JSON.stringify({ typecast: true, records: daSostituire.slice(0, 10).map((r) => ({ id: r.id, fields: { "STATO": "SOSTITUITA" } })) });

// ── Cartella e file su Dropbox ──
const pulito = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
const cartella = `/STUDIO CAI/Deleghe Assemblee/${pulito(condominio)}/${d.data}`;
const nomeFile = `${d.codice} - ${pulito(delegante)}.pdf`;
record.records[0].fields["PDF"] = `${cartella}/${nomeFile}`;

// ── Email di ricevuta ──
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const dataIt = (() => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d.data);
  if (!m) return d.data;
  const mesi = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
  return `${Number(m[3])} ${mesi[Number(m[2]) - 1]} ${m[1]}`;
})();
const riga = (k, v) => `<tr><td style="padding:10px 0;border-bottom:1px solid #eee7e2;color:#6b6466;width:150px;vertical-align:top;">${k}</td><td style="padding:10px 0;border-bottom:1px solid #eee7e2;font-weight:bold;vertical-align:top;">${v}</td></tr>`;
const linkRevoca = `${txt(IN.urlRevoca)}?codice=${encodeURIComponent(d.codice)}&token=${token}`;
const emailHtml = `<!DOCTYPE html>
<html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Delega registrata</title></head>
<body style="margin:0;padding:0;background:#f4f1ee;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f1ee;padding:24px 0;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center" style="padding:0 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e6dfd9;">
<tr><td style="background:#8B1538;padding:20px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="64" valign="middle" style="width:64px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="56" height="56" align="center" valign="middle" style="width:56px;height:56px;background:#ffffff;border-radius:12px;">
<img src="https://studio-cai-messenger.vercel.app/logo.jpg" width="48" height="48" alt="Studio CAI" style="display:block;width:48px;height:48px;border:0;border-radius:8px;">
</td></tr></table></td>
<td valign="middle" style="padding-left:14px;">
<p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.2;color:#ffffff;font-weight:bold;">Studio CAI</p>
<p style="margin:4px 0 0;font-size:13px;color:#f3d9e0;">Delega per l'assemblea registrata</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:30px 30px 10px;">
<p style="margin:0 0 14px;font-size:16px;color:#1f1b1c;">Gentile <strong>${esc(delegante)}</strong>,</p>
<p style="margin:0;font-size:15px;line-height:1.6;color:#333333;">le confermiamo che la sua delega per l'assemblea del condominio di <strong>${esc(condominio)}</strong> è stata registrata. In allegato trova la ricevuta in PDF${d.emailDelegato ? ", inviata in copia anche al delegato" : ""}.</p>
</td></tr>
<tr><td style="padding:14px 30px 4px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9f1f3;border:1px solid #ecd3da;border-left:4px solid #8B1538;border-radius:10px;">
<tr><td style="padding:14px 18px;">
<p style="margin:0;font-size:11px;letter-spacing:0.6px;color:#8B1538;font-weight:bold;">CODICE DELEGA</p>
<p style="margin:4px 0 0;font-family:'Courier New',Courier,monospace;font-size:21px;font-weight:bold;color:#6c1029;">${esc(d.codice)}</p>
</td></tr></table>
</td></tr>
<tr><td style="padding:20px 30px 6px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:#1f1b1c;border-collapse:collapse;">
${riga("Assemblea", esc(dataIt))}
${riga("Unità", esc(d.unita))}
${riga("Delegante", `${esc(delegante)}<br><span style="font-weight:normal;color:#6b6466;">${esc(d.qualita)} · ${esc(d.cf)}</span>`)}
${riga("Delegato", esc(d.delegato))}
${riga("Istruzioni di voto", d.istruzioni ? esc(d.istruzioni).replace(/\r?\n/g, "<br>") : "Nessuna")}
</table>
</td></tr>
<tr><td style="padding:20px 30px 4px;">
<p style="margin:0 0 8px;font-size:15px;font-weight:bold;color:#8B1538;">Vuole annullarla?</p>
<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#333333;">Può revocare la delega fino al giorno dell'assemblea. Per cambiare delegato basta compilare una nuova delega: sostituisce automaticamente questa.</p>
<a href="${linkRevoca}" style="display:inline-block;padding:11px 20px;border-radius:10px;border:1.5px solid #8B1538;color:#8B1538;font-weight:bold;font-size:14px;text-decoration:none;">Revoca la delega</a>
<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:#8a3a1b;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:10px 12px;"><strong>Non ha compilato lei questa delega?</strong> La revochi con il pulsante qui sopra e contatti subito lo studio.</p>
</td></tr>
<tr><td style="padding:22px 30px 28px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #eee7e2;">
<tr><td style="padding-top:18px;font-size:14px;line-height:1.7;color:#333333;">
Per informazioni: <a href="mailto:info@studiocai.it" style="color:#8B1538;font-weight:bold;text-decoration:none;">info@studiocai.it</a> &nbsp;&middot;&nbsp; <a href="tel:+390678359769" style="color:#8B1538;font-weight:bold;text-decoration:none;">06 7835 9769</a>
<br><br>Cordiali saluti,<br>
<span style="font-family:Georgia,'Times New Roman',serif;font-size:17px;color:#8B1538;font-weight:bold;">Studio CAI</span>
</td></tr></table>
</td></tr>
<tr><td style="background:#faf7f5;padding:13px 30px;border-top:1px solid #eee7e2;">
<p style="margin:0;font-size:11px;line-height:1.5;color:#8a8385;">Email automatica, la preghiamo di non rispondere a questo messaggio. La riceve perché il suo indirizzo è stato verificato con il codice inviato durante la compilazione della delega.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;

const telegram = nomeCondominio ? "" :
  `<b>🗳 Delega: condominio da verificare</b>\nNon trovo nell'elenco il condominio scritto nella delega ${esc(d.codice)}:\n• ${esc(d.condominio)}\n\nCorreggere il campo CONDOMINIO su Airtable (base DELEGHE ASSEMBLEE).`;

return {
  condominio, abbinato: !!nomeCondominio, verifica, motivo: motivi.join(" + ") || "email mai vista",
  avvisi: avvisi.join("\n"),
  record: JSON.stringify(record),
  sostituzione, nSostituite: daSostituire.length,
  cartella, nomeFile, token, emailHtml,
  oggetto: `Studio CAI – Delega registrata per l'assemblea del ${dataIt} [${d.codice}]`,
  cc: d.emailDelegato && d.emailDelegato !== d.email ? d.emailDelegato : "",
  telegram,
  risposta: JSON.stringify({ ok: true, codice: d.codice, condominio }),
};
