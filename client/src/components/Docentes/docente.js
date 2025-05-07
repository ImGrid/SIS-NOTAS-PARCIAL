// src/components/Docentes/docente.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './sidebar';
import './style/docente.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Importar servicios necesarios
import { getMisGrupos } from '../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../service/estudianteService';
import { getInformesPorGrupoId } from '../../service/informeService';
import { getBorradorPorDocenteYGrupo } from '../../service/borradorService';

// Iconos para las tarjetas
const icons = {
  grupos: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  pendientes: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  ),
  evaluados: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  proyectos: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  estudiantes: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
    </svg>
  ),
  evaluacion: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <line x1="10" y1="9" x2="8" y2="9"></line>
    </svg>
  ),
  calendar: (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  )
};

function Docentes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumen, setResumen] = useState({
    totalGrupos: 0,
    totalEstudiantes: 0,
    gruposPendientes: 0,
    gruposEvaluados: 0,
    gruposSinEvaluar: 0,
    estudiantesPendientes: 0,
    estudiantesEvaluados: 0
  });
  const [nombreUsuario, setNombreUsuario] = useState('');
  
  // Obtener la fecha actual
  const fechaActual = new Date();
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const fechaFormateada = fechaActual.toLocaleDateString('es-ES', opciones);
  
  // Para el mini calendario
  const diasSemana = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
  const diaActual = fechaActual.getDate();
  const mesActual = fechaActual.getMonth();
  const anioActual = fechaActual.getFullYear();
  const primerDiaMes = new Date(anioActual, mesActual, 1).getDay();
  const ultimoDiaMes = new Date(anioActual, mesActual + 1, 0).getDate();
  
  const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  // Generar días del calendario
  const generarDiasCalendario = () => {
    const dias = [];
    // Días anteriores al mes
    for (let i = 0; i < primerDiaMes; i++) {
      dias.push({ dia: '', esHoy: false, enMes: false });
    }
    // Días del mes actual
    for (let i = 1; i <= ultimoDiaMes; i++) {
      dias.push({ 
        dia: i, 
        esHoy: i === diaActual, 
        enMes: true
      });
    }
    return dias;
  };
  
  // Capitalizar primera letra
  const capitalizarPrimeraLetra = (texto) => {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };
  
  // Determinar el saludo según la hora del día
  const obtenerSaludo = () => {
    const hora = fechaActual.getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };
  
  // Cargar datos al iniciar
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Obtener nombre del docente desde sessionStorage
        const usuarioString = sessionStorage.getItem('usuario');
        if (usuarioString) {
          const usuario = JSON.parse(usuarioString);
          setNombreUsuario(usuario.nombre || 'Docente');
        }
        
        // Obtener grupos del docente
        const grupos = await getMisGrupos();
        
        let totalEstudiantes = 0;
        let estudiantesEvaluados = 0;
        let gruposEvaluados = 0;
        let gruposPendientes = 0;
        let gruposSinEvaluar = 0;
        
        // Para cada grupo, obtener estudiantes e informes
        for (const grupo of grupos) {
          // Obtener estudiantes del grupo
          const estudiantes = await getEstudiantesByGrupoId(grupo.id);
          totalEstudiantes += estudiantes.length;
          
          // Si no hay estudiantes, no consideramos este grupo para la evaluación
          if (estudiantes.length === 0) continue;
          
          // Obtener informes del grupo
          const informes = await getInformesPorGrupoId(grupo.id);
          estudiantesEvaluados += informes.length;
          
          // Verificar si tiene borrador (indica que está pendiente)
          let tieneBorrador = false;
          if (usuarioString) {
            try {
              const usuario = JSON.parse(usuarioString);
              const docenteId = usuario.id;
              const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupo.id, true);
              tieneBorrador = borrador !== null;
            } catch (error) {
              console.log('Error al verificar borrador:', error);
            }
          }
          
          // Clasificar el grupo según sus evaluaciones
          if (informes.length === 0) {
            // Si no tiene informes pero tiene un borrador, considerar pendiente
            if (tieneBorrador) {
              gruposPendientes++;
            } else {
              gruposSinEvaluar++;
            }
          } else if (informes.length < estudiantes.length) {
            gruposPendientes++;
          } else {
            gruposEvaluados++;
          }
        }
        
        // Actualizar el estado con los datos calculados
        setResumen({
          totalGrupos: grupos.length,
          totalEstudiantes,
          gruposPendientes,
          gruposEvaluados,
          gruposSinEvaluar,
          estudiantesPendientes: totalEstudiantes - estudiantesEvaluados,
          estudiantesEvaluados
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos del dashboard:', err);
        setError('Error al cargar la información del dashboard');
        setLoading(false);
        toast.error('Error al cargar la información del dashboard');
      }
    };
    
    cargarDatos();
  }, []);
  
  // Manejar navegación a diferentes secciones
  const irAGestionGrupos = () => navigate('/grupos/gestion');
  const irACrearGrupo = () => navigate('/grupos/crear');
  const irAEvaluaciones = () => navigate('/evaluaciones/gestionar');
  const irAListarEstudiantes = () => navigate('/estudiantes/listar');
  
  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content">
        <ToastContainer position="top-right" autoClose={3000} />
        
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando información...</p>
          </div>
        ) : error ? (
          <div className="error-message">
            {error}
          </div>
        ) : (
          <div className="dashboard-container">
            {/* Encabezado del Dashboard - Ajustado para ocupar todo el ancho */}
            <div className="dashboard-header-fullwidth">
              <div className="welcome-section">
                <h1>{obtenerSaludo()}, {nombreUsuario}</h1>
                <p className="date-display">
                  {capitalizarPrimeraLetra(fechaFormateada)}
                </p>
              </div>
            </div>
            
            <div className="dashboard-main-content">
              <div className="dashboard-left-content">
                {/* Tarjetas de resumen */}
                <div className="dashboard-cards">
                  <div className="card-container">
                    <div className="dashboard-card total-grupos">
                      <div className="card-icon">{icons.grupos}</div>
                      <div className="card-content">
                        <h2>{resumen.totalGrupos}</h2>
                        <p>Grupos totales</p>
                      </div>
                    </div>
                    
                    <div className="dashboard-card total-estudiantes">
                      <div className="card-icon">{icons.estudiantes}</div>
                      <div className="card-content">
                        <h2>{resumen.totalEstudiantes}</h2>
                        <p>Estudiantes asignados</p>
                      </div>
                    </div>
                    
                    <div className="dashboard-card pendientes">
                      <div className="card-icon">{icons.pendientes}</div>
                      <div className="card-content">
                        <h2>{resumen.gruposPendientes + resumen.gruposSinEvaluar}</h2>
                        <p>Grupos con evaluaciones pendientes</p>
                      </div>
                    </div>
                    
                    <div className="dashboard-card evaluados">
                      <div className="card-icon">{icons.evaluados}</div>
                      <div className="card-content">
                        <h2>{resumen.gruposEvaluados}</h2>
                        <p>Grupos completamente evaluados</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Estado de evaluaciones */}
                <div className="dashboard-status-section">
                  <h2>Estado de Evaluaciones</h2>
                  
                  <div className="status-container">
                    <div className="status-card">
                      <div className="status-header">
                        <h3>Estudiantes</h3>
                      </div>
                      <div className="status-body">
                        <div className="progress-container">
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${resumen.totalEstudiantes > 0 ? (resumen.estudiantesEvaluados / resumen.totalEstudiantes) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <div className="progress-stats">
                          <span>{resumen.estudiantesEvaluados} de {resumen.totalEstudiantes} evaluados</span>
                          <span>{Math.round(resumen.totalEstudiantes > 0 ? (resumen.estudiantesEvaluados / resumen.totalEstudiantes) * 100 : 0)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="status-card">
                      <div className="status-header">
                        <h3>Grupos</h3>
                      </div>
                      <div className="status-body">
                        <div className="progress-container">
                          <div 
                            className="progress-bar" 
                            style={{ 
                              width: `${resumen.totalGrupos > 0 ? (resumen.gruposEvaluados / resumen.totalGrupos) * 100 : 0}%` 
                            }}
                          ></div>
                        </div>
                        <div className="progress-stats">
                          <span>{resumen.gruposEvaluados} de {resumen.totalGrupos} completados</span>
                          <span>{Math.round(resumen.totalGrupos > 0 ? (resumen.gruposEvaluados / resumen.totalGrupos) * 100 : 0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Accesos Rápidos */}
                <div className="dashboard-actions-section">
                  <h2>Acciones Rápidas</h2>
                  
                  <div className="actions-container">
                    <button 
                      className="action-button crear-grupo"
                      onClick={irACrearGrupo}
                    >
                      <div className="action-icon">{icons.proyectos}</div>
                      <span>Crear Nuevo Grupo</span>
                    </button>
                    
                    <button 
                      className="action-button gestionar-grupos"
                      onClick={irAGestionGrupos}
                    >
                      <div className="action-icon">{icons.grupos}</div>
                      <span>Gestionar Grupos</span>
                    </button>
                    
                    <button 
                      className="action-button evaluar-proyectos"
                      onClick={irAEvaluaciones}
                    >
                      <div className="action-icon">{icons.evaluacion}</div>
                      <span>Evaluar Proyectos</span>
                    </button>
                    
                    <button 
                      className="action-button ver-estudiantes"
                      onClick={irAListarEstudiantes}
                    >
                      <div className="action-icon">{icons.estudiantes}</div>
                      <span>Ver Estudiantes</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="dashboard-right-content">
                {/* Mini Calendario */}
                <div className="mini-calendar-container">
                  <div className="calendar-header">
                    <div className="calendar-icon">{icons.calendar}</div>
                    <h3>{nombresMeses[mesActual]} {anioActual}</h3>
                  </div>
                  <div className="calendar-days-header">
                    {diasSemana.map(dia => (
                      <div key={dia} className="calendar-day-name">{dia}</div>
                    ))}
                  </div>
                  <div className="calendar-days-grid">
                    {generarDiasCalendario().map((item, index) => (
                      <div 
                        key={index} 
                        className={`calendar-day ${item.esHoy ? 'today' : ''} ${item.enMes ? '' : 'outside-month'}`}
                      >
                        {item.dia}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Resumen de Actividad */}
                <div className="dashboard-activity-section">
                  <h2>Pendientes de Evaluación</h2>
                  
                  {resumen.gruposPendientes === 0 && resumen.gruposSinEvaluar === 0 ? (
                    <div className="no-pending-message">
                      <p>¡Excelente! No tienes evaluaciones pendientes.</p>
                    </div>
                  ) : (
                    <div className="pending-summary">
                      <div className="pending-item">
                        <span className="pending-count">{resumen.gruposSinEvaluar}</span>
                        <span className="pending-label">Grupos sin evaluaciones</span>
                      </div>
                      
                      <div className="pending-item">
                        <span className="pending-count">{resumen.gruposPendientes}</span>
                        <span className="pending-label">Grupos con evaluaciones parciales</span>
                      </div>
                      
                      <div className="pending-item">
                        <span className="pending-count">{resumen.estudiantesPendientes}</span>
                        <span className="pending-label">Estudiantes sin evaluar</span>
                      </div>
                      
                      <button 
                        className="view-pending-button"
                        onClick={irAEvaluaciones}
                      >
                        Ver evaluaciones pendientes
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Docentes;