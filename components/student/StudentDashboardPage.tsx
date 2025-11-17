import React, { useState, useEffect } from 'react';
import { Student, StudentAnalytics } from '../../types';
import * as analyticsService from '../../services/analyticsService';
import { BarChartIcon, LayersIcon, ActivityIcon, CalendarIcon } from '../IconComponents';

interface StudentDashboardPageProps {
    student: Student;
}

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <div>
            <p className="text-sm font-semibold text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({ student }) => {
    const [analytics, setAnalytics] = useState<StudentAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            setIsLoading(true);
            const data = await analyticsService.getStudentComprehensiveAnalytics(student.id);
            setAnalytics(data);
            setIsLoading(false);
        };
        fetchAnalytics();
    }, [student.id]);

    if (isLoading) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!analytics) {
        return <div className="p-6">Não foi possível carregar seu dashboard.</div>;
    }

    return (
        <div className="h-full w-full flex flex-col bg-gray-50 overflow-y-auto">
            <header className="p-6 border-b border-gray-200 bg-white">
                <h1 className="text-3xl font-bold text-gray-800">Meu Dashboard</h1>
                <p className="text-gray-500 mt-1">Seu resumo de progresso e desempenho na plataforma.</p>
            </header>

            <main className="flex-grow p-6 space-y-6">
                 <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">Progresso Geral no Curso</h3>
                    <div className="w-full bg-gray-200 rounded-full h-5">
                        <div className="bg-primary h-5 rounded-full transition-all duration-500 flex items-center justify-center" style={{ width: `${analytics.overallProgress}%` }}>
                           <span className="text-sm font-bold text-white">{analytics.overallProgress}%</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Média (Testes)" value={`${analytics.testAverage}%`} icon={BarChartIcon} />
                    <StatCard title="Precisão (Cards)" value={`${analytics.flashcardAccuracy}%`} icon={LayersIcon} />
                    <StatCard title="Dias de Estudo" value={`${analytics.studyDays}`} icon={CalendarIcon} />
                    <StatCard title="Sessões Iniciadas" value={`${analytics.totalSessions}`} icon={ActivityIcon} />
                </div>
                
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-4">Atividade Recente</h3>
                     {analytics.recentActivity.length > 0 ? (
                        <ul className="space-y-4 bg-white p-4 rounded-lg border">
                            {analytics.recentActivity.map(activity => (
                                <li key={activity.id} className="flex items-start gap-3">
                                    <div className="mt-1 p-1.5 bg-primary/10 rounded-full"><ActivityIcon className="w-4 h-4 text-primary" /></div>
                                    <div>
                                        <p className="text-sm text-gray-800">{activity.description}</p>
                                        <p className="text-xs text-gray-500">{new Date(activity.created_at).toLocaleString()}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-10 bg-white rounded-lg border">
                            <p className="text-gray-500">Nenhuma atividade recente registrada.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default StudentDashboardPage;
