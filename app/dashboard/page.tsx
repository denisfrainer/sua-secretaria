import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfile, getServices, getPortfolio } from './actions';
import DashboardPanel from '@/components/storefront/DashboardPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Guard: Double-check authentication
  if (!user) {
    redirect('/login');
  }

  console.log(`[DASHBOARD_LOAD] Loading configurations for user: ${user.id}`);

  // Fetch initial data concurrently
  const [profile, services, portfolio] = await Promise.all([
    getProfile(user.id),
    getServices(user.id),
    getPortfolio(user.id)
  ]);

  return (
    <main className="w-full flex flex-col gap-8">
      {/* Welcome Title */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Painel de Configuração</h1>
        <p className="text-sm font-medium text-slate-500">
          Gerencie os dados e mídias expostas na sua Vitrine Virtual.
        </p>
      </div>

      <DashboardPanel
        userId={user.id}
        initialProfile={profile}
        initialServices={services}
        initialPortfolio={portfolio}
      />
    </main>
  );
}
