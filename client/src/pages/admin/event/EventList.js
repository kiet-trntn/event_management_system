import React , { useEffect, useState } from 'react';
import {useNavigate} from 'react-router-dom';
import Swal from 'sweetalert2';

function EventList() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [currentOfficialPage, setCurrentOfficialPage] = useState(1);
    const [currentDraftPage, setCurrentDraftPage] = useState(1);
    const eventsPerPage = 6; 

    useEffect(() => {
        document.title = "Quản lý Sự kiện | TaskFlow";
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

    const handleCardClick = (id) => navigate(`/admin/events/view/${id}`);
    const handleEdit = (e, id) => { 
        e.stopPropagation(); 
        navigate(`/admin/events/edit/${id}`); 
    };
    const handleDelete = async (e, id) => { 
        e.stopPropagation(); 
        const result = await Swal.fire({
            title: 'Chuyển vào thùng rác?',
            text: "Sự kiện sẽ được chuyển vào thùng rác và có thể khôi phục lại sau này.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Đồng ý xóa',
            cancelButtonText: 'Hủy'
        });
        if (result.isConfirmed) {
            try {
                const response = await fetch(`http://localhost:5000/api/events/${id}/delete`, {
                    method: 'PATCH',
                    headers: { 
                        'Authorization': `Bearer ${localStorage.getItem('my_token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                const data = await response.json();
                
                if (response.ok) {
                    Swal.fire('Đã xóa!', 'Sự kiện đã được đưa vào thùng rác.', 'success');
                    setEvents(prevEvents => prevEvents.filter(ev => ev.id !== id));
                } else {
                    Swal.fire('Lỗi!', data.message || 'Không thể xóa sự kiện.', 'error');
                }
            } catch (error) {
                console.error("Lỗi xóa:", error);
                Swal.fire('Lỗi!', 'Không thể kết nối máy chủ.', 'error');
            }
        }
    };

    const officialEvents = events.filter(event => event.status !== 'Nháp');
    const draftEvents = events.filter(event => event.status === 'Nháp');

    const indexOfLastOfficial = currentOfficialPage * eventsPerPage;
    const currentOfficialEvents = officialEvents.slice(indexOfLastOfficial - eventsPerPage, indexOfLastOfficial);
    const totalOfficialPages = Math.ceil(officialEvents.length / eventsPerPage);

    const indexOfLastDraft = currentDraftPage * eventsPerPage;
    const currentDraftEvents = draftEvents.slice(indexOfLastDraft - eventsPerPage, indexOfLastDraft);
    const totalDraftPages = Math.ceil(draftEvents.length / eventsPerPage);

    return (
        <div className="page-container event-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Quản lý Sự kiện</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn-trash" onClick={() => navigate('/admin/events/trash')}>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Thùng rác
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/admin/events/add')} >
                        + Thêm sự kiện
                    </button>
                </div>
                
            </div>
            
            {loading ? (
                <div className="text-center text-secondary mb-6">Đang tải dữ liệu...</div>
            ) : (
                <>
                    <div className="mb-6">
                        <h3 className="section-title">Sự kiện chính thức</h3>
                        
                        {currentOfficialEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card">Không có sự kiện chính thức nào.</div>
                        ) : (
                            <>
                                <div className="event-grid">
                                    {currentOfficialEvents.map(event => (
                                        <div key={event.id} className="event-card" onClick={() => handleCardClick(event.id)} style={{ cursor: 'pointer' }}>
                                            <div className="event-card-header">
                                                <span className={`status-badge ${event.status === 'Đã hủy' ? 'status-inactive' : 'status-active'}`}>
                                                    {event.status}
                                                </span>
                                            </div>
                                            <h4 className="event-title">{event.title}</h4>
                                            <p className="event-detail-row">📍 {event.location}</p>
                                            <p className="event-detail-row">🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
                                        </div>
                                    ))}
                                </div>

                                {officialEvents.length > eventsPerPage && (
                                    <div className="pagination-container">
                                        <button className="btn-page" disabled={currentOfficialPage === 1} onClick={() => setCurrentOfficialPage(currentOfficialPage - 1)}>Trước</button>
                                        {Array.from({ length: totalOfficialPages }, (_, i) => i + 1).map(page => (
                                            <button key={page} className={`btn-page ${currentOfficialPage === page ? 'active' : ''}`} onClick={() => setCurrentOfficialPage(page)}>{page}</button>
                                        ))}
                                        <button className="btn-page" disabled={currentOfficialPage === totalOfficialPages} onClick={() => setCurrentOfficialPage(currentOfficialPage + 1)}>Sau</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="event-divider mb-6"></div>

                    <div>
                        <h3 className="section-title warning">Bản nháp</h3>
                        
                        {currentDraftEvents.length === 0 ? (
                            <div className="text-center text-secondary form-card">Không có bản nháp nào.</div>
                        ) : (
                            <>
                                <div className="event-grid">
                                    {currentDraftEvents.map(event => (
                                        <div key={event.id} className="event-card" onClick={() => handleCardClick(event.id)} style={{ cursor: 'pointer' }}>
                                            <h4 className="event-title">{event.title}</h4>
                                            <p className="event-detail-row">📍 {event.location}</p>
                                            <p className="event-detail-row">🕒 {new Date(event.start_date).toLocaleDateString('vi-VN')}</p>
                                            
                                            <div className="event-actions">
                                                <button className="btn-edit" title="Sửa sự kiện" onClick={(e) => handleEdit(e, event.id)}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                                <button className="btn-delete" title="Xóa sự kiện" onClick={(e) => handleDelete(e, event.id)}>
                                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {draftEvents.length > eventsPerPage && (
                                    <div className="pagination-container">
                                        <button className="btn-page" disabled={currentDraftPage === 1} onClick={() => setCurrentDraftPage(currentDraftPage - 1)}>Trước</button>
                                        {Array.from({ length: totalDraftPages }, (_, i) => i + 1).map(page => (
                                            <button key={page} className={`btn-page ${currentDraftPage === page ? 'active' : ''}`} onClick={() => setCurrentDraftPage(page)}>{page}</button>
                                        ))}
                                        <button className="btn-page" disabled={currentDraftPage === totalDraftPages} onClick={() => setCurrentDraftPage(currentDraftPage + 1)}>Sau</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

export default EventList;