import { supabase } from './supabaseClient';
import { Course, Module, Discipline, QuestionSet, QuestionBank, QuizQuestion } from '../types';

export const getQuestionBank = async (): Promise<QuestionBank> => {
    const { data, error } = await supabase.rpc('get_question_bank_list');
    if (error) {
        console.error("Erro ao ler o banco de questões via RPC:", error.message || error);
        return {};
    }
    if (!data) return {};

    const bank: QuestionBank = {};
    for (const set of data) {
        // RPC function already returns camelCase
        bank[set.id] = set;
    }
    return bank;
};


export const getStructuredQuestionBank = async (): Promise<Course[]> => {
    const { data, error } = await supabase.rpc('get_structured_academic_content');
    if (error) {
        console.error("Error fetching structured question bank from RPC:", error.message || error);
        return [];
    }
    return data || [];
};

export const saveQuestionSet = async (disciplineId: string, subjectName: string, questions: QuizQuestion[]): Promise<QuestionSet | null> => {
    const { data, error } = await supabase.rpc('save_question_set', {
        p_discipline_id: disciplineId,
        p_subject_name: subjectName,
        p_questions: questions,
    }).select().single();

    if (error) {
        console.error('Error saving question set:', error.message || error);
        return null;
    }
    return data;
};

export const updateQuestionSetDetails = async (id: string, updates: { subjectName?: string; imageUrl?: string }): Promise<QuestionSet | null> => {
    const updatePayload: { subject_name?: string; image_url?: string } = {};
    if (updates.subjectName) {
        updatePayload.subject_name = updates.subjectName;
    }
    if (updates.imageUrl !== undefined) {
        updatePayload.image_url = updates.imageUrl;
    }

    if (Object.keys(updatePayload).length === 0) {
        const { data } = await supabase.from('question_sets').select().eq('id', id).single();
        return data;
    }

    const { data, error } = await supabase
        .from('question_sets')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
    
    if (error) { 
        console.error('Error updating question set details:', error.message || error); 
        return null; 
    }
    return data;
};

export const updateQuestionSetQuestions = async (id: string, questions: QuizQuestion[]): Promise<boolean> => {
    const { error } = await supabase
        .from('question_sets')
        .update({ questions: questions })
        .eq('id', id);

    if (error) { console.error('Error updating question set questions:', error.message || error); return false; }
    return true;
};

export const deleteQuestionSet = async (id: string): Promise<void> => {
    // Manually cascade deletes for entities related to a question_set.
    // This is necessary if ON DELETE CASCADE is not set up in the database.

    // 1. Find all flashcard sessions related to this question set.
    const { data: sessions, error: sessionsError } = await supabase
        .from('flashcard_sessions')
        .select('id')
        .eq('question_set_id', id);

    if (sessionsError) {
        console.error('Error finding flashcard sessions to delete:', sessionsError.message);
        throw sessionsError;
    }

    if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);

        // 2. Delete all responses linked to those sessions.
        const { error: responsesError } = await supabase
            .from('flashcard_responses')
            .delete()
            .in('session_id', sessionIds);

        if (responsesError) {
            console.error('Error deleting flashcard responses:', responsesError.message);
            throw responsesError;
        }
        
        // 3. Delete the sessions themselves.
        const { error: deleteSessionsError } = await supabase
            .from('flashcard_sessions')
            .delete()
            .in('id', sessionIds);
        
        if (deleteSessionsError) {
             console.error('Error deleting flashcard sessions:', deleteSessionsError.message);
             throw deleteSessionsError;
        }
    }

    // 4. Delete student ratings for this question set.
    const { error: ratingsError } = await supabase
        .from('student_question_ratings')
        .delete()
        .eq('question_set_id', id);

    if (ratingsError) {
        console.error('Error deleting student question ratings:', ratingsError.message);
        throw ratingsError;
    }
    
    // 5. Finally, delete the question set itself.
    const { error } = await supabase.from('question_sets').delete().eq('id', id);
    if (error) { 
        console.error('Error deleting question set:', error.message || error); 
        throw error;
    }
};

export const moveQuestionSet = async (questionSetId: string, newDisciplineId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('question_sets')
        .update({ discipline_id: newDisciplineId })
        .eq('id', questionSetId);
    
    if (error) {
        console.error('Error moving question set:', error.message || error);
        return false;
    }
    return true;
};