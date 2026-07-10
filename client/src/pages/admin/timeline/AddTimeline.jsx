import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

function AddTimelineItem() {
    const { timelineId } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [phase, setPhase] = useState('preparation');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [orderNumber, setOrderNumber] = useState('0');
    const [taskId, setTaskId] = useState('');

    const [availableTasks, setAvailableTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        document.title = "Thêm mốc lịch trình | TaskFlow";
        const fetchContextAndTasks = async () => {
            try {
                const token = localStorage.getItem('my_token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // 1. Lấy ngữ cảnh sự kiện từ timelineId
                const tlRes = await fetch(`http://localhost:5000/api/timelines/context/${timelineId}`, { headers });
                const tlData = await tlRes.json();
                
                if (tlRes.ok) {
                    if (tlData.event_status === 'Đã kết thúc' || tlData.event_status === 'Đã hủy') {
                        Swal.fire('Cảnh báo', 'Sự kiện này đã đóng, không thể bổ sung lịch trình!', 'warning').then(() => navigate(-1));
                        return;
                    }

                    // 2. Lấy danh sách task của sự kiện đó để fill vào Dropdown
                    const taskRes = await fetch(`http://localhost:5000/api/tasks?event_id=${tlData.event_id}`, { headers });
                    const taskData = await taskRes.json();
                    
                    if (taskRes.ok) {
                        const taskList = taskData.tasks || taskData.data || taskData || [];
                        setAvailableTasks(Array.isArray(taskList) ? taskList.filter(t => !t.is_deleted) : []);
                    }
                } else {
                    Swal.fire('Lỗi', 'Không tìm thấy thông tin lịch trình', 'error').then(() => navigate(-1));
                }
            } catch (e) {
                console.error(e);
            } finally { setLoading(false); }
        };
        fetchContextAndTasks();
    }, [timelineId, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !startTime || !endTime) {
            return Swal.fire('Cảnh báo', 'Vui lòng điền đủ các trường bắt buộc!', 'warning');
        }

        try {
            const token = localStorage.getItem('my_token');
            const response = await fetch(`http://localhost:5000/api/timelines/${timelineId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    task_id: taskId || null,
                    title: title.trim(),
                    description: description.trim(),
                    phase,
                    start_time: startTime,
                    end_time: endTime,
                    order_number: Number(orderNumber) || 0
                })
            });

            const data = await response.json();
            if (response.ok) {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Đã lưu mốc thời gian', showConfirmButton: false, timer: 1500 });
                navigate(-1); // Quay lại trang trước đó tự động (Admin hay Leader đều hoạt động đúng)
            } else {
                Swal.fire('Lỗi', data.message || 'Không thể tạo', 'error');
            }
        } catch (error) { Swal.fire('Lỗi', 'Mất kết nối máy chủ', 'error'); }
    };

    if (loading) return <div className="text-center py-6">Đang tải biểu mẫu...</div>;

    return (
        <div className="page-container">
            <div className="page-header-form" style={{ maxWidth: '600px' }}>
                <button className="btn-back" onClick={() => navigate(-1)}>
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Quay lại
                </button>
                <h3>Thêm mốc thời gian mới</h3>
            </div>

            <div className="form-card large" style={{ maxWidth: '600px' }}>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Tiêu đề mốc lịch trình <span className="text-error">*</span></label>
                        <input type="text" className="form-input" placeholder="Ví dụ: Đón tiếp đại biểu" value={title} onChange={(e) => setTitle(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Giai đoạn thực hiện <span className="text-error">*</span></label>
                        <select className="form-input" value={phase} onChange={(e) => setPhase(e.target.value)}>
                            <option value="preparation">Chuẩn bị</option>
                            <option value="during_event">Diễn ra</option>
                            <option value="post_event">Kết thúc</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Liên kết công việc hệ thống</label>
                        <select className="form-input" value={taskId} onChange={(e) => {
                            setTaskId(e.target.value);
                            // Tự động điền tiêu đề và giai đoạn nếu chọn công việc
                            const t = availableTasks.find(item => String(item.id) === String(e.target.value));
                            if (t) {
                                setTitle(t.title);
                                setPhase(t.task_type);
                            }
                        }}>
                            <option value="">-- Không đính kèm công việc --</option>
                            {availableTasks.map(t => <option key={t.id} value={t.id}>[#{t.id}] {t.title}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thời gian bắt đầu <span className="text-error">*</span></label>
                        <input type="datetime-local" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thời gian kết thúc <span className="text-error">*</span></label>
                        <input type="datetime-local" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thứ tự ưu tiên hiển thị (Số nhỏ xếp trước)</label>
                        <input type="number" min="0" className="form-input" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ghi chú chi tiết</label>
                        <textarea className="form-input" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} style={{ resize: 'vertical' }} placeholder="Mô tả các hoạt động cụ thể..." />
                    </div>

                    <div className="form-actions" style={{ marginTop: '24px' }}>
                        <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Hủy bỏ</button>
                        <button type="submit" className="btn-primary">Lưu thông tin</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddTimelineItem;