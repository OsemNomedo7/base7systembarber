/* Form de criação/edição de profissional: dados básicos, serviços que realiza,
 * expediente semanal e bloqueios/folgas. Os dois últimos só ficam disponíveis
 * depois que o profissional já existe (precisam do id). */
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useProfessional, useProfessionalServiceIds } from "@/hooks/useProfessional";
import { useProfessionalMutations } from "@/hooks/useProfessionalMutations";
import { useServices } from "@/hooks/useServices";
import {
  useProfessionalSchedules,
  useProfessionalTimeOff,
  useProfessionalScheduleMutations,
} from "@/hooks/useProfessionalSchedule";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import ImageUploader from "@/components/admin/ImageUploader";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const AdminProfissionalForm = () => {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { data: existing, isLoading } = useProfessional(id);
  const { createProfessional, updateProfessional, setProfessionalServices } = useProfessionalMutations();
  const { data: allServices = [] } = useServices(false);
  const { data: assignedServiceIds } = useProfessionalServiceIds(id);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setPhone(existing.phone ?? "");
    setBio(existing.bio ?? "");
    setPhoto(existing.photo ?? "");
    setIsActive(existing.is_active);
  }, [existing]);

  useEffect(() => {
    if (assignedServiceIds) setSelectedServiceIds(assignedServiceIds);
  }, [assignedServiceIds]);

  if (isEditing && isLoading) {
    return <p className="text-muted-foreground text-sm">Carregando...</p>;
  }

  const toggleService = (serviceId: string) =>
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((s) => s !== serviceId) : [...prev, serviceId]
    );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      phone: phone.trim() || null,
      bio: bio.trim() || null,
      photo: photo || null,
      is_active: isActive,
    };

    const onError = () => toast.error("Falha ao salvar profissional.");
    const saveServices = (professionalId: string) =>
      setProfessionalServices.mutate(
        { professionalId, serviceIds: selectedServiceIds },
        { onError: () => toast.error("Profissional salvo, mas falha ao salvar os serviços dele.") }
      );

    if (isEditing && id) {
      updateProfessional.mutate(
        { id, ...payload },
        {
          onSuccess: () => {
            saveServices(id);
            toast.success("Profissional atualizado.");
          },
          onError,
        }
      );
    } else {
      createProfessional.mutate(payload, {
        onSuccess: (data) => {
          saveServices(data.id);
          toast.success("Profissional criado. Configure o expediente dele abaixo.");
          // Vai direto pra edição (não pra listagem) porque expediente/bloqueios
          // só podem ser configurados depois que o profissional já existe.
          navigate(`/admin/profissionais/${data.id}/editar`);
        },
        onError,
      });
    }
  };

  const saving = createProfessional.isPending || updateProfessional.isPending;

  return (
    <div className="max-w-2xl">
      <Link
        to="/admin/profissionais"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>

      <h1 className="font-serif text-2xl font-semibold mb-6">
        {isEditing ? "Editar profissional" : "Novo profissional"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio / especialidades</Label>
          <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>

        <ImageUploader value={photo} onChange={setPhoto} folder="professionals" label="Foto" />

        <div className="space-y-2">
          <span className="text-sm font-medium block">Serviços que este profissional realiza</span>
          <div className="grid grid-cols-2 gap-2 rounded-lg border border-border p-3">
            {allServices.map((service) => (
              <label key={service.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedServiceIds.includes(service.id)}
                  onCheckedChange={() => toggleService(service.id)}
                />
                {service.name}
              </label>
            ))}
            {allServices.length === 0 && (
              <p className="text-sm text-muted-foreground">Cadastre serviços primeiro.</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onCheckedChange={setIsActive} />
          <Label>Profissional ativo (disponível pra agendamento)</Label>
        </div>

        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar profissional"}
        </Button>
      </form>

      {isEditing && id && (
        <div className="mt-8 space-y-8">
          <ScheduleEditor professionalId={id} />
          <TimeOffEditor professionalId={id} />
        </div>
      )}
    </div>
  );
};

const ScheduleEditor = ({ professionalId }: { professionalId: string }) => {
  const { data: schedules = [] } = useProfessionalSchedules(professionalId);
  const { addSchedule, removeSchedule } = useProfessionalScheduleMutations();

  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const handleAdd = () => {
    if (startTime >= endTime) {
      toast.error("O horário final precisa ser depois do inicial.");
      return;
    }
    addSchedule.mutate(
      {
        professional_id: professionalId,
        weekday: Number(weekday),
        start_time: `${startTime}:00`,
        end_time: `${endTime}:00`,
        is_active: true,
      },
      { onError: () => toast.error("Falha ao adicionar horário.") }
    );
  };

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">Expediente semanal</h2>
      <p className="text-xs text-muted-foreground">
        Dá pra adicionar mais de uma faixa no mesmo dia (ex: manhã e tarde, com intervalo de almoço no meio).
      </p>

      <div className="rounded-lg border border-border divide-y divide-border">
        {schedules.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>
              {WEEKDAY_LABELS[s.weekday]}: {s.start_time.slice(0, 5)} às {s.end_time.slice(0, 5)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                removeSchedule.mutate(
                  { id: s.id, professional_id: professionalId },
                  { onError: () => toast.error("Falha ao remover horário.") }
                )
              }
            >
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ))}
        {schedules.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum horário configurado ainda.</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Dia</Label>
          <Select value={weekday} onValueChange={setWeekday}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((label, index) => (
                <SelectItem key={index} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Início</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <Button type="button" onClick={handleAdd} disabled={addSchedule.isPending}>
          Adicionar
        </Button>
      </div>
    </div>
  );
};

const TimeOffEditor = ({ professionalId }: { professionalId: string }) => {
  const { data: timeOff = [] } = useProfessionalTimeOff(professionalId);
  const { addTimeOff, removeTimeOff } = useProfessionalScheduleMutations();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const handleAdd = () => {
    if (!start || !end) {
      toast.error("Informe início e fim do bloqueio.");
      return;
    }
    const startsAt = new Date(start).toISOString();
    const endsAt = new Date(end).toISOString();
    if (endsAt <= startsAt) {
      toast.error("O fim precisa ser depois do início.");
      return;
    }
    addTimeOff.mutate(
      { professional_id: professionalId, starts_at: startsAt, ends_at: endsAt, reason: reason.trim() || null },
      {
        onSuccess: () => {
          setStart("");
          setEnd("");
          setReason("");
        },
        onError: () => toast.error("Falha ao adicionar bloqueio."),
      }
    );
  };

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-lg font-semibold">Folgas e bloqueios</h2>

      <div className="rounded-lg border border-border divide-y divide-border">
        {timeOff.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span>
              {new Date(t.starts_at).toLocaleString("pt-BR")} até {new Date(t.ends_at).toLocaleString("pt-BR")}
              {t.reason ? ` — ${t.reason}` : ""}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                removeTimeOff.mutate(
                  { id: t.id, professional_id: professionalId },
                  { onError: () => toast.error("Falha ao remover bloqueio.") }
                )
              }
            >
              <Trash2 size={16} className="text-destructive" />
            </Button>
          </div>
        ))}
        {timeOff.length === 0 && (
          <p className="px-3 py-4 text-sm text-muted-foreground">Nenhum bloqueio cadastrado.</p>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label>Início</Label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Fim</Label>
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Motivo (opcional)</Label>
          <Input placeholder="Férias, folga..." value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button type="button" onClick={handleAdd} disabled={addTimeOff.isPending}>
          Adicionar
        </Button>
      </div>
    </div>
  );
};

export default AdminProfissionalForm;
