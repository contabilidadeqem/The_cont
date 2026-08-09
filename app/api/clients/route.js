import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { onlyDigits, isValidCnpj } from "@/lib/format";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { razaoSocial: { contains: q, mode: "insensitive" } },
            { nomeFantasia: { contains: q, mode: "insensitive" } },
            { cnpj: { contains: onlyDigits(q) } },
          ],
        }
      : undefined,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(clients);
}

export async function POST(request) {
  const body = await request.json();
  const cnpj = onlyDigits(body.cnpj);

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }
  if (!body.razaoSocial || !body.razaoSocial.trim()) {
    return NextResponse.json({ error: "Razão social é obrigatória." }, { status: 400 });
  }

  const data = {
    cnpj,
    razaoSocial: body.razaoSocial,
    nomeFantasia: body.nomeFantasia || null,
    situacaoCadastral: body.situacaoCadastral || null,
    cnaePrincipal: body.cnaePrincipal || null,
    cnaesSecundarios: body.cnaesSecundarios || [],
    porte: body.porte || null,
    municipio: body.municipio || null,
    uf: body.uf || null,
    regimeInferido: body.regimeInferido || null,
    regimeTributarioConfirmado: body.regimeTributarioConfirmado || "Não definido",
    setorAtuacao: body.setorAtuacao || null,
    observacoes: body.observacoes || null,
  };

  const client = await prisma.client.upsert({
    where: { cnpj },
    update: data,
    create: data,
  });

  return NextResponse.json(client);
}
