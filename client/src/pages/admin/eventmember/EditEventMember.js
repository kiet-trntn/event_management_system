import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditEventMember() {
    const { eventId, userId } = useParams(); 
    const navigate = useNavigate();

    const [roleInEvent, setRoleInEvent] = useState('member');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        document.title = "Cập nhật vai trò thành viên | TaskFlow";
    }, [eventId, userId]);

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
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Mã nhân viên đang sửa</label>
                        <input type="text" className="form-input" value={`#${userId}`} disabled style={{ backgroundColor: '#f3f4f6' }} />
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
            </div>
        </div>
    );
}

export default EditEventMember;