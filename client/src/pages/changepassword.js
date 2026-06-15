import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ChangePassword() {
    const navigate = useNavigate(); 
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [message, setMessage] = useState({ type: '', text: '' });
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        document.title = "Change Password | TASKFLOW";
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'New password and confirmation do not match!' });
            return;
        }

        try {
            const token = localStorage.getItem('my_token');
            if (!token) {
                setMessage({ type: 'error', text: 'Phiên đăng nhập đã hết hạn!' });
                return;
            }

            const response = await fetch('http://localhost:5000/api/auth/change-password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ 
                    oldPassword: oldPassword, 
                    newPassword: newPassword, 
                    confirmPassword: confirmPassword 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage({ type: 'error', text: data.message || 'Update failed!' });
                return;
            }
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

        } catch (error) {
            console.error('Lỗi:', error);
            setMessage({ type: 'error', text: 'Lỗi kết nối đến Server.' });
        }
    };

    const handleCancel = () => {
        if (user?.role === 'admin') {
            navigate('/admin');
        } else {
            navigate('/staff');
        }
    };

return (
    <div className="password-container">
        <div className="password-settings-layout">
            <div className="password-card-header">
                <h3>Update Password</h3>
                <p>Ensure your account is using a long, random password to stay secure.</p>
                <p style={{ marginTop: '12px', fontSize: '13px' }}>
                    Use a minimum of 8 characters including letters, numbers and special characters for optimal security.
                </p>
            </div>

            <div className="password-fields-wrapper">
                {message.text && (
                    <div className={`alert-message ${message.type}`}>
                        {message.text}
                    </div>
                )}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="current-password">Current Password</label>
                        <input 
                            type="password" 
                            id="current-password" 
                            className="form-input" 
                            required 
                            placeholder="Enter current password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label" htmlFor="new-password">New Password</label>
                        <input 
                            type="password" 
                            id="new-password" 
                            className="form-input" 
                            required 
                            placeholder="Enter new password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
                        <input 
                            type="password" 
                            id="confirm-password" 
                            className="form-input" 
                            required 
                            placeholder="Re-enter new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
                        <button type="submit" className="btn-primary">Save Changes</button>
                    </div>
                </form>
            </div>

        </div>
    </div>
);
}

export default ChangePassword;