import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

function EventMembers() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');

    const [members, setMembers] = useState([]);
    const [totalMembers, setTotalMembers] = useState(0);
    const [eventStatus, setEventStatus] = useState(''); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timerId = setTimeout(() => { setDebouncedSearch(search); }, 500); 
        return () => clearTimeout(timerId);
    }, [search]);

    const fetchEventData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const eventRes = await fetch(`http://localhost:5000/api/events/${eventId}`, { headers });
            if (eventRes.ok) {
                const eventData = await eventRes.json();
                setEventStatus(eventData.status);
            }

            const queryParams = new URLSearchParams();
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
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
    }, [eventId, debouncedSearch, filterStatus]); 

    useEffect(() => {
        document.title = "Thành viên sự kiện | TaskFlow";
        fetchEventData();
    }, [fetchEventData]);
    
    const isEditable = (eventStatus === 'Nháp' || eventStatus === 'Sắp diễn ra');

    const handleResetFilter = () => {
        setSearch('');
        setFilterStatus('');
    };

    // --- LOGIC THÊM THÀNH VIÊN BẰNG POPUP (MODAL) ---
    const handleAddMemberPopup = async () => {
        try {
            const res = await fetch(`http://localhost:5000/api/users/available/${eventId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await res.json();
            const availableUsers = data.users || [];

            if (availableUsers.length === 0) {
                return Swal.fire('Thông báo', 'Tất cả nhân viên hợp lệ đều đã tham gia sự kiện này.', 'info');
            }

            const inputOptions = {};
            availableUsers.forEach(u => {
                inputOptions[u.id] = `#${u.id} - ${u.full_name}`;
            });

            const { value: selectedUserId } = await Swal.fire({
                title: 'Thêm thành viên mới',
                input: 'select',
                inputOptions: inputOptions,
                inputPlaceholder: '--- Chọn nhân viên ---',
                showCancelButton: true,
                confirmButtonColor: '#3b82f6',
                cancelButtonColor: '#9ca3af',
                confirmButtonText: 'Thêm vào sự kiện',
                cancelButtonText: 'Hủy bỏ',
                inputValidator: (value) => {
                    if (!value) return 'Vui lòng chọn một nhân viên!';
                }
            });

            if (selectedUserId) {
                Swal.fire({ title: 'Đang xử lý...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
                
                const addRes = await fetch(`http://localhost:5000/api/events/${eventId}/members`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                    },
                    body: JSON.stringify({ user_id: selectedUserId })
                });

                if (addRes.ok) {
                    Swal.fire('Thành công!', 'Đã thêm thành viên vào sự kiện.', 'success');
                    fetchEventData(); 
                } else {
                    const errorData = await addRes.json();
                    Swal.fire('Lỗi', errorData.message || 'Không thể thêm thành viên', 'error');
                }
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Không thể kết nối đến máy chủ', 'error');
        }
    };

    // --- LOGIC XÓA (CÓ XÁC NHẬN NẾU VƯỚNG TASK) ---
    const handleDeleteMember = async (memberId) => {
        const result = await Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: "Thành viên này sẽ bị xóa khỏi sự kiện!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#9ca3af',
            confirmButtonText: 'Có, xóa ngay!',
            cancelButtonText: 'Hủy bỏ'
        });

        if (result.isConfirmed) {
            try {
                const res1 = await fetch(`http://localhost:5000/api/events/${eventId}/members/${memberId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data1 = await res1.json();

                if (res1.ok) {
                    Swal.fire('Đã xóa!', 'Thành viên đã được xóa khỏi sự kiện.', 'success');
                    fetchEventData(); 
                } 
                else if (res1.status === 409 && data1.need_confirm) {
                    const confirmResult = await Swal.fire({
                        title: 'Thành viên đang có công việc!',
                        html: `Người này đang phụ trách <b>${data1.affected_task_count}</b> công việc chưa hoàn thành.<br/><br/>Nếu tiếp tục xóa, các công việc này sẽ bị gỡ người phụ trách. Bạn có chắc chắn không?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#ef4444',
                        cancelButtonColor: '#9ca3af',
                        confirmButtonText: 'Đồng ý xóa & Gỡ việc',
                        cancelButtonText: 'Hủy bỏ'
                    });

                    if (confirmResult.isConfirmed) {
                        const res2 = await fetch(`http://localhost:5000/api/events/${eventId}/members/${memberId}?confirm=true`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                        });
                        const data2 = await res2.json();

                        if (res2.ok) {
                            Swal.fire('Đã xóa!', 'Thành viên đã bị xóa và các công việc đã được trả về trạng thái chưa phân công.', 'success');
                            fetchEventData();
                        } else {
                            Swal.fire('Lỗi!', data2.message, 'error');
                        }
                    }
                } 
                else {
                    Swal.fire('Lỗi!', data1.message || 'Không thể xóa thành viên này.', 'error');
                }
            } catch (error) {
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
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
                        <button className="btn-primary" onClick={handleAddMemberPopup}>
                            + Thêm thành viên
                        </button>
                    )}
                </div>
            </div>

            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px', marginTop: '24px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    
                    <div style={{ flex: '2 1 250px' }}>
                        <input 
                            type="text" 
                            className="form-input" 
                            placeholder="Tìm kiếm họ tên, email, số điện thoại..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            style={{ padding: '6px 12px', height: '36px' }}
                        />
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
                                <th style={{ textAlign: 'center' }}>Trạng thái TK</th>
                                <th style={{ textAlign: 'center' }}>Ngày tham gia</th>
                                {isEditable && <th style={{ textAlign: 'center' }}>Hành động</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member) => (
                                <tr key={member.id}>
                                    <td className="font-semibold">#{member.user_id}</td>
                                    <td>
                                        <div className="font-semibold">{member.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            {member.email} • {member.phone || 'Chưa có SĐT'}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className={`status-badge ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                            {member.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {new Date(member.created_at).toLocaleDateString('vi-VN')}
                                    </td>
                                    
                                    {isEditable && (
                                        <td style={{ textAlign: 'center' }}>
                                            <button 
                                                className="btn-delete" 
                                                title="Xóa khỏi sự kiện"
                                                onClick={() => handleDeleteMember(member.user_id)}
                                            >
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
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