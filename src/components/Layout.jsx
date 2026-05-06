import { NavLink, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Package, 
  Briefcase, 
  FileText, 
  Wallet 
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Layout() {
  const { session, signOut } = useAuth();
  
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/clients', label: 'Clients', icon: Building2 },
    { to: '/freelancers', label: 'Freelancers', icon: Users },
    { to: '/services', label: 'Services', icon: Package },
    { to: '/engagements', label: 'Engagements', icon: Briefcase },
    { to: '/invoices', label: 'Invoices', icon: FileText },
    { to: '/fees', label: 'Fees', icon: Wallet },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <aside className="flex w-56 flex-col bg-white border-r border-gray-200">
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 flex-shrink-0 bg-emerald-600 rounded-md flex items-center justify-center text-white text-xs">
            💼
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-gray-900 leading-none">Ilusa</span>
            <span className="text-xs text-gray-500 mt-1">Budget Controlling</span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        
        <div className="border-t border-gray-200 p-3 flex flex-col gap-1">
          <span className="text-xs text-gray-500 truncate" title={session?.user?.email}>
            {session?.user?.email}
          </span>
          <button 
            onClick={signOut}
            className="text-xs text-left text-gray-600 hover:text-red-600 font-medium mt-1 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
      
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
