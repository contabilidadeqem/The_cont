"use client";

import { useState, useEffect } from "react";
import { formatBRL, formatBRL2, formatBRLMil, formatPct, centsToNumber, formatMoneyInput } from "@/lib/format";

export function Field({ label, source, children }) {
  return (
    <div className="field">
      <div className="field-label-row">
        <span className="field-label">{label}</span>
        {source && <span className={`tag tag-${source === "Pública" ? "pub" : "man"}`}>{source}</span>}
      </div>
      {children}
    </div>
  );
}

// Input de moeda com máscara: usuário digita só números, exibição sempre em
// "1.234,56" (2 casas decimais), valor repassado ao pai já como número em reais.
export function MoneyInput({ value, onChange, placeholder }) {
  const [digits, setDigits] = useState(() => String(Math.round((Number(value) || 0) * 100)));

  useEffect(() => {
    const asCents = String(Math.round((Number(value) || 0) * 100));
    setDigits((prev) => (centsToNumber(prev) === Number(value) ? prev : asCents));
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
    setDigits(raw);
    onChange(centsToNumber(raw));
  };

  return (
    <div className="money-field">
      <span className="money-prefix">R$</span>
      <input
        className="input money-input"
        inputMode="decimal"
        placeholder={placeholder}
        value={formatMoneyInput(centsToNumber(digits))}
        onChange={handleChange}
      />
    </div>
  );
}

export function QuestionCard({ q, index, onAnswer, onSkip, onAskFollowup, followupLoading }) {
  const originLabel = { ia: "IA", manual: "Manual", followup: "Follow-up" }[q.origem];
  return (
    <div className={`qcard qcard-${q.status}`}>
      <div className="qcard-head">
        <span className="qnum">{String(index + 1).padStart(2, "0")}</span>
        <span className={`pill pill-${q.origem}`}>{originLabel}</span>
        {q.status === "pulada" && <span className="pill pill-skip">Pulada</span>}
      </div>
      <p className="qtext">{q.texto}</p>
      {q.status !== "pulada" ? (
        <>
          <textarea
            className="input textarea"
            rows={2}
            placeholder="Resposta do cliente..."
            value={q.resposta}
            onChange={(e) => onAnswer(q.id, e.target.value)}
          />
          <div className="qactions">
            <button className="link-action" onClick={() => onSkip(q.id)}>Pular pergunta</button>
            {q.resposta.trim().length > 3 && (
              <button
                className="link-action link-action-gold"
                onClick={() => onAskFollowup(q)}
                disabled={followupLoading === q.id}
              >
                {followupLoading === q.id ? "Analisando resposta..." : "+ Sugerir pergunta de acompanhamento"}
              </button>
            )}
          </div>
        </>
      ) : (
        <button className="link-action" onClick={() => onSkip(q.id)}>Desfazer pular</button>
      )}
    </div>
  );
}

// ---- Fase 3 (revisada): comparativo financeiro + gráficos + regimes + cronograma ----

function BarPair({ labelA, valueA, labelB, valueB, colorA = "#B4B0A0", colorB = "var(--ink)" }) {
  const max = Math.max(valueA, valueB, 1);
  const h = 110;
  const barH = (v) => Math.max(4, (v / max) * h);
  return (
    <svg viewBox="0 0 220 150" className="chart-svg" role="img" aria-label={`${labelA} vs ${labelB}`}>
      <line x1="10" y1={h + 20} x2="210" y2={h + 20} stroke="var(--line)" strokeWidth="1" />
      <rect x="40" y={h + 20 - barH(valueA)} width="50" height={barH(valueA)} rx="2" style={{ fill: colorA }} />
      <text x="65" y={h + 20 - barH(valueA) - 8} textAnchor="middle" className="chart-value">{formatBRL(valueA)}</text>
      <text x="65" y={h + 36} textAnchor="middle" className="chart-label">{labelA}</text>

      <rect x="130" y={h + 20 - barH(valueB)} width="50" height={barH(valueB)} rx="2" style={{ fill: colorB }} />
      <text x="155" y={h + 20 - barH(valueB) - 8} textAnchor="middle" className="chart-value">{formatBRL(valueB)}</text>
      <text x="155" y={h + 36} textAnchor="middle" className="chart-label">{labelB}</text>
    </svg>
  );
}

function ProjectionChart({ economiaAnual }) {
  const anos = [1, 2, 3];
  const valores = anos.map((a) => economiaAnual * a);
  const max = Math.max(...valores, 1);
  const h = 110;
  const barW = 44;
  const gap = 26;
  const barH = (v) => Math.max(4, (v / max) * h);
  return (
    <svg viewBox="0 0 220 150" className="chart-svg" role="img" aria-label="Projeção de economia acumulada em 3 anos">
      <line x1="10" y1={h + 20} x2="210" y2={h + 20} stroke="var(--line)" strokeWidth="1" />
      {anos.map((ano, i) => {
        const x = 20 + i * (barW + gap);
        const v = valores[i];
        return (
          <g key={ano}>
            <rect x={x} y={h + 20 - barH(v)} width={barW} height={barH(v)} rx="2" style={{ fill: "var(--accent-deep)" }} />
            <text x={x + barW / 2} y={h + 20 - barH(v) - 8} textAnchor="middle" className="chart-value">{formatBRL(v)}</text>
            <text x={x + barW / 2} y={h + 36} textAnchor="middle" className="chart-label">Ano {ano}</text>
          </g>
        );
      })}
    </svg>
  );
}

function EstrategiaRow({ e }) {
  const confirmado = e.nivelConfianca === "confirmado";
  return (
    <div className="strat-row">
      <div className="strat-main">
        <p className="strat-title">
          {e.titulo}
          <span className={`badge badge-inline ${confirmado ? "badge-ok" : "badge-warn"}`}>
            {confirmado ? "confirmado" : "estimativa"}
          </span>
        </p>
        <p className="strat-resumo">{e.resumo}</p>
        {e.valorRetroativo ? (
          <p className="strat-retro">+ {formatBRL(e.valorRetroativo)} retroativo{e.anosRetroativos ? ` (até ${e.anosRetroativos} anos)` : ""}</p>
        ) : null}
      </div>
      <div className="strat-valor">{formatBRL(e.economiaAnualEstimada)}<span>/ano</span></div>
    </div>
  );
}

function RegimeCard({ r, atual }) {
  return (
    <div className={`regime-card ${atual ? "regime-atual" : ""} ${!r.aplicavel ? "regime-inaplicavel" : ""}`}>
      <div className="regime-head">
        <span className="regime-nome">{r.regime}</span>
        {atual && <span className="pill pill-manual">Regime atual</span>}
      </div>
      {r.aplicavel ? (
        <p className="regime-valor">{r.impostoAnualEstimado != null ? formatBRL(r.impostoAnualEstimado) : "—"}<span>/ano</span></p>
      ) : (
        <p className="regime-valor regime-na">Não aplicável</p>
      )}
      {r.observacao && <p className="regime-obs">{r.observacao}</p>}
    </div>
  );
}

const URGENCIA_LABEL = { alta: "Urgência alta", media: "Urgência média", baixa: "Urgência baixa" };

function CronogramaBloco({ itensPorMes }) {
  return (
    <div className="cronograma-row">
      {[1, 2, 3].map((mes) => (
        <div key={mes} className="cronograma-col">
          <p className="cronograma-mes">Mês {mes}</p>
          {(itensPorMes[mes] || []).length === 0 ? (
            <p className="cronograma-vazio">—</p>
          ) : (
            itensPorMes[mes].map((item, i) => (
              <div key={i} className="cronograma-item">
                <p className="cronograma-acao">{item.acao}</p>
                <span className={`urg urg-${item.urgencia}`}>{URGENCIA_LABEL[item.urgencia]}</span>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

const AVISO_CURTO =
  "Estimativas geradas por IA para revisão de um especialista antes de qualquer uso com o cliente — não são cálculo definitivo.";

export function ReportPanel({ documento, financeiro, cliente, onGerar, gerando, gerarError, podeGerar, onExport }) {
  const temRelatorio = !!documento?.estrategias;
  const estrategias = documento?.estrategias || [];
  const comparativoRegimes = documento?.comparativoRegimes || [];
  const cronograma = documento?.cronograma || [];

  const faturamentoAnual = (Number(financeiro.faturamentoMensal) || 0) * 12;
  const impostosAtuaisAnual = (Number(financeiro.impostosAtuaisMensal) || 0) * 12;

  const confirmadas = estrategias.filter((e) => e.nivelConfianca === "confirmado");
  const estimativas = estrategias.filter((e) => e.nivelConfianca !== "confirmado");
  const ganhoConfirmadoAnual = confirmadas.reduce((s, e) => s + (e.economiaAnualEstimada || 0), 0);
  const ganhoEstimadoAnual = estimativas.reduce((s, e) => s + (e.economiaAnualEstimada || 0), 0);
  const economiaTotalAnual = ganhoConfirmadoAnual + ganhoEstimadoAnual;
  const retroativoTotal = estrategias.reduce((s, e) => s + (e.valorRetroativo || 0), 0);
  const retroativoAnosMax = estrategias.reduce((m, e) => Math.max(m, e.anosRetroativos || 0), 0);

  const impostosProjetados = Math.max(0, impostosAtuaisAnual - economiaTotalAnual);
  const cargaAtual = faturamentoAnual ? (impostosAtuaisAnual / faturamentoAnual) * 100 : 0;
  const cargaProjetada = faturamentoAnual ? (impostosProjetados / faturamentoAnual) * 100 : 0;
  const perdaMensal = economiaTotalAnual / 12;

  const itensPorMes = { 1: [], 2: [], 3: [] };
  cronograma.forEach((c) => { if (itensPorMes[c.mes]) itensPorMes[c.mes].push(c); });

  const regimeAtualNome = financeiro.regimeTributario;

  return (
    <div className="doc-panel print-area">
      <div className="report-masthead">
        <div className="report-masthead-top">
          <span className="brand-the">the</span>
          <span className="brand-cont">cont<span className="brand-dot">.</span></span>
          {temRelatorio && <button className="btn btn-ghost-invert no-print" onClick={onExport}>Exportar (PDF)</button>}
        </div>
        <p className="eyebrow" style={{ color: "var(--accent)", margin: "0 0 2px" }}>Relatório de estratégia tributária</p>
        <p className="report-cliente">{cliente.razaoSocial}</p>
      </div>
      <div className="doc-aviso">{AVISO_CURTO}</div>

      {!temRelatorio ? (
        <div className="no-print" style={{ textAlign: "center", padding: "10px 2px 6px" }}>
          <p className="empty-sub" style={{ marginBottom: 14 }}>
            Preencha faturamento e impostos médios mensais, responda o roteiro, e gere o relatório consolidado — uma
            única chamada de IA no final.
          </p>
          <button className="btn btn-primary btn-lg" onClick={onGerar} disabled={!podeGerar || gerando}>
            {gerando ? "Gerando relatório..." : "Gerar relatório consolidado"}
          </button>
          {gerarError && <p className="error" style={{ marginTop: 10 }}>{gerarError}</p>}
        </div>
      ) : (
        <>
          <p className="resumo-executivo">
            <strong>{cliente.razaoSocial}</strong> paga {formatBRLMil(impostosAtuaisAnual)}/ano em impostos. Com
            ajustes simples e comprovados legalmente, esse valor cai para {formatBRLMil(impostosProjetados)}. Isso é{" "}
            <strong>{formatBRLMil(economiaTotalAnual)} de lucro a mais já no primeiro ano</strong>, sem mudar a
            operação da empresa.
          </p>

          <div className="ganho-row">
            <div className="ganho-card ganho-garantido">
              <span className="kpi-label">Ganho garantido / ano</span>
              <span className="kpi-value">{formatBRL(ganhoConfirmadoAnual)}</span>
              {retroativoTotal > 0 && (
                <span className="ganho-retro">+ {formatBRL(retroativoTotal)} retroativo{retroativoAnosMax ? ` (até ${retroativoAnosMax} anos)` : ""}</span>
              )}
            </div>
            <div className="ganho-card ganho-estimado">
              <span className="kpi-label">Ganho a validar em diagnóstico / ano</span>
              <span className="kpi-value">{formatBRL(ganhoEstimadoAnual)}</span>
            </div>
          </div>

          <div className="kpi-row">
            <div className="kpi-card">
              <span className="kpi-label">Faturamento anual</span>
              <span className="kpi-value">{formatBRL(faturamentoAnual)}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Impostos hoje</span>
              <span className="kpi-value">{formatBRL(impostosAtuaisAnual)}</span>
              <span className="kpi-sub">{formatPct(cargaAtual)} do faturamento</span>
            </div>
            <div className="kpi-card kpi-highlight">
              <span className="kpi-label">Economia estimada</span>
              <span className="kpi-value">{formatBRL(economiaTotalAnual)}<span className="kpi-unit">/ano</span></span>
              <span className="kpi-sub">carga cai para {formatPct(cargaProjetada)}</span>
            </div>
          </div>

          <div className="charts-row">
            <div>
              <p className="chart-title">Impostos: hoje vs. com a estratégia</p>
              <BarPair labelA="Hoje" valueA={impostosAtuaisAnual} labelB="Projetado" valueB={impostosProjetados} />
            </div>
            <div>
              <p className="chart-title">Economia acumulada</p>
              <ProjectionChart economiaAnual={economiaTotalAnual} />
            </div>
          </div>

          {economiaTotalAnual > 0 && (
            <div className="custo-nao-agir">
              <p>
                <strong>Custo de não agir:</strong> enquanto isso não for corrigido, a empresa deixa de ganhar
                aproximadamente <strong>{formatBRL(perdaMensal)}/mês</strong> — {formatBRL(economiaTotalAnual)}/ano.
              </p>
            </div>
          )}

          {comparativoRegimes.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: 6 }}>Comparativo de regimes tributários</p>
              <div className="regime-row">
                {comparativoRegimes.map((r) => <RegimeCard key={r.regime} r={r} atual={r.regime === regimeAtualNome} />)}
              </div>
            </>
          )}

          <p className="eyebrow" style={{ marginTop: 6 }}>Estratégias identificadas</p>
          <div className="strat-list">
            {estrategias.map((e, i) => <EstrategiaRow key={i} e={e} />)}
          </div>

          {cronograma.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginTop: 14 }}>Cronograma de implementação (30/60/90 dias)</p>
              <CronogramaBloco itensPorMes={itensPorMes} />
            </>
          )}

          {documento.referenciaCurta && <p className="doc-referencia">{documento.referenciaCurta}</p>}

          <button className="btn btn-teal no-print" style={{ marginTop: 16 }} onClick={onGerar} disabled={gerando}>
            {gerando ? "Gerando..." : "Gerar de novo (substitui o relatório atual)"}
          </button>
          {gerarError && <p className="error" style={{ marginTop: 10 }}>{gerarError}</p>}
        </>
      )}
    </div>
  );
}
