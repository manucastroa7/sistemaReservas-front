import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronLeft size={16} strokeWidth={3} />
                </button>
                <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`w-6 h-6 rounded-md text-[10px] font-black flex items-center justify-center transition-all ${currentPage === page
                                ? 'bg-slate-800 text-white shadow-md scale-105'
                                : 'text-slate-500 hover:bg-slate-200'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                >
                    <ChevronRight size={16} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
