import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EditEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
    const [formData, setFormData] = useState({ 
        title: '', 
        description: '', 
        location: '', 
        start_date: '',
        end_date: '',
        max_members: '',
        leader_id: '' 
    });
    
    const [users, setUsers] = useState([]);
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        const pad = (n) => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    useEffect(() => {
        document.title = "Sửa sự kiện | TaskFlow";
        
        const fetchData = async () => {
            try {
                const usersResponse = await fetch('http://localhost:5000/api/users', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const usersData = await usersResponse.json();
                if (usersResponse.ok) {
                    setUsers(usersData.data || usersData);
                }

                const eventResponse = await fetch(`http://localhost:5000/api/events/${id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const eventData = await eventResponse.json();
                
                if (eventResponse.ok) {
                    setFormData({
                        title: eventData.title || '',
                        description: eventData.description || '',
                        location: eventData.location || '',
                        start_date: formatDateForInput(eventData.start_date),
                        end_date: formatDateForInput(eventData.end_date),
                        max_members: eventData.max_members || '',
                        leader_id: eventData.leader_id || ''
                    });
                } else {
                    Swal.fire('Lỗi!', eventData.message || 'Không tìm thấy sự kiện', 'error')
                        .then(() => navigate('/admin/events'));
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu:', error);
                Swal.fire('Lỗi hệ thống', 'Không thể kết nối với máy chủ.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id, navigate]);

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

        try {
            const response = await fetch(`http://localhost:5000/api/events/${id}`, {
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
                    text: 'Đã cập nhật sự kiện thành công.',
                    confirmButtonColor: '#3b82f6', 
                    confirmButtonText: 'Tuyệt vời'
                }).then(() => {
                    navigate('/admin/events'); 
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Chưa hợp lệ!',
                    text: data.message || "Không thể cập nhật sự kiện.",
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

    if (loading) {
        return <div className="text-center text-secondary mt-6">Đang tải dữ liệu...</div>;
    }

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form">
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Sửa sự kiện</h3>
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
                            <label className="form-label">Số lượng tham gia tối đa</label>
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
                            Cập nhật sự kiện
                        </button>
                    </div>
                </form>
            </div>
            
        </div>
    );
}

export default EditEvent;