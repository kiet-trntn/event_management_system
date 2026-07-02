import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage =`10`;

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');

            const [eventsRes, tasksRes] = await Promise.all([
                fetch('http://localhost:5000/api/events', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('http://localhost:5000/api/tasks', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (eventsRes.ok && tasksRes.ok) {
                const eventsData = await eventsRes.json();
                const tasksData = await tasksRes.json();
                setEvents(eventsData.events || []);
                setTasks(tasksData.tasks || []);
            } else {
                Swal.fire('Lỗi', 'Không thể tải dữ liệu sự kiện', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Lỗi', 'Lỗi kết nối đến máy chủ', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        document.title = "Sự kiện của tôi | TaskFlow";
        fetchData();
    }, [fetchData]);

    const calculateProgress = (eventId) => {
        const eventTasks = tasks.filter(t => t.event_id === eventId);
        if (eventTasks.length === 0) return 0;
        const completedTasks = eventTasks.filter(t => t.status === 'completed').length;
        return Math.round((completedTasks / eventTasks.length) * 100);
    };

    const getBadgeClass = (status) => {
        switch(status) {
            case 'Đã kết thúc': return 'badge-pill badge-green';
            case 'Đang diễn ra': return 'badge-pill badge-blue';
            case 'Đã hủy': return 'badge-pill badge-gray';
            case 'Nháp': return 'badge-pill status-draft';
            default: return 'badge-pill badge-yellow';
        }
    };

    // --- LOGIC TÍNH TOÁN PHÂN TRANG Ở FRONTEND ---
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    // Cắt mảng sự kiện chỉ lấy từ vị trí First đến Last của trang hiện tại
    const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
    // Tính tổng số trang cần có
    const totalPages = Math.ceil(events.length / eventsPerPage);

    // Hàm chuyển trang mượt mà
    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        // Tự động cuộn lên đầu trang khi chuyển trang
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="page-container event-page">
            
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Sự Kiện Của Tôi</h3>
            </div>

            {loading ? (
                <div className="form-card text-center text-secondary">Đang tải dữ liệu...</div>
            ) : events.length === 0 ? (
                <div className="form-card text-center text-secondary">Bạn chưa được thêm vào sự kiện nào.</div>
            ) : (
                <>
                    {/* Render danh sách sự kiện của TRANG HIỆN TẠI */}
                    <div className="event-grid">
                        {currentEvents.map(event => {
                            const progress = calculateProgress(event.id);
                            
                            return (
                                <div 
                                    key={event.id} 
                                    className="event-card" 
                                    onClick={() => navigate(`/staff/events/view/${event.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="event-card-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <span className={getBadgeClass(event.status)}>
                                            {event.status}
                                        </span>
                                    </div>
                                    
                                    <h3 className="event-title">{event.title}</h3>
                                    
                                    <p className="event-detail-row">
                                        {event.location}
                                    </p>

                                    <p className="event-detail-row"> 
                                        {new Date(event.start_date).toLocaleDateString('vi-VN')} - {new Date(event.end_date).toLocaleDateString('vi-VN')}
                                    </p>
                                    
                                    <div className="event-divider"></div>
                                    
                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            <span>Tiến độ công việc</span>
                                            <strong className={progress === 100 ? 'text-success' : 'text-brand'}>{progress}%</strong>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div 
                                                style={{ 
                                                    height: '100%', 
                                                    backgroundColor: progress === 100 ? 'var(--success-color)' : 'var(--primary-color)', 
                                                    width: `${progress}%`,
                                                    transition: 'width 0.5s ease-in-out'
                                                }} 
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* --- THANH ĐIỀU HƯỚNG PHÂN TRANG (Áp dụng class từ style.css) --- */}
                    {totalPages > 1 && (
                        <div className="pagination-container">
                            {/* Nút lùi lại 1 trang */}
                            <button 
                                className="btn-page" 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                            >
                                &lsaquo;
                            </button>

                            {/* Khởi tạo danh sách số trang */}
                            {Array.from({ length: totalPages }, (_, index) => {
                                const pageNum = index + 1;
                                return (
                                    <button
                                        key={pageNum}
                                        className={`btn-page ${currentPage === pageNum ? 'active' : ''}`}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            {/* Nút tiến lên 1 trang */}
                            <button 
                                className="btn-page" 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                            >
                                &rsaquo;
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default EventList;