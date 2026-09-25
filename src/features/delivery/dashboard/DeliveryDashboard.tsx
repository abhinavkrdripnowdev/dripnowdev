import { DashboardLayout } from '@/components/layout/DashboardLayout/DashboardLayout';
import { DeliveryOperations } from './DeliveryOperations';
export function DeliveryDashboard() {
  return <DashboardLayout role="Delivery Partner" roleColor="hsl(200, 83%, 52%)" navItems={[]}><DeliveryOperations /></DashboardLayout>;
}
