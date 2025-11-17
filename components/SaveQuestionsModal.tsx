import React, { useState, useEffect } from 'react';
import { XIcon } from './IconComponents';
import { Course, Module, Discipline } from '../types';
import * as academicService from '../services/academicService';

interface SaveQuestionsModalProps {
    onClose: () => void;
    onSave: (details: {
        disciplineId: string;
        subjectName: string;
        createTest: boolean;
        testName: string;
    }) => void;
}

const SaveQuestionsModal: React.FC<SaveQuestionsModalProps> = ({ onClose, onSave }) => {
    const [subjectName, setSubjectName] = useState('');
    const [courses, setCourses] = useState<Course[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [selectedDisciplineId, setSelectedDisciplineId] = useState('');
    
    const [shouldCreateTest, setShouldCreateTest] = useState(false);
    const [testName, setTestName] = useState('');

    const [error, setError] = useState('');
    
    useEffect(() => {
        // When subject name is typed, auto-populate test name
        if (subjectName) {
            setTestName(subjectName);
        }
    }, [subjectName]);

    useEffect(() => {
        const fetchCourses = async () => {
            setCourses(await academicService.getCourses());
        }
        fetchCourses();
    }, []);

    useEffect(() => {
        const fetchModules = async () => {
            if (selectedCourseId) {
                setModules(await academicService.getModules(selectedCourseId));
                setSelectedModuleId('');
                setDisciplines([]);
                setSelectedDisciplineId('');
            } else {
                setModules([]);
            }
        };
        fetchModules();
    }, [selectedCourseId]);

    useEffect(() => {
        const fetchDisciplines = async () => {
            if (selectedModuleId) {
                setDisciplines(await academicService.getDisciplines(selectedModuleId));
                setSelectedDisciplineId('');
            } else {
                setDisciplines([]);
            }
        };
        fetchDisciplines();
    }, [selectedModuleId]);

    const handleSave = () => {
        setError('');
        if (!selectedDisciplineId || !subjectName.trim()) {
            setError('Por favor, preencha o nome do assunto e selecione uma disciplina.');
            return;
        }
        if (shouldCreateTest && !testName.trim()) {
            setError('Por favor, forneça um nome para o teste.');
            return;
        }
        onSave({
            disciplineId: selectedDisciplineId,
            subjectName: subjectName.trim(),
            createTest: shouldCreateTest,
            testName: testName.trim(),
        });
        onClose();
    };

    const renderSelect = (id: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: {id: string, name: string}[], placeholder: string) => (
        <select
            id={id}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-800 focus:ring-2 focus:ring-primary focus:outline-none"
        >
            <option value="">{placeholder}</option>
            {options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
        </select>
    );

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">Salvar Questões</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
                        <XIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Vincular a:</label>
                        <div className="space-y-2 p-3 bg-gray-50 border rounded-md">
                             {renderSelect("course-select", selectedCourseId, e => setSelectedCourseId(e.target.value), courses, "Selecione um curso")}
                             {renderSelect("module-select", selectedModuleId, e => setSelectedModuleId(e.target.value), modules, "Selecione um módulo")}
                             {renderSelect("discipline-select", selectedDisciplineId, e => setSelectedDisciplineId(e.target.value), disciplines, "Selecione uma disciplina")}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                            Nome do Assunto (Este Conjunto de Questões)
                        </label>
                        <input
                            type="text"
                            id="subject"
                            value={subjectName}
                            onChange={(e) => setSubjectName(e.target.value)}
                            placeholder="Ex: Farmacologia - Prova 2023"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                        />
                    </div>
                     <div className="p-3 border-t">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={shouldCreateTest}
                                onChange={(e) => setShouldCreateTest(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <span className="font-medium text-gray-700">Também criar um Teste com estas questões selecionadas</span>
                        </label>
                        {shouldCreateTest && (
                            <div className="mt-3 pl-7">
                                <label htmlFor="testName" className="block text-sm font-medium text-gray-600 mb-1">
                                    Nome do Teste
                                </label>
                                <input
                                    type="text"
                                    id="testName"
                                    value={testName}
                                    onChange={(e) => setTestName(e.target.value)}
                                    placeholder="Ex: Prova Mensal de Farmacologia"
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:outline-none bg-white text-gray-800 placeholder:text-gray-400"
                                />
                            </div>
                        )}
                    </div>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                </div>
                <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                    >
                        Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SaveQuestionsModal;