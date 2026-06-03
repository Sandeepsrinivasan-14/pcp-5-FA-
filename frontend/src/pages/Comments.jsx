import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Comments() {
    const { user: currentUser } = useAuth();
    const [comments, setComments] = useState([]);
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newComment, setNewComment] = useState({ issueId: '', message: '' });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const response = await API.get('/comments');
            const data = response.data.data || [];
            setComments(data);
            if (window.appState) {
                window.appState.comments = data;
            }
        } catch (err) {
            setError('Failed to fetch comments');
        } finally {
            setLoading(false);
        }
    };

    const fetchIssues = async () => {
        try {
            const response = await API.get('/issues');
            setIssues(response.data.data || []);
        } catch (err) {
            console.error('Failed to load issues for comments select');
        }
    };

    useEffect(() => {
        fetchComments();
        fetchIssues();
    }, []);

    useEffect(() => {
        if (window.appState) {
            window.appState.comments = comments;
        }
    }, [comments]);

    const handleCreateComment = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!newComment.issueId || !newComment.message.trim()) {
            setError('Please select an issue and type a message.');
            return;
        }
        try {
            const response = await API.post('/comments', {
                issueId: newComment.issueId,
                message: newComment.message.trim()
            });
            if (response.data.success) {
                setSuccess('Comment posted successfully!');
                setNewComment({ issueId: '', message: '' });
                setShowAddModal(false);
                fetchComments();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add comment');
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;
        setError(null);
        setSuccess(null);
        try {
            const response = await API.delete(`/comments/${commentId}`);
            if (response.data.success) {
                setSuccess('Comment deleted successfully');
                setComments(prev => prev.filter(c => c._id !== commentId));
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete comment');
        }
    };

    return (
        <div className="app-layout" data-testid="comments-layout">
            <Navbar />
            <div className="container" data-testid="comments-container">
                <div className="page-header" data-testid="comments-header">
                    <div>
                        <h1 data-testid="comments-title">Discussion Board</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="comments-subtitle">Latest remarks and updates across all issues</p>
                    </div>
                    <button 
                        className="btn" 
                        onClick={() => setShowAddModal(true)}
                        data-testid="add-comment-btn"
                    >
                        ➕ Add Comment
                    </button>
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="comments-error">{error}</div>}
                {success && (
                    <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)', marginBottom: 24, padding: 12 }} data-testid="comments-success">
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</span>
                    </div>
                )}

                {loading && <div style={{ color: 'white', textAlign: 'center', padding: 40 }} data-testid="comments-loading">Loading comments...</div>}

                {!loading && comments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }} data-testid="no-comments-message">
                        No comments registered yet.
                    </div>
                ) : (
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }} data-testid="comments-list-card">
                        <div className="table-responsive">
                            <table className="table" data-testid="comment-table">
                                <thead>
                                    <tr>
                                        <th>Issue Ticket</th>
                                        <th>Comment Message</th>
                                        <th>Posted By</th>
                                        <th>Role / Department</th>
                                        <th>Timestamp</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comments.map(c => {
                                        const isAuthor = currentUser?.userId === c.user?.userId;
                                        const isAdmin = currentUser?.role === 'admin';
                                        const canDelete = isAdmin || isAuthor;
                                        return (
                                            <tr key={c._id} data-testid="comment-row" data-testid-dyn={`comment-row-${c.commentId}`}>
                                                <td style={{ fontWeight: 600 }}>
                                                    <span style={{ color: 'var(--primary-hover)' }} data-testid={`comment-issue-id-${c.commentId}`}>{c.issue?.issueId || 'N/A'}</span>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }} data-testid={`comment-issue-title-${c.commentId}`}>{c.issue?.title || 'Unknown Issue'}</div>
                                                </td>
                                                <td style={{ whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }} data-testid={`comment-message-${c.commentId}`}>{c.message}</td>
                                                <td style={{ fontWeight: 500 }} data-testid={`comment-user-${c.commentId}`}>{c.user?.name || 'Unknown User'}</td>
                                                <td>
                                                    <span className="badge badge-resolved" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }} data-testid={`comment-role-${c.commentId}`}>{c.user?.role || 'developer'}</span>
                                                    {c.user?.department && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }} data-testid={`comment-dept-${c.commentId}`}>{c.user.department}</div>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }} data-testid={`comment-date-${c.commentId}`}>{new Date(c.createdAt).toLocaleString()}</td>
                                                <td>
                                                    {canDelete && (
                                                        <button 
                                                            className="btn btn-danger" 
                                                            onClick={() => handleDeleteComment(c._id)} 
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                            data-testid={`delete-comment-btn-${c.commentId}`}
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="modal-backdrop" data-testid="add-comment-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Post New Comment</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)} data-testid="close-comment-modal">×</button>
                        </div>
                        <form onSubmit={handleCreateComment} data-testid="add-comment-form">
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label htmlFor="comment-issue-select">Select Issue Ticket</label>
                                    <select 
                                        id="comment-issue-select"
                                        className="form-control"
                                        required
                                        value={newComment.issueId}
                                        onChange={(e) => setNewComment({ ...newComment, issueId: e.target.value })}
                                        data-testid="comment-issue-select"
                                    >
                                        <option value="">Choose issue...</option>
                                        {issues.map(is => (
                                            <option key={is._id} value={is._id}>{is.issueId} - {is.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="comment-message-text">Message</label>
                                    <textarea 
                                        id="comment-message-text"
                                        className="form-control" 
                                        rows="4"
                                        placeholder="Type your discussion comment..." 
                                        required
                                        value={newComment.message}
                                        onChange={(e) => setNewComment({ ...newComment, message: e.target.value })}
                                        style={{ resize: 'vertical' }}
                                        data-testid="comment-message-input"
                                    ></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)} data-testid="cancel-comment-btn">Cancel</button>
                                <button type="submit" className="btn" data-testid="submit-comment-btn">Post Comment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Comments;
