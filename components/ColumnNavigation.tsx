
import React, { useState } from 'react';
import { PlusCircleIcon, SearchIcon, ChevronRightIcon, MoreVerticalIcon, EditIcon, TrashIcon, LayersIcon, ImageIcon } from './IconComponents';

export interface ColumnItem {
    id: string;
    name: string; // or subjectName
    subTitle?: string;
    imageUrl?: string; // New property for cover image
    data?: any; // The original object
}

export interface ColumnDefinition {
    id: string;
    title: string;
    items: ColumnItem[];
    selectedId: string | null;
    onSelect: (item: ColumnItem) => void;
    onAdd?: () => void;
    onEdit?: (item: ColumnItem) => void;
    onDelete?: (id: string) => void;
    renderCustomItem?: (item: ColumnItem) => React.ReactNode;
    emptyMessage?: string;
}

interface ColumnNavigationProps {
    columns: ColumnDefinition[];
    // Removed rigid height prop default, now defaults to h-full of parent
}

const Column: React.FC<ColumnDefinition> = ({ 
    title, 
    items, 
    selectedId, 
    onSelect, 
    onAdd, 
    onEdit, 
    onDelete,
    renderCustomItem,
    emptyMessage 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    const filteredItems = items.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex-shrink-0 w-80 border-r border-gray-200 bg-white flex flex-col h-full first:rounded-l-xl last:border-r-0">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10">
                <h3 className="font-bold text-gray-600 text-xs uppercase tracking-wider flex items-center gap-2">
                    {title} 
                    <span className="bg-gray-200 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">{items.length}</span>
                </h3>
                {onAdd && (
                    <button onClick={onAdd} className="text-primary hover:bg-primary/10 p-1.5 rounded-md transition-colors" title={`Adicionar ${title}`}>
                        <PlusCircleIcon className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="p-3 border-b border-gray-100 bg-white">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder={`Buscar em ${title}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {filteredItems.length > 0 ? (
                    filteredItems.map(item => {
                        const isSelected = selectedId === item.id;
                        return (
                            <div 
                                key={item.id}
                                onClick={() => onSelect(item)}
                                className={`group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border
                                    ${isSelected 
                                        ? 'bg-primary/5 border-primary/30 shadow-sm ring-1 ring-primary/20 z-10' 
                                        : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700'
                                    }`}
                            >
                                <div className="flex-1 min-w-0 pr-2 flex items-center gap-3">
                                    {renderCustomItem ? renderCustomItem(item) : (
                                        <>
                                            {item.imageUrl ? (
                                                <img 
                                                    src={item.imageUrl} 
                                                    alt={item.name} 
                                                    className={`w-10 h-10 rounded-md object-cover flex-shrink-0 border ${isSelected ? 'border-primary/20' : 'border-gray-200'}`} 
                                                />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-white text-primary' : 'bg-gray-100 text-gray-400'}`}>
                                                    <ImageIcon className="w-5 h-5" />
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`font-medium truncate text-sm ${isSelected ? 'text-primary-dark' : 'text-gray-800'}`}>{item.name}</p>
                                                {item.subTitle && <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-primary/70' : 'text-gray-400'}`}>{item.subTitle}</p>}
                                            </div>
                                        </>
                                    )}
                                </div>
                                
                                {isSelected && (
                                    <ChevronRightIcon className="w-4 h-4 text-primary flex-shrink-0" />
                                )}

                                {/* Management Actions */}
                                {(onEdit || onDelete) && (
                                    <div className={`absolute right-2 top-2 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                                         <div className="relative">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === item.id ? null : item.id); }}
                                                className={`p-1.5 rounded-md hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all ${isSelected ? 'bg-white/50 text-primary' : 'bg-gray-100 text-gray-500'}`}
                                            >
                                                <MoreVerticalIcon className="w-4 h-4" />
                                            </button>
                                            {menuOpenId === item.id && (
                                                <>
                                                    <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); }}></div>
                                                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-gray-100 z-30 overflow-hidden animate-fadeIn">
                                                        {onEdit && (
                                                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onEdit(item); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-gray-50 flex items-center gap-2 text-gray-700 font-medium transition-colors">
                                                                <EditIcon className="w-3.5 h-3.5" /> Editar
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onDelete(item.id); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-red-50 flex items-center gap-2 text-red-600 font-medium transition-colors border-t border-gray-50">
                                                                <TrashIcon className="w-3.5 h-3.5" /> Excluir
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                         <div className="p-3 bg-gray-50 rounded-full mb-3">
                            <SearchIcon className="w-6 h-6 text-gray-300" />
                         </div>
                         <p className="text-sm text-gray-500 font-medium">{emptyMessage || "Nenhum item encontrado."}</p>
                         {onAdd && (
                             <button onClick={onAdd} className="mt-3 text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                                 + Adicionar novo item
                             </button>
                         )}
                    </div>
                )}
            </div>
        </div>
    );
};

const ColumnNavigation: React.FC<ColumnNavigationProps> = ({ columns }) => {
    return (
        <div className="h-full w-full flex flex-col">
            {/* Container for the columns - uses flex-grow to fill parent height */}
            <div className="flex-grow flex flex-nowrap overflow-x-auto bg-gray-100 border border-gray-200 rounded-xl shadow-sm">
                {columns.map(col => (
                    <Column key={col.id} {...col} />
                ))}
                {/* Placeholder for "What's next?" or empty space styling */}
                <div className="flex-grow bg-gray-50 min-w-[40px] border-l border-gray-200/50"></div>
            </div>
        </div>
    );
};

export default ColumnNavigation;
