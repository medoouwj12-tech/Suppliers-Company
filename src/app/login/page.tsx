'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, User, Loader2 } from 'lucide-react'

const loginSchema = z.object({
  username: z.string().min(1, 'اسم المستخدم مطلوب'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const fillCredentials = (u: string, p: string) => {
    setValue('username', u, { shouldValidate: true })
    setValue('password', p, { shouldValidate: true })
    setServerError(null)
  }

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setServerError(null)

    const result = await signIn('credentials', {
      username: data.username.trim(),
      password: data.password.trim(),
      redirect: false,
    })

    setIsLoading(false)

    if (result?.error) {
      setServerError(result.error)
      return
    }

    if (result?.ok) {
      // سيتم التوجيه بواسطة middleware
      router.refresh()
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_18%_12%,rgba(36,160,122,0.42),transparent_34%),linear-gradient(140deg,#102d42_0%,#124959_58%,#0e7268_100%)] flex items-center justify-center p-4 sm:p-8">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[radial-gradient(ellipse_at_14%_0%,rgba(51,194,145,0.38),transparent_45%),linear-gradient(135deg,#102d42,#155363)] p-8 text-center sm:p-9">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-300/15 ring-1 ring-inset ring-white/15 rounded-2xl mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 2m0-10h10l2 6H5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">SupplyPro ERP</h1>
            <p className="text-emerald-50/85 text-sm">نظام إدارة التوريدات الغذائية</p>
          </div>

          {/* Form */}
          <div className="p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">تسجيل الدخول</h2>

            {/* بطاقات التعبئة السريعة للتجربة */}
            <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="mb-3 text-[13px] font-bold text-emerald-950">دخول سريع للتجربة</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fillCredentials('admin', 'admin123456')}
                  className="flex cursor-pointer flex-col rounded-xl border border-emerald-200 bg-white p-3 text-right shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/60"
                >
                  <span className="flex items-center gap-1 text-xs font-bold text-emerald-950">
                    👑 حساب المدير
                  </span>
                  <span className="text-gray-500 font-mono text-[11px] mt-0.5">admin / admin123456</span>
                </button>
                <button
                  type="button"
                  onClick={() => fillCredentials('rep1', 'rep123456')}
                  className="p-2 bg-white hover:bg-emerald-100/60 border border-emerald-200 rounded-lg text-right transition flex flex-col group shadow-xs cursor-pointer"
                >
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                    🚚 حساب المندوب
                  </span>
                  <span className="text-gray-500 font-mono text-[11px] mt-0.5">rep1 / rep123456</span>
                </button>
              </div>
            </div>

            {serverError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 end-0 flex items-center pe-3 pointer-events-none">
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    {...register('username')}
                    type="text"
                    autoComplete="username"
                    className={`w-full rounded-xl border py-3 pe-10 ps-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                      errors.username
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="أدخل اسم المستخدم"
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 end-0 flex items-center pe-3">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                    <Lock className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className={`w-full rounded-xl border py-3 pe-10 ps-10 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 ${
                      errors.password
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300 bg-white hover:border-gray-400'
                    }`}
                    placeholder="أدخل كلمة المرور"
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0e7268] px-4 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(8,127,104,0.22)] transition-all duration-200 hover:bg-[#066a58] disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري تسجيل الدخول...
                  </>
                ) : (
                  'تسجيل الدخول'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 pb-6 text-center">
            <p className="text-xs text-gray-400">
              SupplyPro ERP © 2025 - جميع الحقوق محفوظة
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
