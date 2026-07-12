"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi, ApiError } from "@/lib/api";
import Link from "next/link";

import { Suspense } from "react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const viajeId = searchParams.get('viaje_id');
    if (viajeId) {
      localStorage.setItem('pending_viaje_id', viajeId);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    nombre: "",
    apellidos: "",
    email: "",
    password: "",
    passwordConfirm: "",
    rol: "padre", // Por defecto padre/tutor
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.password !== formData.passwordConfirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
      };

      await fetchApi("/api/v1/auth/registro/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Auto-login inmediato
      const loginResult = await fetchApi("/api/v1/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      // Redirigir según el rol y callbackUrl
      const role = loginResult.rol;
      const callbackUrl = searchParams.get("callbackUrl");
      const pendingViajeId = localStorage.getItem("pending_viaje_id");

      if (callbackUrl && callbackUrl.startsWith("/")) {
        router.push(callbackUrl);
      } else if (pendingViajeId && (role === "padre" || role === "mecenas")) {
        const payloadStr = localStorage.getItem(`pending_inscription_payload_${pendingViajeId}`)
        if (payloadStr) {
          try {
            await fetchApi('/api/v1/inscripciones/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payloadStr,
            })
            localStorage.removeItem(`pending_inscription_payload_${pendingViajeId}`)
            localStorage.removeItem('pending_viaje_id')
            router.push(`/app/inscribir/${pendingViajeId}?success=true`)
            return
          } catch (e: any) {
            // Si falla, preservar el payload y redirigir al wizard con el error
            console.error('Failed to submit pending inscription', e)
            const errorMsg = e?.data?.grupo_id || e?.message || 'Error al completar la inscripción. Intenta de nuevo.'
            localStorage.setItem(`inscripcion_error_${pendingViajeId}`, errorMsg)
            router.push(`/app/inscribir/${pendingViajeId}?error=${encodeURIComponent(errorMsg)}`)
            return
          }
        }
        localStorage.removeItem('pending_viaje_id')
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
      // Manejar la respuesta estructurada de DRF
      const data = err?.data;
      if (data && typeof data === 'object') {
        if (data.email) {
          setError("Este email ya está en uso.");
        } else if (data.password) {
          setError(`Contraseña: ${data.password[0]}`);
        } else if (data.nombre) {
          setError(`Nombre: ${data.nombre[0]}`);
        } else if (data.apellidos) {
          setError(`Apellidos: ${data.apellidos[0]}`);
        } else {
          // Extraer cualquier otro error de campo
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            setError(data[firstKey][0]);
          } else {
            setError(err.message || "Error al crear la cuenta. Verifica tus datos.");
          }
        }
      } else {
        setError(err?.message || "Error de red. Inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">Crear Cuenta</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="nombre">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              required
              value={formData.nombre}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="apellidos">
              Apellidos
            </label>
            <input
              id="apellidos"
              name="apellidos"
              type="text"
              required
              value={formData.apellidos}
              onChange={handleChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="rol">
            ¿Eres Padre o Alumno?
          </label>
          <select
            id="rol"
            name="rol"
            value={formData.rol}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white"
          >
            <option value="padre">Padre / Tutor</option>
            <option value="alumno">Alumno (mayor de edad)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700" htmlFor="passwordConfirm">
            Confirmar Contraseña
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            minLength={8}
            value={formData.passwordConfirm}
            onChange={handleChange}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          ¿Ya tienes cuenta?{" "}
          <Link href={`/login${searchParams.get('callbackUrl') ? `?callbackUrl=${searchParams.get('callbackUrl')}` : ''}`} className="font-medium text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </>
  );
}

export default function RegisterPage() {
  return (
    <div>
      <Suspense fallback={<div className="text-center py-4">Cargando formulario...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
