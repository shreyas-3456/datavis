"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { resetPasswordAction, ActionState } from "@/lib/actions/auth.actions";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

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
          Resetting...
        </span>
      ) : (
        "Reset password"
      )}
    </button>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-red-400 text-sm">Invalid or missing reset token.</p>
        <Link href="/auth/forgot-password" className="text-indigo-400 hover:text-indigo-300 text-sm mt-4 inline-block">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white font-medium mb-1">Password reset!</p>
          <p className="text-gray-400 text-sm">{state.message}</p>
          <Link
            href="/auth/login"
            className="inline-block mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm"
          >
            Sign in now
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New password</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm new password</label>
            <input
              name="confirm_password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="Re-enter your password"
              className="w-full bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-gray-500 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors"
            />
          </div>

          <SubmitButton />
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-4">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Set new password</h1>
          <p className="text-gray-400 mt-1 text-sm">Must be at least 8 characters</p>
        </div>

        <Suspense fallback={<div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 animate-pulse h-64" />}>
          <ResetPasswordForm />
        </Suspense>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}