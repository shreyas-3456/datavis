"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { forgotPasswordAction, ActionState } from "@/lib/actions/auth.actions";
import Link from "next/link";

const initialState: ActionState = { error: null, success: false };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors duration-200"
    >
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Sending...
        </span>
      ) : (
        "Send reset link"
      )}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialState);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Forgot your password?</h1>
          <p className="text-gray-400 mt-1 text-sm">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">

          {state.error && (
            <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {state.error}
            </div>
          )}

          {state.success ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-full mb-4">
                <svg className="w-7 h-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-white font-medium mb-1">Check your inbox</p>
              <p className="text-gray-400 text-sm">{state.message}</p>
              <Link
                href="/auth/login"
                className="inline-block mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
              >
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
                />
              </div>
              <SubmitButton />
            </form>
          )}
        </div>

        {!state.success && (
          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{" "}
            <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}