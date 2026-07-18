import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/login';
import ProtectedRouter from './components/ProtectedRouter';
import AdminHeader from './components/admin/header';
import StaffHeader from './components/staff/header';
import Profile from './pages/profile';

import MembersList from './pages/admin/member/MembersList';
import AddMember from './pages/admin/member/AddMember';
import EditMember from './pages/admin/member/EditMember';
import ViewMember from './pages/admin/member/ViewMember';

import EventList from './pages/admin/event/EventList';
import AddEvent from './pages/admin/event/AddEvent';
import ViewEvent from './pages/admin/event/ViewEvent';
import EditEvent from './pages/admin/event/EditEvent';

import EventMembers from './pages/admin/eventmember/EventMembers';

import TimeLineList from './pages/admin/timeline/TimelineList';
import AddTimeline from './pages/admin/timeline/AddTimeline';
import EditTimeline from './pages/admin/timeline/EditTimeline';

import RegisterEvent from './pages/public/RegisterEvent';
import RegisterSuccess from './pages/public/RegisterSuccess';
import RegistrationList from './pages/admin/registration/RegistrationList';

import TaskList from './pages/admin/task/TaskList';
import AddTask from './pages/admin/task/AddTask';
import ViewTask from './pages/admin/task/ViewTask';
import EditTask from './pages/admin/task/EditTask';

import Trash from './pages/Trash';

import Messages from './pages/Chat';

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
        <Route path="/public/events/:eventId/register" element={<RegisterEvent />} />
        <Route path="/public/events/:eventId/success" element={<RegisterSuccess />} />

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route 
          path="/admin"
          element={ 
            <ProtectedRouter allowRoles="admin">
              <AdminHeader/>
            </ProtectedRouter>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="profile" element={<Profile />} />
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
          <Route path="events/:eventId/timeline" element={<TimeLineList />} />  
          <Route path="timelines/:timelineId/items/add" element={<AddTimeline />} />
          <Route path="timelines/items/edit/:itemId" element={<EditTimeline />} />
          <Route path="tasks" element={<TaskList />} />
          <Route path="tasks/add" element={<AddTask />} />
          <Route path="tasks/view/:id" element={<ViewTask />} />
          <Route path="tasks/edit/:id" element={<EditTask />} />
          <Route path="trash" element={<Trash />} />
          <Route path="messages" element={<Messages />} />
          <Route path="events/:eventId/registrations" element={<RegistrationList />} />
        </Route>

        <Route 
          path="/staff"
          element={ 
            <ProtectedRouter allowRoles="employee">
              <StaffHeader/>
            </ProtectedRouter>
          }
        >  
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<EventListStaff />} />
          <Route path="events/view/:id" element={<ViewEventStaff />} />
          <Route path="tasks" element={<TaskListStaff />} />
          <Route path="tasks/view/:id" element={<ViewTaskStaff />} />
          <Route path="calendar" element={<WorkCalendar />} />
          <Route path="tasks/add" element={<AddTask />} />
          <Route path="tasks/edit/:id" element={<EditTask />} />
          <Route path="members/view/:id" element={<ViewMember />} />
          <Route path="trash" element={<Trash />} />
          <Route path="messages" element={<Messages />} />
          <Route path="timelines/:timelineId/items/add" element={<AddTimeline />} />
          <Route path="timelines/items/edit/:itemId" element={<EditTimeline />} />
          <Route path="events/:eventId/registrations" element={<RegistrationList />} />
        </Route>

        <Route path="*" element={<h2>404 - Trang không tồn tại</h2>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;