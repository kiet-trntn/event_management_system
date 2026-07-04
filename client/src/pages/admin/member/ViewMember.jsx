import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function ViewMember() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Xem thông tin thành viên | TaskFlow";
        const fetchMemberDetails = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                if (response.ok) {
                    setMember(data);
                } else {
                    alert(data.message || 'Không tìm thấy thông tin thành viên.');
                    navigate('/admin/members');
                }
                }catch (error) {
                    console.error('Lỗi chi tiết:', error);
                    alert('Lỗi kết nối hệ thống!');
                } finally {
                    setLoading(false);
                }
            };
        fetchMemberDetails();
    }, [id, navigate]);
const formatDate = (dateString) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return <div className="page-container text-center">Đang tải dữ liệu...</div>;
    }

    if (!member) return null; 

    return (
        <div className="page-container member-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3 className="m-0 font-semibold text-lg">Hồ sơ nhân sự</h3>
            </div>

            {/* Dùng class mới: profile-card kết hợp với form-card để lấy viền và đổ bóng */}
            <div className="form-card profile-card">
                
                <div className="profile-header-info">
                    <div className="profile-avatar">
                                {member?.full_name ? member.full_name.substring(0, 2).toUpperCase() : "US"}
                            </div>
                    <h2 className="profile-name">
                        {member.full_name}
                    </h2>
                    <span className={`status-badge ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                        {member.status === 'active' ? 'Đang hoạt động' : 'Tài khoản đã khóa'}
                    </span>
                </div>

                <div className="profile-details-section">
                    
                    <div className="profile-info-row">
                        <div className="profile-info-label">Mã nhân viên (ID)</div>
                        <div className="profile-info-value bold">#{member.id}</div>
                    </div>

                    <div className="profile-info-row">
                        <div className="profile-info-label">Địa chỉ Email</div>
                        <div className="profile-info-value">{member.email}</div>
                    </div>

                    <div className="profile-info-row">
                        <div className="profile-info-label">Vai trò hệ thống</div>
                        <div className="profile-info-value">
                            {member.role === 'admin' ? 'Quản trị viên (Admin)' : 'Nhân viên (Employee)'}
                        </div>
                    </div>

                    <div className="profile-info-row">
                        <div className="profile-info-label">Ngày tạo tài khoản</div>
                        <div className="profile-info-value">
                            {formatDate(member.created_at)}
                        </div>
                    </div>

                </div>

                <div className="profile-actions">
                    <button className="btn-edit-large" onClick={() => navigate(`/admin/members/edit/${member.id}`)}>
                        Chỉnh sửa thông tin
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ViewMember;