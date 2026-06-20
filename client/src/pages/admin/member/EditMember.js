import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditMember() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        full_name: '', 
        email: '', 
        role: 'employee'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Sửa thông tin thành viên | TaskFlow";
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
        const response = await fetch(`http://localhost:5000/api/users/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('my_token')}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (response.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Đã cập nhật thông tin thành viên.',
                confirmButtonColor: '#3b82f6'
            });
            navigate('/admin/members');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: data.message || "Không thể cập nhật thông tin thành viên.",
                confirmButtonColor: '#ef4444'
            });
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật:', error);
        Swal.fire({
            icon: 'error',
            title: 'Lỗi hệ thống',
            text: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau!',
            confirmButtonColor: '#ef4444'
        });
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