import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { userService } from '../services/user.service';
import { User } from '../types';

const roleLabels: Record<User['role'], string> = {
  admin: 'Admin',
  manager: 'Manažer',
  user: 'Uživatel',
};

function AdminUsers() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'user' as User['role'],
  });

  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userService.getAll();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Nepodařilo se načíst uživatele');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [users]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageUsers) return;

    try {
      setSubmitting(true);
      setError('');
      await userService.create({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setForm({ fullName: '', email: '', password: '', role: 'user' });
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Nepodařilo se vytvořit uživatele');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActivation = async (user: User) => {
    if (!canManageUsers || typeof user.isActive !== 'boolean') return;

    try {
      setError('');
      const updated = await userService.setActivation(user.id, !user.isActive);
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Nepodařilo se změnit aktivaci uživatele');
    }
  };

  if (!canManageUsers) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Správa uživatelů</h1>
        <p className="text-sm text-red-600">Pouze administrátor nebo manažer může spravovat uživatele.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-xl font-semibold text-gray-900">Správa uživatelů</h1>
        <p className="text-sm text-gray-600">Vytváření účtů a aktivace/deaktivace přístupů.</p>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{error}</div>}

      <form onSubmit={handleCreateUser} className="bg-white rounded-lg shadow p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Přidat uživatele</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Jméno a příjmení"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          />
          <input
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            required
          />
          <input
            type="password"
            placeholder="Heslo (min. 6 znaků)"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            minLength={6}
            required
          />
          <select
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as User['role'] }))}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="user">Uživatel</option>
            <option value="manager">Manažer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="mt-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Ukládám...' : 'Přidat uživatele'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
        <h2 className="text-base font-semibold text-gray-900 mb-3">Seznam uživatelů</h2>

        {loading ? (
          <p className="text-sm text-gray-500">Načítání...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Jméno</th>
                <th className="py-2 pr-3">E-mail</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Stav</th>
                <th className="py-2">Akce</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const isActive = user.isActive ?? true;
                const isCurrentUser = currentUser?.id === user.id;

                return (
                  <tr key={user.id} className="border-b">
                    <td className="py-2 pr-3">{user.fullName}</td>
                    <td className="py-2 pr-3">{user.email}</td>
                    <td className="py-2 pr-3">{roleLabels[user.role]}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {isActive ? 'Aktivní' : 'Neaktivní'}
                      </span>
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActivation(user)}
                        disabled={isCurrentUser}
                        className={`text-xs px-2 py-1 rounded ${
                          isActive
                            ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={isCurrentUser ? 'Nelze deaktivovat vlastní účet' : ''}
                      >
                        {isActive ? 'Deaktivovat' : 'Aktivovat'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
