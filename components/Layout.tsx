import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Megaphone, Calendar, GraduationCap, Video, 
  BarChart2, Search, LogOut, Menu, X, Moon, Sun, 
  ShieldCheck, UserCircle, Bell, Check, Trash2, Info, AlertTriangle, CheckCircle, AlertCircle, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { CLASSES } from '../services/mockData';
import { AppNotification } from '../types';

export default function Layout() {
  const { user, logout, toggleTheme, isDarkMode, adminViewClass, setAdminViewClass } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotification();
  
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isNotifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Global Search Shortcut (Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Listen for new notifications to show toast
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      const isRecent = new Date().getTime() - new Date(latest.timestamp).getTime() < 2000;
      if (isRecent) {
        setActiveToast(latest);
        const timer = setTimeout(() => setActiveToast(null), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isSearchOpen]);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de Bord' },
    { to: '/announcements', icon: Megaphone, label: 'Annonces' },
    { to: '/schedule', icon: Calendar, label: 'Emploi du Temps' },
    { to: '/exams', icon: GraduationCap, label: 'Examens' },
    { to: '/meet', icon: Video, label: 'Visioconférence' },
    { to: '/polls', icon: BarChart2, label: 'Consultations' },
    { to: '/profile', icon: Settings, label: 'Mon Profil' },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ to: '/admin', icon: ShieldCheck, label: 'Administration' });
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    alert(`Recherche pour: ${searchQuery}`);
  };

  const handleNotifClick = (notif: AppNotification) => {
    markAsRead(notif.id);
    if (notif.link) {
      navigate(notif.link);
      setNotifOpen(false);
    }
  };

  const getNotifIcon = (type: string) => {
    switch(type) {
      case 'warning': return <AlertTriangle size={16} className="text-orange-500" />;
      case 'success': return <CheckCircle size={16} className="text-green-500" />;
      case 'alert': return <AlertCircle size={16} className="text-red-500" />;
      default: return <Info size={16} className="text-primary-500" />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl md:shadow-sm`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 h-16">
          <div className="flex items-center gap-2">
            <div className="bg-primary-300 w-8 h-8 rounded-lg flex items-center justify-center text-white">
              <GraduationCap size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">UniConnect</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <NavLink to="/profile" className="flex items-center gap-3 mb-6 p-3 bg-primary-50 dark:bg-gray-700/50 rounded-lg border border-primary-100 dark:border-gray-600 hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
             <img src={user?.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-4 border-primary-200 group-hover:border-primary-400 transition-colors" />
             <div className="flex-1 min-w-0">
               <p className="text-sm font-semibold truncate text-gray-800 dark:text-white">{user?.name}</p>
               <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                 {user?.role === 'ADMIN' ? 'Administrateur' : user?.className}
               </p>
             </div>
          </NavLink>

          {user?.role === 'ADMIN' && (
            <div className="mb-4 px-1">
               <label className="text-xs text-gray-500 uppercase font-bold ml-1">Vue Classe</label>
               <select 
                className="w-full mt-1 p-2 text-sm border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary-300 outline-none"
                value={adminViewClass || ''}
                onChange={(e) => setAdminViewClass(e.target.value || null)}
               >
                 <option value="">Toutes les classes</option>
                 {CLASSES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
               </select>
            </div>
          )}

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${isActive ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200'}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button onClick={logout} className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors">
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 dark:text-gray-300">
              <Menu size={24} />
            </button>
            <span className="font-bold text-lg text-gray-800 dark:text-white">UniConnect</span>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl ml-4">
             <button 
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-all"
             >
               <Search size={16} />
               <span>Rechercher partout (Ctrl + K)</span>
             </button>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setSearchOpen(true)} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
                <Search size={20} />
             </button>
             
             {/* Notification Bell */}
             <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setNotifOpen(!isNotifOpen)}
                  className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full relative transition-colors focus:ring-2 focus:ring-primary-100 dark:focus:ring-gray-600 outline-none"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800"></span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                     <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800 backdrop-blur">
                       <h3 className="font-bold text-sm text-gray-900 dark:text-white">Notifications</h3>
                       <div className="flex gap-1">
                         {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="p-1.5 text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20 rounded-md transition-colors" title="Tout marquer comme lu">
                              <Check size={16} />
                            </button>
                         )}
                         <button onClick={clearNotifications} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Effacer tout">
                           <Trash2 size={16} />
                         </button>
                       </div>
                     </div>
                     
                     <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
                            <Bell size={32} className="mb-2 opacity-20" />
                            <span className="text-sm">Aucune notification</span>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              onClick={() => handleNotifClick(notif)}
                              className={`p-4 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary-50/40 dark:bg-primary-900/10' : ''}`}
                            >
                              <div className="flex gap-3">
                                <div className={`mt-0.5 flex-shrink-0 ${!notif.isRead ? 'text-primary-500' : 'text-gray-400'}`}>
                                   {getNotifIcon(notif.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1">
                                    <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-300'}`}>
                                      {notif.title}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                      {new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                    {notif.message}
                                  </p>
                                </div>
                                {!notif.isRead && (
                                  <div className="flex-shrink-0 self-center">
                                    <div className="w-2 h-2 bg-primary-500 rounded-full ring-2 ring-primary-100 dark:ring-primary-900"></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                     </div>
                     <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-center">
                        <NavLink to="/announcements" onClick={() => setNotifOpen(false)} className="text-xs font-semibold text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 uppercase tracking-wide">
                          Voir toutes les annonces
                        </NavLink>
                     </div>
                  </div>
                )}
             </div>

             <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-600 outline-none">
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             
             <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
             
             {/* Simple User Badge */}
             <div className="hidden sm:flex items-center gap-2">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                    user?.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' :
                    user?.role === 'DELEGATE' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                    'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'
                }`}>
                  {user?.role === 'DELEGATE' ? 'Délégué' : user?.role === 'ADMIN' ? 'Admin' : 'Étudiant'}
                </span>
             </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 md:pb-8 scroll-smooth bg-gray-50/50 dark:bg-gray-900 relative">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around py-3 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <NavLink to="/" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-gray-700' : 'text-gray-400'}`}>
            <LayoutDashboard size={24} />
          </NavLink>
          <NavLink to="/announcements" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-gray-700' : 'text-gray-400'}`}>
            <Megaphone size={24} />
          </NavLink>
          <NavLink to="/exams" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-gray-700' : 'text-gray-400'}`}>
            <GraduationCap size={24} />
          </NavLink>
          <NavLink to="/profile" className={({isActive}) => `p-2 rounded-lg transition-colors ${isActive ? 'text-primary-500 dark:text-primary-400 bg-primary-50 dark:bg-gray-700' : 'text-gray-400'}`}>
             <UserCircle size={24} />
          </NavLink>
        </nav>
      </div>

      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 animate-[slide-in-right_0.4s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary-400"></div>
          <div className="p-4 pl-5 flex gap-3">
             <div className="mt-0.5 text-primary-500">{getNotifIcon(activeToast.type)}</div>
             <div className="flex-1">
               <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{activeToast.title}</h4>
               <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{activeToast.message}</p>
             </div>
             <button onClick={() => setActiveToast(null)} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-200 transition-colors">
               <X size={16} />
             </button>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/30 px-4 py-2 text-right">
             <button 
               onClick={() => { handleNotifClick(activeToast); setActiveToast(null); }}
               className="text-xs font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 uppercase tracking-wide"
             >
               Voir
             </button>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSearchOpen(false)}>
           <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
             <form onSubmit={handleSearchSubmit} className="relative border-b border-gray-100 dark:border-gray-700">
                <Search className="absolute left-4 top-4 text-primary-400 pointer-events-none" size={20} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  placeholder="Rechercher un cours, un examen, un fichier..."
                  className="w-full py-4 pl-12 pr-4 bg-transparent text-lg text-gray-800 dark:text-white outline-none placeholder-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="button" onClick={() => setSearchOpen(false)} className="absolute right-3 top-3.5 px-2 py-1 text-xs font-bold text-gray-400 border border-gray-200 rounded dark:text-gray-500 dark:border-gray-600 hover:bg-gray-50 transition-colors">
                  ESC
                </button>
             </form>
             <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 max-h-96 overflow-y-auto">
               {searchQuery ? (
                  <p className="text-center text-gray-500 py-8">Appuyez sur Entrée pour chercher "{searchQuery}"</p>
               ) : (
                 <div className="space-y-3">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Récents</h3>
                   <div className="text-sm text-gray-500 dark:text-gray-400 italic px-2">Aucune recherche récente</div>
                 </div>
               )}
             </div>
           </div>
        </div>
      )}
    </div>
  );
}