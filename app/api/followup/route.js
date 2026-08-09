import { NextResponse } from "next/server";
import { callClaude, parseAiJson } from "@/lib/anthropic";

const SYS_FOLLOWUP = `Você é um especialista tributário brasileiro. Você vai receber o perfil de uma empresa, uma pergunta feita ao cliente e a resposta dada.
Decida se a resposta abre uma nova linha de investigação relevante para planejamento tributário que ainda não está coberta pelas outras perguntas do roteiro.
Se sim, responda APENAS com JSON {"pergunta": "texto de UMA pergunta de acompanhamento, objetiva, em português"}.
Se não valer a pena aprofundar, responda APENAS com JSON {"pergunta": null}.
Sem markdown, sem texto adicional.`;

export async function POST(request) {
  const { perfil, pergunta, resposta } = await request.json();
  try {
    const raw = await callClaude(SYS_FOLLOWUP, JSON.stringify({ perfil, pergunta, resposta }));
    const parsed = parseAiJson(raw);
    return NextResponse.json({ pergunta: parsed?.pergunta || null });
  } catch (e) {
    return NextResponse.json({ pergunta: null }, { status: 200 });
  }
}
