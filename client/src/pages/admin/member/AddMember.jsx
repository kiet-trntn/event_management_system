import React, { useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddMember() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        full_name: '', email: '', password: '', role: 'employee',
        phone: '', gender: '', date_of_birth: '', address: '', bio: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.title = "Thêm thành viên mới | TaskFlow";
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Swal.fire({
                    icon: 'success', title: 'Thành công!', text: 'Đã thêm thành viên mới.',
                    confirmButtonColor: '#3b82f6', confirmButtonText: 'Tuyệt vời'
                }).then(() => navigate('/admin/members'));
            } else {
                Swal.fire({
                    icon: 'error', title: 'Chưa hợp lệ!', text: data.message || "Không thể thêm thành viên.",
                    confirmButtonColor: '#ef4444', confirmButtonText: 'Đã hiểu'
                });
            }
        } catch (error) {
            console.error('Lỗi hệ thống:', error);
            Swal.fire({
                icon: 'error', title: 'Lỗi hệ thống', text: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau!',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Thêm thành viên mới</h3>
            </div>

            <div className="form-card">
                <form onSubmit={handleSubmit}>
                    
                    {/* KHUNG GRID CHIA 2 CỘT */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                        <div className="form-group">
                            <label className="form-label">Họ và tên</label>
                            <input className="form-input" type="text" required 
                                value={formData.full_name} 
                                onChange={e => setFormData({...formData, full_name: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="form-input" type="email" required 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                            <label className="form-label">Mật khẩu tạm thời</label>
                            <input className="form-input" type="password" required 
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Số điện thoại</label>
                            <input className="form-input" type="text" 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Giới tính</label>
                            <select className="form-input" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                <option value="">Chọn giới tính</option>
                                <option value="male">Nam</option>
                                <option value="female">Nữ</option>
                                <option value="other">Khác</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Ngày sinh</label>
                            <input className="form-input" type="date" 
                                value={formData.date_of_birth}
                                onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Địa chỉ</label>
                            <input className="form-input" type="text" 
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Vai trò</label>
                            <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="employee">Nhân viên</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>
                    </div>
                    {/* KẾT THÚC GRID */}

                    {/* TEXTAREA CHIẾM FULL BỀ NGANG */}
                    <div className="form-group">
                        <label className="form-label">Tiểu sử (Bio)</label>
                        <textarea className="form-input" rows="3" style={{ resize: 'vertical' }}
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang lưu...' : 'Lưu thành viên'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddMember;