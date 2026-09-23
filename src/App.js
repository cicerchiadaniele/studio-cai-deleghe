import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Shield, Sparkles, Lock, Mail, MapPin, User, UserCheck, PenLine, ShieldCheck,
  FileCheck2, AlertCircle, CheckCircle2, ChevronDown, Loader2, RotateCcw, ArrowLeft, Info, X,
  AlertTriangle,
} from "lucide-react";
import { creaPdfDelega } from "./pdf";

// ─────────────────────────────────────────────────────────────
// Build constants (v1.1)
// ─────────────────────────────────────────────────────────────
const APP_VERSION = "1.1";
const BUILD_DATE_LABEL = "23/09/2026";
const BRAND = "Studio CAI";
const PRIMARY = "#8B1538";
const LOGO_URL = "/logo.jpg";

// Webhook Make (scenari "Studio CAI – Deleghe: …")
const HOOK_CODICE = "https://hook.eu1.make.com/fejmi9wawtx9l4mcrnfmt4kqh5rlbns2";
const HOOK_CONFERMA = "https://hook.eu1.make.com/a66hokl5a55nagoie3z1h1953kbsa336";

const QUALITA = [
  "Proprietario",
  "Comproprietario",
  "Usufruttuario",
  "Nudo proprietario",
  "Rappresentante legale (società)",
];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const cn = (...c) => c.filter(Boolean).join(" ");
const scurisci = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - f));
  const g = Math.round(((n >> 8) & 255) * (1 - f));
  const b = Math.round((n & 255) * (1 - f));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};
const norm = (s) => String(s || "").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Z]/g, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const oggiISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sanitizers = {
  condominio: (v) => v.replace(/[^\p{L}\p{N}\s.,'/-]/gu, ""),
  unita: (v) => v.replace(/[^\p{L}\p{N}\s./-]/gu, ""),
  nome: (v) => v.replace(/[^\p{L}\s'-]/gu, ""),
  cognome: (v) => v.replace(/[^\p{L}\s'-]/gu, ""),
  delegato: (v) => v.replace(/[^\p{L}\s'.-]/gu, ""),
  cf: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16),
  email: (v) => v.replace(/\s/g, ""),
  emailDelegato: (v) => v.replace(/\s/g, ""),
};
const pulisci = (v) => String(v || "").replace(/\s+/g, " ").trim();

// ── Codice fiscale: formato, carattere di controllo, coerenza con nome e cognome ──
const cons = (s) => s.replace(/[AEIOU]/g, "");
const voc = (s) => s.replace(/[^AEIOU]/g, "");
const codCognome = (c) => { c = norm(c); return (cons(c) + voc(c) + "XXX").slice(0, 3); };
const codNome = (n) => { n = norm(n); const k = cons(n); return k.length >= 4 ? k[0] + k[2] + k[3] : (k + voc(n) + "XXX").slice(0, 3); };
const DISPARI = { 0: 1, 1: 0, 2: 5, 3: 7, 4: 9, 5: 13, 6: 15, 7: 17, 8: 19, 9: 21, A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18, N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23 };
const carattereControllo = (cf) => {
  let s = 0;
  for (let i = 0; i < 15; i++) {
    const ch = cf[i];
    s += i % 2 === 0 ? DISPARI[ch] : (/[0-9]/.test(ch) ? Number(ch) : ch.charCodeAt(0) - 65);
  }
  return String.fromCharCode(65 + (s % 26));
};
function verificaCF(cf, nome, cognome) {
  if (!cf) return { stato: "vuoto" };
  if (cf.length < 16) return { stato: "incompleto", msg: `${cf.length}/16 caratteri` };
  const formato = /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/;
  if (!formato.test(cf) || carattereControllo(cf) !== cf[15]) return { stato: "errore", msg: "Codice fiscale non valido: controlla di averlo scritto bene" };
  if (nome && cognome && (cf.slice(0, 3) !== codCognome(cognome) || cf.slice(3, 6) !== codNome(nome)))
    return { stato: "errore", msg: "Il codice fiscale non corrisponde a nome e cognome indicati" };
  return { stato: "ok", msg: "Codice fiscale coerente" };
}
const eAmministratore = (s) => /CICERCHIA|STUDIOCAI|AMMINISTRATOR/.test(norm(s));

const nuovoCodiceDelega = () => {
  const d = new Date();
  const g = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const alfa = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  const buf = new Uint32Array(5);
  (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(buf) : buf.forEach((_, i) => { buf[i] = Math.floor(Math.random() * 1e9); });
  buf.forEach((x) => { r += alfa[x % alfa.length]; });
  return `DL-${g}-${r}`;
};

async function leggiIp() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json();
    return j.ip || "";
  } catch { return ""; }
}

async function inviaModulo(url, campi, file) {
  const fd = new FormData();
  Object.entries(campi).forEach(([k, v]) => fd.append(k, String(v ?? "")));
  if (file) fd.append("pdf", file, file.name);
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Errore di collegamento (${res.status}). Riprova tra poco.`);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { throw new Error("Risposta non valida dal server. Riprova tra poco."); }
}

const VUOTO = {
  condominio: "", dataAssemblea: "", unita: "",
  nome: "", cognome: "", cf: "", qualita: "", email: "",
  delegato: "", emailDelegato: "", istruzioni: "",
  dichiarazione: false, privacy: false,
};

// ─────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState(() => {
    // Il QR può precompilare condominio e data: ?c=Via+Roma+23&d=2026-10-15
    const p = new URLSearchParams(window.location.search);
    const d = p.get("d") || "";
    return {
      ...VUOTO,
      condominio: sanitizers.condominio(p.get("c") || ""),
      dataAssemblea: /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= oggiISO() ? d : "",
    };
  });
  const [touched, setTouched] = useState({});
  const [fase, setFase] = useState("modulo"); // modulo | codice | fatto
  const [firma, setFirma] = useState(null);    // dataURL PNG
  const [errore, setErrore] = useState("");
  const [invio, setInvio] = useState(false);
  const [richiesta, setRichiesta] = useState(null); // { requestId, codiceDelega }
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [scadenza, setScadenza] = useState(0);
  const [attesaReinvio, setAttesaReinvio] = useState(0);
  const [esito, setEsito] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [adesso, setAdesso] = useState(Date.now());
  const sigRef = useRef(null);

  useEffect(() => { document.title = `Deleghe assemblea – ${BRAND}`; }, []);
  useEffect(() => {
    if (fase !== "codice") return;
    const t = setInterval(() => {
      setAdesso(Date.now());
      setAttesaReinvio((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [fase]);

  const cssVars = useMemo(() => ({
    "--brand": PRIMARY,
    "--brand-dark": scurisci(PRIMARY, 0.22),
    "--brand-deep": scurisci(PRIMARY, 0.38),
  }), []);

  const update = (k, v) => {
    const clean = sanitizers[k] ? sanitizers[k](v) : v;
    setForm((s) => ({ ...s, [k]: clean }));
    setErrore("");
    setTouched((t) => ({ ...t, [k]: true }));
  };
  const esci = (k) => { setForm((s) => ({ ...s, [k]: typeof s[k] === "string" ? pulisci(s[k]) : s[k] })); setTouched((t) => ({ ...t, [k]: true })); };

  const cf = verificaCF(form.cf, form.nome, form.cognome);
  const delegatoAmm = eAmministratore(form.delegato);

  const erroreCampo = (k) => {
    if (!touched[k]) return null;
    const v = pulisci(form[k]);
    switch (k) {
      case "condominio": return !v ? "Campo obbligatorio" : v.length < 3 ? "Indirizzo troppo breve" : null;
      case "dataAssemblea": return !v ? "Campo obbligatorio" : v < oggiISO() ? "La data è già passata" : null;
      case "unita": return !v ? "Campo obbligatorio" : null;
      case "nome": case "cognome": return !v ? "Campo obbligatorio" : v.length < 2 ? "Troppo breve" : null;
      case "qualita": return !v ? "Seleziona un'opzione" : null;
      case "email": return !v ? "Campo obbligatorio" : !EMAIL_RE.test(v) ? "Email non valida" : null;
      case "emailDelegato": return v && !EMAIL_RE.test(v) ? "Email non valida" : null;
      case "delegato": return !v ? "Campo obbligatorio" : v.split(" ").length < 2 ? "Indica nome e cognome" : null;
      default: return null;
    }
  };

  const valida = () => {
    const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? pulisci(v) : v]));
    if (!f.condominio || f.condominio.length < 3) return "Indica il condominio";
    if (!f.dataAssemblea) return "Indica la data dell'assemblea";
    if (f.dataAssemblea < oggiISO()) return "La data dell'assemblea è già passata";
    if (!f.unita) return "Indica scala e interno";
    if (!f.nome || !f.cognome) return "Inserisci nome e cognome";
    if (verificaCF(f.cf, f.nome, f.cognome).stato !== "ok") return "Controlla il codice fiscale";
    if (!f.qualita) return "Indica in che qualità deleghi";
    if (!EMAIL_RE.test(f.email)) return "Inserisci un'email valida";
    if (!f.delegato || f.delegato.split(" ").length < 2) return "Indica nome e cognome del delegato";
    if (eAmministratore(f.delegato)) return "Non è possibile delegare l'amministratore (art. 67 disp. att. c.c.)";
    if (norm(f.delegato) === norm(`${f.nome}${f.cognome}`) || norm(f.delegato) === norm(`${f.cognome}${f.nome}`)) return "Il delegato non può essere la stessa persona che delega";
    if (f.emailDelegato && !EMAIL_RE.test(f.emailDelegato)) return "L'email del delegato non è valida";
    if (!firma) return "Manca la firma";
    if (!f.dichiarazione) return "Conferma la dichiarazione di titolarità";
    if (!f.privacy) return "Accetta l'informativa privacy";
    return "";
  };

  const vaiSu = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // ── Passo 1: richiesta del codice ──
  const chiediCodice = async () => {
    setTouched(Object.fromEntries(Object.keys(VUOTO).map((k) => [k, true])));
    const e = valida();
    if (e) { setErrore(e); return; }
    setErrore("");
    setInvio(true);
    try {
      const f = { ...form, email: pulisci(form.email).toLowerCase() };
      setForm((s) => ({ ...s, email: f.email }));
      const r = await inviaModulo(HOOK_CODICE, {
        email: f.email, nome: pulisci(f.nome), cognome: pulisci(f.cognome), condominio: pulisci(f.condominio),
      });
      if (!r.ok || !r.requestId) throw new Error("Non è stato possibile inviare il codice. Riprova.");
      setRichiesta((p) => ({ requestId: r.requestId, codiceDelega: p?.codiceDelega || nuovoCodiceDelega() }));
      setOtp(["", "", "", "", "", ""]);
      setScadenza(Date.now() + 10 * 60 * 1000);
      setAttesaReinvio(30);
      setFase("codice");
      vaiSu();
    } catch (err) {
      setErrore(err.message || "Invio non riuscito. Riprova.");
    } finally {
      setInvio(false);
    }
  };

  // ── Passo 2: conferma con il codice, PDF e registrazione ──
  const conferma = async () => {
    const codice = otp.join("");
    if (codice.length !== 6) return;
    setErrore("");
    setInvio(true);
    try {
      const f = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? pulisci(v) : v]));
      const quando = new Date();
      const [ip, pdf] = await Promise.all([
        leggiIp(),
        creaPdfDelega({ ...f, istruzioni: form.istruzioni.trim(), codiceDelega: richiesta.codiceDelega, firma, quando }),
      ]);
      const r = await inviaModulo(HOOK_CONFERMA, {
        requestId: richiesta.requestId, codice,
        codiceDelega: richiesta.codiceDelega,
        condominio: f.condominio, dataAssemblea: f.dataAssemblea, unita: f.unita,
        nome: f.nome, cognome: f.cognome, cf: f.cf, qualita: f.qualita, email: f.email.toLowerCase(),
        delegato: f.delegato, emailDelegato: f.emailDelegato.toLowerCase(), istruzioni: form.istruzioni.trim(),
        ip, dispositivo: navigator.userAgent, versione: APP_VERSION, timestamp: quando.toISOString(),
      }, pdf);
      if (r.ok) {
        setEsito({ codice: r.codice || richiesta.codiceDelega, condominio: r.condominio || f.condominio, ...f });
        setFase("fatto");
        vaiSu();
        return;
      }
      if (r.errore === "errato") { setErrore("Codice non corretto. Controlla l'email e riprova."); setOtp(["", "", "", "", "", ""]); }
      else if (r.errore === "troppi") setErrore("Troppi tentativi errati. Richiedi un nuovo codice.");
      else setErrore("Il codice è scaduto. Richiedi un nuovo codice.");
    } catch (err) {
      setErrore(err.message || "Invio non riuscito. Riprova.");
    } finally {
      setInvio(false);
    }
  };

  const ricomincia = () => {
    setForm((s) => ({ ...VUOTO, condominio: s.condominio, dataAssemblea: s.dataAssemblea }));
    setTouched({}); setFirma(null); setRichiesta(null); setEsito(null); setErrore("");
    sigRef.current?.pulisci();
    setFase("modulo"); vaiSu();
  };

  const restano = Math.max(0, Math.floor((scadenza - adesso) / 1000));
  const titolo = fase === "modulo" ? ["Modulo di delega", <>Tutti i campi con <span className="font-semibold">*</span> sono obbligatori · circa 1 minuto</>]
    : fase === "codice" ? ["Verifica email", "Ultimo passaggio"] : ["Fatto!", "Delega registrata e ricevuta inviata"];

  return (
    <div className="relative min-h-screen w-full bg-paper bg-noise text-neutral-900" style={cssVars}>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-brand/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-neutral-200/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white ring-1 ring-neutral-200 shadow-soft flex items-center justify-center">
                <img src={LOGO_URL} alt="logo" className="w-full h-full object-contain p-1"
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand ring-2 ring-white flex items-center justify-center">
                <Shield className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display font-semibold text-xl sm:text-2xl text-neutral-900 truncate">{BRAND}</h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white tracking-wider">v{APP_VERSION}</span>
              </div>
              <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">Deleghe per l'assemblea di condominio</p>
            </div>
            <button onClick={() => setShowInfo(!showInfo)} className="p-2.5 rounded-xl hover:bg-neutral-100 active:bg-neutral-200 transition-colors" aria-label="Informazioni">
              <Info className="w-5 h-5 text-neutral-600" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {showInfo && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="relative z-10 bg-gradient-to-b from-brand/8 to-brand/4 border-b border-brand/20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-start gap-3 text-sm">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand/12 flex items-center justify-center"><Info className="w-5 h-5 text-brand-dark" /></div>
              <div className="flex-1 text-neutral-600">
                <p className="font-semibold text-brand-deep mb-1">Come funziona</p>
                Compila la delega, firmala sullo schermo e conferma con il codice che ricevi via email.
                Tu e il delegato ricevete subito la ricevuta in PDF. Puoi revocare la delega dal link nella ricevuta;
                una nuova delega per la stessa unità sostituisce la precedente. La delega non può essere conferita
                all'amministratore (art. 67 disp. att. c.c.).
              </div>
              <button onClick={() => setShowInfo(false)} className="p-1.5 hover:bg-brand/12 rounded-lg"><X className="w-4 h-4 text-brand-dark" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      {fase === "modulo" && (
        <section className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 backdrop-blur ring-1 ring-neutral-200 text-xs font-medium text-neutral-700 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-brand" /> Valida anche all'ultimo momento
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold text-neutral-900 leading-[1.05] tracking-tight">
              Delega la tua <em className="not-italic text-brand">presenza</em> in assemblea
            </h2>
            <p className="mt-4 text-neutral-600 text-base sm:text-lg">
              Compila, firma con il dito e conferma con il codice che ricevi via email. Ricevuta immediata a te e al tuo delegato.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-600">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-neutral-200"><Lock className="w-3 h-3" /> Codice di verifica via email</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-neutral-200"><PenLine className="w-3 h-3" /> Firma sullo schermo</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white ring-1 ring-neutral-200"><FileCheck2 className="w-3 h-3" /> Ricevuta in PDF</span>
            </div>
          </motion.div>
        </section>
      )}

      <main className={cn("relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8", fase !== "modulo" && "pt-8 sm:pt-12")}>
        <motion.div layout className="bg-white rounded-3xl shadow-lift overflow-hidden ring-1 ring-neutral-200/80"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
          <div className="relative overflow-hidden bg-gradient-to-br from-brand via-brand-dark to-brand-deep px-6 sm:px-8 py-6">
            <div aria-hidden="true" className="absolute inset-0 opacity-20" style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)",
              backgroundSize: "32px 32px", backgroundPosition: "0 0, 16px 16px" }} />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/25 flex items-center justify-center">
                <FileCheck2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-display font-semibold text-xl sm:text-2xl text-white leading-tight">{titolo[0]}</h2>
                <p className="text-white/85 text-sm mt-1">{titolo[1]}</p>
              </div>
            </div>
          </div>

          {/* ═══ MODULO ═══ */}
          {fase === "modulo" && (
            <div className="p-6 sm:p-8 space-y-8">
              <FormSection step={1} icon={<Building2 className="w-4 h-4" />} title="Assemblea" description="Per quale assemblea stai delegando?">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <TextField label="Condominio" required placeholder="Es. Via Roma 23" value={form.condominio}
                      onChange={(v) => update("condominio", v)} onBlur={() => esci("condominio")}
                      icon={<MapPin className="w-4 h-4" />} error={erroreCampo("condominio")} hint="Indirizzo dello stabile, come riportato sulla convocazione" />
                  </div>
                  <TextField label="Data dell'assemblea" required type="date" value={form.dataAssemblea} min={oggiISO()}
                    onChange={(v) => update("dataAssemblea", v)} onBlur={() => esci("dataAssemblea")}
                    error={erroreCampo("dataAssemblea")} hint="Quella di prima o di seconda convocazione" />
                  <TextField label="Scala / Interno" required placeholder="Es. A / 12" value={form.unita}
                    onChange={(v) => update("unita", v)} onBlur={() => esci("unita")} error={erroreCampo("unita")} />
                </div>
              </FormSection>

              <FormSection step={2} icon={<User className="w-4 h-4" />} title="I tuoi dati" description="Chi delega: il titolare dell'unità">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <TextField label="Nome" required placeholder="Mario" autoComplete="given-name" value={form.nome}
                    onChange={(v) => update("nome", v)} onBlur={() => esci("nome")} error={erroreCampo("nome")} />
                  <TextField label="Cognome" required placeholder="Rossi" autoComplete="family-name" value={form.cognome}
                    onChange={(v) => update("cognome", v)} onBlur={() => esci("cognome")} error={erroreCampo("cognome")} />
                  <div className="sm:col-span-2">
                    <TextField label="Codice fiscale" required placeholder="RSSMRA70A01H501S" mono value={form.cf}
                      onChange={(v) => update("cf", v)}
                      state={cf.stato === "ok" ? "ok" : cf.stato === "errore" ? "error" : null}
                      error={cf.stato === "errore" ? cf.msg : touched.cf && cf.stato === "vuoto" ? "Campo obbligatorio" : null}
                      success={cf.stato === "ok" ? cf.msg : null}
                      hint={cf.stato === "incompleto" ? cf.msg : "Viene controllato che corrisponda a nome e cognome"} />
                  </div>
                  <SelectField label="In qualità di" required value={form.qualita} options={QUALITA}
                    onChange={(v) => update("qualita", v)} error={erroreCampo("qualita")} />
                  <TextField label="Email" required type="email" placeholder="nome@email.it" autoComplete="email" value={form.email}
                    onChange={(v) => update("email", v)} onBlur={() => esci("email")} icon={<Mail className="w-4 h-4" />}
                    error={erroreCampo("email")} hint="Riceverai il codice di verifica e la ricevuta" />
                </div>
              </FormSection>

              <FormSection step={3} icon={<UserCheck className="w-4 h-4" />} title="Il tuo delegato" description="Chi ti rappresenterà in assemblea">
                <div className="space-y-4">
                  <TextField label="Nome e cognome del delegato" required placeholder="Es. Laura Bianchi" value={form.delegato}
                    onChange={(v) => update("delegato", v)} onBlur={() => esci("delegato")} error={erroreCampo("delegato")} />
                  {delegatoAmm && (
                    <Nota tipo="errore">Non è possibile delegare l'amministratore (art. 67 disp. att. c.c.). Indica un'altra persona.</Nota>
                  )}
                  <TextField label="Email del delegato" optional type="email" placeholder="Per inviargli copia della delega" value={form.emailDelegato}
                    onChange={(v) => update("emailDelegato", v)} onBlur={() => esci("emailDelegato")} error={erroreCampo("emailDelegato")} />
                  <div>
                    <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5 mb-1.5">
                      Istruzioni di voto <span className="font-medium text-neutral-400">(facoltative)</span>
                    </label>
                    <textarea value={form.istruzioni} maxLength={1500} rows={4}
                      onChange={(e) => setForm((s) => ({ ...s, istruzioni: e.target.value }))}
                      placeholder="Es. Punto 2: favorevole. Punto 4: contrario."
                      className="w-full rounded-2xl border border-neutral-300 hover:border-neutral-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-white placeholder:text-neutral-400 resize-y" />
                    <p className="mt-1.5 text-xs text-neutral-500 flex justify-between gap-3">
                      <span>Restano scritte nella delega: il delegato è tenuto a rispettarle</span>
                      <span className="tabular-nums">{form.istruzioni.length}/1500</span>
                    </p>
                  </div>
                </div>
              </FormSection>

              <FormSection step={4} icon={<PenLine className="w-4 h-4" />} title="Firma" description="Tocca il riquadro: si apre l'area in cui firmare">
                <PadFirma ref={sigRef} iniziale={firma} onChange={setFirma} />
              </FormSection>

              <FormSection step={5} icon={<ShieldCheck className="w-4 h-4" />} title="Dichiarazione" description="Obbligatoria per procedere">
                <div className="space-y-3">
                  <Spunta checked={form.dichiarazione} onChange={(v) => setForm((s) => ({ ...s, dichiarazione: v }))}>
                    Dichiaro di essere il <b>titolare</b> dell'unità immobiliare indicata, o di avere titolo a rappresentarla,
                    e di compilare personalmente la presente delega. Sono consapevole che la falsa attribuzione di identità
                    costituisce reato (art. 494 c.p.).
                  </Spunta>
                  <Spunta checked={form.privacy} onChange={(v) => setForm((s) => ({ ...s, privacy: v }))}>
                    Ho letto l'informativa privacy e acconsento al trattamento dei dati per la gestione dell'assemblea.
                  </Spunta>
                </div>
              </FormSection>

              <AnimatePresence>{errore && <Nota tipo="errore" onClose={() => setErrore("")}>{errore}</Nota>}</AnimatePresence>

              <div>
                <Bottone onClick={chiediCodice} disabled={invio}>
                  {invio ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                  {invio ? "Invio del codice…" : "Ricevi il codice di verifica"}
                </Bottone>
                <p className="mt-2.5 text-center text-xs text-neutral-500">Ti inviamo un codice di 6 cifre all'email indicata</p>
              </div>
            </div>
          )}

          {/* ═══ CODICE ═══ */}
          {fase === "codice" && (
            <div className="p-6 sm:p-8">
              <div className="text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-2xl mt-4">Controlla la tua email</h3>
                <p className="text-sm text-neutral-600 mt-1.5">Abbiamo inviato un codice a <b className="text-neutral-800 break-all">{form.email}</b></p>
              </div>
              <CampoOtp valore={otp} onChange={setOtp} disabled={invio} />
              <p className="text-center text-xs text-neutral-500">
                {restano > 0
                  ? <>Il codice scade tra <b className="tabular-nums">{String(Math.floor(restano / 60)).padStart(2, "0")}:{String(restano % 60).padStart(2, "0")}</b> · Non lo trovi? Guarda nello spam</>
                  : <b className="text-red-600">Codice scaduto: richiedine uno nuovo</b>}
              </p>
              <div className="max-w-md mx-auto mt-6 space-y-3">
                <AnimatePresence>{errore && <Nota tipo="errore" onClose={() => setErrore("")}>{errore}</Nota>}</AnimatePresence>
                <Bottone onClick={conferma} disabled={invio || otp.join("").length !== 6 || restano <= 0}>
                  {invio ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                  {invio ? "Registrazione in corso…" : "Conferma e firma la delega"}
                </Bottone>
                <Bottone variante="ghost" onClick={() => { setErrore(""); setFase("modulo"); }} disabled={invio}>
                  <ArrowLeft className="w-4 h-4" /> Modifica i dati
                </Bottone>
              </div>
              <p className="text-center mt-4">
                <button type="button" disabled={attesaReinvio > 0 || invio} onClick={chiediCodice}
                  className="text-xs font-bold text-brand disabled:text-neutral-400 disabled:cursor-not-allowed inline-flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> Invia di nuovo il codice{attesaReinvio > 0 ? ` (${attesaReinvio}s)` : ""}
                </button>
              </p>
            </div>
          )}

          {/* ═══ FATTO ═══ */}
          {fase === "fatto" && esito && (
            <div className="p-6 sm:p-8">
              <div className="rounded-2xl border p-5 shadow-soft bg-gradient-to-br from-brand/8 to-white border-brand/30">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-brand/12 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-brand-dark" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-brand-deep text-lg leading-tight">Delega registrata</div>
                    <p className="text-sm text-neutral-600 mt-1">
                      La ricevuta in PDF è stata inviata a <b className="break-all">{esito.email}</b>{esito.emailDelegato ? " e al delegato" : ""}.
                    </p>
                    <div className="mt-3 bg-white rounded-xl px-4 py-3 ring-1 ring-brand/20">
                      <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1 font-semibold">Codice delega</p>
                      <p className="font-mono font-bold text-brand-dark text-lg tracking-tight select-all break-all">{esito.codice}</p>
                    </div>
                  </div>
                </div>
              </div>

              <dl className="mt-5 rounded-2xl ring-1 ring-neutral-200 overflow-hidden text-sm">
                {[
                  ["Condominio", esito.condominio],
                  ["Assemblea", new Date(`${esito.dataAssemblea}T12:00:00`).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })],
                  ["Unità", esito.unita],
                  ["Delegante", `${esito.nome} ${esito.cognome} · ${esito.qualita}`],
                  ["Delegato", esito.delegato],
                  ["Istruzioni di voto", esito.istruzioni ? "Sì, riportate nella delega" : "Nessuna"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-2.5 border-b border-neutral-100 last:border-0">
                    <dt className="text-neutral-500">{k}</dt><dd className="font-semibold text-right">{v}</dd>
                  </div>
                ))}
                <div className="flex justify-between items-center gap-4 px-4 py-2.5">
                  <dt className="text-neutral-500">Firma</dt>
                  <dd>{firma && <img src={firma} alt="firma" className="h-10" />}</dd>
                </div>
              </dl>

              <div className="mt-5">
                <Nota tipo="avviso">
                  Puoi <b>revocare</b> la delega fino al giorno dell'assemblea con il pulsante nell'email di ricevuta.
                  Per cambiare delegato basta compilare una nuova delega: sostituisce la precedente.
                  Se non l'hai compilata tu, contatta subito lo studio.
                </Nota>
              </div>
              <div className="mt-5"><Bottone variante="ghost" onClick={ricomincia}>Compila un'altra delega</Bottone></div>
            </div>
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white/70 backdrop-blur rounded-2xl ring-1 ring-neutral-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-neutral-600 text-center sm:text-left">
              <Building2 className="w-4 h-4 text-brand" />
              <span>© {new Date().getFullYear()} <span className="font-semibold text-neutral-800">{BRAND}</span> — Tutti i diritti riservati</span>
            </div>
            <div className="text-center sm:text-right text-xs text-neutral-500 tabular-nums">
              <span className="font-mono font-semibold text-neutral-700">v{APP_VERSION}</span>
              <span className="mx-2">·</span>
              Ultimo aggiornamento: <span className="font-semibold text-neutral-700">{BUILD_DATE_LABEL}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function FormSection({ step, icon, title, description, children }) {
  return (
    <section>
      <header className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center ring-1 ring-brand/20">{icon}</div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Step {step}</span>
          <h3 className="font-display font-semibold text-lg text-neutral-900 leading-tight">{title}</h3>
          {description && <p className="text-sm text-neutral-600 mt-0.5">{description}</p>}
        </div>
      </header>
      <div className="pl-0 sm:pl-12">{children}</div>
    </section>
  );
}

function Messaggio({ error, success, hint }) {
  if (error) return <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</motion.p>;
  if (success) return <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{success}</p>;
  if (hint) return <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>;
  return null;
}

function TextField({ label, value, onChange, onBlur, placeholder, type = "text", icon, required, optional, error, success, hint, mono, state, min, autoComplete }) {
  const s = error ? "error" : state;
  return (
    <div className="min-w-0">
      <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5 mb-1.5">
        {label}{required && <span className="text-red-500">*</span>}
        {optional && <span className="font-medium text-neutral-400">(facoltativa)</span>}
      </label>
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">{icon}</span>}
        <input type={type} value={value} min={min} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
          className={cn(
            "w-full rounded-2xl border py-3 text-sm focus:outline-none focus:ring-2 transition-all bg-white placeholder:text-neutral-400",
            icon ? "pl-10 pr-4" : "px-4", mono && "font-mono uppercase tracking-wider",
            type === "date" && "campo-data",
            s === "error" ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
              : s === "ok" ? "border-green-300 focus:ring-green-500/20 focus:border-green-500"
              : "border-neutral-300 hover:border-neutral-400 focus:ring-brand/20 focus:border-brand"
          )} />
      </div>
      <Messaggio error={error} success={success} hint={hint} />
    </div>
  );
}

function SelectField({ label, value, onChange, options = [], required, error }) {
  return (
    <div>
      <label className="text-sm font-semibold text-neutral-700 flex items-center gap-1.5 mb-1.5">{label}{required && <span className="text-red-500">*</span>}</label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className={cn("appearance-none w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white transition-all",
            error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-neutral-300 hover:border-neutral-400 focus:ring-brand/20 focus:border-brand")}>
          <option value="">— Seleziona —</option>
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
      </div>
      <Messaggio error={error} />
    </div>
  );
}

function Spunta({ checked, onChange, children }) {
  return (
    <label className={cn("flex gap-3 items-start p-4 rounded-2xl border cursor-pointer transition-all text-[13.5px] leading-relaxed text-neutral-700",
      checked ? "border-brand bg-brand/5" : "border-neutral-200 hover:border-neutral-300")}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn("mt-0.5 w-[22px] h-[22px] rounded-[7px] border-2 flex-shrink-0 flex items-center justify-center transition-all",
        checked ? "bg-brand border-brand" : "bg-white border-neutral-300")}>
        {checked && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><path d="m5 12 5 5 9-10" /></svg>}
      </span>
      <span>{children}</span>
    </label>
  );
}

function Nota({ tipo, children, onClose }) {
  const stili = {
    errore: "bg-red-50 border-red-300 text-red-900",
    avviso: "bg-amber-50 border-amber-300 text-amber-900",
  };
  const Icona = tipo === "errore" ? AlertCircle : AlertTriangle;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className={cn("flex gap-2.5 items-start rounded-2xl border px-4 py-3 text-sm leading-relaxed", stili[tipo])}>
      <Icona className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && <button onClick={onClose} className="p-0.5 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>}
    </motion.div>
  );
}

function Bottone({ children, onClick, disabled, variante }) {
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled}
      whileHover={disabled ? {} : { y: -1 }} whileTap={disabled ? {} : { scale: 0.99 }}
      className={cn("w-full rounded-2xl py-4 px-5 text-[15px] font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-55 disabled:cursor-not-allowed",
        variante === "ghost"
          ? "bg-white text-brand ring-1 ring-brand/30 hover:bg-brand/5"
          : "text-white bg-gradient-to-br from-brand to-brand-dark shadow-[0_10px_24px_-10px_rgba(139,21,56,0.6)]")}>
      {children}
    </motion.button>
  );
}

function CampoOtp({ valore, onChange, disabled }) {
  const refs = useRef([]);
  const imposta = (i, c) => {
    const n = [...valore]; n[i] = c; onChange(n);
  };
  const incolla = (e) => {
    const d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!d) return;
    e.preventDefault();
    const n = ["", "", "", "", "", ""]; d.split("").forEach((c, k) => { n[k] = c; });
    onChange(n);
    refs.current[Math.min(d.length, 5)]?.focus();
  };
  useEffect(() => { refs.current[0]?.focus(); }, []);
  return (
    <div className="flex gap-2 justify-center my-6">
      {valore.map((c, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} value={c} disabled={disabled}
          inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} maxLength={1} onPaste={incolla}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            if (v.length > 1) { incolla({ clipboardData: { getData: () => v }, preventDefault: () => {} }); return; }
            imposta(i, v); if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => { if (e.key === "Backspace" && !c && i > 0) refs.current[i - 1]?.focus(); }}
          className="w-11 h-14 sm:w-12 sm:h-[58px] text-center font-mono font-bold text-2xl rounded-xl border-[1.5px] border-neutral-300 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-neutral-50" />
      ))}
    </div>
  );
}

const PadFirma = React.forwardRef(function PadFirma({ onChange, iniziale }, ref) {
  // Il riquadro sulla pagina è solo un'anteprima bloccata: si firma in una finestra a tutto schermo
  // che si apre con un tocco, così scorrere la pagina non lascia mai segni involontari.
  const [aperto, setAperto] = useState(false);
  React.useImperativeHandle(ref, () => ({ pulisci: () => onChange(null) }));
  return (
    <div>
      <button type="button" onClick={() => setAperto(true)}
        className={cn("relative w-full rounded-2xl h-40 bg-[#fdfcfa] flex items-center justify-center transition-all",
          iniziale ? "border-[1.5px] border-brand" : "border-[1.5px] border-dashed border-neutral-300 hover:border-brand/60")}>
        {iniziale ? (
          <img src={iniziale} alt="firma" className="max-h-28 max-w-[85%] object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-neutral-500">
            <span className="w-11 h-11 rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20 flex items-center justify-center"><PenLine className="w-5 h-5" /></span>
            <span className="text-sm font-semibold text-neutral-700">Tocca qui per firmare</span>
          </span>
        )}
      </button>
      <div className="flex justify-between items-center mt-2 text-xs">
        <span className={iniziale ? "text-green-700 font-semibold" : "text-neutral-500"}>{iniziale ? "✓ Firma acquisita" : "Nessuna firma"}</span>
        {iniziale && (
          <button type="button" onClick={() => setAperto(true)} className="font-bold text-brand inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Rifai la firma
          </button>
        )}
      </div>
      {createPortal(
        <AnimatePresence>
          {aperto && <FinestraFirma onAnnulla={() => setAperto(false)} onConferma={(img) => { onChange(img); setAperto(false); }} />}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
});

function FinestraFirma({ onAnnulla, onConferma }) {
  const canvas = useRef(null);
  const stato = useRef({ disegno: false, ultimo: null, tratti: 0 });
  const [firmato, setFirmato] = useState(false);

  const prepara = () => {
    const cv = canvas.current; if (!cv) return;
    const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1;
    cv.width = r.width * d; cv.height = r.height * d;
    const ctx = cv.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#1c1917"; ctx.lineWidth = 2.6;
    stato.current = { disegno: false, ultimo: null, tratti: 0 }; setFirmato(false);
  };
  useEffect(() => {
    const prima = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    prepara();
    window.addEventListener("resize", prepara);
    return () => { document.body.style.overflow = prima; window.removeEventListener("resize", prepara); };
  }, []); // eslint-disable-line

  const pos = (e) => { const r = canvas.current.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const giu = (e) => { e.preventDefault(); stato.current.disegno = true; stato.current.ultimo = pos(e); canvas.current.setPointerCapture(e.pointerId); };
  const muovi = (e) => {
    const s = stato.current; if (!s.disegno) return;
    e.preventDefault();
    const p = pos(e), ctx = canvas.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(s.ultimo.x, s.ultimo.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    s.ultimo = p; s.tratti++;
    if (s.tratti > 15 && !firmato) setFirmato(true);
  };
  const su = () => { stato.current.disegno = false; };
  const pulisci = () => { canvas.current.getContext("2d").clearRect(0, 0, canvas.current.width, canvas.current.height); stato.current.tratti = 0; setFirmato(false); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-neutral-900/60 backdrop-blur-sm flex items-stretch sm:items-center justify-center p-0 sm:p-6">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        className="bg-white w-full sm:max-w-3xl sm:rounded-3xl shadow-lift flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-neutral-200">
          <div>
            <h3 className="font-display font-semibold text-lg leading-tight">Firma del delegante</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Firma per esteso con il dito o con il mouse</p>
          </div>
          <button type="button" onClick={onAnnulla} className="p-2 rounded-xl hover:bg-neutral-100" aria-label="Chiudi"><X className="w-5 h-5 text-neutral-600" /></button>
        </div>
        <div className="relative flex-1 min-h-[260px] sm:h-[340px] sm:flex-none m-4 rounded-2xl border-[1.5px] border-dashed border-neutral-300 bg-[#fdfcfa]">
          <canvas ref={canvas} className="absolute inset-0 w-full h-full rounded-2xl cursor-crosshair touch-none"
            onPointerDown={giu} onPointerMove={muovi} onPointerUp={su} onPointerLeave={su} onPointerCancel={su} />
          <div className="absolute left-8 right-8 bottom-12 border-b border-neutral-300 pointer-events-none" />
          {!firmato && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-neutral-400 text-sm pointer-events-none">
              <PenLine className="w-4 h-4" /> Firma qui
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 pb-5">
          <Bottone variante="ghost" onClick={pulisci}><RotateCcw className="w-4 h-4" /> Cancella</Bottone>
          <Bottone onClick={() => onConferma(esportaFirma(canvas.current))} disabled={!firmato}><CheckCircle2 className="w-5 h-5" /> Conferma firma</Bottone>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Ritaglia la firma sul contenuto e la esporta in PNG su sfondo trasparente
function esportaFirma(cv) {
  const ctx = cv.getContext("2d");
  const { width: w, height: h } = cv;
  const px = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    if (px[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  if (x1 <= x0 || y1 <= y0) return cv.toDataURL("image/png");
  const m = 12;
  x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w, x1 + m); y1 = Math.min(h, y1 + m);
  const out = document.createElement("canvas");
  out.width = x1 - x0; out.height = y1 - y0;
  out.getContext("2d").drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}
