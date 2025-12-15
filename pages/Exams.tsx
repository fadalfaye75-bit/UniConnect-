import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, MapPin, AlertTriangle, Plus, Trash2, Loader2 } from 'lucide-react';
import { UserRole, Exam } from '../types';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';

export default function Exams() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({ subject: '', date: '', time: '', duration: '', room: '', notes: '' });

  // 1. PERMISSIONS
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  // 2. FETCH DATA
  useEffect(() => {
    fetchExams();
  }, [user, adminViewClass]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;

      const formatted: Exam[] = (data || []).map(item => ({
        id: item.id,
        subject: item.subject,
        date: item.date,
        duration: item.duration,
        room: item.room,
        notes: item.notes,
        className: item.class_name
      }));

      setExams(formatted);
    } catch (error) {
      console.error('Error fetching exams:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les examens.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  // 3. FILTERING
  const displayedExams = useMemo(() => {
    return exams.filter(exam => {
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? exam.className === adminViewClass : true;
      }
      return exam.className === user?.className;
    });
  }, [user, adminViewClass, exams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CONFIRMATION
    if (!window.confirm(`Confirmez-vous l'ajout de l'examen de ${formData.subject} le ${new Date(formData.date).toLocaleDateString()} ?`)) {
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || 'Général');
      const isoDate = new Date(`${formData.date}T${formData.time}`).toISOString();

      const { data, error } = await supabase.from('exams').insert({
        subject: formData.subject,
        date: isoDate,
        duration: formData.duration,
        room: formData.room,
        notes: formData.notes,
        class_name: targetClass,
        created_by: user?.id
      }).select().single();

      if (error) throw error;

      if (data) {
        const newExam: Exam = {
            id: data.id,
            subject: data.subject,
            date: data.date,
            duration: data.duration,
            room: data.room,
            notes: data.notes,
            className: data.class_name
        };
        // Add locally and resort
        setExams(prev => [...prev, newExam].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      }

      setIsModalOpen(false);
      setFormData({ subject: '', date: '', time: '', duration: '', room: '', notes: '' });
      addNotification({ title: 'Succès', message: 'Examen ajouté au calendrier.', type: 'success' });

    } catch (error: any) {
      console.error('Error adding exam:', error);
      addNotification({ title: 'Erreur', message: error.message || "Impossible d'ajouter l'examen.", type: 'alert' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cet examen ?')) return;

    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      
      setExams(prev => prev.filter(e => e.id !== id));
      addNotification({ title: 'Examen supprimé', message: 'L\'examen a été retiré.', type: 'info' });
    } catch (error) {
        console.error(error);
        addNotification({ title: 'Erreur', message: "Impossible de supprimer.", type: 'alert' });
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
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 py-4 z-10 backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Examens & DS</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Calendrier : <span className="font-semibold text-primary-600">{user?.role === UserRole.ADMIN && adminViewClass ? adminViewClass : user?.className}</span>
          </p>
        </div>
        {canManage && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Ajouter</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {displayedExams.map((exam) => {
          const examDate = new Date(exam.date);
          const now = new Date();
          const timeDiff = examDate.getTime() - now.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          const isUrgent = daysDiff >= 0 && daysDiff <= 3;
          const isPassed = timeDiff < 0;

          return (
            <div key={exam.id} className={`relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border transition-all hover:shadow-md ${isUrgent ? 'border-orange-300 dark:border-orange-500 ring-1 ring-orange-100 dark:ring-orange-900/30' : isPassed ? 'opacity-75 border-gray-100 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700'}`}>
              
              {isUrgent && (
                <div className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1 shadow-sm">
                  <AlertTriangle size={12} /> J-{daysDiff}
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center gap-6">
                
                {/* Date Box */}
                <div className={`flex-shrink-0 flex md:flex-col items-center justify-center rounded-lg p-3 md:w-20 md:h-20 text-center gap-2 md:gap-0 ${isUrgent ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                   <span className="text-xs font-bold uppercase tracking-wider">{examDate.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                   <span className="text-2xl font-black">{examDate.getDate()}</span>
                   <span className="text-xs md:hidden">- {examDate.toLocaleDateString('fr-FR', { weekday: 'long' })}</span>
                </div>

                <div className="flex-1">
                   <div className="flex justify-between items-start">
                     <h3 className={`text-lg font-bold ${isPassed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>{exam.subject}</h3>
                     {canManage && (
                       <button onClick={() => handleDelete(exam.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                         <Trash2 size={16} />
                       </button>
                     )}
                   </div>
                   
                   <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-300 mt-2">
                     <div className="flex items-center gap-1.5">
                       <Clock size={16} className="text-primary-500" />
                       <span>{examDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ({exam.duration})</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                       <MapPin size={16} className="text-primary-500" />
                       <span>{exam.room}</span>
                     </div>
                     <div className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                       {exam.className}
                     </div>
                   </div>

                   {exam.notes && (
                     <div className="mt-3 text-xs font-medium bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-200 px-3 py-1.5 rounded-lg inline-block border border-yellow-100 dark:border-yellow-900/50">
                       ℹ️ {exam.notes}
                     </div>
                   )}
                </div>
              </div>
            </div>
          );
        })}
        {displayedExams.length === 0 && (
           <div className="text-center py-12 text-gray-400">Aucun examen prévu pour le moment.</div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Ajouter un Examen">
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Matière</label>
             <input required type="text" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: Mathématiques" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date</label>
               <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heure</label>
               <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" />
             </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Durée</label>
               <input required type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: 2h" />
             </div>
             <div>
               <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Salle</label>
               <input required type="text" value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: A204" />
             </div>
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Notes (Optionnel)</label>
             <input type="text" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" placeholder="Ex: Calculatrice autorisée" />
           </div>
           <button 
             type="submit" 
             disabled={submitting}
             className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Ajouter au calendrier'}
           </button>
        </form>
      </Modal>
    </div>
  );
}