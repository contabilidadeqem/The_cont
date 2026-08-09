import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request, { params }) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: params.id },
    include: { client: true },
  });
  if (!meeting) return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
  return NextResponse.json(meeting);
}

// Autosave: o front-end chama isso com debounce a cada alteração no roteiro
// ou no documento. Nunca cria um novo registro — só atualiza a reunião atual.
export async function PATCH(request, { params }) {
  const body = await request.json();
  const data = {};
  if (body.perguntas !== undefined) data.perguntas = body.perguntas;
  if (body.documento !== undefined) data.documento = body.documento;
  if (body.exportadoEm !== undefined) data.exportadoEm = new Date(body.exportadoEm);

  const meeting = await prisma.meeting.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(meeting);
}
