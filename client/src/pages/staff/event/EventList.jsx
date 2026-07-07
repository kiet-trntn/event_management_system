import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function EventList() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Đọc URL từ Header
    const urlSearch = new URLSearchParams(location.search).get('search') || '';
    const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);

    const [events, setEvents] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- CÁC BỘ LỌC SỰ KIỆN TỐI ĐA ---
    const [status, setStatus] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    

    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage = 10;

    // Chống lag khi gõ
    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearch(urlSearch);
        }, 500); 
        return () => clearTimeout(timerId);
    }, [urlSearch]);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('my_token');
            const queryParams = new URLSearchParams();
            
            if (debouncedSearch) queryParams.append('search', debouncedSearch);
            if (status) queryParams.append('status', status);
            if (fromDate) queryParams.append('from_date', fromDate);
            if (toDate) queryParams.append('to_date', toDate);

            // Gửi toàn bộ filter xuống API Sự kiện
            const [eventsRes, tasksRes] = await Promise.all([
                fetch(`http://localhost:5000/api/events?${queryParams.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`http://localhost:5000/api/tasks`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (eventsRes.ok && tasksRes.ok) {
                const eventsData = await eventsRes.json();
                const tasksData = await tasksRes.json();
                setEvents(eventsData.events || []);
                setTasks(tasksData.tasks || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, status, fromDate, toDate]);

    useEffect(() => {
        document.title = "Sự kiện của tôi | TaskFlow";
        setCurrentPage(1);
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, status, fromDate, toDate]);

    const handleReset = () => {
        setStatus('');
        setFromDate('');
        setToDate('');
        navigate(location.pathname, { replace: true });
    };

    const calculateProgress = (eventId) => {
        const eventTasks = tasks.filter(t => t.event_id === eventId);
        if (eventTasks.length === 0) return 0;
        const completedTasks = eventTasks.filter(t => t.status === 'completed').length;
        return Math.round((completedTasks / eventTasks.length) * 100);
    };

    const getBadgeClass = (statusStr) => {
        switch(statusStr) {
            case 'Đã kết thúc': return 'badge-pill badge-green';
            case 'Đang diễn ra': return 'badge-pill badge-blue';
            case 'Đã hủy': return 'badge-pill badge-gray';
            default: return 'badge-pill badge-yellow';
        }
    };

    // --- LOGIC SẮP XẾP SỰ KIỆN THÔNG MINH ---
    const getStatusWeight = (statusStr) => {
        if (statusStr === 'Đang diễn ra') return 1; // Ưu tiên cao nhất
        if (statusStr === 'Sắp diễn ra') return 2;  // Tiếp theo
        if (statusStr === 'Đã kết thúc') return 3;
        if (statusStr === 'Đã hủy') return 4;       // Đẩy xuống cuối cùng
        return 5;
    };

    const sortedEvents = [...events].sort((a, b) => {
        const weightA = getStatusWeight(a.status);
        const weightB = getStatusWeight(b.status);

        // 1. So sánh theo trạng thái trước
        if (weightA !== weightB) {
            return weightA - weightB;
        }

        // 2. Nếu cùng trạng thái, so sánh theo thời gian bắt đầu
        const dateA = new Date(a.start_date).getTime();
        const dateB = new Date(b.start_date).getTime();

        if (weightA === 1 || weightA === 2) {
            // "Đang diễn ra" hoặc "Sắp diễn ra": Sự kiện nào sắp tới gần nhất (sớm nhất) sẽ xếp trước
            return dateA - dateB; 
        }
        
        // "Đã kết thúc" hoặc "Đã hủy": Sự kiện nào vừa kết thúc/hủy gần đây nhất sẽ xếp trên
        return dateB - dateA; 
    });

    // --- PHÂN TRANG DỰA TRÊN DANH SÁCH ĐÃ SẮP XẾP ---
    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = sortedEvents.slice(indexOfFirstEvent, indexOfLastEvent);
    const totalPages = Math.ceil(sortedEvents.length / eventsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="page-container event-page">
            <div className="page-header-form" style={{ maxWidth: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Sự Kiện Của Tôi</h3>
            </div>

            {/* --- KHU VỰC BỘ LỌC ĐẦY ĐỦ --- */}
            <div className="form-card mb-6" style={{ maxWidth: '100%', padding: '20px', marginTop: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 150px' }}>
                        <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="Sắp diễn ra">Sắp diễn ra</option>
                            <option value="Đang diễn ra">Đang diễn ra</option>
                            <option value="Đã kết thúc">Đã kết thúc</option>
                            <option value="Đã hủy">Đã hủy</option>
                        </select>
                    </div>
                    <div style={{ flex: '1 1 140px', position: 'relative' }}>
                                <input 
                                    type={fromDate ? 'date' : 'text'} 
                                    placeholder="Từ ngày..." 
                                    className="form-input" 
                                    value={fromDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setFromDate(e.target.value)} 
                                    style={{ padding: '6px 30px 6px 12px', height: '36px', width: '100%' }} 
                                />
                            </div>
                        
                            <div style={{ flex: '1 1 140px', position: 'relative' }}>
                                <input 
                                    type={toDate ? 'date' : 'text'} 
                                    placeholder="Đến ngày..." 
                                    className="form-input" 
                                    value={toDate} 
                                    onFocus={(e) => e.target.type = 'date'} 
                                    onBlur={(e) => { if (!e.target.value) e.target.type = 'text'; }}
                                    onChange={(e) => setToDate(e.target.value)} 
                                    style={{ padding: '6px 30px 6px 12px', height: '36px', width: '100%' }} 
                                />
                            </div>
                    <div style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
                        <button type="button" className="btn-secondary" onClick={handleReset}>Khôi phục</button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="form-card text-center text-secondary">Đang tải dữ liệu...</div>
            ) : events.length === 0 ? (
                <div className="form-card text-center text-secondary">
                    {debouncedSearch || status || fromDate || toDate ? `Không tìm thấy sự kiện nào khớp với bộ lọc.` : "Bạn chưa được thêm vào sự kiện nào."}
                </div>
            ) : (
                <>
                    <div className="event-grid">
                        {currentEvents.map(event => {
                            const progress = calculateProgress(event.id);
                            return (
                                <div key={event.id} className="event-card" onClick={() => navigate(`/staff/events/view/${event.id}`)} style={{ cursor: 'pointer' }}>
                                    <div className="event-card-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <span className={getBadgeClass(event.status)}>{event.status}</span>
                                    </div>
                                    <h3 className="event-title">{event.title}</h3>
                                    <p className="event-detail-row">{event.location}</p>
                                    <p className="event-detail-row">{new Date(event.start_date).toLocaleDateString('vi-VN')} - {new Date(event.end_date).toLocaleDateString('vi-VN')}</p>
                                    <div className="event-divider"></div>
                                    <div style={{ marginTop: 'auto' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px', color: 'var(--text-secondary)' }}>
                                            <span>Tiến độ công việc</span>
                                            <strong className={progress === 100 ? 'text-success' : 'text-brand'}>{progress}%</strong>
                                        </div>
                                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--border-neutral)', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', backgroundColor: progress === 100 ? 'var(--success-color)' : 'var(--primary-color)', width: `${progress}%`, transition: 'width 0.5s ease-in-out' }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination-container">
                            <button className="btn-page" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>&lsaquo;</button>
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button key={index + 1} className={`btn-page ${currentPage === index + 1 ? 'active' : ''}`} onClick={() => handlePageChange(index + 1)}>{index + 1}</button>
                            ))}
                            <button className="btn-page" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>&rsaquo;</button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default EventList;