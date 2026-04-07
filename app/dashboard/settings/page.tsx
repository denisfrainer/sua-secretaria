import { redirect } from 'next/navigation';

export default function SettingsRedirect() {
  // Always redirect to the first tab (Business Profile)
  redirect('/dashboard/settings/business');
}
