import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { Link } from 'react-router-dom';

function Students() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await API.get('/students');
                setStudents(response.data.data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchStudents();
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
                <h1>Students</h1>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr><th style={{ border: '1px solid #ddd', padding: 8 }}>Name</th><th style={{ border: '1px solid #ddd', padding: 8 }}>Department</th><th style={{ border: '1px solid #ddd', padding: 8 }}>CGPA</th><th style={{ border: '1px solid #ddd', padding: 8 }}>Status</th></tr>
                    </thead>
                    <tbody>
                        {students.map(student => (
                            <tr key={student._id}>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{student.name}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{student.department}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{student.cgpa}</td>
                                <td style={{ border: '1px solid #ddd', padding: 8 }}>{student.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Students;
