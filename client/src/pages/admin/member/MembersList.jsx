import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

function MembersList() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 4;

    // --- STATE CHO BỘ LỌC ---
    const [role, setRole] = useState('');
    const [status, setStatus] = useState('');

    // --- GỌI API ---
    const fetchMembers = useCallback(async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (role) queryParams.append('role', role);
            if (status) queryParams.append('status', status);

            const response = await fetch(`http://localhost:5000/api/users?${queryParams.toString()}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
            });
            const data = await response.json();
            setMembers(data.users || data); 
        } catch (err) { 
            console.error(err); 
        } finally { 
            setLoading(false); 
        }
    }, [role, status]);

    useEffect(() => {
        document.title = "Danh sách thành viên | TaskFlow";
        setCurrentPage(1); 
        fetchMembers();
    }, [fetchMembers]);

    const handleReset = () => {
        setRole('');
        setStatus('');
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn vô hiệu hóa (khóa) thành viên này?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}/status`, {
                    method: 'PUT', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                    },
                    body: JSON.stringify({ status: 'inactive' }) 
                });
                if (response.ok) {
                    fetchMembers(); // Tải lại danh sách sau khi khóa
                } else {
                    const data = await response.json();
                    alert(data.message || 'Không thể khóa thành viên này.');
                }
            } catch (error) {
                console.error("Lỗi khi khóa:", error);
                alert("Đã xảy ra lỗi hệ thống!");
            }
        }
    };

    const handleRestore = async (id) => {
        if (window.confirm('Bạn muốn khôi phục (mở khóa) hoạt động cho thành viên này?')) {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}/status`, {
                    method: 'PUT', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                    },
                    body: JSON.stringify({ status: 'active' }) 
                });
                if (response.ok) {
                    fetchMembers(); // Tải lại danh sách sau khi mở khóa
                } else {
                    const data = await response.json();
                    alert(data.message || 'Không thể mở khóa thành viên này.');
                }
            } catch (error) {
                console.error("Lỗi khi mở khóa:", error);
                alert("Đã xảy ra lỗi hệ thống!");
            }
        }
    };

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = members.slice(indexOfFirstUser, indexOfLastUser); 
    const totalPages = Math.ceil(members.length / usersPerPage);

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', marginTop: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Danh sách thành viên</h1>
                <button className="btn-primary" onClick={() => navigate('/admin/members/add')} >
                    + Thêm thành viên
                </button>
            </div>

            {/* --- GIAO DIỆN BỘ LỌC TÌM KIẾM --- */}
            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                        <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)}>
                            <option value="">Tất cả vai trò</option>
                            <option value="admin">Quản trị viên (Admin)</option>
                            <option value="employee">Nhân viên (Employee)</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                        <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="active">Đang hoạt động</option>
                            <option value="inactive">Đã khóa</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                        <button type="button" className="btn-secondary" onClick={handleReset}>Xóa lọc</button>
                    </div>
                </div>
            </div>
            
            <div className="data-table-container" style={{ marginTop: '32px' }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>HỌ VÀ TÊN</th>
                            <th>VAI TRÒ</th>
                            <th>TRẠNG THÁI</th>
                            <th>HÀNH ĐỘNG</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Đang tải dữ liệu...</td></tr>
                        ) : currentUsers.length === 0 ? (
                            <tr><td colSpan="4" style={{textAlign: 'center', padding: '20px'}}>Không tìm thấy thành viên nào phù hợp.</td></tr>
                        ) : (
                            currentUsers.map(m => (
                                <tr key={m.id}>
                                    <td>
                                        <div className="font-semibold">{m.full_name}</div>
                                        <div className="text-secondary" style={{fontSize: '12px'}}>{m.email}</div>
                                    </td>
                                    <td>{m.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}</td>
                                    <td>
                                        <span className={`status-badge ${m.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                            {m.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn-view" title="Xem chi tiết" onClick={() => navigate(`/admin/members/view/${m.id}`)}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                        
                                        <button className="btn-edit" title="Sửa thông tin" onClick={() => navigate(`/admin/members/edit/${m.id}`)}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        
                                        {m.status === 'active' ? (
                                            <button className="btn-delete" title="Khóa tài khoản" onClick={() => handleDelete(m.id)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        ) : (
                                            <button className="btn-restore" title="Mở khóa tài khoản" onClick={() => handleRestore(m.id)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && members.length > usersPerPage && (
                <div className="pagination-container">
                    <button className="btn-page" disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)}>Trước</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button key={page} className={`btn-page ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <button className="btn-page" disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)}>Sau</button>
                </div>
            )}
        </div>
    );
}

export default MembersList;