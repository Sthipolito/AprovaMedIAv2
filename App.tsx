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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserRole = async (session: Session | null) => {
            if (session?.user) {
                const profile = await academicService.getStudentProfile(session.user.id);
                setStudentProfile(profile); // Will be null for teachers/admins
            } else {
                setStudentProfile(null);
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

    // Render the correct app based on whether a student profile was found
    return (
        <div className="h-screen w-screen">
            {studentProfile ? (
                <StudentApp session={session} studentProfile={studentProfile} />
            ) : (
                <TeacherApp />
            )}
        </div>
    );
};

export default App;
