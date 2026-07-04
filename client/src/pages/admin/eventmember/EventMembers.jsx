import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function EventMembers() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    // --- TÌM KIẾM VÀ BỘ LỌC CỤC BỘ ---
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [members, setMembers] = useState([]);
    const [totalMembers, setTotalMembers] = useState(0);
    const [eventStatus, setEventStatus] = useState(''); 
    const [loading, setLoading] = useState(true);

    // Chống lag khi gõ tìm kiếm
    useEffect(() => {
        const timerId = setTimeout(() => { setDebouncedSearch(search); }, 500); 
        return () => clearTimeout(timerId);
    }, [search]);

    const fetchEventData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            // 1. Lấy trạng thái sự kiện
            const eventRes = await fetch(`http://localhost:5000/api/events/${eventId}`, { headers });
            if (eventRes.ok) {
                const eventData = await eventRes.json();
                setEventStatus(eventData.status);
            }

            // 2. Lấy danh sách thành viên (Kèm theo Bộ lọc và Tìm kiếm)
            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (filterRole) queryParams.append('role_in_event', filterRole);
            if (filterStatus) queryParams.append('status', filterStatus);

            const membersRes = await fetch(`http://localhost:5000/api/events/${eventId}/members?${queryParams.toString()}`, { headers });
            const membersData = await membersRes.json();
            
            if (membersRes.ok) {
                setMembers(membersData.members || []);
                setTotalMembers(membersData.total_members || (membersData.members ? membersData.members.length : 0));
            } else {
                Swal.fire('Lỗi!', membersData.message || 'Không thể tải danh sách', 'error');
            }
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu:", error);
        } finally {
            setLoading(false);
        }
    }, [eventId, debouncedSearch, filterRole, filterStatus]); 

    useEffect(() => {
        document.title = "Thành viên sự kiện | TaskFlow";
        fetchEventData();
    }, [fetchEventData]);

    const translateRole = (role) => {
        if(role === 'coordinator') return 'Điều phối viên';
        return 'Thành viên';
    };
    
    const isEditable = (eventStatus === 'Nháp' || eventStatus === 'Sắp diễn ra');

    const handleResetFilter = () => {
        setSearch('');
        setFilterRole('');
        setFilterStatus('');
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
                        fetchEventData(); 
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
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button type="button" className="btn-back" onClick={() => navigate(`/admin/events/view/${eventId}`)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Về chi tiết sự kiện
                </button>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                    <h3 style={{ margin: 0 }}>Thành viên tham gia ({totalMembers})</h3>
                    {isEditable && (
                        <button className="btn-primary" onClick={() => navigate(`/admin/events/${eventId}/members/add`)}>
                            + Thêm thành viên
                        </button>
                    )}
                </div>
            </div>

            {/* --- BỘ LỌC THÀNH VIÊN TRONG SỰ KIỆN TỐI GIẢN --- */}
            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px', marginTop: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    
                    {/* Ô Tìm kiếm được đưa trở lại */}
                    <div style={{ flex: '2 1 250px' }}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tìm kiếm họ tên, email..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            style={{ padding: '6px 12px', height: '36px' }}
                        />
                    </div>

                    <div style={{ flex: '1 1 180px' }}>
                        <select className="form-input" value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                            <option value="">Tất cả vai trò</option>
                            <option value="coordinator">Điều phối viên</option>
                            <option value="member">Thành viên</option>
                        </select>
                    </div>

                    <div style={{ flex: '1 1 180px' }}>
                        <select className="form-input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '6px 12px', height: '36px' }}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Đã bị khóa</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                        <button type="button" className="btn-secondary" onClick={handleResetFilter} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>Khôi phục</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-secondary mb-6 mt-6">Đang tải danh sách...</div>
            ) : members.length === 0 ? (
                <div className="form-card text-center text-secondary mt-6" style={{ maxWidth: '100%' }}>
                    Không tìm thấy thành viên nào khớp với bộ lọc.
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
                                {isEditable && <th style={{ textAlign: 'center' }}>Hành động</th>}
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
                                    
                                    {isEditable && (
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button 
                                                    className="btn-edit" 
                                                    title="Sửa vai trò"
                                                    onClick={() => navigate(`/admin/events/${eventId}/members/edit/${member.id}`)}
                                                >
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
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
                                    )}
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