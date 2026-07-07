import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ChangePassword() {
    const navigate = useNavigate(); 
    
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // State chặn spam click
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Lấy thông tin user an toàn, chống lỗi Crash App
    let user = null;
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) user = JSON.parse(storedUser);
    } catch (error) {
        console.error('Lỗi khi đọc dữ liệu user từ local storage');
    }

    // Hàm định dạng ngày tháng hiển thị
    const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
    };

    // Hàm dịch giới tính
    const getGenderText = (gender) => {
        if (gender === 'male') return 'Nam';
        if (gender === 'female') return 'Nữ';
        if (gender === 'other') return 'Khác';
        return 'Chưa cập nhật';
    };

    useEffect(() => {
        document.title = "Quản lý Tài khoản | TASKFLOW";
        
        const fetchMyProfile = async () => {
            try {
                const token = localStorage.getItem('my_token'); 
                
                if (!token) {
                    setLoadingProfile(false);
                    return;
                }

                const response = await fetch('http://localhost:5000/api/users/me', {
                    method: 'GET',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    setProfile(data.user || data); 
                } else {
                    console.error('Không thể lấy thông tin:', data.message);
                }
            } catch (error) {
                console.error('Lỗi khi kết nối đến API getMe:', error);
            } finally {
                setLoadingProfile(false);
            }
        };

        fetchMyProfile();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        // Validate độ dài mật khẩu 
        if (newPassword.length < 8) {
            setMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự!' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Mật khẩu mới và xác nhận mật khẩu không khớp!' });
            return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem('my_token');
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
        } finally {
            setIsSubmitting(false);
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
        <div className="page-container profile-page">
            <div className="page-header-form">
                <h3>Quản lý Tài khoản</h3>
            </div>
            
            {/* Flex-wrap giúp tự động gập thành 1 cột trên Mobile */}
            <div className="password-settings-layout" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                
                {/* --- CỘT TRÁI: THÔNG TIN CÁ NHÂN --- */}
                <div className="form-card profile-info-section" style={{ flex: '1', minWidth: '300px', padding: '24px', backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', flexShrink: 0 }}>
                            {loadingProfile 
                                ? '...' 
                                : (profile?.full_name ? profile.full_name.substring(0, 2).toUpperCase() : 'ME')
                            }
                        </div>
                        
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', color: '#111827', fontWeight: 'bold' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.full_name || 'Không có tên')}
                            </h2>
                            <span style={{ display: 'inline-block', marginTop: '6px', padding: '4px 12px', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                                {loadingProfile ? '...' : (profile?.role === 'admin' ? 'Quản trị viên' : 'Nhân viên')}
                            </span>
                        </div>
                    </div>
                    
                    {/* Bắt đầu khu vực Grid 2 cột */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Mã nhân viên (ID)</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.id ? `#${profile.id}` : '---')}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Địa chỉ Email</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.email || 'Chưa cập nhật')}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Số điện thoại</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.phone || 'Chưa cập nhật')}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Giới tính</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : getGenderText(profile?.gender)}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Ngày sinh</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : formatDate(profile?.date_of_birth)}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Ngày tham gia</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : formatDate(profile?.created_at)}
                            </div>
                        </div>

                        {/* Địa chỉ cho chiếm full 2 cột vì thường văn bản sẽ dài */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Địa chỉ</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.address || 'Chưa cập nhật')}
                            </div>
                        </div>

                        {/* Tiểu sử (Bio) cũng cho full 2 cột */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Tiểu sử</label>
                            <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px', lineHeight: '1.5' }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.bio || 'Chưa có tiểu sử')}
                            </div>
                        </div>

                        {/* Trạng thái tài khoản */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Trạng thái tài khoản</label>
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                marginTop: '4px',
                                color: profile?.status === 'active' ? '#10B981' : '#EF4444' 
                            }}>
                                {loadingProfile ? 'Đang tải...' : (profile?.status === 'active' ? 'Đang hoạt động' : 'Đã khóa')}
                            </div>
                        </div>
                    </div>
                    {/* Kết thúc khu vực Grid 2 cột */}
                </div>

                {/* --- CỘT PHẢI: FORM ĐỔI MẬT KHẨU --- */}
                <div className="form-card" style={{ flex: '1.5', minWidth: '300px' }}>
                    <div className="password-card-header" style={{ marginBottom: '20px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Đổi Mật Khẩu</h4>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>Sử dụng tối thiểu 8 ký tự bao gồm chữ cái, số và ký tự đặc biệt để đảm bảo an toàn tối ưu.</p>
                    </div>

                    {message.text && (
                        <div className={`alert-message ${message.type}`} style={{ marginBottom: '20px' }}>
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
                                minLength="8" 
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
                                minLength="8"
                                placeholder="Xác nhận mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                        
                        <div className="form-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                            <button type="button" className="btn-secondary" onClick={handleCancel}>Hủy</button>
                            <button type="submit" className="btn-primary" disabled={isSubmitting}>
                                {isSubmitting ? 'Đang cập nhật...' : 'Lưu Thay Đổi'}
                            </button>
                        </div>
                    </form>
                </div>

            </div>
        </div>
    );
}

export default ChangePassword;