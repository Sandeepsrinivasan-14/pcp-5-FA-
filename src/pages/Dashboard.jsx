import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { Link } from 'react-router-dom';

function Dashboard() {
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({ students: 0, companies: 0, drives: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const students = await API.get('/students?limit=1');
                const companies = await API.get('/companies');
                setStats({ students: students.data.total || 0, companies: companies.data.total || 0, drives: 0 });
            } catch (error) {
                console.error(error);
            }
        };
        fetchStats();
    }, []);

    return (
        <div>
            <nav style={{ display: 'flex', gap: 20, padding: 10, background: '#333', color: 'white' }}>
                <Link to="/dashboard" style={{ color: 'white' }}>Dashboard</Link>
                <Link to="/students" style={{ color: 'white' }}>Students</Link>
                <Link to="/companies" style={{ color: 'white' }}>Companies</Link>
                <button onClick={logout} style={{ marginLeft: 'auto' }}>Logout</button>
            </nav>
            <div style={{ padding: 20 }}>
                <h1>Welcome, {user?.name}!</h1>
                <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
                    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 5, flex: 1 }}>
                        <h3>Total Students</h3>
                        <p data-testid="total-students">{stats.students}</p>
                    </div>
                    <div style={{ padding: 20, border: '1px solid #ccc', borderRadius: 5, flex: 1 }}>
                        <h3>Total Companies</h3>
                        <p data-testid="total-companies">{stats.companies}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
