import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  Briefcase,
  FileText,
  ChartNoAxesCombined,
  Activity,
  CheckSquare,
  Settings,
  Wallet,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Building2 },
  { to: '/freelancers', label: 'Freelancers', icon: Users },
  { to: '/services', label: 'Services', icon: Package },
  { to: '/engagements', label: 'Engagements', icon: Briefcase },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/fees', label: 'Fees', icon: Wallet },
  { to: '/payroll-analytics', label: 'Payroll', icon: ChartNoAxesCombined },
  { to: '/monthly-close', label: 'Close', icon: CheckSquare },
  { to: '/activity-log', label: 'Activity', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const mobileNavItems = navItems.filter((item) => ['/', '/invoices', '/fees', '/payroll-analytics', '/monthly-close'].includes(item.to));

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#283618] text-sm font-bold tracking-tight text-[#FEFAE0] shadow-sm shadow-[#283618]/20">
        IL
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-none tracking-tight text-[#283618]">Ilusa</p>
        <p className="mt-1 truncate text-xs text-[#606C38]">Budget Controlling</p>
      </div>
    </div>
  );
}

function NavItem({ item, compact = false }) {
  const Icon = item.icon;

  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
          isActive
            ? 'bg-[#283618] text-[#FEFAE0] shadow-sm shadow-[#283618]/20'
            : 'text-[#606C38] hover:bg-[#DDA15E]/15 hover:text-[#283618]'
        } ${compact ? 'flex-col gap-1 px-2 py-2 text-[11px]' : ''}`
      }
    >
      <Icon size={compact ? 18 : 17} />
      <span className={compact ? 'leading-none' : ''}>{item.label}</span>
    </NavLink>
  );
}

export default function Layout() {
  const { session, signOut } = useAuth();
  const location = useLocation();
  const currentItem = navItems.find((item) => item.to === location.pathname) || navItems[0];
  const CurrentIcon = currentItem.icon;

  return (
    <div className="min-h-screen bg-[#FEFAE0] font-sans text-[#283618]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[#DDA15E]/35 bg-[#FEFAE0]/95 p-4 backdrop-blur lg:flex lg:flex-col">
        <BrandMark />

        <nav className="mt-8 flex-1 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>

        <div className="rounded-xl border border-[#DDA15E]/35 bg-white/75 p-3 shadow-sm shadow-[#283618]/5">
          <p className="truncate text-xs font-medium text-[#283618]" title={session?.user?.email}>
            {session?.user?.email}
          </p>
          <button
            onClick={signOut}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#DDA15E]/40 px-3 py-2 text-xs font-medium text-[#606C38] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="sticky top-0 z-20 border-b border-[#DDA15E]/35 bg-[#FEFAE0]/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <BrandMark />
          <div className="flex items-center gap-2 rounded-full bg-[#DDA15E]/20 px-3 py-1.5 text-xs font-semibold text-[#283618]">
            <CurrentIcon size={14} />
            {currentItem.label}
          </div>
        </div>
      </div>

      <main className="min-h-screen px-4 py-6 pb-28 sm:px-6 lg:ml-64 lg:px-8 lg:py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-[1500px]"
        >
          <Outlet />
        </motion.div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDA15E]/35 bg-[#FEFAE0]/95 px-2 pb-2 pt-2 shadow-[0_-12px_30px_rgba(40,54,24,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {mobileNavItems.map((item) => (
            <NavItem key={item.to} item={item} compact />
          ))}
        </div>
      </nav>
    </div>
  );
}
