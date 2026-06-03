import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <nav className="navbar" data-testid="navbar">
            <Link to="/dashboard" className="navbar-brand" data-testid="nav-brand">
                <span>TrackIt</span>
            </Link>
            <div className="navbar-menu" data-testid="navbar-menu">
                <Link 
                    to="/dashboard" 
                    className={`navbar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                    data-testid="dashboard-link"
                >
                    Dashboard
                </Link>
                <Link 
                    to="/projects" 
                    className={`navbar-link ${location.pathname === '/projects' ? 'active' : ''}`}
                    data-testid="projects-link"
                >
                    Projects
                </Link>
                <Link 
                    to="/issues" 
                    className={`navbar-link ${location.pathname === '/issues' ? 'active' : ''}`}
                    data-testid="issues-link"
                >
                    Issues
                </Link>
                <Link 
                    to="/users" 
                    className={`navbar-link ${location.pathname === '/users' ? 'active' : ''}`}
                    data-testid="users-link"
                >
                    Team
                </Link>
                <Link 
                    to="/comments" 
                    className={`navbar-link ${location.pathname === '/comments' ? 'active' : ''}`}
                    data-testid="comments-link"
                >
                    Discussions
                </Link>
            </div>
            <div className="navbar-profile" data-testid="navbar-profile">
                <Link to="/profile" className="profile-info-link" style={{ textDecoration: 'none', display: 'flex', gap: 10, marginRight: 16 }} data-testid="nav-link-profile">
                    <div className="profile-info">
                        <div className="profile-name" style={{ color: 'white' }} data-testid="profile-name-display">{user?.name || 'User'}</div>
                        <span className="profile-role" data-testid="profile-role-display">{user?.role || 'Guest'}</span>
                    </div>
                </Link>
                <button 
                    onClick={logout} 
                    className="btn btn-secondary" 
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    data-testid="logout-btn"
                >
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default Navbar;
