import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function EditMember() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        full_name: '', 
        email: '', 
        role: 'employee', 
        status: 'active'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    setFormData({
                        full_name: data.full_name,
                        email: data.email,
                        role: data.role,
                        status: data.status
                    });
                }
            } catch (error) {
                console.error('Lỗi tải dữ liệu:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchMember();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch(`http://localhost:5000/api/users/${id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`
                },
                body: JSON.stringify(formData)
            });
            navigate('/admin/members'); 
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
        }
    };

    if (loading) {
        return <div className="page-container text-center">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="page-container">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    &larr; Quay lại
                </button>
                <h3>Sửa thông tin thành viên</h3>
            </div>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    
                    <div className="form-group">
                        <label className="form-label">Họ và tên</label>
                        <input 
                            className="form-input" 
                            type="text"
                            required 
                            value={formData.full_name}
                            onChange={e => setFormData({...formData, full_name: e.target.value})} 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input 
                            className="form-input" 
                            type="email" 
                            required 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Vai trò</label>
                        <select 
                            className="form-input" 
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value})}
                        >
                            <option value="employee">Nhân viên</option>
                            <option value="admin">Quản trị viên</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Trạng thái tài khoản</label>
                            <select 
                                className="form-input" 
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="active">Hoạt động</option>
                                <option value="inactive">Khóa / Tạm dừng</option>
                             </select>
                    </div>
                    
                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-primary">
                            Cập nhật thay đổi
                        </button>
                    </div>
                    
                </form>
            </div>
            
        </div>
    );
}

export default EditMember;