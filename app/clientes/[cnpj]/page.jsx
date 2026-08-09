"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCnpj, formatDataCurta } from "@/lib/format";
import { Field } from "@/components/ui";

const REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "Não definido"];

export default function FichaClientePage({ params }) {
  const router = useRouter();
  const [client, setClient] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [regimeTributarioConfirmado, setRegime] = useState("Não definido");
  const [setorAtuacao, setSetor] = useState("");
  const [observacoes, setObs] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [criandoReuniao, setCriandoReuniao] = useState(false);
  const [error, setError] = useState("");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clients/${params.cnpj}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Cliente não encontrado.");
      setClient(json);
      setMeetings(json.meetings || []);
      setRegime(json.regimeTributarioConfirmado);
      setSetor(json.setorAtuacao || "");
      setObs(json.observacoes || "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [params.cnpj]);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${params.cnpj}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regimeTributarioConfirmado, setorAtuacao, observacoes }),
      });
      if (!res.ok) throw new Error("Erro ao salvar alterações.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const novaReuniao = async () => {
    if (!client) return;
    setCriandoReuniao(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: client.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar reunião.");
      router.push(`/clientes/${params.cnpj}/reunioes/${json.id}`);
    } catch (e) {
      setError(e.message);
      setCriandoReuniao(false);
    }
  };

  if (loading) return <div className="shell"><p style={{ color: "#8B9A93" }}>Carregando ficha…</p></div>;
  if (!client) return <div className="shell"><p className="error">{error || "Cliente não encontrado."}</p></div>;

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <Link className="link-back" href="/">← Voltar para a carteira</Link>
          <h1 className="title">Ficha do cliente</h1>
        </div>
        <button className="btn btn-teal" onClick={novaReuniao} disabled={criandoReuniao}>
          {criandoReuniao ? "Criando..." : "+ Nova reunião"}
        </button>
      </header>

      <section className="panel">
        <p className="eyebrow">Ponto de entrada</p>
        <div className="stamp-block">
          <div className="stamp">{formatCnpj(client.cnpj)}</div>
          <span className={`badge ${client.situacaoCadastral === "ATIVA" ? "badge-ok" : "badge-warn"}`}>
            {client.situacaoCadastral || "Situação não informada"}
          </span>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Dados públicos</p>
        <div className="field-grid">
          <Field label="Razão social" source="Pública"><p className="value">{client.razaoSocial || "—"}</p></Field>
          <Field label="Nome fantasia" source="Pública"><p className="value">{client.nomeFantasia || "—"}</p></Field>
          <Field label="Porte" source="Pública"><p className="value">{client.porte || "—"}</p></Field>
          <Field label="Município / UF" source="Pública">
            <p className="value">{client.municipio ? `${client.municipio} / ${client.uf}` : "—"}</p>
          </Field>
          <Field label="CNAE principal" source="Pública"><p className="value">{client.cnaePrincipal || "—"}</p></Field>
          <Field label="Indício de regime (não confirmado)" source="Pública">
            <p className="value">{client.regimeInferido || "—"}</p>
          </Field>
        </div>
      </section>

      <section className="panel">
        <p className="eyebrow">Complemento manual</p>
        <div className="field-grid">
          <Field label="Regime tributário confirmado" source="Manual">
            <select className="input" value={regimeTributarioConfirmado} onChange={(e) => setRegime(e.target.value)}>
              {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Setor de atuação" source="Manual">
            <input className="input" value={setorAtuacao} onChange={(e) => setSetor(e.target.value)} />
          </Field>
        </div>
        <Field label="Observações" source="Manual">
          <textarea className="input textarea" rows={3} value={observacoes} onChange={(e) => setObs(e.target.value)} />
        </Field>
      </section>

      <div className="save-row">
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" onClick={salvar} disabled={saving}>
          {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar alterações"}
        </button>
      </div>

      <section className="panel">
        <div className="hist-head">
          <p className="eyebrow" style={{ margin: 0 }}>Histórico de reuniões</p>
          <span className="hist-count">{meetings.length} registrada{meetings.length === 1 ? "" : "s"}</span>
        </div>
        {meetings.length === 0 ? (
          <p className="empty-sub" style={{ marginTop: 6 }}>
            Nenhuma reunião registrada ainda para este cliente. Clique em "Nova reunião" para começar.
          </p>
        ) : (
          <div className="hist-list">
            {meetings.map((m) => (
              <Link key={m.id} className="hist-card" href={`/clientes/${params.cnpj}/reunioes/${m.id}`}>
                <span className="hist-date">{formatDataCurta(m.criadoEm)}</span>
                <span className="hist-meta">{m.respondidas}/{m.total} perguntas · {m.oportunidadesCount} oportunidade{m.oportunidadesCount === 1 ? "" : "s"}</span>
                <span className="hist-regime">{m.regimeNoMomento}</span>
                {m.exportadoEm && <span className="hist-exported">Exportada</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
