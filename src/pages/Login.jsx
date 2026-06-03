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
        <div style={{ maxWidth: 400, margin: '50px auto', padding: 20 }}>
            <h2>Login</h2>
            <form onSubmit={handleSubmit}>
                <input type="email" placeholder="Email" required onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
                <input type="password" placeholder="Password" required onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} style={{ width: '100%', padding: 10, margin: '10px 0' }} />
                <button type="submit" disabled={loading} data-testid="login-btn" style={{ width: '100%', padding: 10 }}>Login</button>
                {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
        </div>
    );
}

export default Login;
