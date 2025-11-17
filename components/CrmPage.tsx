import React, { useState, useEffect, useMemo } from 'react';
import * as academicService from '../services/academicService';
import { Student, Course, Class } from '../types';
import { UsersIcon, SearchIcon, PlusCircleIcon } from './IconComponents';
import StudentProfile from './StudentProfile';
import EditStudentModal from './EditStudentModal';
import AddStudentModal from './AddStudentModal';

const CrmPage: React.FC = () => {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        const [studentsData, coursesData, classesData] = await Promise.all([
            academicService.getAllStudentsWithDetails(),
            academicService.getCourses(),
            academicService.getClasses(),
        ]);
        setAllStudents(studentsData);
        setCourses(coursesData);
        setClasses(classesData);
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSaveEdit = async (updates: { name: string; image_url: string; class_id: string; email: string; }) => {
        if (!editingStudent) return;
        try {
            await academicService.updateStudent(editingStudent, updates);
            setEditingStudent(null);
            fetchData();
        } catch (error) {
            alert("Falha ao atualizar o perfil.");
            console.error(error);
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!window.confirm("Tem certeza que deseja excluir este aluno? Esta ação é irreversível e removerá completamente o aluno e sua conta de acesso.")) {
            return;
        }
        try {
            await academicService.deleteStudent(studentId);
            alert("Aluno excluído com sucesso.");
            setSelectedStudent(null); // Close profile modal
            fetchData(); // Refresh the student list
        } catch (err: any) {
            const errorMessage = `Falha ao excluir o aluno: ${err.message}`;
            console.error(errorMessage, err);
            alert(errorMessage);
        }
    };
    
    const handleStudentAdded = () => {
        setIsAddModalOpen(false);
        fetchData();
    };

    const filteredStudents = useMemo(() => {
        return allStudents.filter(student => {
            const studentCourseId = student.classes?.courses?.id;
            const matchesCourse = !selectedCourseId || studentCourseId === selectedCourseId;
            const matchesClass = !selectedClassId || student.classId === selectedClassId;
            const matchesSearch = !searchTerm || student.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCourse && matchesClass && matchesSearch;
        });
    }, [allStudents, searchTerm, selectedCourseId, selectedClassId]);
    
    const filteredClasses = useMemo(() => {
        if (!selectedCourseId) return classes;
        return classes.filter(c => c.courseId === selectedCourseId);
    }, [selectedCourseId, classes]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (allStudents.length === 0) {
            return (
                <div className="text-center py-20">
                    <div className="p-4 bg-white rounded-full mb-4 inline-block shadow-md">
                        <UsersIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-700">Nenhum Aluno Encontrado</h2>
                    <p className="text-gray-500 mt-2 max-w-md mx-auto">
                        Clique em "Adicionar Aluno" para começar a montar seu CRM.
                    </p>
                </div>
            );
        }

        return (
             <div className="overflow-x-auto bg-white rounded-lg shadow border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nome do Aluno</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Turma</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Curso</th>
                            <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Data de Inscrição</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredStudents.map(student => (
                            <tr key={student.id} onClick={() => setSelectedStudent(student)} className="hover:bg-primary/5 group cursor-pointer">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0 h-10 w-10">
                                            {student.image_url ? (
                                                <img className="h-10 w-10 rounded-full object-cover" src={student.image_url} alt={student.name} />
                                            ) : (
                                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <span className="text-primary font-bold">{student.name.charAt(0)}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.classes?.name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.classes?.courses?.name || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(student.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <>
            <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
                <header className="p-6 border-b border-gray-200 bg-white flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">CRM de Alunos</h1>
                        <p className="text-gray-500 mt-1">Acompanhe o progresso individual e o desempenho da turma.</p>
                    </div>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                    >
                        <PlusCircleIcon className="w-5 h-5" />
                        Adicionar Aluno
                    </button>
                </header>
                <div className="p-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <div className="relative">
                                <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-gray-800 placeholder:text-gray-400 transition" />
                            </div>
                            <select value={selectedCourseId} onChange={e => { setSelectedCourseId(e.target.value); setSelectedClassId(''); }} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer">
                                <option value="">Filtrar por Curso</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={!selectedCourseId && filteredClasses.length === 0}>
                                <option value="">Filtrar por Turma</option>
                                {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <main className="flex-grow">
                        {renderContent()}
                    </main>
                </div>
            </div>
            {isAddModalOpen && (
                <AddStudentModal onClose={() => setIsAddModalOpen(false)} onStudentAdded={handleStudentAdded} />
            )}
            {selectedStudent && (
                <StudentProfile 
                    student={selectedStudent} 
                    onClose={() => setSelectedStudent(null)} 
                    onEditRequest={setEditingStudent} 
                    onDeleteRequest={handleDeleteStudent}
                />
            )}
            {editingStudent && (
                <EditStudentModal
                    student={editingStudent}
                    onClose={() => setEditingStudent(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </>
    );
};

export default CrmPage;