import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://192.168.1.38:3000/api/v1';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    document.title = 'Restablecer Contraseña | KioEdu';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      setStatus('error');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      const res = await fetch(`${API_URL}/auth/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'El enlace es inválido o ha expirado.');
      }

      setStatus('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error inesperado.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50">
      {/* Mini Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors no-underline font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver al inicio
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-600 to-indigo-400 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow">K</div>
            <span className="font-black text-slate-800">KioEdu</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-md mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-200 mb-5 rotate-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">
            Kio<span className="text-brand-600">Edu</span>
          </h1>
          <p className="text-slate-500 font-medium">Restablecer tu contraseña</p>
        </div>

        {/* No token error */}
        {!token && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
            <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800 mb-1">Enlace inválido</h3>
                <p className="text-sm text-red-700">No se encontró el token de seguridad. Usá el enlace que enviamos a tu correo electrónico.</p>
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8 text-center">
            <div className="mx-auto w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h2>
            <p className="text-sm text-slate-500 mb-6">Tu contraseña fue cambiada exitosamente. Ya podés iniciar sesión con tu nueva contraseña desde el POS o la App.</p>
            <Link to="/" className="inline-block px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl transition-colors no-underline shadow-lg shadow-brand-200">
              Volver al inicio
            </Link>
          </div>
        )}

        {/* Form */}
        {token && status !== 'success' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-8">
            {status === 'error' && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setStatus('idle'); }}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-1.5">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setStatus('idle'); }}
                  required
                  placeholder="Repetí la contraseña"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Cambiar Contraseña'
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
