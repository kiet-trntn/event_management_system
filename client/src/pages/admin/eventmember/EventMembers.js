import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function EventMembers() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [members, setMembers] = useState([]);
    const [totalMembers, setTotalMembers] = useState(0);
    const [loading, setLoading] = useState(true);

    // 🌟 Đưa fetchMembers ra ngoài và bọc bằng useCallback
    const fetchMembers = useCallback(async () => {
        try {
            const response = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            if (response.ok) {
                setMembers(data.members || []);
                setTotalMembers(data.total_members || (data.members ? data.members.length : 0));
            } else {
                Swal.fire('Lỗi!', data.message || 'Không thể tải danh sách thành viên', 'error');
            }
        } catch (error) {
            console.error("Lỗi khi tải thành viên:", error);
        } finally {
            setLoading(false);
        }
    }, [eventId]); 

    // 🌟 useEffect bây giờ chỉ gọi hàm một cách sạch sẽ
    useEffect(() => {
        document.title = "Thành viên sự kiện | TaskFlow";
        fetchMembers();
    }, [fetchMembers]);

    const translateRole = (role) => {
        if(role === 'coordinator') return 'Điều phối viên';
        return 'Thành viên';
    };
    
    const handleDeleteMember = (memberId) => {
        Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: "Thành viên này sẽ bị xóa khỏi sự kiện!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Có, xóa ngay!',
            cancelButtonText: 'Hủy bỏ'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const response = await fetch(`http://localhost:5000/api/events/${eventId}/members/${memberId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                    });
                    const data = await response.json();
                    
                    if (response.ok) {
                        Swal.fire('Đã xóa!', 'Thành viên đã được xóa khỏi sự kiện.', 'success');
                        fetchMembers(); // 🌟 Bây giờ thì gọi thoải mái, không lo lỗi nữa!
                    } else {
                        Swal.fire('Lỗi!', data.message, 'error');
                    }
                } catch (error) {
                    Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
                }
            }
        });
    };

    return (
        <div className="page-container">
            
            {/* --- HEADER --- */}
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button type="button" className="btn-back" onClick={() => navigate(`/admin/events/view/${eventId}`)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Về chi tiết sự kiện
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <h3 style={{ margin: 0 }}>Thành viên tham gia ({totalMembers})</h3>
                    <button className="btn-primary" onClick={() => navigate(`/admin/events/${eventId}/members/add`)}>
                        + Thêm thành viên
                    </button>
                </div>
            </div>

            {/* --- DANH SÁCH THÀNH VIÊN --- */}
            {loading ? (
                <div className="text-center text-secondary mb-6 mt-6">Đang tải danh sách...</div>
            ) : members.length === 0 ? (
                <div className="form-card text-center text-secondary mt-6" style={{ maxWidth: '100%' }}>
                    Sự kiện này chưa có thành viên nào tham gia.
                </div>
            ) : (
                <div style={{ marginTop: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-neutral)' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã NV</th>
                                <th>Họ và tên</th>
                                <th style={{ textAlign: 'center' }}>Vai trò</th>
                                <th style={{ textAlign: 'center' }}>Ngày tham gia</th>
                                <th style={{ textAlign: 'center' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <tr key={member.id}>
                                    <td className="font-semibold">#{member.id}</td>
                                    <td>
                                        <div className="font-semibold">{member.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {member.email}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`status-badge ${member.role_in_event === 'coordinator' ? 'status-active' : 'status-draft'}`}>
                                            {translateRole(member.role_in_event)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {new Date(member.joined_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            
                                            {/* NÚT SỬA */}
                                            <button 
                                                className="btn-edit" 
                                                title="Sửa vai trò"
                                                onClick={() => navigate(`/admin/events/${eventId}/members/edit/${member.id}`)}
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            
                                            {/* NÚT XÓA */}
                                            <button 
                                                className="btn-delete" 
                                                title="Xóa khỏi sự kiện"
                                                onClick={() => handleDeleteMember(member.id)}
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>

                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default EventMembers;