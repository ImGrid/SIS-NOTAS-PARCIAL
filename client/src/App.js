import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './Auth/login';
import SupervisorLogin from './Auth/loginadm';
import Docentes from './components/Docentes/docente';
import ProtectedRoute from './Auth/ProtectedRoute';
import GestionGrupos from './components/Grupos/pages/gestionGrupos';
import CrearGrupos from './components/Grupos/pages/crearGrupos';
import AsignarGRupos from './components/Grupos/pages/asignarEstudiantes';
import EditarGrupos from './components/Grupos/pages/editarGrupos';
import GestionarEvaluaciones from './components/Rubricas/pages/gestionRubricas';
import EvaluarProyectos from './components/Rubricas/pages/gruposRubrica';
import VistaRubrica from './components/Rubricas/pages/vistaRubrica';
import SupervisorDashboard from './components/Supervisor/pages/supDashboard';
import AdminProtectedRoute from './Auth/AdminProtectedRoute';
import CrearEstudiante from './components/Estudiantes/pages/crearEstudiante';
import ListarEstudiantes from './components/Estudiantes/pages/listarEstudiantes';
import EditarEstudiante from './components/Estudiantes/pages/editarEstudiante'; // Nueva importación
import NotasRubrica from './components/Rubricas/pages/notasRubrica'
import NotasInformes from './components/Informes/pages/notasInformes';
import Estadisticas from './components/Informes/pages/estadisticas';
import SupervisorRubricas from './components/Supervisor/pages/supRubricas';
import SupervisorInformes from './components/Supervisor/pages/supInformes';
import CrearDocenteAdmin from './components/Docentes/pages/crearDocenteSup';
import ListarDocentesAdmin from './components/Docentes/pages/listarDocenteSup';
import SupervisorEstadisticas from './components/Supervisor/pages/supEstadisticas';

function App() {
  return (
    <Router>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/adm/login" element={<SupervisorLogin />} />
        
        {/* Rutas protegidas para docentes */}
        <Route 
          path="/docentes" 
          element={
            <ProtectedRoute>
              <Docentes />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grupos/gestion" 
          element={
            <ProtectedRoute>
              <GestionGrupos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grupos/crear" 
          element={
            <ProtectedRoute>
              <CrearGrupos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grupos/editar/:id" 
          element={
            <ProtectedRoute>
              <EditarGrupos />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/grupos/asignar" 
          element={
            <ProtectedRoute>
              <AsignarGRupos />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas para estudiantes */}
        <Route 
          path="/estudiantes/crear" 
          element={
            <ProtectedRoute>
              <CrearEstudiante />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/estudiantes/listar" 
          element={
            <ProtectedRoute>
              <ListarEstudiantes />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/estudiantes/editar/:id" 
          element={
            <ProtectedRoute>
              <EditarEstudiante />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/evaluaciones/gestionar" 
          element={
            <ProtectedRoute>
              <GestionarEvaluaciones />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/evaluaciones/evaluar" 
          element={
            <ProtectedRoute>
              <EvaluarProyectos />
            </ProtectedRoute>
          } 
        />        
        <Route 
          path="/evaluaciones/rubrica" 
          element={
            <ProtectedRoute>
              <VistaRubrica />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/evaluaciones/ver-grupo/:id" 
          element={
            <ProtectedRoute>
              <NotasRubrica />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas de administrador */}
        <Route 
          path="/supervisor/dashboard" 
          element={
            <AdminProtectedRoute>
              <SupervisorDashboard />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/supervisor/rubricas" 
          element={
            <AdminProtectedRoute>
              <SupervisorRubricas />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/supervisor/estadisticas" 
          element={
            <AdminProtectedRoute>
              <SupervisorEstadisticas />
            </AdminProtectedRoute>
          } 
        />
        {/* Nuevas rutas para gestión de docentes (admin) */}
        <Route 
          path="/adm/personal/crear" 
          element={
            <AdminProtectedRoute>
              <CrearDocenteAdmin />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/adm/personal/listar" 
          element={
            <AdminProtectedRoute>
              <ListarDocentesAdmin />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/supervisor/informes" 
          element={
            <AdminProtectedRoute>
              <SupervisorInformes />
            </AdminProtectedRoute>
          } 
        />
        <Route 
          path="/informes/notas-finales" 
          element={
            <ProtectedRoute>
              <NotasInformes />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/informes/estadisticas" 
          element={
            <ProtectedRoute>
              <Estadisticas />
            </ProtectedRoute>
          } 
        />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;