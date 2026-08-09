"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDataCurta, newQuestion } from "@/lib/format";
import { QuestionCard, ReportPanel, MoneyInput } from "@/components/ui";

export default function ReuniaoPage({ params }) {
  const { cnpj, meetingId } = params;
  const [client, setClient] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerandoRoteiro, setGerandoRoteiro] = useState(false);
  const [genError, setGenError] = useState("");
  const [followupLoading, setFollowupLoading] = useState(null);
  const [manualTexto, setManualTexto] = useState("");
  const [gerandoRelatorio, setGerandoRelatorio] = useState(false);
  const [relatorioError, setRelatorioError] = useState("");

  const saveTimer = useRef(null);
  const meetingRef = useRef(null);
  meetingRef.current = meeting;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/meetings/${meetingId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setClient(json.client);
        setMeeting(json);
      } catch {
        setGenError("Não foi possível carregar esta reunião.");
      } finally {
        setLoading(false);
      }
    })();
  }, [meetingId]);

  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perguntas: next.perguntas, documento: next.documento, perfilSnapshot: next.perfilSnapshot }),
        });
      } catch {
        // autosave silencioso — próxima alteração tenta novamente
      }
    }, 500);
  }, [meetingId]);

  const updateMeeting = useCallback((updater) => {
    setMeeting((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persist(next);
      return next;
    });
  }, [persist]);

  const gerarRoteiro = useCallback(async () => {
    setGenError("");
    setGerandoRoteiro(true);
    try {
      const res = await fetch("/api/roteiro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil: meeting.perfilSnapshot }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao gerar roteiro.");
      updateMeeting((prev) => ({ ...prev, perguntas: json.perguntas }));
    } catch (e) {
      setGenError(e.message || "Não foi possível gerar o roteiro agora.");
    } finally {
      setGerandoRoteiro(false);
    }
  }, [meeting, updateMeeting]);

  const onAnswer = (id, texto) => {
    updateMeeting((prev) => ({
      ...prev,
      perguntas: prev.perguntas.map((p) =>
        p.id === id ? { ...p, resposta: texto, status: texto.trim() ? "respondida" : "pendente" } : p
      ),
    }));
  };

  const onSkip = (id) => {
    updateMeeting((prev) => ({
      ...prev,
      perguntas: prev.perguntas.map((p) =>
        p.id === id ? { ...p, status: p.status === "pulada" ? (p.resposta.trim() ? "respondida" : "pendente") : "pulada" } : p
      ),
    }));
  };

  const addManual = () => {
    if (!manualTexto.trim()) return;
    updateMeeting((prev) => ({ ...prev, perguntas: [...prev.perguntas, newQuestion(manualTexto.trim(), "manual")] }));
    setManualTexto("");
  };

  const askFollowup = async (q) => {
    setFollowupLoading(q.id);
    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil: meeting.perfilSnapshot, pergunta: q.texto, resposta: q.resposta }),
      });
      const json = await res.json();
      if (json?.pergunta) {
        updateMeeting((prev) => {
          const idx = prev.perguntas.findIndex((p) => p.id === q.id);
          const novaLista = [...prev.perguntas];
          novaLista.splice(idx + 1, 0, newQuestion(json.pergunta, "followup", q.id));
          return { ...prev, perguntas: novaLista };
        });
      }
    } catch {
      // silencioso
    } finally {
      setFollowupLoading(null);
    }
  };

  // ---- Dados financeiros (faturamento / impostos atuais) ----
  const setFinanceiro = (campo, valor) => {
    updateMeeting((prev) => ({ ...prev, perfilSnapshot: { ...prev.perfilSnapshot, [campo]: valor } }));
  };

  const podeGerarRelatorio =
    Number(meeting?.perfilSnapshot?.faturamentoMensal) > 0 &&
    Number(meeting?.perfilSnapshot?.impostosAtuaisMensal) >= 0 &&
    (meeting?.perguntas || []).some((p) => p.status === "respondida");

  // ---- Fase 3 (revisada): UMA chamada consolidada, disparada manualmente ----
  const gerarRelatorio = async () => {
    setRelatorioError("");
    setGerandoRelatorio(true);
    try {
      const atual = meetingRef.current;
      const perguntasRespondidas = atual.perguntas.filter((p) => p.status === "respondida" && p.resposta.trim());
      const faturamentoMensal = Number(atual.perfilSnapshot.faturamentoMensal) || 0;
      const impostosAtuaisMensal = Number(atual.perfilSnapshot.impostosAtuaisMensal) || 0;
      const perfilParaIA = {
        ...atual.perfilSnapshot,
        faturamentoAnual: faturamentoMensal * 12,
        impostosAtuaisAnual: impostosAtuaisMensal * 12,
      };
      const res = await fetch("/api/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perfil: perfilParaIA, perguntasRespondidas }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao gerar relatório.");
      const novoDocumento = {
        estrategias: json.estrategias,
        comparativoRegimes: json.comparativoRegimes,
        cronograma: json.cronograma,
        referenciaCurta: json.referenciaCurta,
        geradoEm: new Date().toISOString(),
      };
      updateMeeting((prev) => ({ ...prev, documento: novoDocumento }));
    } catch (e) {
      setRelatorioError(e.message || "Não foi possível gerar o relatório agora.");
    } finally {
      setGerandoRelatorio(false);
    }
  };

  const handleExport = async () => {
    const now = new Date().toISOString();
    setMeeting((prev) => ({ ...prev, exportadoEm: now }));
    try {
      await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportadoEm: now }),
      });
    } catch {}
    setTimeout(() => window.print(), 150);
  };

  if (loading) return <div className="shell"><p style={{ color: "#8B9A93" }}>Carregando reunião…</p></div>;
  if (!client || !meeting) return <div className="shell"><p className="error">{genError || "Reunião não encontrada."}</p></div>;

  const perguntas = meeting.perguntas || [];
  const total = perguntas.length;
  const respondidas = perguntas.filter((p) => p.status === "respondida").length;
  const pct = total ? Math.round((respondidas / total) * 100) : 0;
  const temRoteiro = total > 0;

  return (
    <div className="shell shell-wide">
      <header className="topbar no-print">
        <div>
          <Link className="link-back" href={`/clientes/${cnpj}`}>← Voltar para a ficha</Link>
          <h1 className="title">Roteiro de reunião</h1>
          <p className="meeting-date">Reunião de {formatDataCurta(meeting.criadoEm)}</p>
        </div>
      </header>

      <section className="panel panel-profile no-print">
        <p className="eyebrow">Cliente</p>
        <p className="value" style={{ fontFamily: "'Fraunces', serif", fontSize: 18, marginBottom: 8 }}>{client.razaoSocial}</p>
        <div className="profile-pills" style={{ marginBottom: 14 }}>
          <span className="pill pill-info">{meeting.perfilSnapshot.regimeTributario}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.setorAtuacao}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.porte || "porte não informado"}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.localidade}</span>
        </div>
        <div className="field-grid">
          <Field2 label="Faturamento médio mensal">
            <MoneyInput
              value={meeting.perfilSnapshot.faturamentoMensal || 0}
              onChange={(v) => setFinanceiro("faturamentoMensal", v)}
              placeholder="0,00"
            />
          </Field2>
          <Field2 label="Impostos pagos por mês (média)">
            <MoneyInput
              value={meeting.perfilSnapshot.impostosAtuaisMensal || 0}
              onChange={(v) => setFinanceiro("impostosAtuaisMensal", v)}
              placeholder="0,00"
            />
          </Field2>
        </div>
        <p className="financeiro-nota">O sistema calcula o valor anual automaticamente (média mensal × 12) para o relatório.</p>
      </section>

      {!temRoteiro ? (
        <section className="panel no-print" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="empty-title" style={{ color: "var(--ink)" }}>Nenhum roteiro gerado ainda</p>
          <p className="empty-sub" style={{ marginBottom: 18 }}>A IA vai montar perguntas específicas para este regime, setor e porte.</p>
          <button className="btn btn-primary btn-lg" onClick={gerarRoteiro} disabled={gerandoRoteiro}>
            {gerandoRoteiro ? "Gerando roteiro..." : "Gerar roteiro com IA"}
          </button>
          {genError && <p className="error" style={{ marginTop: 12 }}>{genError}</p>}
        </section>
      ) : (
        <div className="roteiro-grid">
          <div className="col-roteiro no-print">
            <div className="progress-row">
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              <span className="progress-label">{respondidas}/{total} respondidas</span>
            </div>
            <div className="qlist">
              {perguntas.map((q, i) => (
                <QuestionCard
                  key={q.id} q={q} index={i}
                  onAnswer={onAnswer} onSkip={onSkip} onAskFollowup={askFollowup}
                  followupLoading={followupLoading}
                />
              ))}
            </div>
            <section className="panel add-manual">
              <p className="eyebrow">Adicionar pergunta própria</p>
              <div className="cnpj-row">
                <input
                  className="input" placeholder="Digite uma pergunta para incluir no roteiro..."
                  value={manualTexto} onChange={(e) => setManualTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addManual()}
                />
                <button className="btn btn-teal" onClick={addManual}>Adicionar</button>
              </div>
            </section>
          </div>
          <div className="col-documento">
            <ReportPanel
              documento={meeting.documento}
              financeiro={meeting.perfilSnapshot}
              cliente={client}
              onGerar={gerarRelatorio}
              gerando={gerandoRelatorio}
              gerarError={relatorioError}
              podeGerar={podeGerarRelatorio}
              onExport={handleExport}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Field2({ label, children }) {
  return (
    <div className="field">
      <div className="field-label-row"><span className="field-label" style={{ color: "#B7C4BC" }}>{label}</span></div>
      {children}
    </div>
  );
}
