import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Link } from 'react-router-dom';

function Companies() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCompanies = async () => {
            try {
                const response = await API.get('/companies');
                setCompanies(response.data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchCompanies();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <nav style={{ display: 'flex', gap: 20, padding: 10, background: '#333', color: 'white' }}>
                <Link to="/dashboard" style={{ color: 'white' }}>Dashboard</Link>
                <Link to="/students" style={{ color: 'white' }}>Students</Link>
                <Link to="/companies" style={{ color: 'white' }}>Companies</Link>
            </nav>
            <div style={{ padding: 20 }}>
                <h1>Companies</h1>
                <button data-testid="add-company-btn" onClick={() => alert('Add company feature')}>Add Company</button>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
                    <thead>
                        <tr><th style={{ border: '1px solid #ddd', padding: 8 }}>Name</th><th style={{ border: '1px solid #ddd', padding: 8 }}>Role</th><th style={{ border: '1px solid #ddd', padding: 8 }}>Package (LPA)</th><th style={{ border: '1px solid #ddd', padding: 8 }}>Status</th></tr>
                    </thead>
                    <tbody>
                        {companies.map(company => (
                            <tr key={company._id}>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{company.name}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{company.role}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{company.package}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{company.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Companies;
