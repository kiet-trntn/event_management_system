import React , { useEffect, useState } from 'react';
import {useNavigate} from 'react-router-dom';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const eventsPerPage = 9;

    useEffect(() => {
        document.title = "Danh sách sự kiện | TOOF";
        const fetchEvents = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/events', {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('my_token')}` }
                });
                const data = await response.json();
                
                setEvents(data.events || data); 
            } catch (err) { 
                console.error("Lỗi khi tải danh sách sự kiện:", err); 
            } finally { 
                setLoading(false); 
            }
        };
        fetchEvents();
    }, []);

    const handleCardClick = (id) => {
        navigate(`/admin/events/view/${id}`);
    };

    const handleDelete = (e,id) => {
        e.stopPropagation();
    };

    const handleEdit = (e, id) => {
        e.stopPropagation(); 
        navigate(`/admin/events/edit/${id}`);
    };

    const indexOfLastEvent = currentPage * eventsPerPage;
    const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
    const currentEvents = events.slice(indexOfFirstEvent, indexOfLastEvent);
    const totalPages = Math.ceil(events.length / eventsPerPage);


    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Danh sách sự kiện</h1>
                <button className="btn-primary" onClick={() => navigate('/admin/events/add')} >
                    + Thêm sự kiện
                </button>
            </div>
            
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Đang tải dữ liệu...
                </div>
            ) : currentEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Không có sự kiện nào.
                </div>
            ) : (
                <div className="event-grid">
                    {currentEvents.map(event => (
                        <div 
                            key={event.id} 
                            className="event-card"
                            onClick={() => handleCardClick(event.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="event-card-header">
                                <span className={`status-badge ${event.status === 'Đã hủy' ? 'status-inactive' : 'status-active'}`}>
                                    {event.status || 'Sắp diễn ra'}
                                </span>
                            </div>
                            
                            <h4 className="event-title">{event.title}</h4>
                            <p className="event-detail text-secondary" style={{ fontSize: '13px' }}>
                                📍 {event.location}
                            </p>
                            <p className="event-detail text-secondary" style={{ fontSize: '13px' }}>
                                🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}
                            </p>
                            
                            <div className="event-divider"></div>

                            <div className="event-actions">
                                <button 
                                    className="btn-edit" 
                                    title="Sửa sự kiện" 
                                    onClick={(e) => handleEdit(e, event.id)}
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                
                                <button 
                                    className="btn-delete" 
                                    title="Xóa sự kiện" 
                                    onClick={(e) => handleDelete(e, event.id)}
                                >
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && events.length > eventsPerPage && (
                <div className="pagination-container">
                    <button 
                        className="btn-page" 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(currentPage - 1)}
                    >
                        Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button 
                            key={page} 
                            className={`btn-page ${currentPage === page ? 'active' : ''}`}
                            onClick={() => setCurrentPage(page)}
                        >
                            {page}
                        </button>
                    ))}
                    <button 
                        className="btn-page" 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(currentPage + 1)}
                    >
                        Sau
                    </button>
                </div>
            )}
        </div>
    );
}

export default EventList;

