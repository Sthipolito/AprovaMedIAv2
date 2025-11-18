import React, { useState, useRef, useEffect } from 'react';
import { TestWithAnalytics } from '../services/testService';
import { CalendarIcon, ClockIcon, MoreVerticalIcon, EditIcon, TrashIcon } from './IconComponents';

interface TestCardProps {
    test: TestWithAnalytics & { moduleName?: string; disciplineName?: string; };
    onResultsClick: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

const Stat: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="text-center px-2">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
    </div>
);


const TestCard: React.FC<TestCardProps> = ({ test, onResultsClick, onEdit, onDelete }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const isScheduled = test.test_type === 'scheduled' && test.assignments && test.assignments.length > 0;
    const assignment = isScheduled ? test.assignments![0] : null;

    const getStatus = () => {
        if (!isScheduled || !assignment) return { text: 'Disponível', color: 'border-green-500' };

        const now = new Date();
        const start = new Date(assignment.start_time);
        const end = new Date(assignment.end_time);

        if (now < start) return { text: 'Agendado', color: 'border-blue-500' };
        if (now > end) return { text: 'Encerrado', color: 'border-gray-400' };
        return { text: 'Em Andamento', color: 'border-yellow-500' };
    };

    const status = getStatus();

    return (
        <div className={`bg-white border-b-4 ${status.color} rounded-lg shadow-sm flex flex-col transition-all hover:shadow-xl hover:-translate-y-1`}>
            <div className="p-4 flex-grow">
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                         {(test.moduleName || test.disciplineName) && (
                            <div className="text-xs text-primary font-semibold mb-1 uppercase tracking-wider">
                                {test.moduleName}
                                {test.moduleName && test.disciplineName && <span className="mx-1 font-normal text-gray-400">/</span>}
                                {test.disciplineName}
                            </div>
                        )}
                        <h2 className="font-bold text-lg text-gray-800 pr-4 flex-1">{test.name}</h2>
                    </div>
                    <div className="relative" ref={menuRef}>
                         <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-800">
                            <MoreVerticalIcon className="w-5 h-5" />
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg border z-20">
                                <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2">
                                    <EditIcon className="w-4 h-4" /> Editar
                                </button>
                                <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                                    <TrashIcon className="w-4 h-4" /> Excluir
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">{test.questions.length} questões</p>
                
                {isScheduled && assignment && (
                    <div className="mt-4 text-xs text-gray-600 space-y-1.5 border-t pt-3">
                        <p className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-gray-500"/> 
                            <span className="font-medium">Início:</span> {new Date(assignment.start_time).toLocaleString()}
                        </p>
                        <p className="flex items-center gap-2">
                             <ClockIcon className="w-4 h-4 text-gray-500"/> 
                             <span className="font-medium">Término:</span> {new Date(assignment.end_time).toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
            <div className="border-t bg-gray-50/70 p-3 grid grid-cols-2 divide-x">
                <Stat label="Tentativas" value={test.attemptCount} />
                <Stat label="Média" value={`${test.averageScore}%`} />
            </div>
            <div className="p-2">
                <button 
                    onClick={onResultsClick}
                    className="w-full px-4 py-2 bg-primary/10 text-primary font-semibold rounded-md text-sm hover:bg-primary/20 transition-colors"
                >
                    Ver Resultados
                </button>
            </div>
        </div>
    );
};

export default TestCard;