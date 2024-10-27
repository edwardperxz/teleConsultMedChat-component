import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebar } from '../contexts/SidebarContext';

const Sidebar: React.FC = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const location = useLocation();
  const isPatientPath = location.pathname.includes('patient');

  return (
    <div className="relative">
      <aside className={`fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} w-64 bg-white text-[#333333] transition-transform duration-300 md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between p-4 bg-[#bec7c6] text-white md:hidden">
          <h1 className="text-xl font-bold">Menu</h1>
          <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
            ✖
          </button>
        </div>
        <nav className="mt-10">
          <ul className="space-y-4">
            <li>
              <Link to={isPatientPath ? "/patient-dashboard" : "/provider-dashboard"} className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Inicio
              </Link>
            </li>
            <li>
              <a href="#" className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Mis Consultas
              </a>
            </li>
            <li>
              <a href="#" className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Historial Médico
              </a>
            </li>
            <li>
              <a href="#" className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Directorio de Doctores
              </a>
            </li>
            <li>
              <a href="#" className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Recetas y Documentos
              </a>
            </li>
            <li>
              <a href="#" className="block py-2.5 px-4 hover:bg-[#bec7c6] transition duration-200">
                Ayuda y Soporte
              </a>
            </li>
          </ul>
        </nav>
      </aside>
    </div>
  );
};

export default Sidebar;
