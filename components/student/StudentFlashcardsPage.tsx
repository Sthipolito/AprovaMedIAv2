import React, { useState, useEffect } from 'react';
import { Course, QuestionSet, Student, Module, Discipline } from '../../types';
import { ChevronRightIcon } from '../IconComponents';
import FlashcardModal from '../FlashcardModal';
import ContentCarousel from '../ContentCarousel';
import * as academicService from '../../services/academicService';

interface StudentFlashcardsPageProps {
    student: Student;
}

const StudentFlashcardsPage: React.FC<StudentFlashcardsPageProps> = ({ student }) => {
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setForStudy, setSetForStudy] = useState<QuestionSet | null>(null);

    // Navigation state
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);
    const [selectedDiscipline, setSelectedDiscipline] = useState<Discipline | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const studentCourse = await academicService.getStudentCourseContent(student.id);
            setCourse(studentCourse);
            setIsLoading(false);
        };
        loadData();
    }, [student.id]);
    
    useEffect(() => { setSelectedModule(null); setSelectedDiscipline(null); }, [course]);
    useEffect(() => { setSelectedDiscipline(null); }, [selectedModule]);

    const handleStartStudy = (set: QuestionSet) => {
        setSetForStudy(set);
    };

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-6 flex-wrap">
            <span className="font-medium text-gray-700 truncate">{course?.name}</span>
            {selectedModule && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <button onClick={() => setSelectedDiscipline(null)} className="hover:underline font-medium text-gray-700 truncate">{selectedModule.name}</button>
                </>
            )}
             {selectedDiscipline && (
                 <>
                    <ChevronRightIcon className="w-4 h-4 mx-1 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate">{selectedDiscipline.name}</span>
                </>
            )}
        </nav>
    );

    const renderContent = () => {
        if (isLoading) {
            return <div className="flex justify-center items-center h-full"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
        }

        if (!course) {
            return <div className="text-center py-20"><p className="text-gray-500">Você não parece estar matriculado em um curso com conteúdo de flashcards.</p></div>;
        }
        
        if (selectedDiscipline) {
            return <ContentCarousel title="Assuntos para Estudar" items={selectedDiscipline.question_sets || []} type="question_set" onSelect={handleStartStudy} />
        }
        if (selectedModule) {
            return <ContentCarousel title="Disciplinas" items={selectedModule.disciplines || []} type="discipline" onSelect={setSelectedDiscipline} />
        }
        return <ContentCarousel title="Módulos" items={course.modules || []} type="module" onSelect={setSelectedModule} />
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold text-gray-800">Meus Flashcards</h1>
                    <p className="text-gray-500 mt-1">Navegue pelo seu curso e inicie uma sessão de estudo.</p>
                </header>
                <main className="flex-grow p-6">
                    <Breadcrumbs />
                    {renderContent()}
                </main>
            </div>
            {setForStudy && (
                <FlashcardModal
                    studentId={student.id}
                    questionSet={setForStudy}
                    onClose={() => setSetForStudy(null)}
                />
            )}
        </>
    );
};

export default StudentFlashcardsPage;
