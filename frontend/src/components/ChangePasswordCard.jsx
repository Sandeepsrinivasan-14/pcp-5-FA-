import React, { useState } from 'react';
import API from '../services/api';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

function ChangePasswordCard() {
    const [form, setForm] = useState(EMPTY);
    const [status, setStatus] = useState({ error: null, success: null });
    const [saving, setSaving] = useState(false);

    const update = (field) => (event) => {
        setForm({ ...form, [field]: event.target.value });
        setStatus({ error: null, success: null });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Caught here so a simple typo never costs a round trip.
        if (form.newPassword !== form.confirmPassword) {
            setStatus({ error: 'The two new passwords do not match.', success: null });
            return;
        }

        setSaving(true);
        try {
            const response = await API.patch('/auth/password', {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });

            // The server issues a fresh token; store it so this session keeps
            // working rather than carrying one minted before the change.
            if (response.data?.data?.token) {
                localStorage.setItem('token', response.data.data.token);
            }

            setForm(EMPTY);
            setStatus({ error: null, success: 'Password updated.' });
        } catch (error) {
            setStatus({
                error: error.response?.data?.message || 'Could not update the password.',
                success: null,
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="card" data-testid="change-password-card">
            <h3 className="card-title">Change password</h3>

            <form onSubmit={handleSubmit} data-testid="change-password-form">
                <div className="form-group">
                    <label htmlFor="currentPassword">Current password</label>
                    <input
                        type="password"
                        id="currentPassword"
                        className="form-control"
                        autoComplete="current-password"
                        required
                        value={form.currentPassword}
                        onChange={update('currentPassword')}
                        data-testid="current-password-input"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="newPassword">New password</label>
                    <input
                        type="password"
                        id="newPassword"
                        className="form-control"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        value={form.newPassword}
                        onChange={update('newPassword')}
                        data-testid="new-password-input"
                    />
                    <small style={{ color: 'var(--text-secondary)' }}>
                        At least 8 characters.
                    </small>
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm new password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        className="form-control"
                        autoComplete="new-password"
                        required
                        value={form.confirmPassword}
                        onChange={update('confirmPassword')}
                        data-testid="confirm-password-input"
                    />
                </div>

                <button
                    type="submit"
                    className="btn"
                    disabled={saving}
                    data-testid="change-password-btn"
                >
                    {saving ? 'Updating…' : 'Update password'}
                </button>

                {status.error && (
                    <div className="error-alert" style={{ marginTop: 16 }} data-testid="change-password-error">
                        <span>⚠️</span> {status.error}
                    </div>
                )}
                {status.success && (
                    <div
                        style={{ marginTop: 16, color: 'var(--success)', fontWeight: 600 }}
                        data-testid="change-password-success"
                    >
                        {status.success}
                    </div>
                )}
            </form>
        </div>
    );
}

export default ChangePasswordCard;
