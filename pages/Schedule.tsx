import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Clock, Upload, History, Loader2, Trash2, AlertCircle, FileSpreadsheet, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole, ScheduleFile } from '../types';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';
import Modal from '../components/Modal';

export default function Schedule() {
  const { user, adminViewClass } = useAuth();
  const { addNotification } = useNotification();
  
  const [schedules, setSchedules] = useState<ScheduleFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleFile | null>(null);
  const [editVersion, setEditVersion] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  // 1. PERMISSIONS
  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.DELEGATE;

  // 2. FETCH DATA
  useEffect(() => {
    fetchSchedules();
  }, [user, adminViewClass]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('upload_date', { ascending: false });

      if (error) throw error;

      // Transform DB snake_case to frontend camelCase
      const formattedData: ScheduleFile[] = (data || []).map(item => ({
        id: item.id,
        version: item.version,
        uploadDate: item.upload_date,
        url: item.url,
        className: item.class_name
      }));

      setSchedules(formattedData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les emplois du temps.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  // 3. FILTERING
  const displayedSchedules = useMemo(() => {
    return schedules.filter(sch => {
      if (user?.role === UserRole.ADMIN) {
        return adminViewClass ? sch.className === adminViewClass : true;
      }
      return sch.className === user?.className;
    });
  }, [user, adminViewClass, schedules]);

  const currentSchedule = displayedSchedules[0];
  const history = displayedSchedules.slice(1);

  // 4. UPLOAD LOGIC
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    // CONFIRMATION
    if (!window.confirm('Voulez-vous vraiment mettre en ligne une nouvelle version de l\'emploi du temps ? Cela remplacera l\'affichage actuel pour tous les étudiants.')) {
      e.target.value = ''; // Reset input
      return;
    }

    const file = e.target.files[0];
    setUploading(true);

    try {
      // Logic for new version number
      const newVersionNum = currentSchedule 
        ? parseInt(currentSchedule.version.replace(/[^0-9]/g, '')) + 1 
        : 1;
      const versionLabel = `V${isNaN(newVersionNum) ? 1 : newVersionNum}`;
      
      const targetClass = (user?.role === UserRole.ADMIN && adminViewClass) ? adminViewClass : (user?.className || 'Général');
      
      // A. Upload to Storage
      const fileExt = file.name.split('.').pop();
      // Create a clean filename
      const fileName = `${targetClass.replace(/\s+/g, '-')}_${versionLabel}_${Date.now()}.${fileExt}`;
      const filePath = fileName; // Uploading to root of bucket

      const { error: uploadError } = await supabase.storage
        .from('schedules')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // B. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('schedules')
        .getPublicUrl(filePath);

      // C. Save to Database
      const { error: dbError } = await supabase
        .from('schedules')
        .insert({
          version: versionLabel,
          url: publicUrl,
          class_name: targetClass,
          created_by: user?.id
        });

      if (dbError) throw dbError;

      addNotification({ title: 'Succès', message: `L'emploi du temps ${versionLabel} a été mis en ligne.`, type: 'success' });
      fetchSchedules(); // Refresh list

    } catch (error: any) {
      console.error('Upload error:', error);
      addNotification({ title: 'Erreur', message: error.message || "Échec de l'envoi du fichier.", type: 'alert' });
    } finally {
      setUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  // 5. UPDATE/EDIT LOGIC
  const openEditModal = (schedule: ScheduleFile) => {
    setEditingSchedule(schedule);
    setEditVersion(schedule.version);
    setEditFile(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    setUpdating(true);
    try {
      let finalUrl = editingSchedule.url;

      // If a new file is selected, upload it
      if (editFile) {
        const fileExt = editFile.name.split('.').pop();
        const fileName = `${editingSchedule.className.replace(/\s+/g, '-')}_${editVersion}_updated_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('schedules')
          .upload(fileName, editFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('schedules')
          .getPublicUrl(fileName);
        
        finalUrl = publicUrl;
      }

      // Update Database
      const { error: dbError } = await supabase
        .from('schedules')
        .update({
          version: editVersion,
          url: finalUrl
        })
        .eq('id', editingSchedule.id);

      if (dbError) throw dbError;

      addNotification({ title: 'Modifié', message: 'L\'emploi du temps a été mis à jour.', type: 'success' });
      fetchSchedules();
      setIsEditModalOpen(false);

    } catch (error: any) {
      console.error('Update error:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de modifier l\'entrée.', type: 'alert' });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet emploi du temps ?")) return;

    try {
      // 1. Delete from Storage (Best effort)
      const bucketName = 'schedules';
      const pathIndex = url.lastIndexOf(`/${bucketName}/`);
      
      if (pathIndex !== -1) {
        const relativePath = url.substring(pathIndex + bucketName.length + 2);
        const decodedPath = decodeURIComponent(relativePath);
        if (decodedPath) {
          await supabase.storage.from(bucketName).remove([decodedPath]);
        }
      }

      // 2. Delete from DB
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== id));
      addNotification({ title: 'Supprimé', message: 'Fichier supprimé.', type: 'info' });
    } catch (error) {
      console.error('Delete error:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de supprimer.', type: 'alert' });
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
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Emploi du Temps</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === UserRole.ADMIN && adminViewClass 
              ? `Classe : ${adminViewClass}` 
              : `Classe : ${user?.className}`}
          </p>
        </div>
        
        {canManage && (
          <label className={`cursor-pointer flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary-500/20 transition-all hover:scale-105 ${uploading ? 'opacity-70 cursor-wait' : ''}`}>
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            <span className="hidden sm:inline">{uploading ? 'Envoi...' : 'Nouvelle Version'}</span>
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv,.pdf" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        )}
      </div>

      {!currentSchedule ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
           <div className="bg-green-50 dark:bg-green-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
             <FileSpreadsheet size={40} />
           </div>
           <h3 className="text-lg font-bold text-gray-900 dark:text-white">Aucun emploi du temps</h3>
           <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-xs mx-auto">
             L'emploi du temps (Excel/PDF) n'a pas encore été publié pour cette classe.
           </p>
           {canManage && <p className="text-xs mt-4 text-primary-500 font-semibold">Utilisez le bouton en haut à droite pour ajouter le premier.</p>}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          
          {/* Main Current Schedule Card */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Clock size={18} className="text-green-500" /> 
              En cours
            </h3>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                  <FileSpreadsheet size={200} />
              </div>
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                    <FileSpreadsheet size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Planning Semestriel</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium">{currentSchedule.className}</p>
                  </div>
                </div>
                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide border border-green-200 dark:border-green-800">
                  Actuel
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8 relative z-10 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                <div>
                  <span className="block text-xs text-gray-400 uppercase font-bold mb-1">Version</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{currentSchedule.version}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400 uppercase font-bold mb-1">Date d'ajout</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {new Date(currentSchedule.uploadDate).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 relative z-10">
                <a 
                  href={currentSchedule.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white py-3.5 rounded-xl transition-all font-bold shadow-lg hover:shadow-xl active:scale-[0.98]"
                >
                  <Download size={20} /> Télécharger / Voir
                </a>
                {canManage && (
                  <>
                     <button 
                       onClick={() => openEditModal(currentSchedule)}
                       className="p-3.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/50 transition-colors"
                       title="Modifier"
                     >
                       <Edit size={20} />
                     </button>
                     <button 
                       onClick={() => handleDelete(currentSchedule.id, currentSchedule.url)}
                       className="p-3.5 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-100 dark:border-red-900/50 transition-colors"
                       title="Supprimer cette version"
                     >
                       <Trash2 size={20} />
                     </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* History Column */}
          <div className="space-y-4">
             <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
               <History size={18} className="text-gray-400" /> 
               Historique
             </h3>
             <div className="bg-gray-50 dark:bg-gray-800/50 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 max-h-[400px] overflow-y-auto">
                {history.length > 0 ? (
                  history.map(sch => (
                    <div key={sch.id} className="group flex items-center justify-between p-3 m-1 bg-white dark:bg-gray-800 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-600 shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 font-bold text-xs">
                           {sch.version}
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 font-medium">{new Date(sch.uploadDate).toLocaleDateString('fr-FR')}</div>
                          <div className="font-bold text-gray-700 dark:text-gray-200 text-sm">Archives</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={sch.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-primary-500 transition-colors">
                          <Download size={16} />
                        </a>
                        {canManage && (
                          <>
                            <button onClick={() => openEditModal(sch)} className="p-2 text-gray-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(sch.id, sch.url)} className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
                    <History size={24} className="mb-2 opacity-30" />
                    <span className="text-xs">Aucun historique disponible</span>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Modifier l'emploi du temps">
        <form onSubmit={handleUpdateSubmit} className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs">
            Vous modifiez l'entrée : <strong>{editingSchedule?.version}</strong> ({new Date(editingSchedule?.uploadDate || '').toLocaleDateString()})
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom de la version</label>
            <input 
              type="text" 
              required
              value={editVersion}
              onChange={e => setEditVersion(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Remplacer le fichier (Optionnel)</label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {editFile ? (
                  <span className="text-primary-600 font-medium flex items-center gap-2">
                    <FileSpreadsheet size={20} /> {editFile.name}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">Cliquez pour remplacer le fichier Excel/PDF</span>
                )}
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv,.pdf" 
                  className="hidden" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) setEditFile(e.target.files[0]);
                  }}
                />
              </label>
              {editFile && (
                <button 
                  type="button" 
                  onClick={() => setEditFile(null)} 
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={updating}
            className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          >
             {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
             {updating ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      </Modal>
    </div>
  );
}