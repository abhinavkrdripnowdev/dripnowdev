import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import { DeliveryOperations, type DeliverySection } from './DeliveryOperations';
import './DeliveryWorkspace.css';

export function DeliveryDashboard() {
  const [section, setSection] = useState<DeliverySection>('overview');
  const navItems = [
    { label: 'Overview', icon: '', active: section === 'overview', onClick: () => setSection('overview') },
    { label: 'Open Orders', icon: '', active: section === 'available', onClick: () => setSection('available') },
    { label: 'Active Delivery', icon: '', active: section === 'active', onClick: () => setSection('active') },
    { label: 'Delivery History', icon: '', active: section === 'history', onClick: () => setSection('history') },
    { label: 'Earnings', icon: '', active: section === 'earnings', onClick: () => setSection('earnings') },
    { label: 'Profile & Vehicle', icon: '', active: section === 'profile', onClick: () => setSection('profile') },
  ];
  return <DashboardLayout role="Delivery Partner" roleColor="hsl(200, 83%, 52%)" navItems={navItems}><DeliveryOperations section={section} onNavigate={setSection} /></DashboardLayout>;
}
