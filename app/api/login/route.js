import { NextResponse } from "next/server";

export async function POST(request) {
  const { usuario, senha } = await request.json().catch(() => ({}));

  if (!process.env.APP_AUTH_SECRET || !process.env.APP_LOGIN_USER || !process.env.APP_LOGIN_PASSWORD) {
    return NextResponse.json(
      { error: "Login não configurado no servidor (faltam variáveis de ambiente)." },
      { status: 500 }
    );
  }

  const userOk = usuario === process.env.APP_LOGIN_USER;
  const passOk = senha === process.env.APP_LOGIN_PASSWORD;

  if (!userOk || !passOk) {
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth", process.env.APP_AUTH_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 dias
  });
  return res;
}
