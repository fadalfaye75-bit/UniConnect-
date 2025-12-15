import React, { useState, useEffect, useMemo } from 'react';
import { Video, ExternalLink, Plus, Trash2, Calendar, Copy, Loader2, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, MeetLink } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

export default function Meet() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const [meetings, setMeetings] = useState<MeetLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ title: '', platform: 'Google Meet', url: '', day: '', time: '' });

  // 1. PERMISSIONS
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  // 2. FETCH DATA
  useEffect(() => {
    fetchMeetings();
  }, [user, adminViewClass]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: MeetLink[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        platform: item.platform,
        url: item.url,
        time: `${item.day} ${item.time}`,
        className: item.class_name
      }));

      setMeetings(formatted);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les réunions.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  // 3. FILTERING
  const displayedLinks = useMemo(() => {
    return meetings.filter(link => {
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? link.className === adminViewClass : true;
      }
      return link.className === user?.className;
    });
  }, [user, adminViewClass, meetings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || 'Général');
      
      const { data, error } = await supabase.from('meetings').insert({
        title: formData.title,
        platform: formData.platform,
        url: formData.url,
        day: formData.day,
        time: formData.time,
        class_name: targetClass,
        created_by: user?.id
      }).select().single();

      if (error) throw error;

      if (data) {
        const newLink: MeetLink = {
          id: data.id,
          title: data.title,
          platform: data.platform,
          url: data.url,
          time: `${data.day} ${data.time}`,
          className: data.class_name
        };
        setMeetings(prev => [newLink, ...prev]);
      }

      setIsModalOpen(false);
      setFormData({ title: '', platform: 'Google Meet', url: '', day: '', time: '' });
      addNotification({ title: 'Réunion ajoutée', message: 'Le lien est disponible pour la classe.', type: 'success' });
    } catch (error: any) {
      console.error(error);
      addNotification({ title: 'Erreur', message: "Impossible d'ajouter la réunion.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer ce lien ?')) return;

    try {
      const { error } = await supabase.from('meetings').delete().eq('id', id);
      if (error) throw error;
      setMeetings(prev => prev.filter(l => l.id !== id));
      addNotification({ title: 'Supprimé', message: 'Lien de visioconférence retiré.', type: 'info' });
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur', message: "Impossible de supprimer.", type: 'alert' });
    }
  };

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      addNotification({ title: 'Copié', message: 'Lien copié dans le presse-papier.', type: 'success' });
    }).catch(() => {
      addNotification({ title: 'Erreur', message: 'Impossible de copier le lien.', type: 'alert' });
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Visioconférences</h2>
           <p className="text-sm text-gray-500">{user?.role === UserRole.ADMIN && adminViewClass ? adminViewClass : user?.className}</p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Ajouter une réunion</span>
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Cours</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Plateforme</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider">Horaire</th>
                <th className="p-5 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {displayedLinks.map(link => (
                <tr key={link.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                  <td className="p-5 font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-500 rounded-lg">
                      <Video size={18} />
                    </div>
                    {link.title}
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border
                      ${link.platform === 'Google Meet' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800' : 
                        link.platform === 'Zoom' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800' : 
                        'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800'}`}>
                      {link.platform}
                    </span>
                  </td>
                  <td className="p-5 text-sm font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      {link.time}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    {/* Increased gap from gap-3 to gap-5 for better separation */}
                    <div className="flex items-center justify-end gap-5">
                      
                      {/* Copy Button */}
                      <button 
                        onClick={() => handleCopy(link.url)}
                        className="text-gray-400 hover:text-primary-500 transition-colors p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-1.5 text-xs font-bold"
                        title="Copier le lien"
                      >
                         <Copy size={16} /> <span className="hidden lg:inline">Copier</span>
                      </button>

                      <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>

                      {/* Join Button */}
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-600 hover:text-primary-700 hover:underline px-2 py-1"
                      >
                        Rejoindre <ExternalLink size={14} />
                      </a>

                      {canManage && (
                        <>
                           <div className="h-4 w-px bg-gray-200 dark:bg-gray-700"></div>
                           <button 
                             onClick={() => handleDelete(link.id)} 
                             className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                             title="Supprimer"
                           >
                             <Trash2 size={16} />
                           </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayedLinks.length === 0 && (
          <div className="p-12 text-center text-gray-400">
            <Video size={48} className="mx-auto mb-3 opacity-20" />
            <p>Aucune visioconférence programmée pour cette classe.</p>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle Réunion">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Titre du cours</label>
            <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: TD Anglais" />
          </div>
          <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Plateforme</label>
             <select value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300">
               <option value="Google Meet">Google Meet</option>
               <option value="Zoom">Zoom</option>
               <option value="Teams">Microsoft Teams</option>
               <option value="Other">Autre</option>
             </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Lien URL</label>
            <div className="relative">
               <LinkIcon className="absolute left-3 top-2.5 text-gray-400" size={16} />
               <input required type="url" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="https://..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Jour</label>
               <select required value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300">
                 <option value="">Choisir...</option>
                 <option value="Lundi">Lundi</option>
                 <option value="Mardi">Mardi</option>
                 <option value="Mercredi">Mercredi</option>
                 <option value="Jeudi">Jeudi</option>
                 <option value="Vendredi">Vendredi</option>
                 <option value="Samedi">Samedi</option>
               </select>
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heure</label>
               <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" />
             </div>
          </div>
          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
             {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Ajouter'}
          </button>
        </form>
      </Modal>
    </div>
  );
}