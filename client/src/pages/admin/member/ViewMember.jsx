import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
                    setMember(data.user || data); 
                } else {
                    alert(data.message || 'Không tìm thấy thông tin thành viên.');
                    navigate('/admin/members');
                }
            } catch (error) {
                console.error('Lỗi chi tiết:', error);
                alert('Lỗi kết nối hệ thống!');
            } finally {
                setLoading(false);
            }
        };
        fetchMemberDetails();
    }, [id, navigate]);

    // Hàm format ngày tháng (có tùy chọn hiển thị cả giờ phút)
    const formatDate = (dateString, includeTime = false) => {
        if (!dateString) return 'Chưa cập nhật';
        const date = new Date(dateString);
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return date.toLocaleDateString('vi-VN', options);
    };

    const getGenderText = (gender) => {
        if (gender === 'male') return 'Nam';
        if (gender === 'female') return 'Nữ';
        if (gender === 'other') return 'Khác';
        return 'Chưa cập nhật';
    };

    if (loading) {
        return <div className="page-container text-center">Đang tải dữ liệu...</div>;
    }

    if (!member) return null; 

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3 className="m-0 font-semibold text-lg">Hồ sơ nhân sự</h3>
            </div>

            <div className="form-card profile-card" style={{ maxWidth: '800px', margin: '0 auto', padding: '32px' }}>
                
                {/* Header Profile */}
                <div className="profile-header-info" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#2563EB', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 'bold', flexShrink: 0 }}>
                        {/* Logic mới: Lấy chữ cái đầu của Họ và Tên */}
                        {member?.full_name ? (
                            (() => {
                                const names = member.full_name.trim().split(' ');
                                if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
                                return (names[0][0] + names[names.length - 1][0]).toUpperCase();
                            })()
                        ) : "US"}
                    </div>
                    
                    {/* Thêm display: 'flex' vào đây để Tên và Trạng thái nằm ngang hàng */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '22px', color: '#111827', fontWeight: 'bold' }}>
                            {member.full_name}
                        </h2>
                        <span className={`status-badge ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                            {member.status === 'active' ? 'Đang hoạt động' : 'Tài khoản đã khóa'}
                        </span>
                    </div>
                </div>

                {/* Khung lưới 2 cột đồng bộ với trang Profile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px', paddingBottom: '24px' }}>
                    
                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Mã nhân viên (ID)</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '600', marginTop: '4px' }}>#{member.id}</div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Địa chỉ Email</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{member.email}</div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Số điện thoại</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{member.phone || 'Chưa cập nhật'}</div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Vai trò hệ thống</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                            {member.role === 'admin' ? 'Quản trị viên (Admin)' : 'Nhân viên (Employee)'}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Giới tính</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{getGenderText(member.gender)}</div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Ngày sinh</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{formatDate(member.date_of_birth)}</div>
                    </div>

                    <div>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Ngày tạo tài khoản</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{formatDate(member.created_at, true)}</div>
                    </div>

                    {/* Địa chỉ và Tiểu sử chiếm full 2 cột */}
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Địa chỉ</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>{member.address || 'Chưa cập nhật'}</div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Tiểu sử (Bio)</label>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: '500', marginTop: '4px', lineHeight: '1.6' }}>{member.bio || 'Chưa cập nhật'}</div>
                    </div>

                </div>

                <div className="profile-actions" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-primary" onClick={() => navigate(`/admin/members/edit/${member.id}`)}>
                        Chỉnh sửa thông tin
                    </button>
                </div>

            </div>
        </div>
    );
}

export default ViewMember;