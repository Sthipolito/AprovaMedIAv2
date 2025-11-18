import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { Session } from '@supabase/supabase-js';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import TeacherApp from './components/TeacherApp';
import * as academicService from './services/academicService';
import { Student } from './types';

// pdf.js worker configuration
import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs');

const App: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [studentProfile, setStudentProfile] = useState<Student | null>(null);
    // Add a specific state for the user's role to make logic clearer.
    const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserRole = async (session: Session | null) => {
            if (session?.user) {
                // Try to fetch a student profile for the logged-in user.
                const profile = await academicService.getStudentProfile(session.user.id);
                
                if (profile) {
                    // If a profile is found, the user is a student.
                    setStudentProfile(profile);
                    setUserRole('student');
                } else {
                    // If no profile is found, we assume the user is a teacher/admin.
                    setStudentProfile(null);
                    setUserRole('teacher');
                }
            } else {
                // No session, so no user role.
                setStudentProfile(null);
                setUserRole(null);
            }
            setSession(session);
            setLoading(false);
        };

        // Check for initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            checkUserRole(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setLoading(true);
            checkUserRole(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }
    
    if (!session) {
        return <AuthPage />;
    }

    // Render the correct app based on the determined role.
    return (
        <div className="h-screen w-screen">
            {userRole === 'student' && studentProfile ? (
                <StudentApp session={session} studentProfile={studentProfile} />
            ) : userRole === 'teacher' ? (
                <TeacherApp />
            ) : (
                // This is a fallback while role is being determined after login, but should be quick.
                 <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
};

export default App;