import { ResetForm } from '@/components/auth/PasswordForms';

export const metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({ searchParams }) {
  const sp = await searchParams;
  return <ResetForm token={sp?.token || ''} email={sp?.email || ''} />;
}
