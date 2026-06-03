import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Profile() {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUserIssues = useCallback(async () => {
        setLoading(true);
        try {
            const response = await API.get('/issues');
            const allIssues = response.data.data || [];
            if (user?.role === 'developer') {
                setIssues(allIssues.filter(i => i.assignedTo?.userId === user.userId));
            } else {
                setIssues(allIssues.filter(i => i.reportedBy?.userId === user.userId));
            }
        } catch (err) {
            setError('Failed to fetch user tickets');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchUserIssues();
        }
    }, [user, fetchUserIssues]);

    return (
        <div className="app-layout" data-testid="profile-layout">
            <Navbar />
            <div className="container" data-testid="profile-container">
                <div className="page-header" data-testid="profile-header">
                    <div>
                        <h1 data-testid="profile-title">User Profile</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="profile-subtitle">Personal information and task list</p>
                    </div>
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="profile-error">{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, alignItems: 'flex-start' }} data-testid="profile-grid">
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="profile-details-card">
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 10 }} data-testid="profile-card-title">Account Information</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Full Name</span>
                                <strong style={{ fontSize: '1.1rem' }} data-testid="profile-name">{user?.name || 'N/A'}</strong>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Email Address</span>
                                <span style={{ fontSize: '0.95rem' }} data-testid="profile-email">{user?.email || 'N/A'}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>User ID</span>
                                <span style={{ fontSize: '0.95rem', fontFamily: 'monospace', color: 'var(--primary-hover)' }} data-testid="profile-userid">{user?.userId || 'N/A'}</span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>System Role</span>
                                <span className={`badge badge-${user?.role === 'admin' ? 'resolved' : user?.role === 'manager' ? 'progress' : user?.role === 'developer' ? 'open' : 'closed'}`} data-testid="profile-role">
                                    {user?.role?.toUpperCase() || 'GUEST'}
                                </span>
                            </div>
                            <div>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Department</span>
                                <span style={{ fontSize: '0.95rem' }} data-testid="profile-dept">{user?.department || 'Engineering'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }} data-testid="profile-tickets-card">
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: 10 }} data-testid="profile-tickets-title">
                            {user?.role === 'developer' ? 'My Assigned Issues' : 'My Reported Issues'}
                        </h3>
                        {loading && <div style={{ color: 'white', textAlign: 'center', padding: 20 }} data-testid="profile-tickets-loading">Loading tickets...</div>}
                        {!loading && issues.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }} data-testid="profile-no-tickets">
                                No issues linked to your account.
                            </p>
                        ) : (
                            <div className="table-responsive" data-testid="profile-table-container">
                                <table className="table" data-testid="profile-tickets-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Title</th>
                                            <th>Project</th>
                                            <th>Priority</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {issues.map(issue => (
                                            <tr key={issue._id} data-testid={`profile-issue-row-${issue.issueId}`}>
                                                <td style={{ fontWeight: 600, color: 'var(--primary-hover)' }} data-testid={`profile-issue-id-${issue.issueId}`}>{issue.issueId}</td>
                                                <td data-testid={`profile-issue-title-${issue.issueId}`}>{issue.title}</td>
                                                <td data-testid={`profile-issue-project-${issue.issueId}`}>{issue.project?.title || 'Unknown'}</td>
                                                <td>
                                                    <span className={`badge badge-${issue.priority}`} data-testid={`profile-issue-priority-${issue.issueId}`}>
                                                        {issue.priority}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${issue.severity}`} data-testid={`profile-issue-severity-${issue.issueId}`}>
                                                        {issue.severity}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${issue.status}`} data-testid={`profile-issue-status-${issue.issueId}`}>
                                                        {issue.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
