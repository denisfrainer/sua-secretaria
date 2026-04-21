import React from 'react';

export default function AuthSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
            <svg 
              className="h-12 w-12 text-green-600" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800">✅ Agenda Conectada!</h1>
        
        <p className="text-lg text-slate-600">
          Pode fechar esta tela e voltar para o WhatsApp. A Eliza já mandou mensagem lá com os próximos passos.
        </p>

        <div className="pt-4">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
