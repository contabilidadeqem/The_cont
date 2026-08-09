import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPerfilResumo } from "@/lib/format";

// Cada chamada cria uma reunião NOVA e independente — nunca sobrescreve uma
// reunião anterior. O perfilSnapshot é um retrato do cliente no momento da
// criação, então editar o cadastro do cliente depois não altera reuniões passadas.
export async function POST(request) {
  const { clientId } = await request.json();
  if (!clientId) return NextResponse.json({ error: "clientId é obrigatório." }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Cliente não encontrado." }, { status: 404 });

  const meeting = await prisma.meeting.create({
    data: {
      clientId,
      perfilSnapshot: buildPerfilResumo(client),
      perguntas: [],
      documento: { oportunidades: [] },
    },
  });

  return NextResponse.json(meeting);
}
