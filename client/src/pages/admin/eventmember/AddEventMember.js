import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddEventMember() {
    const { eventId } = useParams();
    const navigate = useNavigate();

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
            } catch (error) { console.error("Lỗi tải danh sách nhân viên:", error); }
        };
        fetchAllUsers();
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userId) return Swal.fire('Lỗi', 'Vui lòng chọn một nhân viên', 'warning');

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                },
                body: JSON.stringify({ user_id: userId, role_in_event: roleInEvent })
            });

            if (response.ok) {
                Swal.fire('Thành công!', 'Đã thêm thành viên vào sự kiện.', 'success').then(() => {
                    navigate(-1); // Quay ngược lại trang chi tiết trước đó
                });
            } else {
                const data = await response.json();
                Swal.fire('Thất bại!', data.message || 'Không thể thêm', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Lỗi hệ thống!', 'error'); }
        finally { setLoading(false); }
    };

    return (
        <div className="page-container">
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>Quay lại</button>
                <h3>Thêm thành viên mới</h3>
            </div>
            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Nhân viên <span className="text-error">*</span></label>
                        <select className="form-input" value={userId} onChange={(e) => setUserId(e.target.value)}>
                            <option value="">Chọn nhân viên</option>
                            {usersList.map((user) => <option key={user.id} value={user.id}>{user.id}. {user.full_name}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Vai trò trong sự kiện <span className="text-error">*</span></label>
                        <select className="form-input" value={roleInEvent} onChange={(e) => setRoleInEvent(e.target.value)}>
                            <option value="member">Thành viên</option>
                            <option value="coordinator">Điều phối viên</option>
                        </select>
                    </div>
                    <div className="form-actions" style={{ marginTop: '32px' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Đang thêm...' : 'Xác nhận thêm'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddEventMember;