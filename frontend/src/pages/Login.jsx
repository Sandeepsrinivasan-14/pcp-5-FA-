import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const { login, error, loading } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(credentials);
        if (success) navigate('/dashboard');
    };

    return (
        <div className="auth-container" data-testid="login-container">
            <div className="auth-card" data-testid="login-card">
                <div className="auth-header" data-testid="login-header">
                    <h2 data-testid="login-title">TrackIt</h2>
                    <p data-testid="login-subtitle">MERN Issue & Bug Tracking System</p>
                </div>
                <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form">
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input 
                            type="email" 
                            id="email"
                            className="form-control"
                            placeholder="e.g. admin@test.com" 
                            required 
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            data-testid="email-input"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input 
                            type="password" 
                            id="password"
                            className="form-control"
                            placeholder="••••••••" 
                            required 
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            data-testid="password-input"
                        />
                    </div>
                    <button type="submit" className="btn" disabled={loading} data-testid="login-btn">
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                    
                    {error && (
                        <div className="error-alert" data-testid="login-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}
                </form>

                <div style={{ marginTop: 24, fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: 16 }} data-testid="demo-accounts-info">
                    <p style={{ fontWeight: 600, marginBottom: 8, color: 'white' }}>Demo Accounts (Password matches username + '123' / 'dev123'):</p>
                    <ul style={{ listStyleType: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <li>• Admin: <code style={{ color: 'var(--primary-hover)' }}>admin@test.com</code> (admin123)</li>
                        <li>• Manager: <code style={{ color: 'var(--primary-hover)' }}>manager@test.com</code> (manager123)</li>
                        <li>• Developer: <code style={{ color: 'var(--primary-hover)' }}>developer@test.com</code> (dev123)</li>
                        <li>• Tester: <code style={{ color: 'var(--primary-hover)' }}>tester@test.com</code> (tester123)</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

export default Login;
