import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type Form = z.infer<typeof schema>;

function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-2xl bg-[#123f38] text-white shadow-lg shadow-[#123f38]/15"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v18M3 12h18" />
        <path d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4" opacity=".35" />
      </svg>
    </span>
  );
}

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3" />
      <path d="M6.2 6.2C4.1 7.5 2.9 9.7 2.5 12c.7 1.8 3.9 7 9.5 7 1.3 0 2.5-.3 3.5-.8" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2.5 12s3.3-7 9.5-7 9.5 7 9.5 7-3.3 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function LoginPage() {
  const { me, login } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (me) return <Navigate to="/dashboard" replace />;

  const onSubmit = handleSubmit(async (values) => {
    setError('');

    try {
      await login(values.email.trim(), values.password);
    } catch (e) {
      setError(errorMessage(e));
    }
  });

  return (
    <main className="relative flex min-h-screen bg-[#f5f7f5]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#dcebe5]/50 blur-3xl" />
        <div className="absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#e8eee6]/60 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Brand panel */}
        <aside className="relative hidden w-[48%] flex-col justify-between overflow-hidden bg-[#123f38] px-12 py-10 text-white lg:flex xl:px-16">
          <div className="absolute inset-0 opacity-[0.08]" aria-hidden="true">
            <div className="absolute -right-40 -top-32 h-[520px] w-[520px] rounded-full border border-white" />
            <div className="absolute -right-20 -top-12 h-[360px] w-[360px] rounded-full border border-white" />
            <div className="absolute -bottom-52 -left-32 h-[560px] w-[560px] rounded-full border border-white" />
            <div className="absolute bottom-0 left-0 h-px w-full bg-white" />
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <BrandMark size={46} />
            <div>
              <p className="text-lg font-extrabold tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                MediCore
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[.19em] text-[#c0d7ce]">
                Healthcare operations
              </p>
            </div>
          </div>

          <div className="relative z-10 my-12 max-w-xl">
            <p className="mb-5 text-[10px] font-bold uppercase tracking-[.22em] text-[#b5d3c6]">
              A clearer view of care
            </p>

            <h1
              className="max-w-lg text-4xl font-semibold leading-[1.16] tracking-[-.04em] xl:text-5xl"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Better coordinated care starts here.
            </h1>

            <p className="mt-6 max-w-md text-sm leading-7 text-[#d0e0d9]">
              One workspace for your clinical teams, patient records,
              appointments and day-to-day operations.
            </p>

            <div className="mt-12 max-w-md rounded-2xl border border-white/15 bg-white/[0.07] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#d6e9df]">
                  <ShieldIcon />
                </span>
                <div>
                  <p className="text-xs font-bold text-white">Organization-aware access</p>
                  <p className="mt-1 text-[11px] text-[#c0d7ce]">
                    Secure access to your clinic workspace
                  </p>
                </div>
              </div>
              <div className="mt-5 h-px bg-white/15" />
              <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-[#c0d7ce]">
                <span>Clinical workspace</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9dd5b8]" />
                  Secure environment
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-5 text-[10px] text-[#c0d7ce]">
            <span>© {new Date().getFullYear()} MediCore</span>
            <span>Designed for better healthcare operations</span>
          </div>
        </aside>

        {/* Sign-in area */}
        <section className="relative flex min-h-screen flex-1 flex-col justify-between px-5 py-7 sm:px-10 lg:px-12 xl:px-20">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 lg:invisible">
              <BrandMark size={36} />
              <span className="text-base font-extrabold tracking-tight text-[#183d36]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                MediCore
              </span>
            </div>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[.13em] text-slate-400">
              Clinical workspace
            </span>
          </header>

          <div className="mx-auto w-full max-w-[420px] py-12">
            <div className="mb-8">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#267263]">
                Welcome back
              </p>
              <h2
                className="mt-3 text-[32px] font-bold tracking-[-.045em] text-[#172b27] sm:text-[36px]"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Sign in to MediCore
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Enter your organization account details to continue to your workspace.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <span className="mt-0.5 shrink-0">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v4m0 4h.01" />
                  </svg>
                </span>
                <div>
                  <p className="font-bold">Unable to sign in</p>
                  <p className="mt-1 text-xs leading-5">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-xs font-bold text-slate-700">
                  Email address
                </label>
                <div className={`relative rounded-xl border bg-white transition-all focus-within:border-[#4d8b7d] focus-within:ring-4 focus-within:ring-[#dcebe5]/70 ${
                  errors.email ? 'border-red-300' : 'border-slate-200'
                }`}>
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    placeholder="you@organization.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className="h-[52px] w-full rounded-xl bg-transparent pl-11 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-2 text-xs font-medium text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <span className="text-[10px] font-medium text-slate-400">
                    Secure account access
                  </span>
                </div>

                <div className={`relative rounded-xl border bg-white transition-all focus-within:border-[#4d8b7d] focus-within:ring-4 focus-within:ring-[#dcebe5]/70 ${
                  errors.password ? 'border-red-300' : 'border-slate-200'
                }`}>
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="4" y="10" width="16" height="11" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className="h-[52px] w-full rounded-xl bg-transparent pl-11 pr-12 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4d8b7d]/30"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    <EyeIcon visible={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-2 text-xs font-medium text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#174d43] px-5 text-sm font-bold text-white shadow-lg shadow-[#174d43]/15 transition duration-200 hover:-translate-y-0.5 hover:bg-[#103d35] hover:shadow-xl hover:shadow-[#174d43]/20 focus:outline-none focus:ring-4 focus:ring-[#b8d8cd] disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:translate-y-0"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
                      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Continue to workspace
                    <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="my-7 flex items-center gap-3">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-[9px] font-bold uppercase tracking-[.15em] text-slate-400">
                Protected workspace
              </span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-[#e2ebe6] bg-[#f8faf8] p-4">
              <span className="mt-0.5 text-[#397c6d]">
                <ShieldIcon />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-700">Your organization, your workspace</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Access is managed through your organization's account and assigned permissions.
                </p>
              </div>
            </div>
          </div>

          <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 py-5 text-[10px] text-slate-400 sm:flex-row">
            <span>© {new Date().getFullYear()} MediCore. All rights reserved.</span>
            <span>Healthcare management workspace</span>
          </footer>
        </section>
      </div>
    </main>
  );
}