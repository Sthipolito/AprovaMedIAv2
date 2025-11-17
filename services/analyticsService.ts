import { supabase } from './supabaseClient';
import { ContentAnalyticsData, StudentContextualPerformance, StudentFlashcardSession, StudentAnalytics, PerformanceTopic } from '../types';

export const getContentAnalytics = async (
    level: 'course' | 'module' | 'discipline' | 'class',
    id: string
): Promise<ContentAnalyticsData> => {
    const result: ContentAnalyticsData = {
        studentCount: 0,
        testCount: 0,
        averageScore: 0,
        flashcardSessionCount: 0,
        averageFlashcardAccuracy: 0,
        students: [],
        tests: [],
        flashcardSessions: [],
        activityLog: [],
    };

    try {
        const { data: details, error } = await supabase.rpc('get_content_analytics_details', {
            p_level: level,
            p_id: id,
        });

        // For debugging purposes, log what we get from the DB
        console.log('Raw analytics details from RPC:', details);

        if (error) throw error;
        if (!details) return result;

        const students = details.students || [];
        const tests = details.tests || [];
        const attempts = details.testAttempts || [];
        const sessions = details.sessions || [];
        const activityLog = details.activityLog || [];

        result.studentCount = students.length;
        result.testCount = tests.length;
        result.flashcardSessionCount = sessions.length;
        result.activityLog = activityLog;
        result.flashcardSessions = sessions;
        
        // Calculate test averages
        if (attempts.length > 0) {
            result.averageScore = Math.round(attempts.reduce((acc: number, a: { score: number }) => acc + a.score, 0) / attempts.length);

            const studentScores: { [key: string]: { total: number; count: number } } = {};
            attempts.forEach((a: { student_id: string, score: number }) => {
                studentScores[a.student_id] = studentScores[a.student_id] || { total: 0, count: 0 };
                studentScores[a.student_id].total += a.score;
                studentScores[a.student_id].count++;
            });

            result.students = students.map((s: { id: string, name: string }) => ({
                id: s.id,
                name: s.name,
                testAverage: studentScores[s.id] ? Math.round(studentScores[s.id].total / studentScores[s.id].count) : 0,
                flashcardAccuracy: 0 // Will be calculated next
            }));
            
            const testScores: { [key: string]: { total: number; count: number } } = {};
             attempts.forEach((a: { test_id: string, score: number }) => {
                testScores[a.test_id] = testScores[a.test_id] || { total: 0, count: 0 };
                testScores[a.test_id].total += a.score;
                testScores[a.test_id].count++;
            });

            result.tests = tests.map((t: { id: string, name: string }) => ({
                id: t.id,
                name: t.name,
                average: testScores[t.id] ? Math.round(testScores[t.id].total / testScores[t.id].count) : 0
            })).sort((a,b) => b.average - a.average);

        } else {
             result.students = students.map((s: { id: string, name: string }) => ({ ...s, testAverage: 0, flashcardAccuracy: 0 }));
             result.tests = tests.map((t: { id: string, name: string }) => ({ ...t, average: 0 }));
        }

        // Calculate flashcard accuracy
        if (sessions.length > 0) {
            const totalCorrect = sessions.reduce((acc: number, s: { correct_answers: number }) => acc + s.correct_answers, 0);
            const totalIncorrect = sessions.reduce((acc: number, s: { incorrect_answers: number }) => acc + s.incorrect_answers, 0);
            const totalAnswered = totalCorrect + totalIncorrect;
            result.averageFlashcardAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

            const studentFlashcardStats: { [key: string]: { correct: number; total: number } } = {};
            sessions.forEach((s: { student_id: string, correct_answers: number, incorrect_answers: number }) => {
                studentFlashcardStats[s.student_id] = studentFlashcardStats[s.student_id] || { correct: 0, total: 0 };
                studentFlashcardStats[s.student_id].correct += s.correct_answers;
                studentFlashcardStats[s.student_id].total += s.correct_answers + s.incorrect_answers;
            });

            result.students.forEach(s => {
                const flashcardStats = studentFlashcardStats[s.id];
                s.flashcardAccuracy = flashcardStats && flashcardStats.total > 0
                    ? Math.round((flashcardStats.correct / flashcardStats.total) * 100)
                    : 0;
            });
        }
        
        result.students.sort((a, b) => (b.testAverage + b.flashcardAccuracy) - (a.testAverage + a.flashcardAccuracy));

    } catch (error: any) {
        console.error(`Error calculating analytics for ${level} ${id}:`, error.message || error);
    }

    return result;
};

export const getStudentPerformanceInContext = async (
    studentId: string,
    context: { level: 'course' | 'module' | 'discipline' | 'class', contentId: string }
): Promise<StudentContextualPerformance | null> => {
    try {
        const { data, error } = await supabase.rpc('get_student_performance_in_context', {
            p_student_id: studentId,
            p_level: context.level,
            p_content_id: context.contentId,
        });

        if (error) {
            console.error("Error fetching student contextual performance from RPC:", error.message || error);
            return null;
        }
        
        return data as StudentContextualPerformance;

    } catch (error: any) {
        console.error("Client-side error in getStudentPerformanceInContext:", error.message || error);
        return null;
    }
};

export const getStudentComprehensiveAnalytics = async (studentId: string): Promise<StudentAnalytics | null> => {
    try {
        const { data, error } = await supabase.rpc('get_student_comprehensive_analytics', { p_student_id: studentId });
        
        if (error) {
            console.error("Error fetching student comprehensive analytics from RPC:", error.message || error);
            return null;
        }

        if (!data) {
            return null;
        }

        // The RPC function is designed to return data exactly in the format of StudentAnalytics.
        // Ensure arrays are not null.
        return {
            ...data,
            strengths: data.strengths || [],
            weaknesses: data.weaknesses || [],
            recentActivity: data.recentActivity || [],
        };

    } catch (error: any) {
        console.error("Client-side error in getStudentComprehensiveAnalytics:", error.message || error);
        return null;
    }
};