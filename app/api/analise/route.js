import { NextResponse } from "next/server";
import { callClaude, parseAiJson } from "@/lib/anthropic";

// Fase 3 (revisada): UMA única chamada consolidada ao final da reunião, em vez de
// uma chamada por resposta. Reduz drasticamente o consumo de créditos de API e
// concentra o uso de busca na web numa única passada. O relatório é enxuto,
// pensado para leitura do empresário — sem parágrafos de base legal por item.
const SYS_RELATORIO = `Você é um consultor tributário brasileiro que resume, de forma consolidada, o diagnóstico de uma reunião completa com um cliente.
Você vai receber o perfil da empresa (regime, setor, porte, localidade), o faturamento anual informado, os impostos anuais atualmente pagos, e a lista de perguntas e respostas da reunião.
Você TEM acesso a busca na web — use-a com moderação, apenas para confirmar a existência ou o percentual de um benefício central antes de estimar a economia dele. Não busque para cada item; busque só o essencial.
Identifique as estratégias de redução tributária mais relevantes e realistas para este caso — no máximo 6, evite estratégias triviais ou de impacto insignificante.
Escreva para um empresário, não para um advogado: linguagem direta e comercial, sem citar dispositivos legais no corpo do texto, sem parágrafos longos. Cada estratégia deve ter no máximo 2 frases curtas.
Se não houver dados suficientes para estimar a economia de uma estratégia com alguma segurança, não a inclua.
Responda APENAS com este JSON, sem markdown, sem texto antes ou depois:
{"estrategias": [{"titulo": "nome curto e comercial da estratégia", "resumo": "1-2 frases simples explicando o que muda na prática para o caixa da empresa", "economiaAnualEstimada": 00000, "nivelConfianca": "confirmado" ou "estimativa"}], "referenciaCurta": "uma frase só (opcional) citando a fonte mais importante, ou string vazia se não fizer diferença"}
Os valores de economiaAnualEstimada são números puros em reais, sem formatação, sem símbolo R$, sem texto.`;

export async function POST(request) {
  const { perfil, perguntasRespondidas } = await request.json();

  if (!Array.isArray(perguntasRespondidas) || perguntasRespondidas.length === 0) {
    return NextResponse.json({ error: "Nenhuma resposta preenchida ainda." }, { status: 400 });
  }

  try {
    const payload = {
      perfil,
      perguntasERespostas: perguntasRespondidas.map((p) => ({ pergunta: p.texto, resposta: p.resposta })),
    };
    const raw = await callClaude(SYS_RELATORIO, JSON.stringify(payload), { useWebSearch: true });
    const parsed = parseAiJson(raw);
    const estrategias = Array.isArray(parsed?.estrategias)
      ? parsed.estrategias
          .filter((e) => e && e.titulo && Number.isFinite(Number(e.economiaAnualEstimada)))
          .map((e) => ({
            titulo: e.titulo,
            resumo: e.resumo || "",
            economiaAnualEstimada: Number(e.economiaAnualEstimada),
            nivelConfianca: e.nivelConfianca === "confirmado" ? "confirmado" : "estimativa",
          }))
      : [];

    return NextResponse.json({
      estrategias,
      referenciaCurta: parsed?.referenciaCurta || "",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Falha ao gerar o relatório." }, { status: 502 });
  }
}
