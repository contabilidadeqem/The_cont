"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { formatDataCurta, newQuestion, genId } from "@/lib/format";
import { QuestionCard, DocumentoPanel } from "@/components/ui";

export default function ReuniaoPage({ params }) {
  const { cnpj, meetingId } = params;
  const [client, setClient] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [genError, setGenError] = useState("");
  const [followupLoading, setFollowupLoading] = useState(null);
  const [analisandoIds, setAnalisandoIds] = useState({});
  const [manualTexto, setManualTexto] = useState("");

  const saveTimer = useRef(null);
  const analiseTimers = useRef({});
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

  // ---- autosave (debounce) das perguntas + documento ----
  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ perguntas: next.perguntas, documento: next.documento }),
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
    setGerando(true);
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
      setGerando(false);
    }
  }, [meeting, updateMeeting]);

  const runAnalysis = useCallback(async (questionId) => {
    const atual = meetingRef.current;
    const q = atual?.perguntas?.find((p) => p.id === questionId);
    if (!q) return;
    const texto = q.resposta.trim();
    if (texto.length < 4 || texto === q.analisadoResposta) return;

    setAnalisandoIds((prev) => ({ ...prev, [questionId]: true }));
    try {
      const jaIdentificadas = (atual.documento?.oportunidades || []).map((o) => o.titulo);
      const res = await fetch("/api/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          perfil: atual.perfilSnapshot,
          pergunta: q.texto,
          resposta: texto,
          oportunidadesJaIdentificadas: jaIdentificadas,
        }),
      });
      const json = await res.json();
      const novas = Array.isArray(json?.oportunidades) ? json.oportunidades : [];

      updateMeeting((prev) => {
        const perguntasAtualizadas = prev.perguntas.map((p) =>
          p.id === questionId ? { ...p, analisadoResposta: texto } : p
        );
        if (novas.length === 0) return { ...prev, perguntas: perguntasAtualizadas };
        return {
          ...prev,
          perguntas: perguntasAtualizadas,
          documento: {
            oportunidades: [...(prev.documento?.oportunidades || []), ...novas],
            atualizadoEm: new Date().toISOString(),
          },
        };
      });
    } catch {
      // falha silenciosa — a reunião continua normalmente
    } finally {
      setAnalisandoIds((prev) => {
        const n = { ...prev };
        delete n[questionId];
        return n;
      });
    }
  }, [updateMeeting]);

  const scheduleAnalysis = useCallback((questionId) => {
    if (analiseTimers.current[questionId]) clearTimeout(analiseTimers.current[questionId]);
    analiseTimers.current[questionId] = setTimeout(() => runAnalysis(questionId), 1400);
  }, [runAnalysis]);

  const onAnswer = (id, texto) => {
    updateMeeting((prev) => ({
      ...prev,
      perguntas: prev.perguntas.map((p) =>
        p.id === id ? { ...p, resposta: texto, status: texto.trim() ? "respondida" : "pendente" } : p
      ),
    }));
    if (texto.trim().length >= 4) scheduleAnalysis(id);
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
        <div className="profile-pills">
          <span className="pill pill-info">{meeting.perfilSnapshot.regimeTributario}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.setorAtuacao}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.porte || "porte não informado"}</span>
          <span className="pill pill-info">{meeting.perfilSnapshot.localidade}</span>
        </div>
      </section>

      {!temRoteiro ? (
        <section className="panel no-print" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p className="empty-title" style={{ color: "var(--ink)" }}>Nenhum roteiro gerado ainda</p>
          <p className="empty-sub" style={{ marginBottom: 18 }}>A IA vai montar perguntas específicas para este regime, setor e porte.</p>
          <button className="btn btn-primary btn-lg" onClick={gerarRoteiro} disabled={gerando}>
            {gerando ? "Gerando roteiro..." : "Gerar roteiro com IA"}
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
                  followupLoading={followupLoading} analisando={!!analisandoIds[q.id]}
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
            <DocumentoPanel documento={meeting.documento} cliente={client} onExport={handleExport} />
          </div>
        </div>
      )}
    </div>
  );
}
