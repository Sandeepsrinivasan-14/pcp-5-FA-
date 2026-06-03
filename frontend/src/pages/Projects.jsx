import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import Navbar from '../components/Navbar';

function Projects() {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', description: '', category: 'Web Development' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await API.get('/projects');
            const data = response.data.data || [];
            setProjects(data);
            if (window.appState) {
                window.appState.projects = data;
            }
        } catch (err) {
            setError('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (window.appState) {
            window.appState.projects = projects;
        }
    }, [projects]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        try {
            const response = await API.post('/projects', newProject);
            if (response.data.success) {
                setSuccess('Project created successfully!');
                setNewProject({ title: '', description: '', category: 'Web Development' });
                setShowCreateModal(false);
                fetchProjects();
            } else {
                setError(response.data.message || 'Failed to create project.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Server error occurred while creating project.');
        }
    };

    const isAuthorized = user?.role === 'admin' || user?.role === 'manager';

    const filteredProjects = projects.filter(p => 
        (p.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const itemsPerPage = 6;
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="app-layout" data-testid="projects-layout">
            <Navbar />
            <div className="container" data-testid="projects-container">
                <div className="page-header" data-testid="projects-header">
                    <div>
                        <h1 data-testid="projects-title">Projects Directory</h1>
                        <p style={{ color: 'var(--text-secondary)' }} data-testid="projects-subtitle">Manage and track development workspaces</p>
                    </div>
                    {isAuthorized && (
                        <button 
                            className="btn" 
                            onClick={() => setShowCreateModal(true)}
                            data-testid="create-project-btn"
                        >
                            ➕ Create Project
                        </button>
                    )}
                </div>

                <div className="filter-toolbar" data-testid="filter-toolbar" style={{ marginBottom: 24, display: 'flex', gap: 16 }}>
                    <div className="filter-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                        <input 
                            type="text" 
                            placeholder="Search projects..." 
                            className="filter-control" 
                            value={searchQuery} 
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} 
                            data-testid="project-search" 
                        />
                    </div>
                </div>

                {error && <div className="error-alert" style={{ marginBottom: 24 }} data-testid="projects-error">{error}</div>}
                {success && (
                    <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'rgba(16, 185, 129, 0.05)', marginBottom: 24, padding: 12 }} data-testid="projects-success">
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>{success}</span>
                    </div>
                )}

                {loading && <div style={{ color: 'white', textAlign: 'center', padding: 40 }} data-testid="projects-loading">Loading projects...</div>}

                {!loading && filteredProjects.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }} data-testid="no-projects-message">
                        No projects found.
                    </div>
                ) : (
                    <div data-testid="project-list">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }} data-testid="projects-grid">
                            {paginatedProjects.map((proj) => (
                                <div className="card" key={proj._id} style={{ display: 'flex', flexDirection: 'column', height: '100%', marginBottom: 0 }} data-testid={`project-card-${proj.projectId}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }} data-testid={`project-title-${proj.projectId}`}>{proj.title}</h3>
                                        <span className="badge badge-resolved" style={{ fontSize: '0.7rem' }} data-testid={`project-category-${proj.projectId}`}>{proj.category}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>ID: <strong style={{ color: 'var(--primary-hover)' }} data-testid={`project-id-display-${proj.projectId}`}>{proj.projectId}</strong></p>
                                    <p style={{ flexGrow: 1, fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: 20, lineBreak: 'anywhere' }} data-testid={`project-desc-${proj.projectId}`}>
                                        {proj.description || 'No description provided.'}
                                    </p>
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                        <div>
                                            <span style={{ color: 'var(--text-secondary)' }}>Owner: </span>
                                            <strong data-testid={`project-owner-${proj.projectId}`}>{proj.owner?.name || 'Unknown Owner'}</strong>
                                        </div>
                                        <span style={{ color: 'var(--text-secondary)' }} data-testid={`project-date-${proj.projectId}`}>
                                            {proj.startDate ? new Date(proj.startDate).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, alignItems: 'center' }} data-testid="pagination-container">
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
                                disabled={currentPage === 1 || totalPages <= 1}
                                data-testid="pagination-prev"
                            >
                                Previous
                            </button>
                            <span style={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {Math.max(totalPages, 1)}</span>
                            <button 
                                className="btn btn-secondary" 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
                                disabled={currentPage === totalPages || totalPages <= 1}
                                data-testid="pagination-next"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showCreateModal && (
                <div className="modal-backdrop" data-testid="create-project-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Create New Project</h3>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)} data-testid="close-project-modal-btn">×</button>
                        </div>
                        <form onSubmit={handleCreateProject} data-testid="create-project-form">
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label htmlFor="proj-title">Project Title</label>
                                    <input 
                                        type="text" 
                                        id="proj-title"
                                        className="form-control" 
                                        placeholder="e.g. Mobile App Redesign" 
                                        required 
                                        value={newProject.title}
                                        onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                                        data-testid="project-title-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="proj-desc">Description</label>
                                    <textarea 
                                        id="proj-desc"
                                        className="form-control" 
                                        rows="4"
                                        placeholder="Enter details about this project..." 
                                        value={newProject.description}
                                        onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                        style={{ resize: 'vertical' }}
                                        data-testid="project-desc-input"
                                    ></textarea>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="proj-category">Category</label>
                                    <select 
                                        id="proj-category"
                                        className="form-control"
                                        value={newProject.category}
                                        onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                                        data-testid="project-category-select"
                                    >
                                        <option value="Web Development">Web Development</option>
                                        <option value="Mobile Development">Mobile Development</option>
                                        <option value="Quality Assurance">Quality Assurance</option>
                                        <option value="Finance">Finance</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} data-testid="cancel-project-btn">Cancel</button>
                                <button type="submit" className="btn" data-testid="submit-project-btn">Create Workspace</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Projects;
