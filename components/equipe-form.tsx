"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTeamPerson, saveTeamPerson } from "@/lib/actions";
import type { TeamPerson } from "@/lib/types";

const fieldClass = "mt-1 w-full rounded-2xl border border-purple/15 bg-white px-3 py-2 text-sm text-purple outline-none focus:border-teal";

const roles = ["Recepcionista", "Mestre de Cerimônias", "Mídia", "Gerente", "Assistente", "Freelancer"];

export function EquipeForm({ person }: { person?: TeamPerson }) {
  const router = useRouter();
  const editing = Boolean(person);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(person?.name ?? "");
  const [nickname, setNickname] = useState(person?.nickname ?? "");
  const [role, setRole] = useState(person?.role || "Assistente");
  const [bond, setBond] = useState(person?.bond || "Fixa");
  const [photoName, setPhotoName] = useState("");
  const [whatsapp, setWhatsapp] = useState(person?.whatsapp ?? "");
  const [birthDate, setBirthDate] = useState(person?.birthDate ?? "");
  const [address, setAddress] = useState(person?.address ?? "");
  const [driving, setDriving] = useState(person?.driving ?? "");
  const [shirt, setShirt] = useState(person?.shirt ?? "");
  const [pants, setPants] = useState(person?.pants ?? "");
  const [shoes, setShoes] = useState(person?.shoes ?? "");
  const [pix, setPix] = useState(person?.pix ?? "");
  const [bloodType, setBloodType] = useState(person?.bloodType ?? "");
  const [allergies, setAllergies] = useState(person?.allergies ?? "");
  const [emergencyContact, setEmergencyContact] = useState(person?.emergencyContact ?? "");
  const [notes, setNotes] = useState(person?.notes ?? "");
  const [confirming, setConfirming] = useState(false);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (person) formData.set("id", String(person.id));
    formData.set("name", name);
    formData.set("nickname", nickname);
    formData.set("role", role);
    formData.set("bond", bond);
    formData.set("whatsapp", whatsapp);
    formData.set("birthDate", birthDate);
    formData.set("address", address);
    formData.set("driving", driving);
    formData.set("shirt", shirt);
    formData.set("pants", pants);
    formData.set("shoes", shoes);
    formData.set("pix", pix);
    formData.set("bloodType", bloodType);
    formData.set("allergies", allergies);
    formData.set("emergencyContact", emergencyContact);
    formData.set("notes", notes);
    startTransition(async () => {
      const result = await saveTeamPerson(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(editing ? "Ficha atualizada." : "Pessoa cadastrada na equipe.");
      router.push("/cerimonial/equipe");
      router.refresh();
    });
  }

  function remove() {
    if (!person) return;
    startTransition(async () => {
      const result = await deleteTeamPerson(person.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pessoa apagada da equipe.");
      router.push("/cerimonial/equipe");
      router.refresh();
    });
  }

  return (
    <>
    <form onSubmit={save} className="mt-5 space-y-3 rounded-[1.5rem] bg-white p-5 ring-1 ring-purple/10">
      <div>
        <p className="text-sm font-bold text-purple">Foto</p>
        <div className="mt-2 flex items-center gap-3">
          {person?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#f6eefb] text-lg font-extrabold text-teal">
              {name.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
          <label className="cursor-pointer rounded-full border border-purple/20 px-4 py-2 text-sm font-bold text-purple">
            Escolher foto
            <input
              id="equipe-foto"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")}
            />
          </label>
          <span className="min-w-0 truncate text-sm text-muted-foreground">{photoName || "JPG, PNG ou WebP"}</span>
        </div>
      </div>
      <Field label="Nome" id="equipe-nome">
        <input id="equipe-nome" value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Apelido" id="equipe-apelido">
        <input id="equipe-apelido" value={nickname} onChange={(event) => setNickname(event.target.value)} className={fieldClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Função" id="equipe-funcao">
          <select id="equipe-funcao" value={role} onChange={(event) => setRole(event.target.value)} className={fieldClass}>
            {roles.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Vínculo" id="equipe-vinculo">
          <select id="equipe-vinculo" value={bond} onChange={(event) => setBond(event.target.value)} className={fieldClass}>
            <option>Fixa</option>
            <option>Freelancer</option>
          </select>
        </Field>
      </div>
      <Field label="WhatsApp" id="equipe-whatsapp">
        <input id="equipe-whatsapp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} inputMode="tel" className={fieldClass} />
      </Field>
      <Field label="Nascimento" id="equipe-nascimento">
        <input id="equipe-nascimento" type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Endereço" id="equipe-endereco">
        <textarea id="equipe-endereco" value={address} onChange={(event) => setAddress(event.target.value)} rows={2} className={fieldClass} />
      </Field>
      <Field label="Condução" id="equipe-conducao">
        <input
          id="equipe-conducao"
          value={driving}
          onChange={(event) => setDriving(event.target.value)}
          placeholder="Dirige, carona ou transporte do evento"
          className={fieldClass}
        />
      </Field>
      <fieldset>
        <legend className="text-sm font-bold text-purple">Tamanhos</legend>
        <div className="mt-1 grid gap-3 sm:grid-cols-3">
          <Field label="Blusa" id="equipe-blusa">
            <input id="equipe-blusa" value={shirt} onChange={(event) => setShirt(event.target.value)} placeholder="P" className={fieldClass} />
          </Field>
          <Field label="Calça" id="equipe-calca">
            <input id="equipe-calca" value={pants} onChange={(event) => setPants(event.target.value)} placeholder="38" className={fieldClass} />
          </Field>
          <Field label="Calçado" id="equipe-calcado">
            <input id="equipe-calcado" value={shoes} onChange={(event) => setShoes(event.target.value)} placeholder="36" className={fieldClass} />
          </Field>
        </div>
      </fieldset>
      <Field label="Chave Pix" id="equipe-pix">
        <input id="equipe-pix" value={pix} onChange={(event) => setPix(event.target.value)} className={fieldClass} />
      </Field>
      <Field label="Tipo sanguíneo" id="equipe-sangue">
        <select id="equipe-sangue" value={bloodType} onChange={(event) => setBloodType(event.target.value)} className={fieldClass}>
          <option value="">Não informado</option>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>
      </Field>
      <Field label="Alergias/intolerâncias" id="equipe-alergias">
        <textarea
          id="equipe-alergias"
          value={allergies}
          onChange={(event) => setAllergies(event.target.value)}
          rows={2}
          placeholder="Nenhuma, ou descreva"
          className={fieldClass}
        />
      </Field>
      <Field label="Contato de emergência" id="equipe-emergencia">
        <input
          id="equipe-emergencia"
          value={emergencyContact}
          onChange={(event) => setEmergencyContact(event.target.value)}
          placeholder="Nome e telefone"
          className={fieldClass}
        />
      </Field>
      <Field label="Observações" id="equipe-observacoes">
        <textarea id="equipe-observacoes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={fieldClass} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="rounded-full bg-magenta px-5 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            Apagar
          </button>
        ) : null}
        <button type="submit" disabled={pending} className="rounded-full bg-purple px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {editing ? "Salvar" : "Cadastrar"}
        </button>
      </div>
    </form>
    {confirming && person ? (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-purple/40 px-4">
        <div role="dialog" aria-modal="true" aria-labelledby="apagar-pessoa-titulo" className="w-full max-w-md rounded-[1.5rem] bg-white p-6">
          <h2 id="apagar-pessoa-titulo" className="font-heading text-2xl text-purple italic">
            Apagar
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-purple">Tem certeza que deseja apagar? {person.name} sai da equipe.</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-full px-4 py-2 text-sm font-bold text-purple ring-1 ring-purple/15"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="rounded-full bg-magenta px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Apagar
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-purple" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}
