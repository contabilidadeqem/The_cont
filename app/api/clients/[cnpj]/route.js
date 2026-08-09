import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { onlyDigits } from "@/lib/format";

export async function GET(request, { params }) {
  const cnpj = onlyDigits(params.cnpj);
  const client = await prisma.client.findUnique({
    where: { cnpj },
    include: {
      meetings: {
        orderBy: { criadoEm: "desc" },
        select: {
          id: true,
          criadoEm: true,
          atualizadoEm: true,
          exportadoEm: true,
          perguntas: true,
          documento: true,
          perfilSnapshot: true,
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  // resume cada reunião para a lista de histórico (sem mandar o conteúdo todo)
  const meetings = client.meetings.map((m) => {
    const perguntas = Array.isArray(m.perguntas) ? m.perguntas : [];
    const oportunidades = m.documento?.oportunidades || [];
    return {
      id: m.id,
      criadoEm: m.criadoEm,
      atualizadoEm: m.atualizadoEm,
      exportadoEm: m.exportadoEm,
      total: perguntas.length,
      respondidas: perguntas.filter((p) => p.status === "respondida").length,
      oportunidadesCount: oportunidades.length,
      regimeNoMomento: m.perfilSnapshot?.regimeTributario || "—",
    };
  });

  return NextResponse.json({ ...client, meetings });
}

export async function PUT(request, { params }) {
  const cnpj = onlyDigits(params.cnpj);
  const body = await request.json();

  const client = await prisma.client.update({
    where: { cnpj },
    data: {
      regimeTributarioConfirmado: body.regimeTributarioConfirmado,
      setorAtuacao: body.setorAtuacao || null,
      observacoes: body.observacoes || null,
    },
  });

  return NextResponse.json(client);
}
