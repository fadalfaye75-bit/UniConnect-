import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { CLASSES } from '../services/mockData';
import { Plus, User, Calendar, Share2, Copy, Trash2, Paperclip, X, Image as ImageIcon, ShieldAlert, Loader2 } from 'lucide-react';
import { UserRole, Announcement } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

export default function Announcements() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ title: '', content: '', isImportant: false });
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

  // 1. PERMISSIONS
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  // 2. FETCH DATA
  useEffect(() => {
    fetchAnnouncements();
  }, [user, adminViewClass]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: Announcement[] = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        author: item.author,
        date: item.created_at,
        className: item.class_name,
        isImportant: item.is_important,
        attachments: item.attachments || []
      }));

      setAnnouncements(formatted);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les annonces.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  // 3. FILTERING
  const displayedAnnouncements = useMemo(() => {
    return announcements.filter(ann => {
      // Admin View: If specific class selected in sidebar, filter by it. Else show all.
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? ann.className === adminViewClass : true;
      }
      // Student/Delegate: Strictly own class only
      return ann.className === user?.className;
    });
  }, [user, adminViewClass, announcements]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      addNotification({ title: 'Copié', message: 'Le contenu a été copié dans le presse-papier', type: 'success' });
    }).catch(() => {
      addNotification({ title: 'Erreur', message: 'Impossible de copier le texte', type: 'alert' });
    });
  };

  const handleShareEmail = (ann: Announcement) => {
    const classInfo = CLASSES.find(c => c.name === ann.className);
    
    if (!classInfo || !classInfo.email) {
      addNotification({ title: 'Impossible', message: 'Aucun email configuré pour cette classe.', type: 'warning' });
      return;
    }

    const subject = encodeURIComponent(`[UniConnect] Annonce : ${ann.title}`);
    const body = encodeURIComponent(`${ann.content}\n\n--\nPartagé via UniConnect`);
    
    // Open default mail client
    window.location.href = `mailto:${classInfo.email}?subject=${subject}&body=${body}`;
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette annonce ?')) return;

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;

      setAnnouncements(prev => prev.filter(a => a.id !== id));
      addNotification({ title: 'Supprimé', message: 'L\'annonce a été supprimée.', type: 'info' });
    } catch (error) {
      console.error('Delete error:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer l\'annonce.', type: 'alert' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFilesToUpload(prev => [...prev, file]);
    }
  };

  const removeFileToUpload = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    try {
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || 'Général');
      const uploadedUrls: string[] = [];

      // 1. Upload files if any
      if (filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('announcements')
            .upload(fileName, file);
          
          if (uploadError) {
             console.error('File upload failed', uploadError);
             continue; 
          }

          const { data: { publicUrl } } = supabase.storage
            .from('announcements')
            .getPublicUrl(fileName);
          
          // Store just the filename or full URL depending on preference. using filename for clean display later or full URL.
          // Let's store full URL but maybe we want to display original name. 
          // For simplicity, we store the public URL. Ideally, we'd store an object {name, url}.
          // Adapting to current Schema which is string[] -> We will store the public URL.
          uploadedUrls.push(publicUrl);
        }
      }

      // 2. Insert into DB
      const { data, error } = await supabase
        .from('announcements')
        .insert({
          title: formData.title,
          content: formData.content,
          author: user?.role === UserRole.DELEGATE ? 'Délégué Classe' : 'Administration', // Simplified author name
          class_name: targetClass,
          is_important: formData.isImportant,
          attachments: uploadedUrls,
          user_id: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newAnn: Announcement = {
          id: data.id,
          title: data.title,
          content: data.content,
          author: data.author,
          date: data.created_at,
          className: data.class_name,
          isImportant: data.is_important,
          attachments: data.attachments
        };
        setAnnouncements(prev => [newAnn, ...prev]);
      }

      setIsModalOpen(false);
      setFormData({ title: '', content: '', isImportant: false });
      setFilesToUpload([]);
      addNotification({ title: 'Succès', message: 'Votre annonce a été publiée.', type: 'success' });

    } catch (error: any) {
      console.error('Post error:', error);
      addNotification({ title: 'Erreur', message: error.message || 'Impossible de publier.', type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-primary-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 py-2 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Avis & Annonces</h2>
          {user?.role === UserRole.ADMIN && adminViewClass && (
             <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded border border-primary-100 dark:bg-primary-900/20 dark:border-primary-800 dark:text-primary-300">
               Vue filtrée : {adminViewClass}
             </span>
          )}
        </div>
        
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nouvelle annonce</span>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {displayedAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-700/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aucune annonce visible</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {user?.role === UserRole.STUDENT 
                ? "Aucune annonce n'a été publiée pour votre classe." 
                : "Aucune annonce ne correspond aux filtres actuels."}
            </p>
          </div>
        ) : (
          displayedAnnouncements.map((ann) => (
            <div key={ann.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                      <User size={20} />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-900 dark:text-white text-sm">{ann.author}</h3>
                     <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                       <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(ann.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' })}</span>
                       <span>•</span>
                       <span className="font-semibold text-primary-600 dark:text-primary-400">{ann.className}</span>
                     </div>
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                  {ann.isImportant && (
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 uppercase tracking-wide">Important</span>
                  )}
                  {canManage && (
                    <button onClick={() => handleDelete(ann.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Supprimer">
                      <Trash2 size={16} />
                    </button>
                  )}
                 </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-3">{ann.title}</h4>
                <div className="prose dark:prose-invert text-gray-600 dark:text-gray-300 text-sm max-w-none leading-relaxed whitespace-pre-line">
                  {ann.content}
                </div>

                {/* Attachments */}
                {ann.attachments && ann.attachments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h5 className="text-xs font-bold text-gray-400 uppercase mb-2">Pièces jointes</h5>
                    <div className="flex flex-wrap gap-2">
                      {ann.attachments.map((fileUrl, idx) => (
                        <a 
                          key={idx} 
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          <Paperclip size={14} className="text-primary-500" />
                          <span>Fichier joint {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleCopy(ann.content)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                  >
                    <Copy size={16} /> Copier
                  </button>
                  {canManage && (
                    <button 
                      onClick={() => handleShareEmail(ann)}
                      className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                    >
                      <Share2 size={16} /> Envoyer par mail
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle Annonce">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Titre</label>
            <input 
              type="text" 
              required
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-300 outline-none transition-all"
              placeholder="Ex: Changement de salle..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Contenu</label>
            <textarea 
              required
              rows={5}
              value={formData.content}
              onChange={e => setFormData({...formData, content: e.target.value})}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-300 outline-none transition-all"
              placeholder="Détails de l'annonce..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isImportant"
              checked={formData.isImportant}
              onChange={e => setFormData({...formData, isImportant: e.target.checked})}
              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
            />
            <label htmlFor="isImportant" className="text-sm font-medium text-gray-700 dark:text-gray-300">Marquer comme important</label>
          </div>

          <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pièces jointes</label>
             <div className="flex items-center gap-2">
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-600 dark:text-gray-300">
                  <Paperclip size={16} /> Ajouter un fichier
                  <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
                <label className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-600 dark:text-gray-300">
                  <ImageIcon size={16} /> Image
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
             </div>
             {filesToUpload.length > 0 && (
               <div className="mt-2 flex flex-wrap gap-2">
                 {filesToUpload.map((file, i) => (
                   <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded border border-primary-100">
                     {file.name}
                     <button type="button" onClick={() => removeFileToUpload(i)}><X size={12} /></button>
                   </span>
                 ))}
               </div>
             )}
          </div>
          
          {/* Target Class Info */}
          <div className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-700 p-2 rounded">
             Cible: {user?.role === UserRole.ADMIN && adminViewClass ? adminViewClass : (user?.className || 'Général')}
          </div>

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="animate-spin" size={20} /> : <Plus size={20} />}
            {submitting ? 'Publication...' : 'Publier l\'annonce'}
          </button>
        </form>
      </Modal>
    </div>
  );
}