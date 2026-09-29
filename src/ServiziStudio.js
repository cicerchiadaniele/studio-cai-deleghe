import React from "react";
import { LayoutGrid, Bot, PhoneCall, Phone, Mail, TriangleAlert, ArrowUpRight } from "lucide-react";

// Collegamenti comuni alle webapp Studio CAI per i condòmini (stesso file in tutte le app).
// Portale servizi, assistente virtuale, numeri utili e recapiti dello studio.
const PORTALE = "https://studio-cai-portali.vercel.app/";
const ASSISTENTE = "https://studio-cai-chatbot.vercel.app/";
const NUMERI = "https://studio-cai-portali.vercel.app/?servizio=numeri-utili";
const TEL = "06 7835 9769";
const TEL_LINK = "tel:+390678359769";
const EMAIL = "info@studiocai.it";

const LINK = [
  { href: PORTALE, titolo: "Tutti i servizi", sotto: "Portale servizi dello studio", Icona: LayoutGrid },
  { href: ASSISTENTE, titolo: "Assistente virtuale", sotto: "Chiedi qualsiasi cosa sul condominio", Icona: Bot },
  { href: NUMERI, titolo: "Numeri utili", sotto: "Emergenze, acqua, luce e gas", Icona: PhoneCall },
];

export function ServiziStudio({ className = "" }) {
  return (
    <section className={`relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-4 ${className}`} aria-label="Altri servizi dello studio">
      <div className="bg-white/80 backdrop-blur rounded-2xl ring-1 ring-neutral-200 p-4 sm:p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3">Ti serve altro?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {LINK.map(({ href, titolo, sotto, Icona }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl bg-white ring-1 ring-neutral-200 hover:ring-[#8B1538]/40 px-3 py-2.5 transition-colors">
              <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#8B1538]/10 text-[#8B1538] flex items-center justify-center">
                <Icona className="w-[18px] h-[18px]" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-neutral-900 leading-tight">{titolo}</span>
                <span className="block text-xs text-neutral-500 leading-tight">{sotto}</span>
              </span>
              <ArrowUpRight className="flex-shrink-0 w-4 h-4 text-neutral-400 group-hover:text-[#8B1538]" />
            </a>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-neutral-600">
          <span className="font-semibold text-neutral-800">Studio CAI</span>
          <a href={TEL_LINK} className="inline-flex items-center gap-1.5 hover:text-[#8B1538]"><Phone className="w-3.5 h-3.5" />{TEL}</a>
          <a href={`mailto:${EMAIL}`} className="inline-flex items-center gap-1.5 hover:text-[#8B1538]"><Mail className="w-3.5 h-3.5" />{EMAIL}</a>
        </div>
      </div>
    </section>
  );
}

// Avviso per le emergenze (usato in Segnalazioni): la segnalazione online non è un pronto intervento.
export function AvvisoEmergenza({ className = "" }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 ${className}`} role="note">
      <TriangleAlert className="flex-shrink-0 w-5 h-5 text-amber-700 mt-0.5" />
      <p className="text-sm text-amber-900 leading-snug">
        <span className="font-semibold">Pericolo immediato?</span> Non usare il modulo: chiama subito il{" "}
        <a href="tel:112" className="font-bold underline underline-offset-2">112</a>. Per odore di gas esci di casa e chiama l'
        <a href="tel:800900999" className="font-bold underline underline-offset-2 whitespace-nowrap">800 900 999</a>{" "}
        (Italgas). Altri numeri in{" "}
        <a href={NUMERI} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Numeri utili</a>.
      </p>
    </div>
  );
}
