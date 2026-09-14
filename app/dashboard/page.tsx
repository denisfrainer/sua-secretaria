import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTenant, getPremios, searchCoupons } from './actions';
import DashboardPanel from '@/components/storefront/DashboardPanel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  console.log(`[DASHBOARD_LOAD] Loading configurations for tenant: ${user.id}`);

  // Concurrently fetch tenant configuration, prize pool, and issued coupons
  const [tenant, premios, initialCoupons] = await Promise.all([
    getTenant(user.id),
    getPremios(user.id),
    searchCoupons('', user.id)
  ]);

  return (
    <main className="w-full flex flex-col gap-8">
      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
          Painel de Controle
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Personalize a identidade da sua Roleta Vantajosa, configure os prêmios e valide os cupons dos clientes.
        </p>
      </div>

      <DashboardPanel
        userId={user.id}
        initialTenant={tenant}
        initialPremios={premios}
        initialCoupons={initialCoupons}
      />
    </main>
  );
}
