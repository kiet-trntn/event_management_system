import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditEventMember() {
    const { eventId, userId } = useParams(); 
    const navigate = useNavigate();

    const [roleInEvent, setRoleInEvent] = useState('member'); // Sẽ được đè lại bằng dữ liệu thật
    const [userName, setUserName] = useState(''); // Thêm state để lưu tên nhân viên
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true); // Trạng thái đang tải dữ liệu cũ

    useEffect(() => {
        document.title = "Cập nhật vai trò thành viên | TaskFlow";
        
        const fetchMemberDetails = async () => {
            try {
                // Gọi API lấy danh sách thành viên trong sự kiện
                const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok && data.members) {
                    // Tìm đúng nhân viên đang cần sửa dựa vào userId trên URL
                    const currentMember = data.members.find(m => m.id.toString() === userId.toString());
                    
                    if (currentMember) {
                        setRoleInEvent(currentMember.role_in_event); // Gán đúng chức vụ hiện tại vào ô Select
                        setUserName(currentMember.full_name); // Lưu lại tên để hiển thị cho đẹp
                    } else {
                        Swal.fire('Lỗi', 'Không tìm thấy thành viên này trong sự kiện', 'error').then(() => navigate(-1));
                    }
                }
            } catch (error) {
                console.error("Lỗi tải thông tin:", error);
            } finally {
                setFetching(false);
            }
        };

        fetchMemberDetails();
    }, [eventId, userId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`http://localhost:5000/api/events/${eventId}/members/${userId}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                body: JSON.stringify({
                    role_in_event: roleInEvent
                })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire('Thành công!', 'Đã cập nhật vai trò thành viên.', 'success').then(() => {
                    navigate(`/admin/events/${eventId}/members`); 
                });
            } else {
                Swal.fire('Thất bại!', data.message || 'Không thể cập nhật vai trò', 'error');
            }
        } catch (error) {
            console.error("Lỗi cập nhật vai trò:", error);
            Swal.fire('Lỗi hệ thống!', 'Vui lòng thử lại sau', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(`/admin/events/${eventId}/members`)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Về danh sách thành viên
                </button>
                <h3>Cập nhật vai trò</h3>
            </div>

            <div className="form-card">
                {fetching ? (
                    <div className="text-center text-secondary py-4">Đang tải dữ liệu nhân viên...</div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Nhân viên đang sửa</label>
                            {/* 🌟 Đã cập nhật: Hiển thị cả Mã ID và Tên nhân viên */}
                            <input 
                                type="text" 
                                className="form-input" 
                                value={`#${userId} ${userName ? `- ${userName}` : ''}`} 
                                disabled 
                                style={{ backgroundColor: '#f3f4f6', fontWeight: '500' }} 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Chọn vai trò mới <span className="text-error">*</span></label>
                            <select 
                                className="form-input" 
                                value={roleInEvent}
                                onChange={(e) => setRoleInEvent(e.target.value)}
                            >
                                <option value="member">Thành viên (Member)</option>
                                <option value="coordinator">Điều phối viên (Coordinator)</option>
                            </select>
                        </div>

                        <div className="form-actions" style={{ marginTop: '32px' }}>
                            <button type="button" className="btn-secondary" onClick={() => navigate(`/admin/events/${eventId}/members`)}>
                                Hủy bỏ
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

export default EditEventMember;