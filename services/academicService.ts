import { supabase } from './supabaseClient';
import { Course, Module, Discipline, Class, Student, QuestionSet } from '../types';
import * as questionBankService from './questionBankService';
import * as testService from './testService';


// --- Auth Related ---

export const createStudentProfile = async (userId: string, name: string, classId: string): Promise<Student | null> => {
    const { data, error } = await supabase
        .from('students')
        .insert({
            user_id: userId,
            name: name,
            class_id: classId,
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating student profile:', error.message);
        throw error;
    }
    return data ? { ...data, classId: data.class_id } : null;
};

export const getStudentProfile = async (userId: string): Promise<Student | null> => {
    const { data, error } = await supabase
        .from('students')
        .select('*, classes(*, courses(*))')
        .eq('user_id', userId)
        .single();
    
    if (error) {
        if (error.code !== 'PGRST116') { // Ignore "No rows found" error, it's expected for new users.
            console.error('Error fetching student profile:', error.message);
        }
        return null;
    }
    return data ? { ...data, classId: data.class_id } as Student : null;
};


// --- Content Structure ---

export const getCourses = async (): Promise<Course[]> => {
    const { data, error } = await supabase.rpc('get_courses_list');
    if (error) { console.error('Error fetching courses from RPC:', error.message || error); return []; }
    return data || [];
};

export const addCourse = async (name: string, imageUrl?: string): Promise<Course | null> => {
    const { data, error } = await supabase.from('courses').insert({ name, image_url: imageUrl }).select();
    if (error) { 
        console.error('Error adding course:', error.message || error);
        throw error;
    }
    return data?.[0] || null;
};

export const updateCourse = async (id: string, updates: { name?: string; image_url?: string }): Promise<Course | null> => {
    const { data, error } = await supabase.from('courses').update(updates).eq('id', id).select();
    if (error) { console.error('Error updating course:', error.message || error); throw error; }
    return data?.[0] || null;
};

export const deleteCourse = async (id: string): Promise<void> => {
    // 1. Find and delete all associated modules (which will cascade to their contents)
    const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id')
        .eq('course_id', id);

    if (modulesError) {
        console.error('Error finding modules for course:', modulesError.message);
        throw modulesError;
    }
    if (modules) {
        await Promise.all(modules.map(m => deleteModule(m.id)));
    }

    // 2. Find and delete all associated classes (which will cascade to their students)
    const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id')
        .eq('course_id', id);

    if (classesError) {
        console.error('Error finding classes for course:', classesError.message);
        throw classesError;
    }
    if (classes) {
        await Promise.all(classes.map(c => deleteClass(c.id)));
    }

    // 3. Find and delete all associated tests (if any are linked directly to course)
     const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id')
        .eq('course_id', id);
    
    if (testsError) {
        console.error('Error finding tests for course:', testsError.message);
        throw testsError;
    }
    if (tests) {
        await Promise.all(tests.map(t => testService.deleteTest(t.id)));
    }

    // 4. Finally, delete the course itself
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) { console.error('Error deleting course:', error.message || error); throw error; }
};

export const getModules = async (courseId?: string): Promise<Module[]> => {
    const { data, error } = await supabase.rpc('get_modules_list', { p_course_id: courseId });
    if (error) { console.error('Error fetching modules from RPC:', error.message || error); return []; }
    return data || [];
};

export const addModule = async (courseId: string, name: string, imageUrl?: string): Promise<Module | null> => {
    const { data, error } = await supabase.from('modules').insert({ course_id: courseId, name, image_url: imageUrl }).select();
    if (error) { 
        console.error('Error adding module:', error.message || error);
        throw error;
    }
    return data?.[0] ? { ...data[0], courseId: data[0].course_id } : null;
};

export const updateModule = async (id: string, updates: { name?: string; image_url?: string }): Promise<Module | null> => {
    const { data, error } = await supabase.from('modules').update(updates).eq('id', id).select();
    if (error) { console.error('Error updating module:', error.message || error); throw error; }
    return data?.[0] ? { ...data[0], courseId: data[0].course_id } : null;
};

export const deleteModule = async (id: string): Promise<void> => {
    // 1. Find and delete all associated disciplines (which will cascade to their contents)
    const { data: disciplines, error: disciplinesError } = await supabase
        .from('disciplines')
        .select('id')
        .eq('module_id', id);
    
    if (disciplinesError) {
        console.error('Error finding disciplines for module:', disciplinesError.message);
        throw disciplinesError;
    }
    if (disciplines) {
        await Promise.all(disciplines.map(d => deleteDiscipline(d.id)));
    }
    
    // 2. Find and delete all associated tests (if any are linked directly to module)
    const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id')
        .eq('module_id', id);
    
    if (testsError) {
        console.error('Error finding tests for module:', testsError.message);
        throw testsError;
    }
    if (tests) {
        await Promise.all(tests.map(t => testService.deleteTest(t.id)));
    }

    // 3. Delete the module itself
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) { console.error('Error deleting module:', error.message || error); throw error; }
};

export const getDisciplines = async (moduleId?: string): Promise<Discipline[]> => {
    const { data, error } = await supabase.rpc('get_disciplines_list', { p_module_id: moduleId });
    if (error) { console.error('Error fetching disciplines from RPC:', error.message || error); return []; }
    return data || [];
};

export const addDiscipline = async (moduleId: string, name: string, imageUrl?: string): Promise<Discipline | null> => {
    const { data, error } = await supabase.from('disciplines').insert({ module_id: moduleId, name, image_url: imageUrl }).select();
    if (error) { 
        console.error('Error adding discipline:', error.message || error);
        throw error;
    }
    return data?.[0] ? { ...data[0], moduleId: data[0].module_id } : null;
};

export const updateDiscipline = async (id: string, updates: { name?: string; image_url?: string }): Promise<Discipline | null> => {
    const { data, error } = await supabase.from('disciplines').update(updates).eq('id', id).select();
    if (error) { console.error('Error updating discipline:', error.message || error); throw error; }
    return data?.[0] ? { ...data[0], moduleId: data[0].module_id } : null;
};

export const deleteDiscipline = async (id: string): Promise<void> => {
    // 1. Find and delete all associated question sets
    const { data: questionSets, error: qsError } = await supabase
        .from('question_sets')
        .select('id')
        .eq('discipline_id', id);

    if (qsError) {
        console.error('Error finding question sets for discipline:', qsError.message);
        throw qsError;
    }
    if (questionSets) {
        await Promise.all(questionSets.map(qs => questionBankService.deleteQuestionSet(qs.id)));
    }

    // 2. Find and delete all associated tests
    const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id')
        .eq('discipline_id', id);
    
    if (testsError) {
        console.error('Error finding tests for discipline:', testsError.message);
        throw testsError;
    }
    if (tests) {
        await Promise.all(tests.map(t => testService.deleteTest(t.id)));
    }

    // 3. Delete the discipline itself
    const { error } = await supabase.from('disciplines').delete().eq('id', id);
    if (error) { console.error('Error deleting discipline:', error.message || error); throw error; }
};

// --- Classes & Students ---

export const getClasses = async (courseId?: string): Promise<Class[]> => {
    const { data, error } = await supabase.rpc('get_classes_list', { p_course_id: courseId });
    if (error) { console.error('Error fetching classes from RPC:', error.message || error); return []; }
    return data || [];
};

export const addClass = async (courseId: string, name: string, imageUrl?: string): Promise<Class | null> => {
    const { data, error } = await supabase.from('classes').insert({ course_id: courseId, name, image_url: imageUrl }).select();
    if (error) {
        console.error('Error adding class:', error.message || error);
        throw error;
    }
    return data?.[0] ? { ...data[0], courseId: data[0].course_id } : null;
};

export const updateClass = async (id: string, updates: { name?: string; image_url?: string }): Promise<Class | null> => {
    const { data, error } = await supabase.from('classes').update(updates).eq('id', id).select();
    if (error) { console.error('Error updating class:', error.message || error); throw error; }
    return data?.[0] ? { ...data[0], courseId: data[0].course_id } : null;
};

export const deleteClass = async (id: string): Promise<void> => {
    // 1. Find and delete all students in the class
    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', id);

    if (studentsError) {
        console.error('Error finding students for class:', studentsError.message);
        throw studentsError;
    }
    if (students) {
        // deleteStudent uses an RPC which is good, it handles the auth user
        await Promise.all(students.map(s => deleteStudent(s.id)));
    }

    // 2. Delete the class itself
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) { console.error('Error deleting class:', error.message || error); throw error; }
};

export const getStudents = async (classId?: string): Promise<Student[]> => {
    let query = supabase.from('students').select('*, classes(*, courses(*))');
    if (classId) {
        query = query.eq('class_id', classId);
    }
    const { data, error } = await query.order('name');
    if (error) { console.error('Error fetching students:', error.message || error); return []; }
    if (!data) return [];
    return data.map(student => ({
        ...student,
        classId: student.class_id,
    }));
};

export const addStudent = async (classId: string, name: string, email: string, password: string, imageUrl?: string): Promise<void> => {
    const { error } = await supabase.rpc('create_student_user', {
        p_class_id: classId,
        p_name: name,
        p_email: email,
        p_password: password,
        p_image_url: imageUrl,
    });
    if (error) {
        console.error('Error calling create_student_user RPC:', error.message || error);
        throw error;
    }
};

export const updateStudent = async (student: Student, updates: { name: string; image_url: string; class_id: string, email: string }): Promise<void> => {
    // This RPC seems to be expecting the user_id in the p_student_id parameter to correctly update the auth.users table.
    const { error } = await supabase.rpc('update_student_user', {
        p_student_id: student.user_id, // Use user_id instead of student.id
        p_name: updates.name,
        p_class_id: updates.class_id,
        p_image_url: updates.image_url,
        p_email: updates.email
    });

    if (error) { 
        console.error('Error calling update_student_user RPC:', error.message || error); 
        throw error;
    }
};

export const deleteStudent = async (studentId: string): Promise<void> => {
    const { error } = await supabase.rpc('delete_student_user', { p_student_id: studentId });
    if (error) { 
        console.error('Error calling delete_student_user RPC:', error.message || error); 
        throw error;
    }
};


// New function to get all students with class and course details
export const getAllStudentsWithDetails = async (): Promise<Student[]> => {
    const { data, error } = await supabase.rpc('get_all_students_with_details');
    if (error) {
        console.error('Error fetching students with details from RPC:', error.message || error);
        return [];
    }
    return data || [];
};

export const getStructuredDataForManagement = async (): Promise<Course[]> => {
    const { data, error } = await supabase.rpc('get_structured_academic_content');
    if (error) {
        console.error('Error fetching structured data from RPC:', error.message || error);
        return [];
    }
    return data || [];
};

export const getStudentCourseContent = async (studentId: string): Promise<Course | null> => {
    const { data, error } = await supabase.rpc('get_student_course_content', { p_student_id: studentId });
    if (error) {
        console.error("Error fetching student course content:", error.message || error);
        return null;
    }
    return data;
};