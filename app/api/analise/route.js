import { NextResponse } from "next/server";
import { callClaude, parseAiJson } from "@/lib/anthropic";

// Fase 3 (revisada): UMA chamada consolidada ao final da reunião.
// Agora também retorna: comparativo entre regimes tributários, ganhos retroativos
// (quando aplicável, sujeitos ao prazo prescricional tributário — geralmente até
// 5 anos no Brasil) e um cronograma de implementação em 30/60/90 dias.
const SYS_RELATORIO = `Você é um consultor tributário brasileiro que resume, de forma consolidada, o diagnóstico de uma reunião completa com um cliente.
Você vai receber o perfil da empresa (regime atual, setor, porte, localidade), o faturamento anual e os impostos anuais atualmente pagos (já calculados a partir da média mensal informada pelo cliente), e a lista de perguntas e respostas da reunião.
Você TEM acesso a busca na web — use-a com moderação, apenas para confirmar a existência ou o percentual de um benefício central, ou o teto de faturamento de um regime, antes de estimar valores. Não busque para cada item; busque só o essencial.

Escreva para um empresário, não para um advogado: linguagem direta e comercial, sem citar dispositivos legais no corpo do texto, sem parágrafos longos.

Sua resposta deve conter 4 partes, todas no mesmo JSON:

1. "estrategias": no máximo 6, as mais relevantes e realistas. Cada uma:
   - "titulo": nome curto e comercial
   - "resumo": 1-2 frases simples explicando o que muda na prática para o caixa da empresa
   - "economiaAnualEstimada": economia RECORRENTE por ano, a partir de agora, número puro em reais
   - "nivelConfianca": "confirmado" (você verificou/tem alta segurança) ou "estimativa"
   - "valorRetroativo": se essa estratégia permitir recuperar valores pagos a mais no passado (ex: reenquadramento retroativo, créditos não aproveitados), o valor total estimado recuperável, número puro em reais. Caso não se aplique, use null.
   - "anosRetroativos": quantos anos retroativos essa recuperação cobre (no Brasil, o prazo prescricional tributário costuma ser de até 5 anos — não invente prazo maior sem confirmar). Use null se valorRetroativo for null.
   Se não houver dados suficientes para estimar uma economia com alguma segurança, não inclua a estratégia.

2. "comparativoRegimes": um array com exatamente estes 3 regimes: "Simples Nacional", "Lucro Presumido", "Lucro Real". Para cada um:
   - "regime": o nome
   - "aplicavel": true/false — false se o faturamento ou o setor tornarem esse regime inelegível (ex: Simples Nacional tem teto de faturamento por volta de R$ 4,8 milhões/ano e restrições por atividade)
   - "impostoAnualEstimado": estimativa do imposto anual total nesse regime para esta empresa, número puro em reais, ou null se não for possível estimar ou não for aplicável
   - "observacao": 1 frase curta (ex: por que é ou não vantajoso, ou por que não é aplicável)
   Marque o regime atual da empresa claramente dentro da observação quando for o caso.

3. "cronograma": lista de ações organizadas em até 3 meses (30/60/90 dias), cada uma:
   - "mes": 1, 2 ou 3
   - "acao": nome curto da ação (ex: "Correção do enquadramento tributário")
   - "urgencia": "alta", "media" ou "baixa"
   No máximo 2 ações por mês. Baseie isso nas estratégias identificadas, priorizando as de maior impacto e mais simples de implementar primeiro.

4. "referenciaCurta": uma frase só (opcional), citando a fonte mais importante, ou string vazia.

Responda APENAS com este JSON, sem markdown, sem texto antes ou depois:
{"estrategias": [...], "comparativoRegimes": [...], "cronograma": [...], "referenciaCurta": "..."}`;

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

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
          .filter((e) => e && e.titulo && num(e.economiaAnualEstimada) !== null)
          .map((e) => ({
            titulo: e.titulo,
            resumo: e.resumo || "",
            economiaAnualEstimada: num(e.economiaAnualEstimada),
            nivelConfianca: e.nivelConfianca === "confirmado" ? "confirmado" : "estimativa",
            valorRetroativo: num(e.valorRetroativo),
            anosRetroativos: num(e.anosRetroativos),
          }))
      : [];

    const REGIMES_ESPERADOS = ["Simples Nacional", "Lucro Presumido", "Lucro Real"];
    const comparativoRegimes = REGIMES_ESPERADOS.map((nome) => {
      const found = Array.isArray(parsed?.comparativoRegimes)
        ? parsed.comparativoRegimes.find((r) => r?.regime === nome)
        : null;
      return {
        regime: nome,
        aplicavel: found?.aplicavel !== false,
        impostoAnualEstimado: num(found?.impostoAnualEstimado),
        observacao: found?.observacao || "",
      };
    });

    const cronograma = Array.isArray(parsed?.cronograma)
      ? parsed.cronograma
          .filter((c) => c && c.acao && [1, 2, 3].includes(Number(c.mes)))
          .map((c) => ({
            mes: Number(c.mes),
            acao: c.acao,
            urgencia: ["alta", "media", "baixa"].includes(c.urgencia) ? c.urgencia : "media",
          }))
      : [];

    return NextResponse.json({
      estrategias,
      comparativoRegimes,
      cronograma,
      referenciaCurta: parsed?.referenciaCurta || "",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Falha ao gerar o relatório." }, { status: 502 });
  }
}
