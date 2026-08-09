"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Usuário ou senha incorretos.");
      }
      router.push("/");
      router.refresh();
    } catch (e2) {
      setErro(e2.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={entrar}>
        <p className="eyebrow">Acesso restrito</p>
        <h1 className="title login-title">Entrar</h1>
        <div className="field">
          <div className="field-label-row"><span className="field-label">Usuário</span></div>
          <input className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus autoComplete="username" />
        </div>
        <div className="field" style={{ marginTop: 12 }}>
          <div className="field-label-row"><span className="field-label">Senha</span></div>
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" />
        </div>
        {erro && <p className="error" style={{ marginTop: 10 }}>{erro}</p>}
        <button className="btn btn-primary btn-lg login-submit" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
