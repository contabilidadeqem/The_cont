"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCnpj, onlyDigits, isValidCnpj } from "@/lib/format";
import { Field } from "@/components/ui";

const REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real", "Não definido"];

export default function NovoClientePage() {
  const router = useRouter();
  const [cnpjInput, setCnpjInput] = useState("");
  const [dados, setDados] = useState(null);
  const [regimeTributarioConfirmado, setRegime] = useState("Não definido");
  const [setorAtuacao, setSetor] = useState("");
  const [observacoes, setObs] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const buscar = async () => {
    const digits = onlyDigits(cnpjInput);
    if (!isValidCnpj(digits)) {
      setError("CNPJ inválido. Confira os dígitos e tente novamente.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/cnpj?cnpj=${digits}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao consultar o CNPJ.");
      setDados(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const salvar = async () => {
    if (!dados) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...dados, regimeTributarioConfirmado, setorAtuacao, observacoes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar.");
      router.push(`/clientes/${json.cnpj}`);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <Link className="link-back" href="/">← Voltar para a carteira</Link>
          <h1 className="title">Novo cliente</h1>
        </div>
      </header>

      <section className="panel">
        <p className="eyebrow">Ponto de entrada</p>
        <div className="cnpj-row">
          <input
            className="cnpj-input"
            placeholder="00.000.000/0000-00"
            value={formatCnpj(cnpjInput)}
            onChange={(e) => setCnpjInput(e.target.value)}
          />
          <button className="btn btn-primary" onClick={buscar} disabled={loading}>
            {loading ? "Consultando..." : "Buscar dados públicos"}
          </button>
        </div>
        {dados && (
          <div className="stamp-block">
            <div className="stamp">{formatCnpj(dados.cnpj)}</div>
            <span className={`badge ${dados.situacaoCadastral === "ATIVA" ? "badge-ok" : "badge-warn"}`}>
              {dados.situacaoCadastral || "Situação não informada"}
            </span>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </section>

      {dados && (
        <>
          <section className="panel">
            <p className="eyebrow">Dados públicos</p>
            <div className="field-grid">
              <Field label="Razão social" source="Pública"><p className="value">{dados.razaoSocial || "—"}</p></Field>
              <Field label="Nome fantasia" source="Pública"><p className="value">{dados.nomeFantasia || "—"}</p></Field>
              <Field label="Porte" source="Pública"><p className="value">{dados.porte || "—"}</p></Field>
              <Field label="Município / UF" source="Pública">
                <p className="value">{dados.municipio ? `${dados.municipio} / ${dados.uf}` : "—"}</p>
              </Field>
              <Field label="CNAE principal" source="Pública"><p className="value">{dados.cnaePrincipal || "—"}</p></Field>
              <Field label="Indício de regime (não confirmado)" source="Pública">
                <p className="value">{dados.regimeInferido || "—"}</p>
              </Field>
            </div>
            {dados.cnaesSecundarios?.length > 0 && (
              <Field label="CNAEs secundários" source="Pública">
                <ul className="cnae-list">{dados.cnaesSecundarios.map((c, i) => <li key={i}>{c}</li>)}</ul>
              </Field>
            )}
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
                <input className="input" placeholder="Ex: clínica odontológica, e-commerce, indústria têxtil..."
                  value={setorAtuacao} onChange={(e) => setSetor(e.target.value)} />
              </Field>
            </div>
            <Field label="Observações" source="Manual">
              <textarea className="input textarea" rows={3} placeholder="Anotações livres sobre o cliente..."
                value={observacoes} onChange={(e) => setObs(e.target.value)} />
            </Field>
          </section>

          <div className="save-row">
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary btn-lg" onClick={salvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar cadastro"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
