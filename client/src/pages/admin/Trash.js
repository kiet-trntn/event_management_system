import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function Trash() {
    const navigate = useNavigate();
    
    // Mặc định vào thùng rác sẽ mở Tab Sự kiện trước
    const [activeTab, setActiveTab] = useState('events'); 
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tự động gọi API khi vào trang hoặc khi chuyển Tab
    useEffect(() => {
        document.title = "Thùng rác hệ thống | TOOF";
        fetchTrashData(activeTab);
    }, [activeTab]);

    // --- HÀM GỌI API ĐƯỢC NÂNG CẤP ---
    const fetchTrashData = async (tab) => {
        setLoading(true);
        setItems([]); // 🧹 Xóa sạch dữ liệu cũ trên màn hình trước khi tải cái mới để tránh bị "ngáo" giao diện

        try {
            // 🎯 TÁCH RIÊNG ĐƯỜNG DẪN: Chỗ này cực kỳ quan trọng!
            let url = '';
            if (tab === 'events') {
                url = 'http://localhost:5000/api/events/trash';
            } else if (tab === 'tasks') {
                url = 'http://localhost:5000/api/tasks/deleted';
            } else if (tab === 'attachments') {
                url = 'http://localhost:5000/api/attachments/deleted'; 
            }
            
            const response = await fetch(url, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            // In ra console để bạn dễ F12 kiểm tra
            console.log(`Dữ liệu nhận được từ tab ${tab}:`, data);
            
            if (response.ok) {
                // Tự động gắp đúng mảng dữ liệu trả về từ Backend
                if (tab === 'events') setItems(data.events || []);
                if (tab === 'tasks') setItems(data.tasks || []);
                if (tab === 'attachments') setItems(data.attachments || []);
            } else {
                console.error("Backend báo lỗi:", data.message);
                setItems([]);
            }
        } catch (err) {
            console.error("Lỗi khi gọi API thùng rác:", err);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    // Hàm xử lý bấm nút Khôi phục
    const handleRestore = async (id) => {
        const result = await Swal.fire({
            title: 'Khôi phục dữ liệu?',
            text: "Dữ liệu này sẽ được đưa trở lại hệ thống.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981', 
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Khôi phục ngay',
            cancelButtonText: 'Để sau'
        });

        if (result.isConfirmed) {
            try {
                // Gọi API khôi phục tự động theo tab hiện tại
                const response = await fetch(`http://localhost:5000/api/${activeTab}/${id}/restore`, {
                    method: 'PATCH',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });

                const data = await response.json();

                if (response.ok) {
                    Swal.fire('Thành công!', 'Đã khôi phục thành công.', 'success');
                    // Xóa item vừa khôi phục khỏi màn hình
                    setItems(prevItems => prevItems.filter(item => item.id !== id));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể khôi phục.', 'error');
                }
            } catch (error) {
                console.error("Lỗi khôi phục:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối đến máy chủ.', 'error');
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '100%' }}>
                <button type="button" className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
                    </svg>
                    Quay lại
                </button>
                <h3>Thùng rác hệ thống</h3>
            </div>

            {/* TẠO 3 TABS DƯỚI DẠNG NÚT BẤM */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #E5E7EB', paddingBottom: '12px' }}>
                <button 
                    onClick={() => setActiveTab('events')}
                    style={{ padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: activeTab === 'events' ? '3px solid #3B82F6' : '3px solid transparent', color: activeTab === 'events' ? '#3B82F6' : '#6B7280' }}
                >
                    Sự kiện
                </button>
                <button 
                    onClick={() => setActiveTab('tasks')}
                    style={{ padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: activeTab === 'tasks' ? '3px solid #3B82F6' : '3px solid transparent', color: activeTab === 'tasks' ? '#3B82F6' : '#6B7280' }}
                >
                    Công việc
                </button>
                <button 
                    onClick={() => setActiveTab('attachments')}
                    style={{ padding: '8px 16px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: activeTab === 'attachments' ? '3px solid #3B82F6' : '3px solid transparent', color: activeTab === 'attachments' ? '#3B82F6' : '#6B7280' }}
                >
                    Tài liệu
                </button>
            </div>

            {/* HIỂN THỊ DỮ LIỆU */}
            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu thùng rác...</div>
            ) : items.length === 0 ? (
                <div className="text-center text-secondary form-card mb-6" style={{ maxWidth: '100%' }}>
                    Thùng rác hiện tại đang trống.
                </div>
            ) : (
                <div className="event-grid">
                    {items.map(item => (
                        <div key={item.id} className="event-card" style={{ opacity: 0.75 }}>
                            <div className="event-card-header">
                                <span className="status-badge status-inactive">
                                    Đã xóa
                                </span>
                            </div>
                            
                            {/* Tên item có Fallback an toàn */}
                            <h4 className="event-title text-secondary" style={{ wordBreak: 'break-all' }}>
                                {activeTab === 'events' && '🎉 '}
                                {activeTab === 'tasks' && '✅ '}
                                {activeTab === 'attachments' && '📄 '}
                                {item.title || item.file_name || 'Không có tiêu đề'}
                            </h4>
                            
                            {/* DỮ LIỆU HIỂN THỊ TÙY THEO TAB */}
                            {activeTab === 'events' && (
                                <>
                                    <p className="event-detail-row">📍 {item.location || 'Chưa xác định'}</p>
                                    <p className="event-detail-row">🕒 {item.start_date ? new Date(item.start_date).toLocaleDateString('vi-VN') : 'Không có'}</p>
                                </>
                            )}

                            {activeTab === 'tasks' && (
                                <>
                                    <p className="event-detail-row">🎯 Ưu tiên: {item.priority === 'high' ? 'Cao' : item.priority === 'medium' ? 'Trung bình' : 'Thấp'}</p>
                                    <p className="event-detail-row">🕒 Hạn chót: {item.due_date ? new Date(item.due_date).toLocaleDateString('vi-VN') : 'Không có'}</p>
                                </>
                            )}

                            {activeTab === 'attachments' && (
                                <>
                                    <p className="event-detail-row">📦 Kích thước: {item.file_size ? (item.file_size / 1024 / 1024).toFixed(2) : 0} MB</p>
                                    <p className="event-detail-row">👤 Người nộp: {item.uploaded_by_name || 'Hệ thống'}</p>
                                </>
                            )}
                            
                            <div className="event-divider"></div>
                            
                            <div className="event-actions">
                                <button className="btn-restore" title="Khôi phục" onClick={() => handleRestore(item.id)}>
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Trash;