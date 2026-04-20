import { redirect } from 'next/navigation';

export default async function PublicSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const profileId = resolvedParams?.id;

  if (!profileId || profileId === 'undefined') {
    return null;
  }
  
  // Permanent redirect to the new primary booking journey
  redirect(`/booking/${profileId}`);
}

