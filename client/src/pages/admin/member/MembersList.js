import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function MembersList() {
    const navigate = useNavigate();
    const [members, setMembers] = useState([]);
    const [IsLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        document.title = "Danh sách thành viên | TaskFlow";
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('my_token');

            if (!token) {
                throw new Error("Phiên đăng nhập đã hết hạn, vui lòng đăng xuất và đăng nhập lại!");
            }

            const response = await fetch('http://localhost:5000/api/users', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Lỗi khi lấy danh sách thành viên');
            }

            setMembers(data.users || data);
            setError(null);

        } catch (err) {
            console.error('Lỗi fetch API:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Danh sách thành viên</h>
                
                <button className="btn-primary" onClick={() => navigate('/admin/members/add')} >
                    + Thêm thành viên
                </button>
            </div>

            {error && (
                <div className="alert-message error" style={{ textAlign: 'center', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

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
                    {IsLoading ? (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                                Đang tải dữ liệu...
                            </td>
                        </tr>
                    ) : members.length === 0 ? (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                                Chưa có thành viên nào trong hệ thống.
                            </td>
                        </tr>
                    ) : (
                        members.map((member) => (
                            <tr key={member.id}>
                                <td>
                                    <div>
                                        <div style={{ fontWeight: '600' }}>{member.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{member.email}</div>
                                    </div>
                                </td>
                                
                                <td>
                                    {member.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'}
                                </td>

                                <td>
                                     <span className={`status-badge ${member.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                                            {member.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                                    </span>
                                </td>
                                
                                <td>
                                    <button className="btn-view"  >Xem</button>
                                    <button className="btn-edit" onClick={() => navigate(`/admin/members/edit/${member.id}`)}>Sửa</button>
                                    <button className="btn-delete">Xóa</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default MembersList;