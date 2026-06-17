"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { PROFILES, useProfile } from "@/components/profile/ProfileContext";

export default function ProfileGate({ children }: { children: ReactNode }) {
  const { profile, selectProfile } = useProfile();

  if (profile) {
    return <>{children}</>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10 text-slate-900 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col justify-center gap-10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <span className="relative h-16 w-16 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/10">
            <Image src="/logo.png" alt="Macro Maxxer logo" fill className="object-contain p-2" priority />
          </span>
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Choose your profile</p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Personalize Macro Maxxer</h1>
            <p className="text-base leading-7 text-slate-600 sm:text-lg">
              Pick a profile to save this browser&apos;s experience. You can switch profiles later from the sidebar.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PROFILES.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => selectProfile(candidate.id)}
              className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20"
            >
              <span className={`mb-5 h-2 w-20 rounded-full bg-gradient-to-r ${candidate.accent}`} />
              <span className="text-xl font-semibold text-slate-950">{candidate.name}</span>
              <span className="mt-3 flex-1 text-sm leading-6 text-slate-600">{candidate.description}</span>
              <span className="mt-6 text-sm font-semibold text-blue-600 transition group-hover:translate-x-1">
                Continue →
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
