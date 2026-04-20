import { redirect } from 'next/navigation';

export default async function PublicBookingPage({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const { slug } = await params;
  
  // Permanent redirect to the new primary booking journey
  redirect(`/booking/${slug}`);
}

