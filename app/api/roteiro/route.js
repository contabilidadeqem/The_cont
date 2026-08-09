import { NextResponse } from "next/server";
import { callClaude, parseAiJson } from "@/lib/anthropic";
import { newQuestion } from "@/lib/format";

const SYS_ROTEIRO = `Você é um especialista tributário brasileiro que prepara roteiros de reunião para um consultor de planejamento tributário.
Gere entre 9 e 13 perguntas objetivas, em português, para o consultor fazer ao cliente durante a reunião.
As perguntas devem ser adaptadas ao regime tributário, setor/CNAE, porte e localidade informados — nunca gere perguntas genéricas que serviriam para qualquer empresa em qualquer regime.
O objetivo das perguntas é levantar informações que revelem oportunidades de redução tributária (federal, estadual e municipal) e pontos de risco ou desenquadramento.
Responda APENAS com um array JSON de strings. Sem markdown, sem comentário, sem texto antes ou depois.`;

export async function POST(request) {
  const { perfil } = await request.json();
  try {
    const raw = await callClaude(SYS_ROTEIRO, JSON.stringify(perfil));
    const lista = parseAiJson(raw);
    if (!Array.isArray(lista) || lista.length === 0) throw new Error("Resposta vazia.");
    const perguntas = lista.map((texto) => newQuestion(texto, "ia"));
    return NextResponse.json({ perguntas });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Falha ao gerar roteiro." }, { status: 502 });
  }
}
