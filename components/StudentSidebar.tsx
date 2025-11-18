import React from 'react';
import { StudentView } from './StudentApp';
import { HomeIcon, LayersIcon, ClipboardListIcon, UserIcon, BookOpenIcon, FileTextIcon } from './IconComponents';
import { supabase } from '../services/supabaseClient';

interface StudentSidebarProps {
    studentName: string;
    currentView: StudentView;
    setCurrentView: (view: StudentView) => void;
    onLogout: () => void;
}

const StudentSidebar: React.FC<StudentSidebarProps> = ({ studentName, currentView, setCurrentView, onLogout }) => {
    
    const navItems = [
        { view: 'dashboard', label: 'Meu Dashboard', icon: HomeIcon },
        { view: 'myQuestions', label: 'Minhas Questões', icon: BookOpenIcon },
        { view: 'tests', label: 'Meus Testes', icon: ClipboardListIcon },
        { view: 'summaries', label: 'Resumos Oficiais', icon: FileTextIcon },
        { view: 'trueFlashcards', label: 'Flashcards', icon: LayersIcon },
        { view: 'profile', label: 'Meu Perfil', icon: UserIcon },
    ];
    
    const logoUrl = "https://pub-872633efa2d545638be12ea86363c2ca.r2.dev/WhatsApp%20Image%202025-11-09%20at%2013.47.15%20(1).png";

    return (
        <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0">
            <div className="p-2 border-b border-gray-700 flex items-center justify-center">
                 <img src={logoUrl} alt="AprovaMed IA Logo" className="w-full h-auto" />
            </div>
            <div className="p-4 border-b border-gray-700 text-center">
                <p className="text-sm text-gray-300">Bem-vindo(a),</p>
                <p className="font-bold text-lg">{studentName}</p>
            </div>
            <nav className="flex-grow p-4">
                <ul className="space-y-2">
                    {navItems.map(item => {
                        const Icon = item.icon;
                        const isActive = currentView === item.view;
                        
                        return (
                            <li key={item.view}>
                                <button
                                    onClick={() => setCurrentView(item.view as StudentView)}
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
            <div className="p-4 border-t border-gray-700">
                <button
                    onClick={onLogout}
                    className="w-full px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                    Sair
                </button>
            </div>
        </aside>
    );
};

export default StudentSidebar;
