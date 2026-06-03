import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Issues() {
    const { user } = useAuth();
    const [issues, setIssues] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({ project: '', status: '', priority: '', severity: '', search: '' });
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newIssue, setNewIssue] = useState({
        title: '',
        description: '',
        project: '',
        priority: 'medium',
        severity: 'minor',
        assignedTo: ''
    });
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        try {
            let query = [];
            if (filters.project) query.push(`project=${filters.project}`);
            if (filters.status) query.push(`status=${filters.status}`);
            if (filters.priority) query.push(`priority=${filters.priority}`);
            if (filters.severity) query.push(`severity=${filters.severity}`);
            if (filters.search) query.push(`search=${filters.search}`);
            
            const queryString = query.length > 0 ? '?' + query.join('&') : '';
            const response = await API.get('/issues' + queryString);
            const data = response.data.data || [];
            setIssues(data);
            if (window.appState) {
                window.appState.issues = data;
                window.appState.filters = filters;
            }
        } catch (err) {
            setError('Failed to load issues.');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const fetchDropdowns = async () => {
        try {
            const projectsRes = await API.get('/projects');
            setProjects(projectsRes.data.data || []);
            
            const usersRes = await API.get('/users');
            setUsers(usersRes.data.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchIssues();
    }, [filters, fetchIssues]);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    useEffect(() => {
        if (window.appState) {
            window.appState.issues = issues;
            window.appState.filters = filters;
        }
    }, [issues, filters]);

    const handleCreateIssue = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            if (!newIssue.project) {
                setError('Project is required.');
                return;
            }
            const response = await API.post('/issues', newIssue);
            if (response.data.success) {
                setSuccess('Issue created successfully!');
                setNewIssue({
                    title: '',
                    description: '',
                    project: '',
                    priority: 'medium',
                    severity: 'minor',
                    assignedTo: ''
                });
                setShowCreateModal(false);
                fetchIssues();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create issue.');
        }
    };

    const handleOpenDetails = async (issue) => {
        setError(null);
        try {
            const response = await API.get(`/issues/${issue._id}`);
            setSelectedIssue(response.data.data);
            setShowDetailsModal(true);
        } catch (err) {
            setError('Failed to load issue details.');
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setError(null);
        try {
            const response = await API.post(`/issues/${selectedIssue._id}/comments`, { comment: newComment });
            if (response.data.success) {
                setSelectedIssue(prev => ({
                    ...prev,
                    comments: [...(prev.comments || []), response.data.data]
                }));
                setNewComment('');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add comment.');
        }
    };

    const handleUpdateIssueAttribute = async (field, value) => {
        setError(null);
        try {
            const response = await API.patch(`/issues/${selectedIssue._id}`, { [field]: value });
            if (response.data.success) {
                setSelectedIssue(prev => ({
                    ...prev,
                    [field]: response.data.data[field],
                    assignedTo: response.data.data.assignedTo
                }));
                fetchIssues();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update issue attribute.');
        }
    };

    const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';
    const isDeveloper = user?.role === 'developer';
    const isTester = user?.role === 'tester';
    const isAssignedDeveloper = isDeveloper && selectedIssue?.assignedTo?.userId === user?.userId;

    return (
        <div className="app-layout" data-testid="issues-layout">
            <Navbar />
            <div className="container" data-testid="issues-container">
                <div className="page-header" data-testid="issues-header">
                    <div>
                        <h1 data-testid="issues-title">Issues Tracking</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="issues-subtitle">Log, prioritize, and manage bug reports</p>
                    </div>
                    {isManagerOrAdmin && (
                        <button 
                            className="btn" 
                            onClick={() => setShowCreateModal(true)}
                            data-testid="create-issue-btn"
                        >
                            ➕ Report Issue
                        </button>
                    )}
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="issues-error">{error}</div>}
                {success && (
                    <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)', marginBottom: 24, padding: 12 }} data-testid="issues-success">
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</span>
                    </div>
                )}

                <div className="filter-toolbar" data-testid="filter-toolbar" style={{ flexWrap: 'wrap', gap: 16 }}>
                    <div className="filter-group" style={{ flexGrow: 1, minWidth: 200 }}>
                        <label htmlFor="issue-search-input">Search Summary/Description</label>
                        <input 
                            id="issue-search-input"
                            type="text" 
                            placeholder="Type search terms..." 
                            className="filter-control" 
                            value={filters.search || ''} 
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })} 
                            data-testid="issue-search" 
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="filter-project">Project</label>
                        <select 
                            id="filter-project"
                            className="filter-control"
                            value={filters.project}
                            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                            data-testid="filter-project"
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p._id} value={p._id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="filter-status">Status</label>
                        <select 
                            id="filter-status"
                            className="filter-control"
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            data-testid="issue-filter"
                        >
                            <option value="">All Statuses</option>
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="testing">Testing</option>
                            <option value="resolved">Resolved</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="filter-priority">Priority</label>
                        <select 
                            id="filter-priority"
                            className="filter-control"
                            value={filters.priority}
                            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                            data-testid="filter-priority"
                        >
                            <option value="">All Priorities</option>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <label htmlFor="filter-severity">Severity</label>
                        <select 
                            id="filter-severity"
                            className="filter-control"
                            value={filters.severity}
                            onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                            data-testid="filter-severity"
                        >
                            <option value="">All Severities</option>
                            <option value="minor">Minor</option>
                            <option value="major">Major</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => setFilters({ project: '', status: '', priority: '', severity: '', search: '' })}
                        style={{ padding: '8px 16px', fontSize: '0.85rem', alignSelf: 'flex-end', marginLeft: 'auto' }}
                        data-testid="clear-filters-btn"
                    >
                        Clear Filters
                    </button>
                </div>

                {loading && <div style={{ color: 'white', textAlign: 'center', padding: 40 }} data-testid="issues-loading">Loading issues...</div>}

                {!loading && issues.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }} data-testid="no-issues-message">
                        No issues matching the filters were found.
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }} data-testid="issues-list-card">
                        <div className="table-responsive">
                            <table className="table" data-testid="issue-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Title</th>
                                        <th>Project</th>
                                        <th>Assigned To</th>
                                        <th>Priority</th>
                                        <th>Severity</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issues.map(issue => (
                                        <tr key={issue._id} onClick={() => handleOpenDetails(issue)} data-testid="issue-row" data-testid-dyn={`issue-row-${issue.issueId}`} style={{ cursor: 'pointer' }}>
                                            <td style={{ fontWeight: 600, color: 'var(--primary-hover)' }} data-testid={`issue-id-${issue.issueId}`}>{issue.issueId}</td>
                                            <td data-testid={`issue-title-${issue.issueId}`}>{issue.title}</td>
                                            <td data-testid={`issue-project-${issue.issueId}`}>{issue.project?.title || 'Unknown'}</td>
                                            <td data-testid={`issue-assignee-${issue.issueId}`}>{issue.assignedTo?.name || <em style={{ color: 'var(--text-secondary)' }}>Unassigned</em>}</td>
                                            <td>
                                                <span className={`badge badge-${issue.priority}`} data-testid={`issue-priority-${issue.issueId}`}>
                                                    {issue.priority}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${issue.severity}`} data-testid={`issue-severity-${issue.issueId}`}>
                                                    {issue.severity}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-${issue.status}`} data-testid={`issue-status-${issue.issueId}`}>
                                                    {issue.status}
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

            {showCreateModal && (
                <div className="modal-backdrop" data-testid="create-issue-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Report New Issue</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)} data-testid="close-create-issue-modal">×</button>
                        </div>
                        <form onSubmit={handleCreateIssue} data-testid="create-issue-form">
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label htmlFor="issue-title">Issue Summary / Title</label>
                                    <input 
                                        type="text" 
                                        id="issue-title"
                                        className="form-control" 
                                        placeholder="e.g. API returns 500 error on checkout" 
                                        required 
                                        value={newIssue.title}
                                        onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                                        data-testid="issue-title-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="issue-desc">Description & Steps to Reproduce</label>
                                    <textarea 
                                        id="issue-desc"
                                        className="form-control" 
                                        rows="4"
                                        placeholder="Enter details..." 
                                        value={newIssue.description}
                                        onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                                        style={{ resize: 'vertical' }}
                                        data-testid="issue-desc-textarea"
                                    ></textarea>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label htmlFor="issue-project">Project Workspace</label>
                                        <select 
                                            id="issue-project"
                                            className="form-control"
                                            required
                                            value={newIssue.project}
                                            onChange={(e) => setNewIssue({ ...newIssue, project: e.target.value })}
                                            data-testid="issue-project-select"
                                        >
                                            <option value="">Select Project...</option>
                                            {projects.map(p => (
                                                <option key={p._id} value={p._id}>{p.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="issue-assignee">Assign Developer</label>
                                        <select 
                                            id="issue-assignee"
                                            className="form-control"
                                            value={newIssue.assignedTo}
                                            onChange={(e) => setNewIssue({ ...newIssue, assignedTo: e.target.value })}
                                            data-testid="issue-assignee-select"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.filter(u => u.role === 'developer').map(u => (
                                                <option key={u._id} value={u._id}>{u.name} ({u.department})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label htmlFor="issue-priority">Priority</label>
                                        <select 
                                            id="issue-priority"
                                            className="form-control"
                                            value={newIssue.priority}
                                            onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value })}
                                            data-testid="issue-priority-select"
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="issue-severity">Severity</label>
                                        <select 
                                            id="issue-severity"
                                            className="form-control"
                                            value={newIssue.severity}
                                            onChange={(e) => setNewIssue({ ...newIssue, severity: e.target.value })}
                                            data-testid="issue-severity-select"
                                        >
                                            <option value="minor">Minor</option>
                                            <option value="major">Major</option>
                                            <option value="critical">Critical</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} data-testid="cancel-issue-btn">Cancel</button>
                                <button type="submit" className="btn" data-testid="submit-issue-btn">File Bug Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showDetailsModal && selectedIssue && (
                <div className="modal-backdrop" data-testid="details-modal">
                    <div className="modal-content" style={{ maxWidth: 800 }}>
                        <div className="modal-header">
                            <div>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }} data-testid="details-issue-id">Ticket: {selectedIssue.issueId}</span>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: 4 }} data-testid="details-issue-title">{selectedIssue.title}</h3>
                            </div>
                            <button className="modal-close" onClick={() => setShowDetailsModal(false)} data-testid="close-details-modal">×</button>
                        </div>
                        <div className="modal-body">
                            <div className="issue-details-grid">
                                <div>
                                    <div style={{ marginBottom: 20 }}>
                                        <h5 style={{ color: 'var(--text-secondary)', marginBottom: 8, fontSize: '0.9rem' }}>Description</h5>
                                        <p style={{ fontSize: '0.95rem', lineHeight: '1.5', background: 'var(--bg-primary)', padding: 16, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }} data-testid="details-issue-desc">
                                            {selectedIssue.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    <div className="comment-section">
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 16 }}>Comments ({selectedIssue.comments?.length || 0})</h4>
                                        <div className="comment-list" data-testid="details-comments-list">
                                            {(!selectedIssue.comments || selectedIssue.comments.length === 0) ? (
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', padding: '10px 0' }} data-testid="details-no-comments">No comments posted yet.</p>
                                            ) : (
                                                selectedIssue.comments.map(c => (
                                                    <div className="comment-item" key={c._id} data-testid={`issue-comment-${c.commentId}`}>
                                                        <div className="comment-meta">
                                                            <div>
                                                                <span className="comment-author" data-testid={`comment-author-${c.commentId}`}>{c.user?.name || 'Anonymous'}</span>
                                                                <span style={{ fontSize: '0.7rem', background: 'var(--bg-primary)', padding: '2px 4px', borderRadius: 4, marginLeft: 8, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                                                    {c.user?.role}
                                                                </span>
                                                            </div>
                                                            <span className="comment-date">{new Date(c.createdAt).toLocaleString()}</span>
                                                        </div>
                                                        <p className="comment-text" data-testid={`comment-text-${c.commentId}`}>{c.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        
                                        <form onSubmit={handleAddComment} className="comment-form" data-testid="details-comment-form">
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <textarea 
                                                    className="form-control" 
                                                    rows="2" 
                                                    placeholder="Write a comment..." 
                                                    required 
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    style={{ resize: 'none' }}
                                                    data-testid="details-comment-input"
                                                ></textarea>
                                            </div>
                                            <button type="submit" className="btn" style={{ alignSelf: 'flex-end', padding: '8px 16px', fontSize: '0.85rem' }} data-testid="details-comment-submit-btn">
                                                Post Comment
                                            </button>
                                        </form>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="meta-box" data-testid="details-meta-box">
                                        <h5 style={{ fontWeight: 600, marginBottom: 4, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>Ticket Metadata</h5>
                                        
                                        <div className="meta-row">
                                            <span className="meta-label">Project:</span>
                                            <span className="meta-value">{selectedIssue.project?.title || 'Unknown'}</span>
                                        </div>
                                        
                                        <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                                            <span className="meta-label">Status:</span>
                                            {(isManagerOrAdmin || isAssignedDeveloper) ? (
                                                <select 
                                                    className="form-control" 
                                                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                    value={selectedIssue.status}
                                                    onChange={(e) => handleUpdateIssueAttribute('status', e.target.value)}
                                                    data-testid="details-status-select"
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="in-progress">In Progress</option>
                                                    <option value="testing">Testing</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                            ) : (
                                                <span className={`badge badge-${selectedIssue.status}`} data-testid="details-status-display">{selectedIssue.status}</span>
                                            )}
                                        </div>

                                        <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                                            <span className="meta-label">Priority:</span>
                                            {isManagerOrAdmin ? (
                                                <select 
                                                    className="form-control" 
                                                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                    value={selectedIssue.priority}
                                                    onChange={(e) => handleUpdateIssueAttribute('priority', e.target.value)}
                                                    data-testid="details-priority-select"
                                                >
                                                    <option value="low">Low</option>
                                                    <option value="medium">Medium</option>
                                                    <option value="high">High</option>
                                                </select>
                                            ) : (
                                                <span className={`badge badge-${selectedIssue.priority}`} data-testid="details-priority-display">{selectedIssue.priority}</span>
                                            )}
                                        </div>

                                        <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                                            <span className="meta-label">Severity:</span>
                                            {isManagerOrAdmin ? (
                                                <select 
                                                    className="form-control" 
                                                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                    value={selectedIssue.severity}
                                                    onChange={(e) => handleUpdateIssueAttribute('severity', e.target.value)}
                                                    data-testid="details-severity-select"
                                                >
                                                    <option value="minor">Minor</option>
                                                    <option value="major">Major</option>
                                                    <option value="critical">Critical</option>
                                                </select>
                                            ) : (
                                                <span className={`badge badge-${selectedIssue.severity}`} data-testid="details-severity-display">{selectedIssue.severity}</span>
                                            )}
                                        </div>

                                        <div className="meta-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
                                            <span className="meta-label">Assigned To:</span>
                                            {isManagerOrAdmin ? (
                                                <select 
                                                    className="form-control" 
                                                    style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                                                    value={selectedIssue.assignedTo?._id || ''}
                                                    onChange={(e) => handleUpdateIssueAttribute('assignedTo', e.target.value || null)}
                                                    data-testid="assign-issue-btn"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {users.filter(u => u.role === 'developer').map(u => (
                                                        <option key={u._id} value={u._id}>{u.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="meta-value" data-testid="details-assignee-display">{selectedIssue.assignedTo?.name || 'Unassigned'}</span>
                                            )}
                                        </div>

                                        <div className="meta-row">
                                            <span className="meta-label">Reported By:</span>
                                            <span className="meta-value" data-testid="details-reporter-display">{selectedIssue.reportedBy?.name || 'System'}</span>
                                        </div>

                                        <div className="meta-row">
                                            <span className="meta-label">Reported Date:</span>
                                            <span className="meta-value" style={{ fontSize: '0.75rem' }} data-testid="details-report-date">
                                                {selectedIssue.createdAt ? new Date(selectedIssue.createdAt).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {isTester && (
                                        <div className="card" style={{ padding: 12, border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)', margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }} data-testid="details-tester-warning">
                                            ℹ️ <strong>Tester view:</strong> You are authorized to add comments, but cannot change issue ticket attributes.
                                        </div>
                                    )}
                                    {isDeveloper && !isAssignedDeveloper && (
                                        <div className="card" style={{ padding: 12, border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.02)', margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }} data-testid="details-developer-warning">
                                            ℹ️ <strong>Developer view:</strong> You can only update the status of issues that are directly assigned to you.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowDetailsModal(false)} data-testid="close-details-btn">Close View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Issues;
