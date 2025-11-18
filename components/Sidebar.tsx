import React, { useState, useRef, useEffect } from 'react';
// FIX: The 'View' type is exported from TeacherApp.tsx, not App.tsx.
import { View } from './TeacherApp';
import { PlusCircleIcon, GraduationCapIcon, UsersIcon, ClipboardListIcon, LayersIcon, BookOpenIcon, HomeIcon, UserCheckIcon } from './IconComponents';
import { useUser } from '../contexts/UserContext';
import { UserRole } from '../types';

interface SidebarProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout }) => {
    const { userRole, setUserRole, allStudents } = useUser();
    const [isProfileSelectorOpen, setIsProfileSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    
    const navItems = [
        { view: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { view: 'landing', label: 'Nova Sessão de Estudo', icon: PlusCircleIcon },
        { view: 'academicManagement', label: 'Gestão Acadêmica', icon: GraduationCapIcon },
        { view: 'questionBankManagement', label: 'Banco de Questões', icon: BookOpenIcon },
        { view: 'tests', label: 'Testes na Íntegra', icon: ClipboardListIcon },
        { view: 'crm', label: 'CRM de Alunos', icon: UsersIcon },
        { view: 'flashcards', label: 'Flashcards', icon: LayersIcon },
    ];
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
                setIsProfileSelectorOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleRoleChange = (role: UserRole) => {
        setUserRole(role);
        setIsProfileSelectorOpen(false);
    };

    const currentRoleLabel = userRole.role === 'teacher' ? 'Professor' : userRole.studentName;

    return (
        <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
            <div className="p-2 border-b border-gray-700 flex items-center justify-center">
                 <img src={logoUrl} alt="AprovaMed IA Logo" className="w-full h-auto" />
            </div>
            <nav className="flex-grow p-4">
                <ul className="space-y-2">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.view || (item.view === 'landing' && currentView === 'chat');
                        
                        return (
                            <li key={item.view}>
                                <button
                                    onClick={() => setCurrentView(item.view as View)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-semibold transition-colors ${
                                        isActive ? 'bg-primary text-white' : 'hover:bg-gray-700'
                                    }`}
                                >
                                    <Icon className="w-6 h-6" />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-gray-700 space-y-4">
                <div ref={selectorRef} className="relative">
                    {isProfileSelectorOpen && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            <ul className="space-y-1">
                                <li>
                                    <button
                                        onClick={() => handleRoleChange({ role: 'teacher' })}
                                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-600"
                                    >
                                        Professor
                                    </button>
                                </li>
                                {allStudents.map(student => (
                                    <li key={student.id}>
                                        <button
                                            onClick={() => handleRoleChange({ role: 'student', studentId: student.id, studentName: student.name })}
                                            className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-600"
                                        >
                                            {student.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <button
                        onClick={() => setIsProfileSelectorOpen(!isProfileSelectorOpen)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-700 transition-colors"
                    >
                        <UserCheckIcon className="w-5 h-5 text-primary-light" />
                        <div>
                            <p className="text-xs text-gray-400">Visualizando como:</p>
                            <p className="font-semibold text-white truncate">{currentRoleLabel}</p>
                        </div>
                    </button>
                </div>
                
                <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                    Sair
                </button>

                <div className="pt-2 text-center text-xs text-gray-400">
                    <p>&copy; {new Date().getFullYear()} AprovaMed IA</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;