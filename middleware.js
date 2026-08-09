import { NextResponse } from "next/server";

// Protege todo o app: qualquer rota que não seja /login ou /api/login exige
// o cookie de sessão. Como é uso interno de uma equipe pequena, o login é
// único (um usuário/senha compartilhado), guardado em variáveis de ambiente —
// não há tabela de usuários nem cadastro (isso é escopo da Fase 5 completa).
export function middleware(request) {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  const cookie = request.cookies.get("auth")?.value;
  if (cookie && process.env.APP_AUTH_SECRET && cookie === process.env.APP_AUTH_SECRET) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
