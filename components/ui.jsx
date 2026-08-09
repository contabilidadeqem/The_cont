"use client";

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

export function QuestionCard({ q, index, onAnswer, onSkip, onAskFollowup, followupLoading, analisando }) {
  const originLabel = { ia: "IA", manual: "Manual", followup: "Follow-up" }[q.origem];
  return (
    <div className={`qcard qcard-${q.status}`}>
      <div className="qcard-head">
        <span className="qnum">{String(index + 1).padStart(2, "0")}</span>
        <span className={`pill pill-${q.origem}`}>{originLabel}</span>
        {q.status === "pulada" && <span className="pill pill-skip">Pulada</span>}
        {analisando && <span className="pill pill-analisando">Analisando resposta…</span>}
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

export function OportunidadeCard({ o }) {
  const confirmado = o.nivelConfianca === "confirmado";
  return (
    <div className="opp-card">
      <div className="opp-head">
        <p className="opp-title">{o.titulo}</p>
        <span className={`badge ${confirmado ? "badge-ok" : "badge-warn"}`}>
          {confirmado ? "Confirmado via busca" : "Estimativa — validar"}
        </span>
      </div>
      <p className="opp-desc">{o.descricao}</p>
      <div className="opp-valor">{o.valorEstimadoAnual}</div>
      <p className="opp-logica"><strong>Como chegamos nesse número:</strong> {o.logicaCalculo}</p>
      <p className="opp-base"><strong>Base legal / fonte:</strong> {o.baseLegal}</p>
    </div>
  );
}

const AVISO_DOCUMENTO =
  "Os valores apresentados são estimativas geradas por IA e devem ser revisados por um especialista tributário antes de qualquer uso com o cliente. Não constituem cálculo definitivo nem aconselhamento tributário formal.";

export function DocumentoPanel({ documento, cliente, onExport }) {
  const oportunidades = documento?.oportunidades || [];
  return (
    <div className="doc-panel print-area">
      <div className="doc-header no-print-flex">
        <div>
          <p className="eyebrow">Documento de estratégia tributária</p>
          <p className="doc-cliente">{cliente.razaoSocial}</p>
        </div>
        <button className="btn btn-teal no-print" onClick={onExport}>Exportar (PDF)</button>
      </div>
      <div className="doc-aviso">{AVISO_DOCUMENTO}</div>
      {oportunidades.length === 0 ? (
        <p className="empty-sub" style={{ padding: "18px 2px" }}>
          Nenhuma oportunidade identificada ainda — continue respondendo o roteiro.
        </p>
      ) : (
        <div className="opp-list">
          {oportunidades.map((o) => <OportunidadeCard key={o.id} o={o} />)}
        </div>
      )}
    </div>
  );
}
