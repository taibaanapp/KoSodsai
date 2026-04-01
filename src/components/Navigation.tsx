import React from 'react';
import { LayoutDashboard, Beef, Wallet, History, Settings, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center w-full py-2 px-1 transition-colors",
      active ? "text-orange-600" : "text-gray-500 hover:text-orange-400"
    )}
  >
    <div className={cn("p-1 rounded-lg", active && "bg-orange-50")}>
      {icon}
    </div>
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout: () => void;
}

export const Navigation = ({ activeTab, onTabChange, onLogout }: NavigationProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pb-safe pt-2 flex justify-between items-center z-50">
      <NavItem
        icon={<LayoutDashboard size={20} />}
        label="หน้าหลัก"
        active={activeTab === 'dashboard'}
        onClick={() => onTabChange('dashboard')}
      />
      <NavItem
        icon={<Beef size={20} />}
        label="จัดการวัว"
        active={activeTab === 'cattle'}
        onClick={() => onTabChange('cattle')}
      />
      <NavItem
        icon={<Wallet size={20} />}
        label="บัญชี"
        active={activeTab === 'finance'}
        onClick={() => onTabChange('finance')}
      />
      <NavItem
        icon={<History size={20} />}
        label="ประวัติ"
        active={activeTab === 'history'}
        onClick={() => onTabChange('history')}
      />
      <NavItem
        icon={<LogOut size={20} />}
        label="ออก"
        onClick={onLogout}
      />
    </nav>
  );
};
