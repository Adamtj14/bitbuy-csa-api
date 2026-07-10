import { useEffect, useState } from 'react';
import { api, ApiError, InviteRow, Me, UserRow } from '../api.js';

export function AdminPanel({ me }: { me: Me }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    api.listUsers().then(setUsers).catch(() => {});
    api.listInvites().then(setInvites).catch(() => {});
  };
  useEffect(refresh, []);

  const act = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  return (
    <section className="panel">
      <h2>People</h2>
      {error && <p className="error">{error}</p>}
      <ul className="people-list">
        {users.map((user) => (
          <li key={user.id}>
            <span className="person-name">
              {user.name || user.email}
              {user.id === me.id && ' (you)'}
            </span>
            <span className="person-email">{user.email}</span>
            <select
              value={user.role}
              disabled={user.id === me.id}
              onChange={(e) =>
                act(() => api.setUserRole(user.id, e.target.value as 'admin' | 'member'))
              }
            >
              <option value="admin">admin</option>
              <option value="member">member</option>
            </select>
            <button
              disabled={user.id === me.id}
              onClick={() => act(() => api.deleteUser(user.id))}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <h2 style={{ marginTop: 16 }}>Invites</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as 'member' | 'admin')}>
          <option value="member">member</option>
          <option value="admin">admin</option>
        </select>
        <button
          disabled={!email.includes('@')}
          onClick={() =>
            act(async () => {
              await api.createInvite(email, role);
              setEmail('');
            })
          }
        >
          Invite
        </button>
      </div>
      <ul className="people-list">
        {invites.map((invite) => (
          <li key={invite.id}>
            <span className="person-name">{invite.email}</span>
            <span className="person-email">
              {invite.role} · {invite.usedAt ? 'joined' : 'pending'}
            </span>
            {!invite.usedAt && (
              <button onClick={() => act(() => api.deleteInvite(invite.id))}>Revoke</button>
            )}
          </li>
        ))}
        {invites.length === 0 && <li className="hint">No invites yet.</li>}
      </ul>
      <p className="hint">
        Invited people sign in with Google using the invited email; they join as soon as
        they first sign in.
      </p>
    </section>
  );
}
