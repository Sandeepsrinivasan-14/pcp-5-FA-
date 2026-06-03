import React, { useEffect, useState } from 'react';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    return (
        <div className="app-layout" data-testid="users-layout">
            <Navbar />
            <div className="container" data-testid="users-container">
                <div className="page-header" data-testid="users-header">
                    <div>
                        <h1 data-testid="users-title">Team Directory</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="users-subtitle">Members of the organization and their assigned roles</p>
                    </div>
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="users-error">{error}</div>}

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
                                                <span className={`badge badge-${user.role === 'admin' ? 'resolved' : user.role === 'manager' ? 'progress' : user.role === 'developer' ? 'open' : 'closed'}`} data-testid={`user-role-${user.userId}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td data-testid={`user-dept-${user.userId}`}>{user.department || 'Engineering'}</td>
                                            <td>
                                                <span className={`badge badge-${user.status === 'active' ? 'resolved' : 'closed'}`} data-testid={`user-status-${user.userId}`}>
                                                    {user.status || 'active'}
                                                </span>
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
