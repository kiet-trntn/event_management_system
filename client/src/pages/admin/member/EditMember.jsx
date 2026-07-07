import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditMember() {
    const { id } = useParams(); 
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        full_name: '', email: '', role: 'employee',
        phone: '', gender: '', date_of_birth: '', address: '', bio: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.title = "Sửa thông tin thành viên | TaskFlow";
        const fetchMember = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/users/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    const user = data.user || data;
                    setFormData({
                        full_name: user.full_name || '',
                        email: user.email || '',
                        role: user.role || 'employee',
                        phone: user.phone || '',
                        gender: user.gender || '',
                        date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
                        address: user.address || '',
                        bio: user.bio || ''
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
        setIsSubmitting(true);
        
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
                    icon: 'success', title: 'Thành công!', text: 'Đã cập nhật thông tin thành viên.',
                    confirmButtonColor: '#3b82f6'
                });
                navigate('/admin/members');
            } else {
                Swal.fire({
                    icon: 'error', title: 'Lỗi!', text: data.message || "Không thể cập nhật thông tin.",
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            Swal.fire({
                icon: 'error', title: 'Lỗi hệ thống', text: 'Không thể kết nối đến máy chủ.',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="page-container text-center">Đang tải dữ liệu...</div>;

    return (
        <div className="page-container">
            <div className="page-header-form">
               <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Sửa thông tin thành viên</h3>
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

                        {/* Cho vai trò chiếm 2 cột ở dưới để cân đối form nếu bị lẻ */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Vai trò</label>
                            <select className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                                <option value="employee">Nhân viên</option>
                                <option value="admin">Quản trị viên</option>
                            </select>
                        </div>
                    </div>
                    {/* KẾT THÚC GRID */}

                    <div className="form-group">
                        <label className="form-label">Tiểu sử (Bio)</label>
                        <textarea className="form-input" rows="3"
                            value={formData.bio}
                            onChange={e => setFormData({...formData, bio: e.target.value})}></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật thay đổi'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EditMember;