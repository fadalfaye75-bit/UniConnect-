import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { ANNOUNCEMENTS_MOCK, EXAMS_MOCK } from '../services/mockData';
import { Clock, AlertCircle, ChevronRight, FileText, Video, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { openChat } = useChat();

  const importantAnnouncements = ANNOUNCEMENTS_MOCK.slice(0, 3);
  const upcomingExams = EXAMS_MOCK.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 5);

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
          <div className="text-3xl font-bold text-gray-800 dark:text-white">3</div>
          <div className="text-xs text-green-500 font-medium mt-1">+1 cette semaine</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between mb-3">
             <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">Examens</div>
             <div className="p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg group-hover:bg-orange-100 transition-colors"><GraduationCap size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">2</div>
          <div className="text-xs text-orange-500 font-medium mt-1">À venir (7 jours)</div>
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
            
            <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x">
               {upcomingExams.map(exam => {
                 const daysLeft = Math.ceil((new Date(exam.date).getTime() - Date.now()) / (1000 * 3600 * 24));
                 const isUrgent = daysLeft <= 3;
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
                         <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Restant</span>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 flex items-center gap-2">
               <FileText size={20} className="text-primary-400" />
               Fil d'actualité
            </h3>
            <div className="space-y-4">
              {importantAnnouncements.map(ann => (
                <div key={ann.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all group">
                  <div className="flex items-start gap-4">
                    <div className={`mt-1 p-2.5 rounded-full flex-shrink-0 ${ann.isImportant ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {ann.isImportant ? <AlertCircle size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                         <h4 className="font-bold text-gray-900 dark:text-white truncate pr-2">{ann.title}</h4>
                         <span className="text-xs text-gray-400 whitespace-nowrap">{new Date(ann.date).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2 leading-relaxed">{ann.content}</p>
                      <Link to="/announcements" className="text-xs text-primary-500 font-bold mt-3 flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400 group-hover:translate-x-1 transition-all">
                        Lire la suite <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Access Right Column (Desktop) */}
        <div className="hidden md:block space-y-6">
           {/* AI Promo Card */}
           <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <h3 className="font-bold text-lg mb-2 relative z-10">Besoin d'aide ?</h3>
              <p className="text-primary-100 text-sm mb-6 leading-relaxed relative z-10">
                L'assistant UniConnect est là pour répondre à vos questions sur les cours.
              </p>
              <button 
                onClick={openChat}
                className="bg-white text-primary-700 text-sm font-bold px-5 py-2.5 rounded-lg transition-transform hover:scale-105 shadow-md w-full relative z-10 active:scale-95"
              >
                Ouvrir l'Assistant
              </button>
           </div>

           {/* Quick Actions */}
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-sm uppercase tracking-wide">Accès Rapide</h3>
              <div className="grid grid-cols-2 gap-3">
                 <Link to="/schedule" className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center hover:bg-white hover:shadow-md hover:border-gray-200 border border-transparent transition-all group">
                   <Clock className="mx-auto mb-2 text-primary-500 group-hover:scale-110 transition-transform" size={24} />
                   <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Emploi du temps</span>
                 </Link>
                 <Link to="/meet" className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center hover:bg-white hover:shadow-md hover:border-gray-200 border border-transparent transition-all group">
                   <Video className="mx-auto mb-2 text-primary-500 group-hover:scale-110 transition-transform" size={24} />
                   <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Visio</span>
                 </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}