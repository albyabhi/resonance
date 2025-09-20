// RoleDashboard.jsx
import React, { Suspense } from 'react';

const Admin = React.lazy(() => import('./DashboardAdmin'));      // admin [attached_file:3]
const Student = React.lazy(() => import('./DashboardStudent'));  // student [attached_file:2]
const Faculty = React.lazy(() => import('./DashboardFaculty'));  // faculty [attached_file:1]
const House = React.lazy(() => import('./DashboardHouse'));      // house [attached_file:4]
// Note: filename is "DasboardGuest.jsx" (without the 'h') in the attachment
const Guest = React.lazy(() => import('./DasboardGuest'));       // guest [attached_file:5]

const roleMap = {
  admin: Admin,
  student: Student,
  faculty: Faculty,
  house: House,
  guest: Guest,
};

export default function RoleDashboard({ role }) {
  const Comp = roleMap[role?.toLowerCase()] ?? Guest;
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Comp />
    </Suspense>
  );
}

// Example usage inside a protected route or page:
// <RoleDashboard role={currentUser.role} />
