import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AddMember() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ 
        full_name: '', 
        email: '', 
        password: '', 
        role: 'employee',
        status: 'active'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`
                },
                body: JSON.stringify(formData)
            });
            navigate('/admin/members');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="page-container">
            
            {/* Header Form thẳng tắp */}
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    {/* Icon mũi tên xịn thay cho &larr; */}
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Thêm thành viên mới</h3>
            </div>

            {/* Khung Form nhập liệu */}
            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    
                    <div className="form-group">
                        <label className="form-label">Họ và tên</label>
                        <input 
                            className="form-input" 
                            type="text"
                            required 
                            onChange={e => setFormData({...formData, full_name: e.target.value})} 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input 
                            className="form-input" 
                            type="email" 
                            required 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                        />
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Mật khẩu tạm thời</label>
                        <input 
                            className="form-input" 
                            type="password" 
                            required 
                            onChange={e => setFormData({...formData, password: e.target.value})} 
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
                            Lưu thành viên
                        </button>
                    </div>
                    
                </form>
            </div>
            
        </div>
    );
}

export default AddMember;