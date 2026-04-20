import { redirect } from 'next/navigation';

/**
 * LEGACY REDIRECTOR
 * Catches any old links pointing to /booking/[slug] and redirects them to the new root-level /[slug].
 */
export default async function LegacyBookingRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;

  if (slug) {
    redirect(`/${slug}`);
  }

  redirect('/');
}
