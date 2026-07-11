import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddEvent() {
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ 
        title: '', 
        description: '', 
        location: '', 
        start_date: '',
        end_date: '',
        max_members: '', // Nhân sự tối đa
        leader_id: '',
        max_attendees: '', // Khách tham gia tối đa
        registration_deadline: '' // Hạn chót đăng ký form
    });
    
    const [users, setUsers] = useState([]);

    useEffect(() => {
        document.title = "Thêm sự kiện mới | TaskFlow";
        
        const fetchUsers = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                if (response.ok) {
                    if (data.users && Array.isArray(data.users)) {
                        setUsers(data.users);
                    } else if (Array.isArray(data)) {
                        setUsers(data);
                    } else if (data.data && Array.isArray(data.data)) {
                        setUsers(data.data);
                    }
                }
            } catch (error) {
                console.error('Lỗi khi tải danh sách nhân viên:', error);
            }
        };

        fetchUsers();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.leader_id) {
            Swal.fire({
                icon: 'warning',
                title: 'Thiếu thông tin',
                text: 'Vui lòng chọn Nhóm trưởng cho sự kiện!',
                confirmButtonColor: '#f59e0b'
            });
            return;
        }

        // Đóng gói data, nếu để trống thì truyền null để database hiểu là không giới hạn
        const payload = {
            ...formData,
            status: 'Nháp',
            max_attendees: formData.max_attendees ? Number(formData.max_attendees) : null,
            registration_deadline: formData.registration_deadline || null
        };

        try {
            const response = await fetch('http://localhost:5000/api/events', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`
                },
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: 'Đã lưu bản nháp sự kiện thành công.',
                    confirmButtonColor: '#3b82f6', 
                    confirmButtonText: 'Tuyệt vời'
                }).then(() => {
                    navigate('/admin/events'); 
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Chưa hợp lệ!',
                    text: data.message || "Không thể thêm sự kiện.",
                    confirmButtonColor: '#ef4444'
                });
            }
        } catch (error) {
            console.error('Lỗi hệ thống:', error);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi hệ thống',
                text: 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau!',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Thêm sự kiện mới</h3>
            </div>

            <div className="form-card large">
                <form onSubmit={handleSubmit}>
                    
                    <div className="form-group">
                        <label className="form-label">Tiêu đề sự kiện</label>
                        <input 
                            className="form-input" 
                            type="text"
                            required 
                            value={formData.title}
                            onChange={e => setFormData({...formData, title: e.target.value})} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Bắt đầu từ</label>
                            <input 
                                className="form-input" 
                                type="datetime-local" 
                                required 
                                value={formData.start_date}
                                onChange={e => setFormData({...formData, start_date: e.target.value})} 
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Kết thúc vào</label>
                            <input 
                                className="form-input" 
                                type="datetime-local" 
                                required 
                                value={formData.end_date}
                                onChange={e => setFormData({...formData, end_date: e.target.value})} 
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Địa điểm</label>
                        <input 
                            className="form-input" 
                            type="text" 
                            required 
                            value={formData.location}
                            onChange={e => setFormData({...formData, location: e.target.value})} 
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Số NV hỗ trợ tối đa</label>
                            <input 
                                className="form-input" 
                                type="number" 
                                min="1"
                                required 
                                value={formData.max_members}
                                onChange={e => setFormData({...formData, max_members: e.target.value})} 
                            />
                        </div>
                        
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Nhóm trưởng (Leader)</label>
                            <select 
                                className="form-input" 
                                required 
                                value={formData.leader_id}
                                onChange={e => setFormData({...formData, leader_id: e.target.value})}
                            >
                                <option value="" disabled>Chọn người quản lý</option>
                                {users.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.id}. {user.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* DÒNG: Số lượng khách & Hạn chót đăng ký (Hiển thị bình thường) */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Khách đăng ký tối đa <span style={{fontSize: '12px', color: '#64748b', fontWeight: 'normal'}}>(Tùy chọn)</span></label>
                            <input 
                                className="form-input" 
                                type="number" 
                                min="1"
                                placeholder="Để trống nếu không giới hạn"
                                value={formData.max_attendees}
                                onChange={e => setFormData({...formData, max_attendees: e.target.value})} 
                            />
                        </div>
                        
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Hạn chót đóng Form đăng ký <span style={{fontSize: '12px', color: '#64748b', fontWeight: 'normal'}}>(Tùy chọn)</span></label>
                            <input 
                                className="form-input" 
                                type="datetime-local" 
                                value={formData.registration_deadline}
                                onChange={e => setFormData({...formData, registration_deadline: e.target.value})}
                            />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Mô tả chi tiết</label>
                        <textarea 
                            className="form-input" 
                            rows="4"
                            style={{ resize: 'vertical', paddingTop: '8px' }}
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})} 
                        ></textarea>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
                            Hủy
                        </button>
                        <button type="submit" className="btn-primary">
                            Lưu sự kiện
                        </button>
                    </div>
                </form>
            </div>
            
        </div>
    );
}

export default AddEvent;