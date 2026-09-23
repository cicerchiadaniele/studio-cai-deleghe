import { jsPDF } from "jspdf";

// Ricevuta/delega in PDF generata nel browser: nessun servizio esterno, nessun costo.
// Il PDF viaggia verso Make insieme ai dati e viene archiviato su Dropbox e allegato alla ricevuta.

const BORDEAUX = [139, 21, 56];
const GRIGIO = [107, 100, 102];
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const dataEstesa = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${Number(m[3])} ${MESI[Number(m[2]) - 1]} ${m[1]}` : iso;
};
const dataOra = (d) => d.toLocaleString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

// jsPDF con i font standard usa la codifica WinAnsi: sostituisce i caratteri che non esistono lì
const sicuro = (s) => String(s || "")
  .replace(/[‘’ʼ]/g, "'").replace(/[“”]/g, '"')
  .replace(/[–—]/g, "-").replace(/…/g, "...")
  .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ]/g, "");

const dimensioniImmagine = (src) => new Promise((ok) => {
  const im = new Image();
  im.onload = () => ok({ w: im.width, h: im.height });
  im.onerror = () => ok({ w: 400, h: 150 });
  im.src = src;
});

export async function creaPdfDelega(d) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 20, R = 190, W = R - L;
  let y = 20;

  const testo = (t, opt = {}) => {
    const { size = 10.5, bold = false, color = [31, 27, 28], gap = 5.2, align = "left" } = opt;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const righe = doc.splitTextToSize(sicuro(t), W);
    righe.forEach((r) => {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(r, align === "center" ? 105 : L, y, { align });
      y += gap;
    });
  };

  // Intestazione
  doc.setFillColor(...BORDEAUX);
  doc.rect(0, 0, 210, 30, "F");
  doc.setFont("times", "bold"); doc.setFontSize(22); doc.setTextColor(255, 255, 255);
  doc.text("Studio CAI", L, 15);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(243, 217, 224);
  doc.text("Delega a partecipare all'assemblea di condominio", L, 22);
  doc.setFont("courier", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text(sicuro(d.codiceDelega), R, 15, { align: "right" });
  y = 44;

  testo(`Condominio di ${d.condominio}`, { size: 15, bold: true, color: BORDEAUX, align: "center", gap: 7 });
  testo(`Assemblea del ${dataEstesa(d.dataAssemblea)}`, { size: 10.5, color: GRIGIO, align: "center", gap: 11 });

  testo(`Il/La sottoscritto/a ${d.nome} ${d.cognome}, codice fiscale ${d.cf}, in qualità di ${String(d.qualita).toLowerCase()} dell'unità immobiliare ${d.unita} del Condominio di ${d.condominio},`, { gap: 5.6 });
  y += 3;
  testo("DELEGA", { bold: true, align: "center", gap: 8 });
  testo(`il/la Sig./Sig.ra ${d.delegato} a rappresentarlo/a nell'assemblea del condominio convocata per il giorno ${dataEstesa(d.dataAssemblea)}, in prima o in seconda convocazione, con facoltà di intervenire, discutere e votare su tutti i punti all'ordine del giorno${d.istruzioni ? ", secondo le istruzioni di voto riportate di seguito" : ""}.`, { gap: 5.6 });
  y += 4;

  if (d.istruzioni) {
    testo("Istruzioni di voto", { bold: true, color: BORDEAUX, gap: 6 });
    doc.setDrawColor(236, 211, 218);
    const inizio = y - 4;
    testo(d.istruzioni, { size: 10, gap: 5 });
    doc.setFillColor(...BORDEAUX); doc.rect(L - 4, inizio, 1, y - inizio - 2, "F");
    y += 4;
  }

  testo(`Il delegante dichiara di essere il titolare dell'unità immobiliare indicata, o di avere titolo a rappresentarla, e di aver compilato personalmente la presente delega, consapevole che la falsa attribuzione di identità costituisce reato (art. 494 c.p.). La delega non può essere conferita all'amministratore (art. 67 disp. att. c.c.).`, { size: 9, color: GRIGIO, gap: 4.4 });
  y += 8;

  // Firma
  if (y > 225) { doc.addPage(); y = 20; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(31, 27, 28);
  doc.text(sicuro(`Roma, ${dataOra(d.quando).split(",")[0]}`), L, y + 4);
  doc.text("Firma del delegante", 150, y, { align: "center" });
  if (d.firma) {
    const { w, h } = await dimensioniImmagine(d.firma);
    const maxW = 60, maxH = 24;
    const k = Math.min(maxW / w, maxH / h);
    doc.addImage(d.firma, "PNG", 150 - (w * k) / 2, y + 3, w * k, h * k);
  }
  doc.setDrawColor(180, 170, 172); doc.line(118, y + 29, 182, y + 29);
  doc.setFontSize(9); doc.setTextColor(...GRIGIO);
  doc.text(sicuro(`${d.nome} ${d.cognome}`), 150, y + 34, { align: "center" });
  y += 46;

  // Riquadro di verifica
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFillColor(249, 241, 243); doc.setDrawColor(236, 211, 218);
  doc.roundedRect(L, y, W, 34, 3, 3, "FD");
  doc.setFillColor(...BORDEAUX); doc.rect(L, y, 1.4, 34, "F");
  const riga = (k, v, yy) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIGIO); doc.text(k, L + 6, yy);
    doc.setFont("helvetica", "bold"); doc.setTextColor(31, 27, 28); doc.text(sicuro(v), L + 52, yy);
  };
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...BORDEAUX);
  doc.text("DATI DI VERIFICA", L + 6, y + 6.5);
  riga("Codice delega", d.codiceDelega, y + 13);
  riga("Email del delegante", `${d.email} (verificata con codice monouso)`, y + 19);
  riga("Compilata il", dataOra(d.quando), y + 25);
  riga("Firma", "grafica, apposta sul dispositivo del delegante", y + 31);
  y += 42;

  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIGIO);
  const nota = doc.splitTextToSize(sicuro("Delega conferita per iscritto in forma elettronica tramite il modulo online di Studio CAI. Il documento è registrato insieme ai dati di verifica e può essere revocato dal delegante fino al giorno dell'assemblea; una nuova delega per la stessa unità sostituisce la precedente."), W);
  doc.text(nota, L, Math.min(y, 282));

  const blob = doc.output("blob");
  const nome = `${d.codiceDelega} - ${d.nome} ${d.cognome}`.replace(/[\\/:*?"<>|]+/g, "-") + ".pdf";
  return new File([blob], nome, { type: "application/pdf" });
}
