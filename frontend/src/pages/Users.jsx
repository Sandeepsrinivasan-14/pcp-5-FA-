import React, { useEffect, useState } from 'react';
import API from '../services/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const ROLES = ['admin', 'manager', 'developer', 'tester'];

const roleBadge = (role) => {
    if (role === 'admin') return 'resolved';
    if (role === 'manager') return 'progress';
    if (role === 'developer') return 'open';
    return 'closed';
};

const EMPTY_MEMBER = { name: '', email: '', password: '', role: 'developer', department: '' };

function Users() {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'admin';

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [showForm, setShowForm] = useState(false);
    const [newMember, setNewMember] = useState(EMPTY_MEMBER);
    const [formError, setFormError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState(null);
    const [pendingId, setPendingId] = useState(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await API.get('/users');
            const data = response.data.data || [];
            setUsers(data);
            if (window.appState) {
                window.appState.users = data;
            }
        } catch (err) {
            setError('Failed to fetch users list');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFormError(null);
        try {
            // Registration honours the role only for an administrator, which is
            // exactly who can reach this form.
            await API.post('/auth/register', newMember);
            setNewMember(EMPTY_MEMBER);
            setShowForm(false);
            setNotice(`${newMember.name} was added to the team.`);
            await fetchUsers();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Could not create the account.');
        } finally {
            setSaving(false);
        }
    };

    const patchUser = async (member, changes) => {
        setPendingId(member.userId);
        setError(null);
        try {
            await API.patch(`/users/${member.userId}`, changes);
            await fetchUsers();
        } catch (err) {
            setError(err.response?.data?.message || 'Could not update that account.');
        } finally {
            setPendingId(null);
        }
    };

    const field = (name) => (event) => setNewMember({ ...newMember, [name]: event.target.value });

    return (
        <div className="app-layout" data-testid="users-layout">
            <Navbar />
            <div className="container" data-testid="users-container">
                <div className="page-header" data-testid="users-header">
                    <div>
                        <h1 data-testid="users-title">Team Directory</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="users-subtitle">
                            Members of the organization and their assigned roles
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            className="btn"
                            onClick={() => { setShowForm(!showForm); setFormError(null); }}
                            data-testid="toggle-add-member-btn"
                        >
                            {showForm ? 'Cancel' : '+ Add Member'}
                        </button>
                    )}
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="users-error">{error}</div>}

                {notice && (
                    <div
                        className="card"
                        style={{ borderLeft: '4px solid var(--success)', marginBottom: 24 }}
                        data-testid="users-notice"
                    >
                        {notice}
                    </div>
                )}

                {isAdmin && showForm && (
                    <div className="card" data-testid="add-member-card">
                        <h3 className="card-title">Add a team member</h3>
                        <form onSubmit={handleCreate} data-testid="add-member-form">
                            <div className="form-group">
                                <label htmlFor="member-name">Full name</label>
                                <input
                                    id="member-name"
                                    className="form-control"
                                    required
                                    value={newMember.name}
                                    onChange={field('name')}
                                    data-testid="member-name-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="member-email">Email address</label>
                                <input
                                    id="member-email"
                                    type="email"
                                    className="form-control"
                                    required
                                    value={newMember.email}
                                    onChange={field('email')}
                                    data-testid="member-email-input"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="member-password">Temporary password</label>
                                <input
                                    id="member-password"
                                    type="password"
                                    className="form-control"
                                    minLength={8}
                                    required
                                    value={newMember.password}
                                    onChange={field('password')}
                                    data-testid="member-password-input"
                                />
                                <small style={{ color: 'var(--text-secondary)' }}>
                                    At least 8 characters. Share it with them and ask them to change
                                    it from their profile.
                                </small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="member-role">Role</label>
                                <select
                                    id="member-role"
                                    className="form-control"
                                    value={newMember.role}
                                    onChange={field('role')}
                                    data-testid="member-role-select"
                                >
                                    {ROLES.map((role) => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="member-department">Department</label>
                                <input
                                    id="member-department"
                                    className="form-control"
                                    placeholder="Engineering"
                                    value={newMember.department}
                                    onChange={field('department')}
                                    data-testid="member-department-input"
                                />
                            </div>

                            <button type="submit" className="btn" disabled={saving} data-testid="create-member-btn">
                                {saving ? 'Creating…' : 'Create account'}
                            </button>

                            {formError && (
                                <div className="error-alert" style={{ marginTop: 16 }} data-testid="add-member-error">
                                    <span>⚠️</span> {formError}
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {loading && <div style={{ color: 'white', textAlign: 'center', padding: 40 }} data-testid="users-loading">Loading users...</div>}

                {!loading && users.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }} data-testid="no-users-message">
                        No team members registered yet.
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }} data-testid="users-card">
                        <div className="table-responsive">
                            <table className="table" data-testid="users-table">
                                <thead>
                                    <tr>
                                        <th data-testid="th-id">User ID</th>
                                        <th data-testid="th-name">Name</th>
                                        <th data-testid="th-email">Email Address</th>
                                        <th data-testid="th-role">Role Badge</th>
                                        <th data-testid="th-department">Department</th>
                                        <th data-testid="th-status">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user._id} data-testid={`user-row-${user.userId}`}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-hover)' }} data-testid={`user-id-${user.userId}`}>{user.userId}</td>
                                            <td style={{ fontWeight: 500 }} data-testid={`user-name-${user.userId}`}>{user.name}</td>
                                            <td data-testid={`user-email-${user.userId}`}>{user.email}</td>
                                            <td>
                                                {isAdmin ? (
                                                    <select
                                                        className="form-control"
                                                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                        value={user.role}
                                                        disabled={pendingId === user.userId}
                                                        onChange={(e) => patchUser(user, { role: e.target.value })}
                                                        data-testid={`user-role-select-${user.userId}`}
                                                    >
                                                        {ROLES.map((role) => (
                                                            <option key={role} value={role}>{role}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span className={`badge badge-${roleBadge(user.role)}`} data-testid={`user-role-${user.userId}`}>
                                                        {user.role}
                                                    </span>
                                                )}
                                            </td>
                                            <td data-testid={`user-dept-${user.userId}`}>{user.department || 'Engineering'}</td>
                                            <td>
                                                {isAdmin ? (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                                        disabled={pendingId === user.userId}
                                                        onClick={() => patchUser(user, {
                                                            status: user.status === 'active' ? 'inactive' : 'active',
                                                        })}
                                                        data-testid={`user-status-toggle-${user.userId}`}
                                                    >
                                                        {user.status === 'active' ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                ) : (
                                                    <span className={`badge badge-${user.status === 'active' ? 'resolved' : 'closed'}`} data-testid={`user-status-${user.userId}`}>
                                                        {user.status || 'active'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Users;
