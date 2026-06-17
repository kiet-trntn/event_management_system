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
        document.title = "Đổi Mật Khẩu | TASKFLOW";
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp!' });
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
                setMessage({ type: 'error', text: data.message || 'Cập nhật mật khẩu thất bại!' });
                return;
            }
            setMessage({ type: 'success', text: 'Mật khẩu đã được cập nhật thành công!' });
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
        <div className="page-container">
            <div className="password-settings-layout">
                
                {/* --- CỘT TRÁI: TEXT --- */}
                <div className="password-card-header">
                    <h3>Đổi Mật Khẩu</h3>
                    <p>Đảm bảo tài khoản của bạn đang sử dụng mật khẩu dài và ngẫu nhiên để giữ an toàn.</p>
                    <p style={{ marginTop: '12px', fontSize: '13px' }}>
                        Sử dụng tối thiểu 8 ký tự bao gồm chữ cái, số và ký tự đặc biệt để đảm bảo an toàn tối ưu.
                    </p>
                </div>

                {/* --- CỘT PHẢI: FORM --- */}
                <div className="form-card">
                    {message.text && (
                        <div className={`alert-message ${message.type}`}>
                            {message.text}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label" htmlFor="current-password">Mật khẩu hiện tại</label>
                            <input 
                                type="password" 
                                id="current-password" 
                                className="form-input" 
                                required 
                                placeholder="Nhập mật khẩu hiện tại"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="new-password">Mật khẩu mới</label>
                            <input 
                                type="password" 
                                id="new-password" 
                                className="form-input" 
                                required 
                                placeholder="Nhập mật khẩu mới"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label" htmlFor="confirm-password">Xác nhận Mật khẩu Mới</label>
                            <input 
                                type="password" 
                                id="confirm-password" 
                                className="form-input" 
                                required 
                                placeholder="Xác nhận mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={handleCancel}>Hủy</button>
                            <button type="submit" className="btn-primary">Lưu Thay Đổi</button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}

export default ChangePassword;