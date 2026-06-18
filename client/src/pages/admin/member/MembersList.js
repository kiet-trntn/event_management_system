import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MembersList() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;

    useEffect(() => {
<<<<<<< HEAD
=======
        document.title = "Danh sách thành viên | TOOF";
>>>>>>> main
        const fetchMembers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                setMembers(data);
            } catch (err) { 
                console.error(err); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchMembers();
    }, []);

<<<<<<< HEAD
    // HÀM KHÓA THÀNH VIÊN
=======
>>>>>>> main
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
                    setMembers(prevMembers => prevMembers.map(m => 
                        m.id === id ? { ...m, status: 'inactive' } : m
                    ));
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

<<<<<<< HEAD
    // 🌟 HÀM MỚI: MỞ KHÓA THÀNH VIÊN
    const handleRestore = async (id) => {
        if (window.confirm('Bạn muốn khôi phục (mở khóa) hoạt động cho thành viên này?')) {
            try {
                // Vẫn gọi đến API updateStatus nhưng gửi chữ 'active'
=======
    const handleRestore = async (id) => {
        if (window.confirm('Bạn muốn khôi phục (mở khóa) hoạt động cho thành viên này?')) {
            try {
>>>>>>> main
                const response = await fetch(`http://localhost:5000/api/users/${id}/status`, {
                    method: 'PUT', 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}` 
                    },
<<<<<<< HEAD
                    body: JSON.stringify({ status: 'active' }) // Ép trạng thái thành 'active'
                });
                
                if (response.ok) {
                    // Đổi trạng thái trên giao diện thành 'active' (màu xanh)
=======
                    body: JSON.stringify({ status: 'active' }) 
                });
                
                if (response.ok) {
>>>>>>> main
                    setMembers(prevMembers => prevMembers.map(m => 
                        m.id === id ? { ...m, status: 'active' } : m
                    ));
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Danh sách thành viên</h1>
                <button className="btn-primary" onClick={() => navigate('/admin/members/add')} >
                    + Thêm thành viên
                </button>
            </div>
            
            <div className="data-table-container">
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
                            <tr><td colSpan="4" style={{textAlign: 'center'}}>Đang tải dữ liệu...</td></tr>
                        ) : currentUsers.length === 0 ? (
                            <tr><td colSpan="4" style={{textAlign: 'center'}}>Không có thành viên nào.</td></tr>
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
<<<<<<< HEAD
    {/* Nút Xem (Icon Con Mắt) */}
    <button className="btn-view" title="Xem chi tiết" onClick={() => navigate(`/admin/members/view/${m.id}`)}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    </button>
    
    {/* Nút Sửa (Icon Cây Bút) */}
    <button className="btn-edit" title="Sửa thông tin" onClick={() => navigate(`/admin/members/edit/${m.id}`)}>
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    </button>
    
    {/* Nút Khóa / Mở Khóa */}
    {m.status === 'active' ? (
        // Nút Khóa (Icon Thùng rác đỏ)
        <button className="btn-delete" title="Khóa tài khoản" onClick={() => handleDelete(m.id)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
    ) : (
        // Nút Mở Khóa (Icon Khôi phục xanh lá)
        <button className="btn-restore" title="Mở khóa tài khoản" onClick={() => handleRestore(m.id)}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        </button>
    )}
</td>
=======
                                        {/* Nút Xem (Icon Con Mắt) */}
                                        <button className="btn-view" title="Xem chi tiết" onClick={() => navigate(`/admin/members/view/${m.id}`)}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                        
                                        {/* Nút Sửa (Icon Cây Bút) */}
                                        <button className="btn-edit" title="Sửa thông tin" onClick={() => navigate(`/admin/members/edit/${m.id}`)}>
                                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </button>
                                        
                                        {/* Nút Khóa / Mở Khóa */}
                                        {m.status === 'active' ? (
                                            // Nút Khóa (Icon Thùng rác đỏ)
                                            <button className="btn-delete" title="Khóa tài khoản" onClick={() => handleDelete(m.id)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        ) : (
                                            // Nút Mở Khóa (Icon Khôi phục xanh lá)
                                            <button className="btn-restore" title="Mở khóa tài khoản" onClick={() => handleRestore(m.id)}>
                                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                            </button>
                                        )}
                                    </td>
>>>>>>> main
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Thanh phân trang */}
            {!loading && members.length > usersPerPage && (
                <div className="pagination-container">
                    <button 
                        className="btn-page" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button 
                            key={page} 
                            className={`btn-page ${currentPage === page ? 'active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                    ))}
                    <button 
                        className="btn-page" 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
}

export default MembersList;