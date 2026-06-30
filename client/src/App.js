import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import ProtectedRouter from './components/ProtectedRouter';
import AdminHeader from './components/admin/header';
import StaffHeader from './components/staff/header';
import ChangePassword from './pages/changepassword';

import MembersList from './pages/admin/member/MembersList';
import AddMember from './pages/admin/member/AddMember';
import EditMember from './pages/admin/member/EditMember';
import ViewMember from './pages/admin/member/ViewMember';

import EventList from './pages/admin/event/EventList';
import AddEvent from './pages/admin/event/AddEvent';
import ViewEvent from './pages/admin/event/ViewEvent';
import EditEvent from './pages/admin/event/EditEvent';

import EventMembers from './pages/admin/eventmember/EventMembers';
import AddEventMember from './pages/admin/eventmember/AddEventMember';
import EditEventMember from './pages/admin/eventmember/EditEventMember';

import TaskList from './pages/admin/task/TaskList';
import AddTask from './pages/admin/task/AddTask';
import ViewTask from './pages/admin/task/ViewTask';
import EditTask from './pages/admin/task/EditTask';

import AttachmentList from './pages/admin/attachment/AttachmentList';

// Import Thùng rác dùng chung nằm ở folder admin
import Trash from './pages/Trash';

import Dashboard from './pages/staff/Dashboard';
import ManagerDashboard from './pages/admin/ManagerDashboard';

import EventListStaff from './pages/staff/event/EventList';
import ViewEventStaff from './pages/staff/event/ViewEvent';

import TaskListStaff from './pages/staff/task/TaskList';
import ViewTaskStaff from './pages/staff/task/ViewTask';

import WorkCalendar from './pages/staff/WorkCalendar';

function App() {
  return (
    <BrowserRouter>
      <Routes> 
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* =========================================================
            1. PHÂN HỆ ROUTE DÀNH CHO ADMIN
           ========================================================= */}
        <Route 
          path="/admin"
          element={ 
            <ProtectedRouter allowRoles="admin">
              <AdminHeader/>
            </ProtectedRouter>
          }
        >
          <Route path="changepassword" element={<ChangePassword />} />

          <Route path="dashboard" element={<ManagerDashboard />} />

          <Route path="members" element={<MembersList />} />
          <Route path="members/add" element={<AddMember />} />
          <Route path="members/edit/:id" element={<EditMember />} />
          <Route path="members/view/:id" element={<ViewMember />} />

          <Route path="events" element={<EventList />} />
          <Route path="events/add" element={<AddEvent />} />
          <Route path="events/view/:id" element={<ViewEvent />} />
          <Route path="events/edit/:id" element={<EditEvent />} />
          
          <Route path="events/:eventId/members" element={<EventMembers />} />
          <Route path="events/:eventId/members/add" element={<AddEventMember />} />
          <Route path="events/:eventId/members/edit/:userId" element={<EditEventMember />} />

          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/add" element={<AddTask />} />
          <Route path="tasks/view/:id" element={<ViewTask />} />
          <Route path="tasks/edit/:id" element={<EditTask />} />

          <Route path="/admin/tasks/:id/attachments" element={<AttachmentList />} />

          <Route path="trash" element={<Trash />} />
        </Route>

        <Route 
          path="/staff"
          element={ 
            <ProtectedRouter allowRoles="employee">
              <StaffHeader/>
            </ProtectedRouter>
          }
        >  
          <Route path="changepassword" element={<ChangePassword />} />

          <Route path="dashboard" element={<Dashboard />} />

          <Route path="events" element={<EventListStaff />} />
          <Route path="events/view/:id" element={<ViewEventStaff />} />

          <Route path="tasks" element={<TaskListStaff />} />
          <Route path="tasks/view/:id" element={<ViewTaskStaff />} />
          <Route path="calendar" element={<WorkCalendar />} />

          <Route path="events/:eventId/tasks/add" element={<AddTask />} />
          <Route path="tasks/edit/:id" element={<EditTask />} />
          <Route path="events/:eventId/members/add" element={<AddEventMember />} />
          <Route path="events/:eventId/members/edit/:userId" element={<EditEventMember />} />
          
          <Route path="trash" element={<Trash />} />
        </Route>

        <Route path="*" element={<h2>404 - Trang không tồn tại</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;