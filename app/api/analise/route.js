import { NextResponse } from "next/server";
import { callClaude, parseAiJson } from "@/lib/anthropic";
import { genId } from "@/lib/format";

const SYS_ANALISE = `Você é um especialista tributário brasileiro analisando, ao vivo durante uma reunião, as respostas de um cliente para identificar oportunidades de redução tributária federal, estadual ou municipal.
Você TEM acesso a busca na web. Use-a sempre que precisar confirmar um dado específico — alíquota, existência de um benefício, requisito de elegibilidade, número de lei/decreto/norma — antes de incluir uma oportunidade no documento.
Nunca apresente um dado como confirmado sem ter confirmado. Se não conseguir confirmar via busca, ainda pode incluir a oportunidade, mas com nivelConfianca "estimativa".
Você vai receber: perfil da empresa, a pergunta feita, a resposta do cliente, e as oportunidades já identificadas nesta reunião (para não duplicar nem repetir).
Se a resposta indicar uma ou mais oportunidades tributárias novas, reais e relevantes, responda com um objeto JSON no formato:
{"oportunidades": [{"titulo": "título curto", "descricao": "descrição da oportunidade/benefício", "valorEstimadoAnual": "R$ ... (valor aproximado ou faixa)", "logicaCalculo": "premissa do cálculo em 1-2 frases, explicando de onde veio o número", "baseLegal": "lei, decreto, norma específica, ou a fonte usada na busca", "nivelConfianca": "confirmado" ou "estimativa"}]}
Se a resposta não indicar nenhuma oportunidade nova, responda {"oportunidades": []}.
IMPORTANTE: mesmo que você faça buscas antes, a ÚLTIMA coisa que você escreve deve ser APENAS esse JSON — sem markdown, sem texto antes ou depois dele.`;

export async function POST(request) {
  const { perfil, pergunta, resposta, oportunidadesJaIdentificadas } = await request.json();
  try {
    const raw = await callClaude(
      SYS_ANALISE,
      JSON.stringify({ perfil, pergunta, resposta, oportunidadesJaIdentificadas }),
      { useWebSearch: true }
    );
    const parsed = parseAiJson(raw);
    const novas = Array.isArray(parsed?.oportunidades) ? parsed.oportunidades : [];

    const oportunidades = novas
      .filter((o) => o && o.titulo && o.descricao)
      .map((o) => ({
        id: genId(),
        titulo: o.titulo,
        descricao: o.descricao,
        valorEstimadoAnual: o.valorEstimadoAnual || "Não estimado",
        logicaCalculo: o.logicaCalculo || "Não detalhado pela IA.",
        baseLegal: o.baseLegal || "Fonte não especificada — validar manualmente.",
        nivelConfianca: o.nivelConfianca === "confirmado" ? "confirmado" : "estimativa",
        criadoEm: new Date().toISOString(),
      }));

    return NextResponse.json({ oportunidades });
  } catch (e) {
    // falha silenciosa do lado do cliente — a reunião continua normalmente
    return NextResponse.json({ oportunidades: [] }, { status: 200 });
  }
}
