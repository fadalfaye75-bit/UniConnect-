import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Announcement, Exam, UserRole } from '../types';
import { Clock, AlertCircle, ChevronRight, FileText, Video, GraduationCap, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user, adminViewClass } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    announcementsWeek: 0,
    examsWeek: 0,
    totalAnnouncements: 0
  });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, adminViewClass]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || '');
      const isAdmin = user?.role === UserRole.ADMIN && !adminViewClass; // View all if admin and no filter

      // 1. Fetch Upcoming Exams
      const today = new Date().toISOString();
      let examsQuery = supabase
        .from('exams')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(10);

      if (!isAdmin) {
        examsQuery = examsQuery.eq('class_name', targetClass);
      }

      const { data: examsData, error: examsError } = await examsQuery;
      if (examsError) throw examsError;

      // 2. Fetch Recent Announcements
      let annQuery = supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!isAdmin) {
        annQuery = annQuery.eq('class_name', targetClass);
      }

      const { data: annData, error: annError } = await annQuery;
      if (annError) throw annError;

      // 3. Process Data
      const formattedExams: Exam[] = (examsData || []).map(e => ({
        id: e.id,
        subject: e.subject,
        date: e.date,
        duration: e.duration,
        room: e.room,
        notes: e.notes,
        className: e.class_name
      }));

      const formattedAnnouncements: Announcement[] = (annData || []).map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        author: a.author,
        date: a.created_at,
        className: a.class_name,
        isImportant: a.is_important,
        attachments: a.attachments
      }));

      // 4. Calculate Stats
      const oneWeekAway = new Date();
      oneWeekAway.setDate(oneWeekAway.getDate() + 7);
      
      const examsNext7Days = formattedExams.filter(e => new Date(e.date) <= oneWeekAway).length;
      
      // For announcements this week, we need to check the date
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newAnnouncementsCount = formattedAnnouncements.filter(a => new Date(a.date) >= oneWeekAgo).length;

      setExams(formattedExams);
      setAnnouncements(formattedAnnouncements);
      setStats({
        examsWeek: examsNext7Days,
        announcementsWeek: newAnnouncementsCount,
        totalAnnouncements: formattedAnnouncements.length // Just showing count of loaded ones or we could do a count query
      });

    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin text-primary-500" size={48} />
      </div>
    );
  }

  // Filter for display
  const importantAnnouncements = announcements.filter(a => a.isImportant).slice(0, 3);
  // If no important ones, just take the most recent
  const displayAnnouncements = importantAnnouncements.length > 0 ? importantAnnouncements : announcements.slice(0, 3);
  const upcomingExams = exams.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
             Tableau de Bord
           </h2>
           <p className="text-gray-500 dark:text-gray-400 mt-1">
             Bienvenue, <span className="text-primary-500 font-semibold">{user?.name.split(' ')[0]}</span> 👋
           </p>
        </div>
        <span className="hidden md:block text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>

      {/* Quick Stats/Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-3">
             <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Annonces</div>
             <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-colors"><FileText size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalAnnouncements}</div>
          <div className="text-xs text-green-500 font-medium mt-1">
            {stats.announcementsWeek > 0 ? `+${stats.announcementsWeek} cette semaine` : 'Pas de nouveautés'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-3">
             <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Examens</div>
             <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg group-hover:bg-orange-100 transition-colors"><GraduationCap size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">{upcomingExams.length}</div>
          <div className={`text-xs font-medium mt-1 ${stats.examsWeek > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
            {stats.examsWeek > 0 ? `${stats.examsWeek} à venir (7 jours)` : 'Rien cette semaine'}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Urgent Exams & Feed */}
        <div className="md:col-span-2 space-y-8">
          {/* Upcoming Exams Horizontal Scroll */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <Clock size={20} className="text-primary-400" />
                Prochains Examens
              </h3>
              <Link to="/exams" className="text-sm text-primary-500 font-semibold hover:text-primary-600 transition-colors">Voir tout</Link>
            </div>
            
            {upcomingExams.length > 0 ? (
              <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x">
                 {upcomingExams.map(exam => {
                   const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 3600 * 24));
                   const isUrgent = daysLeft <= 3 && daysLeft >= 0;
                   return (
                     <div key={exam.id} className="min-w-[280px] md:min-w-0 snap-start bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:border-primary-200 dark:hover:border-primary-700 transition-colors relative overflow-hidden group">
                        {isUrgent && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-400"></div>}
                        <div className="pl-2">
                          <h4 className="font-bold text-gray-800 dark:text-white text-lg">{exam.subject}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                             <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-medium text-gray-600 dark:text-gray-300">
                               {new Date(exam.date).toLocaleDateString('fr-FR')}
                             </span>
                             <span className="text-gray-400">•</span>
                             <span>{new Date(exam.date).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                             <span className="text-xs text-gray-400 flex items-center gap-1">Salle {exam.room}</span>
                          </div>
                        </div>
                        <div className="text-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg min-w-[70px]">
                           <span className={`block text-xl font-bold ${isUrgent ? 'text-orange-500' : 'text-green-500'}`}>
                             J-{daysLeft}
                           </span>
                           <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Restant</span>
                        </div>
                     </div>
                   );
                 })}
              </div>
            ) : (
              <div className="p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-gray-400 text-sm">
                Aucun examen programmé prochainement.
              </div>
            )}
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
               <FileText size={20} className="text-primary-400" />
               Fil d'actualité
            </h3>
            <div className="space-y-4">
              {displayAnnouncements.length > 0 ? (
                displayAnnouncements.map(ann => (
                  <div key={ann.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs font-bold text-primary-500 uppercase tracking-wide mb-1 block">{ann.author}</span>
                        <h4 className="font-bold text-gray-900 dark:text-white">{ann.title}</h4>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(ann.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{ann.content}</p>
                    <div className="mt-3 flex items-center gap-2">
                       {ann.isImportant && (
                         <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded border border-red-100 uppercase">Important</span>
                       )}
                       <Link to="/announcements" className="ml-auto text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                         Lire la suite <ChevronRight size={14} />
                       </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-center text-gray-400 text-sm">
                  Aucune annonce récente.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Access */}
        <div className="space-y-6">
          
          {/* Quick Actions */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-6 text-white shadow-lg">
             <h3 className="font-bold text-lg mb-4">Accès Rapide</h3>
             <div className="grid grid-cols-2 gap-3">
                <Link to="/schedule" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-colors text-center">
                   <Clock size={24} className="mx-auto mb-2" />
                   <span className="text-xs font-bold">Emploi du temps</span>
                </Link>
                <Link to="/meet" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl backdrop-blur-sm transition-colors text-center">
                   <Video size={24} className="mx-auto mb-2" />
                   <span className="text-xs font-bold">Visiio</span>
                </Link>
             </div>
          </div>

          {/* Next Class / Schedule Teaser (Simulated or fetched if we had parsed schedule data) */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
             <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
               <AlertCircle size={18} className="text-gray-400" /> Info
             </h3>
             <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
               N'oubliez pas de consulter régulièrement votre emploi du temps pour les changements de salle de dernière minute.
             </p>
             <Link to="/schedule" className="mt-4 block w-full py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-center rounded-lg text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
               Voir le planning
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
}