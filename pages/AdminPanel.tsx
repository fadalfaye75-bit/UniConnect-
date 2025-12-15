import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { supabase } from '../services/supabaseClient';
import { CLASSES } from '../services/mockData';
import { Users, BookOpen, UserPlus, Settings, Search, Trash2, Loader2, Save, School } from 'lucide-react';
import { UserRole } from '../types';
import Modal from '../components/Modal';

export default function AdminPanel() {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'users' | 'classes'>('users');
  
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // User Creation State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: UserRole.STUDENT,
    className: 'Licence 1 - Info',
    schoolName: ''
  });

  useEffect(() => {
    if (user?.role === UserRole.ADMIN && activeTab === 'users') {
      fetchUsers();
    }
  }, [user, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de charger les utilisateurs.', type: 'alert' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    // CONFIRMATION
    if (!window.confirm(`Voulez-vous vraiment changer le rôle de cet utilisateur vers ${newRole} ?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      addNotification({ title: 'Succès', message: 'Rôle utilisateur mis à jour.', type: 'success' });
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur', message: 'Impossible de mettre à jour le rôle.', type: 'alert' });
    }
  };

  const handleUpdateClass = async (userId: string, newClass: string) => {
    // CONFIRMATION
    if (!window.confirm(`Voulez-vous déplacer cet utilisateur vers la classe ${newClass} ?`)) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ class_name: newClass })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, class_name: newClass } : u));
      addNotification({ title: 'Succès', message: 'Classe utilisateur mise à jour.', type: 'success' });
    } catch (error) {
      console.error(error);
      addNotification({ title: 'Erreur', message: 'Impossible de mettre à jour la classe.', type: 'alert' });
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // CONFIRMATION
    if (!window.confirm(`Confirmer la création du compte pour ${newUser.fullName} ?`)) return;

    setCreatingUser(true);

    try {
      // NOTE: Client-side user creation in Supabase requires 'service_role' key or backend function 
      // to avoid signing out the current admin. 
      // Here we simulate the process or insert into 'profiles' directly if we just want to populate the directory.
      
      // For this demo, we'll assume a successful operation and close the modal
      // In production: call a Supabase Edge Function: await supabase.functions.invoke('create-user', { body: newUser })
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulating API delay

      addNotification({ 
        title: 'Simulation', 
        message: `Utilisateur ${newUser.fullName} créé avec succès (École: ${newUser.schoolName || 'N/A'}).`, 
        type: 'success' 
      });

      setIsUserModalOpen(false);
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: UserRole.STUDENT,
        className: 'Licence 1 - Info',
        schoolName: ''
      });
      
      // Ideally fetchUsers() here if real

    } catch (error: any) {
      console.error('Create user error:', error);
      addNotification({ title: 'Erreur', message: 'Impossible de créer l\'utilisateur.', type: 'alert' });
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (user?.role !== UserRole.ADMIN) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
         <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4"><Settings size={32} /></div>
         <h2 className="text-xl font-bold text-gray-800 dark:text-white">Accès Restreint</h2>
         <p className="text-gray-500">Cette section est réservée aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Administration</h2>
           <p className="text-sm text-gray-500">Gérez les utilisateurs, les classes et la plateforme.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setActiveTab('users')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
           >
             Utilisateurs
           </button>
           <button 
             onClick={() => setActiveTab('classes')}
             className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'classes' ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
           >
             Classes
           </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
           <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 rounded-xl">
             <Users size={24} />
           </div>
           <div>
             <div className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Utilisateurs inscrits</div>
           </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
           <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 rounded-xl">
             <BookOpen size={24} />
           </div>
           <div>
             <div className="text-3xl font-bold text-gray-900 dark:text-white">{CLASSES.length}</div>
             <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">Classes gérées</div>
           </div>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
           <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Annuaire Utilisateurs</h3>
              <div className="flex gap-3 w-full md:w-auto">
                 <div className="relative flex-1 md:w-64">
                   <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="Rechercher..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-300 outline-none dark:text-white" 
                   />
                 </div>
                 <button 
                   onClick={() => setIsUserModalOpen(true)}
                   className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                 >
                   <UserPlus size={16} /> <span className="hidden sm:inline">Créer</span>
                 </button>
              </div>
           </div>
           
           {loading ? (
             <div className="p-12 flex justify-center">
               <Loader2 className="animate-spin text-primary-500" size={32} />
             </div>
           ) : (
             <div className="overflow-x-auto">
               <table className="w-full text-left text-sm">
                 <thead className="bg-gray-50 dark:bg-gray-700/50">
                   <tr>
                     <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Nom</th>
                     <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Email</th>
                     <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Rôle</th>
                     <th className="px-6 py-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Classe</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                   {filteredUsers.map(u => (
                     <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                       <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{u.full_name}</td>
                       <td className="px-6 py-4 text-gray-500">{u.email}</td>
                       <td className="px-6 py-4">
                         <select 
                           value={u.role}
                           onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                           className={`px-2 py-1 rounded text-xs font-bold border-none outline-none cursor-pointer focus:ring-2 focus:ring-primary-300 ${
                             u.role === UserRole.DELEGATE ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 
                             u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                             'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                           }`}
                         >
                           <option value={UserRole.STUDENT}>Étudiant</option>
                           <option value={UserRole.DELEGATE}>Délégué</option>
                           <option value={UserRole.ADMIN}>Admin</option>
                         </select>
                       </td>
                       <td className="px-6 py-4 text-gray-500">
                         <select
                           value={u.class_name || ''}
                           onChange={(e) => handleUpdateClass(u.id, e.target.value)}
                           className="bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 outline-none text-xs focus:border-primary-500 max-w-[150px]"
                         >
                           <option value="Général">Général</option>
                           {CLASSES.map(cls => (
                             <option key={cls.id} value={cls.name}>{cls.name}</option>
                           ))}
                         </select>
                       </td>
                     </tr>
                   ))}
                   {filteredUsers.length === 0 && (
                     <tr>
                       <td colSpan={5} className="text-center py-8 text-gray-400 italic">Aucun utilisateur trouvé</td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
           <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">Gestion des Classes</h3>
              <button className="text-sm text-primary-600 font-bold hover:underline flex items-center gap-1 opacity-50 cursor-not-allowed">
                <UserPlus size={16} /> Ajouter une classe
              </button>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-gray-50 dark:bg-gray-700/50">
                 <tr>
                   <th className="px-6 py-3 font-semibold text-gray-500">Nom de la classe</th>
                   <th className="px-6 py-3 font-semibold text-gray-500">Email Groupe</th>
                   <th className="px-6 py-3 font-semibold text-gray-500 text-center">Effectif</th>
                   <th className="px-6 py-3 font-semibold text-gray-500 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                 {CLASSES.map(cls => (
                   <tr key={cls.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                     <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cls.name}</td>
                     <td className="px-6 py-4 text-gray-500">{cls.email}</td>
                     <td className="px-6 py-4 text-center">
                       <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-bold text-gray-600 dark:text-gray-300">{cls.studentCount}</span>
                     </td>
                     <td className="px-6 py-4 text-right space-x-2">
                       <button className="text-blue-600 hover:text-blue-800 text-xs font-bold opacity-50">Éditer</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Créer un utilisateur">
         <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-xs">
              <p>L'utilisateur recevra un email pour configurer son mot de passe initial.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom complet</label>
              <input 
                required 
                type="text" 
                value={newUser.fullName} 
                onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" 
                placeholder="Ex: Jean Dupont"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Email universitaire</label>
              <input 
                required 
                type="email" 
                value={newUser.email} 
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" 
                placeholder="Ex: jean.dupont@univ.sn"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
                <select 
                  value={newUser.role} 
                  onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value={UserRole.STUDENT}>Étudiant</option>
                  <option value={UserRole.DELEGATE}>Délégué</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Classe</label>
                <select 
                  value={newUser.className} 
                  onChange={e => setNewUser({...newUser, className: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300"
                >
                  {CLASSES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  <option value="Général">Général (Admin)</option>
                </select>
              </div>
            </div>

            {/* NEW FIELD: SCHOOL NAME */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
                <School size={16} className="text-primary-500" />
                Nom de l'école
              </label>
              <input 
                type="text" 
                value={newUser.schoolName} 
                onChange={e => setNewUser({...newUser, schoolName: e.target.value})}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-300" 
                placeholder="Ex: Université Cheikh Anta Diop"
              />
            </div>

            <button 
              type="submit" 
              disabled={creatingUser}
              className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-lg shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
               {creatingUser ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
               {creatingUser ? 'Création en cours...' : 'Créer le compte'}
            </button>
         </form>
      </Modal>
    </div>
  );
}