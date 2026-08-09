import { currentUser } from '@/lib/auth';
import { AuthForms } from '@/components/AuthForms';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await currentUser();

  return (
    <main className="px-6 md:px-10 py-24 min-h-screen">
      <header className="mb-10">
        <p className="label text-ink/60 mb-4">Account</p>
        <h1 className="display text-4xl md:text-6xl">{user ? 'Your account' : 'Sign in'}</h1>
      </header>

      {user ? (
        <div className="max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <span className="label text-ink/60">Name</span>
            <span className="text-lg">{user.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label text-ink/60">Email</span>
            <span className="text-lg">{user.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="label text-ink/60">Role</span>
            <span className="text-lg capitalize">{user.role}</span>
          </div>
          <div className="mt-4 flex items-center gap-6">
            <LogoutButton />
          </div>
        </div>
      ) : (
        <AuthForms />
      )}
    </main>
  );
}
