import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { Student } from '../types';
import { supabase } from '../services/supabaseClient';

import StudentSidebar from './StudentSidebar';
import StudentDashboardPage from './student/StudentDashboardPage';
import StudentFlashcardsPage from './student/StudentFlashcardsPage';
import StudentTestsPage from './student/StudentTestsPage';
import StudentProfilePage from './student/StudentProfilePage';

interface StudentAppProps {
    session: Session;
    studentProfile: Student;
}

export type StudentView = 'dashboard' | 'flashcards' | 'tests' | 'profile';

const StudentApp: React.FC<StudentAppProps> = ({ studentProfile, session }) => {
    const [currentView, setCurrentView] = useState<StudentView>('dashboard');

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const renderView = () => {
        if (!studentProfile) return null; // or a loading/error state
        switch (currentView) {
            case 'flashcards':
                return <StudentFlashcardsPage student={studentProfile} />;
            case 'tests':
                return <StudentTestsPage student={studentProfile} />;
            case 'profile':
                return <StudentProfilePage student={studentProfile} />;
            case 'dashboard':
            default:
                return <StudentDashboardPage student={studentProfile} />;
        }
    };
    
    if (!studentProfile) {
        return (
             <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-600">Carregando seu portal...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen w-screen bg-gray-100">
            <StudentSidebar
                studentName={studentProfile.name}
                currentView={currentView}
                setCurrentView={setCurrentView}
                onLogout={handleLogout}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                {renderView()}
            </div>
        </div>
    );
};

export default StudentApp;
