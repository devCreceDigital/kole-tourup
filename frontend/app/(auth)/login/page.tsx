"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi, ApiError } from "@/lib/api";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await fetchApi("/api/v1/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      // Redirigir según el rol
      const role = result.rol;
      const callbackUrl = searchParams.get("callbackUrl");
      const pendingViajeId = localStorage.getItem("pending_viaje_id");

      if (callbackUrl && callbackUrl.startsWith("/")) {
        router.push(callbackUrl);
      } else if (pendingViajeId && (role === "padre" || role === "mecenas")) {
        const payloadStr = localStorage.getItem(`pending_inscription_payload_${pendingViajeId}`);
        if (payloadStr) {
          try {
            await fetchApi('/api/v1/inscripciones/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payloadStr
            });
            // NOTA: NO borramos inscripcion_progreso_... para que la pantalla de éxito pueda leer el nombre del alumno
            localStorage.removeItem(`pending_inscription_payload_${pendingViajeId}`);
            localStorage.removeItem("pending_viaje_id");
            router.push(`/app/inscribir/${pendingViajeId}?success=true`);
            return;
          } catch (e: any) {
            console.error('Failed to submit pending inscription', e);
            const errorMsg = e?.data?.grupo_id || e?.message || 'Error al completar la inscripción. Intenta de nuevo.';
            localStorage.setItem(`inscripcion_error_${pendingViajeId}`, errorMsg);
            router.push(`/app/inscribir/${pendingViajeId}?error=${encodeURIComponent(errorMsg)}`);
            return;
          }
        }
        localStorage.removeItem("pending_viaje_id");
        router.push(`/app/inscribir/${pendingViajeId}`);
      } else if (role === "agente") {
        router.push("/backoffice");
      } else if (role === "alumno") {
        router.push("/app/alumno");
      } else if (role === "padre" || role === "mecenas") {
        router.push("/app");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || "Error al iniciar sesión");
      } else {
        setError("Error de red. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="tu@email.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Contraseña
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              placeholder="••••••••"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? "Iniciando..." : "Entrar"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ¿No tienes cuenta?{" "}
          <Link href={`/registro${searchParams.get('callbackUrl') ? `?callbackUrl=${searchParams.get('callbackUrl')}` : ''}`} className="font-medium text-primary hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Iniciar Sesión</h2>
      
      <Suspense fallback={<div className="text-center py-4">Cargando formulario...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
