/* "Comanda" de serviço - usada na Razor Rail da Home e em outras listagens.
 * CTA leva direto pro fluxo de agendamento já com o serviço pré-selecionado. */
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/types/barber";

interface ServiceTicketProps {
  service: Service;
  index: number;
  className?: string;
}

const ServiceTicket = ({ service, index, className = "" }: ServiceTicketProps) => (
  <Link
    to={`/agendar?service=${service.id}`}
    className={`ticket-hover group relative flex w-64 shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-6 ${className}`}
  >
    {service.image && (
      <img
        src={service.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-20 grayscale transition-opacity duration-500 group-hover:opacity-30"
      />
    )}
    <div className="relative">
      <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, "0")}</span>
      <h3 className="font-display text-2xl font-semibold mt-3">{service.name}</h3>
      {service.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{service.description}</p>
      )}
    </div>

    <div className="relative mt-6">
      <div className="rule-brass mb-3" />
      <div className="flex items-center justify-between font-mono text-sm">
        <span className="text-muted-foreground">{service.duration_minutes} MIN</span>
        <span className="text-primary text-base font-medium">R$ {service.price.toFixed(2)}</span>
      </div>
      <span className="mt-4 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.15em] text-primary">
        Agendar
        <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
      </span>
    </div>
  </Link>
);

export default ServiceTicket;
