import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddEventMember() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    // Khởi tạo state cho form
    const [userId, setUserId] = useState('');
    const [roleInEvent, setRoleInEvent] = useState('member');
    const [loading, setLoading] = useState(false);
    const [usersList, setUsersList] = useState([]);

    useEffect(() => {
        document.title = "Thêm thành viên mới | TaskFlow";
        
        const fetchAllUsers = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/users`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    setUsersList(data.users || data.data || data || []);
                }
            } catch (error) {
                console.error("Lỗi khi tải danh sách nhân viên:", error);
            }
        };

        fetchAllUsers();
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!userId) {
            Swal.fire('Lỗi', 'Vui lòng chọn một nhân viên', 'warning');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                body: JSON.stringify({
                    user_id: userId, 
                    role_in_event: roleInEvent
                })
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire('Thành công!', 'Đã thêm thành viên vào sự kiện.', 'success').then(() => {
                    navigate(`/admin/events/${eventId}/members`); 
                });
            } else {
                Swal.fire('Thất bại!', data.message || 'Không thể thêm thành viên', 'error');
            }
        } catch (error) {
            console.error("Lỗi thêm thành viên:", error);
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
                <h3>Thêm thành viên mới</h3>
            </div>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Chọn nhân viên <span className="text-error">*</span></label>
                        <select 
                            className="form-input" 
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                        >
                            <option value="">-- Click để chọn nhân viên --</option>
                            {usersList.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.id}. {user.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Vai trò trong sự kiện <span className="text-error">*</span></label>
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
                            {loading ? 'Đang thêm...' : 'Xác nhận thêm'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEventMember;