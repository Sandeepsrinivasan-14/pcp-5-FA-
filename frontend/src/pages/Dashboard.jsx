import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Dashboard() {
    const { user } = useAuth();
    const [analytics, setAnalytics] = useState(null);
    const [pendingTasks, setPendingTasks] = useState([]);
    const [syncLoading, setSyncLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const analyticsRes = await API.get('/analytics/dashboard');
            if (analyticsRes.data.success) {
                setAnalytics(analyticsRes.data.data);
            }

            const issuesRes = await API.get('/issues');
            const issues = issuesRes.data.data || [];
            
            let filteredTasks = [];
            if (user?.role === 'developer') {
                filteredTasks = issues.filter(i => 
                    i.assignedTo?.userId === user.userId && 
                    ['open', 'in-progress', 'testing'].includes(i.status)
                );
            } else if (user?.role === 'tester') {
                filteredTasks = issues.filter(i => 
                    i.reportedBy?.userId === user.userId && 
                    i.status !== 'closed'
                );
            } else {
                filteredTasks = issues.filter(i => 
                    !i.assignedTo || 
                    ['open', 'in-progress'].includes(i.status)
                );
            }
            setPendingTasks(filteredTasks.slice(0, 5));
        } catch (err) {
            setError('Failed to fetch dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchDashboardData();
        }
    }, [user, fetchDashboardData]);

    useEffect(() => {
        if (window.appState && analytics) {
            window.appState.analytics = analytics;
        }
    }, [analytics]);

    const handleSync = async () => {
        setSyncLoading(true);
        setSyncResult(null);
        setError(null);
        try {
            const response = await API.post('/sync');
            if (response.data.success) {
                setSyncResult(response.data.data);
                fetchDashboardData();
            } else {
                setError(response.data.message || 'Sync failed.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Sync failed.');
        } finally {
            setSyncLoading(false);
        }
    };

    const getStatusCount = (statusName) => {
        if (!analytics?.statusStats) return 0;
        const record = analytics.statusStats.find(s => s._id === statusName);
        return record ? record.count : 0;
    };

    const totalProjects = analytics?.projectStats?.length || 0;
    const openCount = getStatusCount('open');
    const inProgressCount = getStatusCount('in-progress') + getStatusCount('testing');
    const closedCount = getStatusCount('closed') + getStatusCount('resolved');
    const totalIssues = openCount + inProgressCount + closedCount;

    return (
        <div className="app-layout" data-testid="dashboard-layout">
            <Navbar />
            <div className="container" data-testid="dashboard-container">
                <div className="page-header" data-testid="dashboard-header">
                    <div>
                        <h1 data-testid="dashboard-title">Workspace Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="dashboard-welcome">
                            Welcome back, <strong style={{ color: 'white' }} data-testid="user-name">{user?.name}</strong>! Role: <span style={{ color: 'var(--primary-hover)', fontWeight: 600 }} data-testid="user-role">{user?.role?.toUpperCase()}</span>
                        </p>
                    </div>
                    {user?.role === 'admin' && (
                        <button 
                            className="btn" 
                            onClick={handleSync} 
                            disabled={syncLoading}
                            data-testid="sync-btn"
                        >
                            {syncLoading ? 'Syncing...' : '🔄 Sync Dataset'}
                        </button>
                    )}
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="dashboard-error">{error}</div>}

                {syncResult && (
                    <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)', marginBottom: 24 }} data-testid="sync-result">
                        <h4 style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 8 }} data-testid="sync-success-title">Database Synced Successfully!</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} data-testid="sync-success-details">
                            Fetched: <strong>{syncResult.totalFetched}</strong> items | 
                            Inserted: <strong style={{ color: 'var(--success)' }}>{syncResult.inserted}</strong> new records | 
                            Duplicates: <strong style={{ color: 'var(--warning)' }}>{syncResult.duplicates}</strong> updated | 
                            Rejected: <strong style={{ color: 'var(--danger)' }}>{syncResult.rejected}</strong> skipped
                        </p>
                    </div>
                )}

                <div className="stats-grid" data-testid="analytics-container">
                    <div className="stat-card" data-testid="total-issues-card">
                        <span className="stat-label">Total Issues</span>
                        <span className="stat-value">{totalIssues}</span>
                    </div>
                    <div className="stat-card stat-progress" data-testid="active-projects-card">
                        <span className="stat-label">Active Projects</span>
                        <span className="stat-value">{totalProjects}</span>
                    </div>
                    <div className="stat-card stat-open" data-testid="open-issues-card">
                        <span className="stat-label">Open Issues</span>
                        <span className="stat-value">{openCount}</span>
                    </div>
                    <div className="stat-card stat-closed" data-testid="closed-issues-card">
                        <span className="stat-label">Closed Issues</span>
                        <span className="stat-value">{closedCount}</span>
                    </div>
                </div>

                {loading && <div style={{ color: 'white', textAlign: 'center', padding: 20 }} data-testid="dashboard-loading">Loading metrics...</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 24 }} data-testid="dashboard-info-sections">
                    <div className="card" style={{ marginBottom: 0 }} data-testid="issue-chart">
                        <h3 className="card-title">Issue Distribution Chart</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                    <span>Open Issues</span>
                                    <span>{totalIssues > 0 ? Math.round((openCount / totalIssues) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${totalIssues > 0 ? (openCount / totalIssues) * 100 : 0}%`, height: '100%', background: 'var(--primary)' }}></div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                    <span>In Progress & Testing</span>
                                    <span>{totalIssues > 0 ? Math.round((inProgressCount / totalIssues) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${totalIssues > 0 ? (inProgressCount / totalIssues) * 100 : 0}%`, height: '100%', background: 'var(--warning)' }}></div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                                    <span>Closed & Resolved</span>
                                    <span>{totalIssues > 0 ? Math.round((closedCount / totalIssues) * 100) : 0}%</span>
                                </div>
                                <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${totalIssues > 0 ? (closedCount / totalIssues) * 100 : 0}%`, height: '100%', background: 'var(--success)' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginBottom: 0 }} data-testid="recent-activity">
                        <h3 className="card-title">Recent System Activity</h3>
                        {(!analytics?.activityLogs || analytics.activityLogs.length === 0) ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }} data-testid="no-activities">
                                No activity logged yet.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="activity-logs-list">
                                {analytics.activityLogs.map(log => (
                                    <div key={log._id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} data-testid={`activity-log-${log._id}`}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                            <strong style={{ color: 'white' }}>{log.user?.name || 'System'}</strong>
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.details || `Updated status to ${log.newStatus}`}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ marginTop: 24 }} data-testid="pending-tasks-card">
                    <h3 className="card-title">Pending Action Items</h3>
                    {pendingTasks.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>
                            No pending items found.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {pendingTasks.map(task => (
                                <div key={task._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} data-testid={`pending-task-${task.issueId}`}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--primary-hover)', fontWeight: 600, display: 'block' }}>{task.issueId}</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'white' }}>{task.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span className={`badge badge-${task.priority}`} style={{ fontSize: '0.7rem' }}>{task.priority}</span>
                                        <span className={`badge badge-${task.status}`} style={{ fontSize: '0.7rem' }}>{task.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
