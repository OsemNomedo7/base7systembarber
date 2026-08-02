/* Fluxo público de agendamento: Serviço → Profissional → Data/Horário → Dados → Confirmação.
 * Preço/duração exibidos vêm sempre do registro carregado do banco - o backend
 * (create_appointment, RPC) revalida tudo de novo antes de gravar (nunca confia
 * no que está selecionado no cliente). */
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, MessageCircle } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { useServiceProfessionals } from "@/hooks/useServiceProfessionals";
import { useAvailableSlots } from "@/hooks/useAvailableSlots";
import { useAppointmentMutations } from "@/hooks/useAppointmentMutations";
import { useWhatsappNumber } from "@/hooks/useWhatsappNumber";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Step = "service" | "professional" | "datetime" | "details" | "confirmation";
const STEP_LABELS: { key: Step; label: string }[] = [
  { key: "service", label: "Serviço" },
  { key: "professional", label: "Barbeiro" },
  { key: "datetime", label: "Horário" },
  { key: "details", label: "Seus dados" },
];

const todayLocalDate = () => new Date().toLocaleDateString("sv-SE");

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const Agendar = () => {
  usePageTitle("Agendar horário — Navalha Barbearia");
  const [searchParams] = useSearchParams();
  const preselectedProfessionalId = searchParams.get("professional") || undefined;

  const { data: services = [], isLoading: loadingServices } = useServices(true);
  const whatsappNumber = useWhatsappNumber();
  const { createAppointment } = useAppointmentMutations();

  const [step, setStep] = useState<Step>("service");
  const [serviceId, setServiceId] = useState(searchParams.get("service") || "");
  const [professionalId, setProfessionalId] = useState("");
  const [date, setDate] = useState(todayLocalDate());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmedAppointment, setConfirmedAppointment] = useState<{
    serviceName: string;
    professionalName: string;
    startsAt: string;
  } | null>(null);

  const selectedService = services.find((s) => s.id === serviceId);
  const { data: professionals = [], isLoading: loadingProfessionals } = useServiceProfessionals(
    serviceId || undefined
  );
  const selectedProfessional = professionals.find((p) => p.id === professionalId);

  /* Chegou com ?service= na URL: pula direto pra escolha de profissional */
  useEffect(() => {
    if (searchParams.get("service") && step === "service" && services.length > 0) {
      setStep("professional");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services.length]);

  /* Chegou com ?professional= na URL (ou o usuário já escolheu o serviço): pré-seleciona
   * esse profissional assim que ele aparecer na lista de quem realiza o serviço escolhido. */
  useEffect(() => {
    if (preselectedProfessionalId && professionals.some((p) => p.id === preselectedProfessionalId)) {
      setProfessionalId(preselectedProfessionalId);
    }
  }, [preselectedProfessionalId, professionals]);

  const { data: slots = [], isLoading: loadingSlots } = useAvailableSlots(
    professionalId || undefined,
    serviceId || undefined,
    date || undefined
  );

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  const goBack = () => {
    const order: Step[] = ["service", "professional", "datetime", "details"];
    const idx = order.indexOf(step);
    if (idx > 0) setStep(order[idx - 1]);
  };

  const handleConfirm = () => {
    if (!serviceId || !professionalId || !selectedSlot) return;
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error("Informe seu nome e telefone.");
      return;
    }
    createAppointment.mutate(
      {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        professionalId,
        serviceId,
        startsAt: selectedSlot,
        notes: notes.trim() || null,
      },
      {
        onSuccess: () => {
          setConfirmedAppointment({
            serviceName: selectedService?.name ?? "",
            professionalName: selectedProfessional?.name ?? "",
            startsAt: selectedSlot,
          });
          setStep("confirmation");
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "";
          toast.error(
            message.includes("no longer available")
              ? "Esse horário acabou de ficar indisponível — escolha outro."
              : "Não foi possível confirmar o agendamento. Tente novamente."
          );
        },
      }
    );
  };

  const whatsappMessage = useMemo(() => {
    if (!confirmedAppointment) return "";
    const when = new Date(confirmedAppointment.startsAt).toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return encodeURIComponent(
      `Olá! Acabei de agendar ${confirmedAppointment.serviceName} com ${confirmedAppointment.professionalName} para ${when}.`
    );
  }, [confirmedAppointment]);

  if (step === "confirmation" && confirmedAppointment) {
    const when = new Date(confirmedAppointment.startsAt).toLocaleString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
    return (
      <main className="pt-32 pb-20 min-h-screen flex items-center">
        <div className="container mx-auto px-4 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground mb-3">Horário reservado</h1>
          <p className="text-muted-foreground mb-8">
            {confirmedAppointment.serviceName} com {confirmedAppointment.professionalName}
            <br />
            <span className="text-foreground font-medium capitalize">{when}</span>
          </p>
          <div className="flex flex-col gap-3">
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-hero justify-center"
              >
                <MessageCircle size={18} className="mr-2" />
                Confirmar pelo WhatsApp
              </a>
            )}
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Voltar ao início
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-32 pb-20 min-h-screen">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-2">
          Agendar horário
        </h1>

        {/* Indicador de etapas */}
        <div className="flex items-center gap-3 mb-10 font-mono text-xs uppercase tracking-wider">
          {STEP_LABELS.map((s, i) => (
            <div key={s.key} className={`flex items-center gap-1.5 ${i <= stepIndex ? "text-primary" : "text-muted-foreground/50"}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="hidden sm:inline">{s.label}</span>
              {i < STEP_LABELS.length - 1 && <span className="mx-1 text-muted-foreground/30">—</span>}
            </div>
          ))}
        </div>

        {step !== "service" && (
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        )}

        {/* ETAPA 1 - SERVIÇO */}
        {step === "service" && (
          <div className="space-y-3">
            {loadingServices ? (
              <p className="text-sm text-muted-foreground">Carregando serviços...</p>
            ) : (
              services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setServiceId(service.id);
                    setProfessionalId("");
                    setSelectedSlot(null);
                    setStep("professional");
                  }}
                  className="w-full flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 text-left transition-all duration-300 hover:border-primary/50 hover:-translate-y-0.5"
                >
                  <div>
                    <h3 className="font-display text-lg font-semibold">{service.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground mt-1">{service.duration_minutes} MIN</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-primary font-medium">R$ {service.price.toFixed(2)}</span>
                    <ArrowRight size={16} className="text-muted-foreground" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ETAPA 2 - PROFISSIONAL */}
        {step === "professional" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {loadingProfessionals ? (
              <p className="text-sm text-muted-foreground col-span-full">Carregando profissionais...</p>
            ) : professionals.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-full">
                Nenhum profissional disponível pra este serviço no momento.
              </p>
            ) : (
              professionals.map((professional) => (
                <button
                  key={professional.id}
                  onClick={() => {
                    setProfessionalId(professional.id);
                    setSelectedSlot(null);
                    setStep("datetime");
                  }}
                  className="rounded-lg border border-border bg-card overflow-hidden text-left transition-all duration-300 hover:border-primary/50 hover:-translate-y-0.5"
                >
                  <div className="aspect-square bg-secondary overflow-hidden">
                    {professional.photo ? (
                      <img src={professional.photo} alt={professional.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-3xl text-muted-foreground">
                        {professional.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="p-3 text-sm font-medium text-center">{professional.name}</p>
                </button>
              ))
            )}
          </div>
        )}

        {/* ETAPA 3 - DATA/HORÁRIO */}
        {step === "datetime" && (
          <div className="space-y-6">
            <div className="space-y-1.5 max-w-[200px]">
              <Label>Data</Label>
              <Input
                type="date"
                min={todayLocalDate()}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSelectedSlot(null);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Horários disponíveis</Label>
              {loadingSlots ? (
                <p className="text-sm text-muted-foreground">Carregando horários...</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum horário livre nesta data — tente outro dia.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.slot_start}
                      onClick={() => {
                        setSelectedSlot(slot.slot_start);
                        setStep("details");
                      }}
                      className="rounded-lg border border-border px-4 py-2 text-sm font-mono transition-all duration-300 hover:border-primary hover:text-primary"
                    >
                      {formatTime(slot.slot_start)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 4 - DADOS DO CLIENTE */}
        {step === "details" && (
          <div className="space-y-5">
            <div className="rounded-lg border border-border bg-card p-4 text-sm">
              <p className="font-medium">{selectedService?.name}</p>
              <p className="text-muted-foreground">
                com {selectedProfessional?.name} —{" "}
                {selectedSlot &&
                  new Date(selectedSlot).toLocaleString("pt-BR", {
                    weekday: "long",
                    day: "2-digit",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input id="phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <button
              onClick={handleConfirm}
              disabled={createAppointment.isPending}
              className="btn-hero w-full justify-center"
            >
              {createAppointment.isPending ? "Confirmando..." : "Confirmar agendamento"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default Agendar;
