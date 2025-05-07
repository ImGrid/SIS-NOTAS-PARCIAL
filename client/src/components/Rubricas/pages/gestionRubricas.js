// src/components/Evaluaciones/pages/GestionarEvaluaciones.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import '../style/gestionRubricas.css';
import { getMisGrupos } from '../../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { getInformesPorGrupoId } from '../../../service/informeService';
import { getRubricaPorId } from '../../../service/rubricaService';
import { getBorradorPorDocenteYGrupo } from '../../../service/borradorService';
import { exportarTodasLasEvaluaciones } from '../../../util/export/excelService';
import supRubricaService from '../../../service/supRubricaService';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
const icons = {
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  filter: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  ),
  clear: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

function GestionarEvaluaciones() {

  const [grupos, setGrupos] = useState([]);
  const [gruposConEstudiantes, setGruposConEstudiantes] = useState({});
  const [gruposConRubricas, setGruposConRubricas] = useState({});
  const [rubricas, setRubricas] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [semestroFilter, setSemestroFilter] = useState('');
  const [carreraFilter, setCarreraFilter] = useState('');
  const [materiaFilter, setMateriaFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  // Cargar grupos y sus estados al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);        
        const gruposData = await getMisGrupos();
        setGrupos(gruposData);
        
        const estudiantesPorGrupo = {};
        const rubricasPorGrupo = {};
        const rubricasData = {};
        
        for (const grupo of gruposData) {
          const estudiantes = await getEstudiantesByGrupoId(grupo.id);
          estudiantesPorGrupo[grupo.id] = estudiantes;
          
          const informes = await getInformesPorGrupoId(grupo.id);
          
          for (const informe of informes) {
            if (informe.rubrica_id) {
              try {
                const rubrica = await getRubricaPorId(informe.rubrica_id);
                rubricasData[informe.rubrica_id] = rubrica;
              } catch (rubricaError) {
                console.error(`Error al obtener rúbrica ${informe.rubrica_id}:`, rubricaError);
              }
            }
          }
          
          const usuarioString = sessionStorage.getItem('usuario');
          let docenteId = null;
          if (usuarioString) {
            try {
              const usuario = JSON.parse(usuarioString);
              docenteId = usuario.id;
            } catch (error) {
              console.error('Error al parsear datos del usuario:', error);
            }
          }
          
          let tieneBorrador = false;
          if (docenteId) {
            try {
              const borrador = await getBorradorPorDocenteYGrupo(docenteId, grupo.id, true);
              tieneBorrador = borrador !== null;
            } catch (error) {
              console.log('Error al verificar borrador:', error);
              tieneBorrador = false;
            }
          }
          
          if (informes.length === 0) {
            if (tieneBorrador) {
              rubricasPorGrupo[grupo.id] = {
                estado: 'pendiente', 
                texto: 'Pendiente',
                informes: []
              };
            } else {
              rubricasPorGrupo[grupo.id] = {
                estado: 'sin_rubrica', 
                texto: 'Sin Rúbrica',
                informes: []
              };
            }
          } else if (informes.length < estudiantes.length) {
            rubricasPorGrupo[grupo.id] = {
              estado: 'pendiente', 
              texto: 'Pendiente',
              informes: informes
            };
          } else {
            rubricasPorGrupo[grupo.id] = {
              estado: 'finalizado', 
              texto: 'Finalizado',
              informes: informes
            };
          }
          try {
          const detallesGrupo = await supRubricaService.obtenerRubricasGrupo(grupo.id);
          
          // Si hay habilitación activa, cambiar el estado visual
          if (detallesGrupo.grupo.habilitacion_activa) {
            rubricasPorGrupo[grupo.id] = {
              ...rubricasPorGrupo[grupo.id],
              estado: 'pendiente_habilitado',  // Estado especial para grupos habilitados
              texto: 'Habilitado para edición', // Texto más descriptivo
              habilitacion_activa: true  // Flag para indicar que está habilitado
            };
          }
        } catch (error) {
          console.log('Error al verificar habilitación:', error);
        }
        }
        
        setGruposConEstudiantes(estudiantesPorGrupo);
        setGruposConRubricas(rubricasPorGrupo);
        setRubricas(rubricasData); 
        setLoading(false);
        
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  const getSemestrosUnicos = () => {
    const semestres = grupos.map(g => g.semestre);
    return [...new Set(semestres)].sort((a, b) => a - b);
  };

  const getCarrerasUnicas = () => {
    const carreras = grupos.map(g => g.carrera);
    return [...new Set(carreras)].sort();
  };

  const getMateriasUnicas = () => {
    const materias = grupos.map(g => g.materia).filter(Boolean);
    return [...new Set(materias)].sort();
  };

  // Filtrar grupos
  const gruposFiltrados = grupos.filter(grupo => {
    const matchesSearch = grupo.nombre_proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          grupo.carrera.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (grupo.materia && grupo.materia.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSemestre = !semestroFilter || grupo.semestre.toString() === semestroFilter;
    const matchesCarrera = !carreraFilter || grupo.carrera === carreraFilter;
    const matchesMateria = !materiaFilter || grupo.materia === materiaFilter;
    
    return matchesSearch && matchesSemestre && matchesCarrera && matchesMateria;
  });

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSemestroFilter('');
    setCarreraFilter('');
    setMateriaFilter('');
  };


  const handleEvaluarGrupo = async (grupoId, estado) => {
    if (estado === 'finalizado') {
      try {
        const detallesGrupo = await supRubricaService.obtenerRubricasGrupo(grupoId);
        if (detallesGrupo.grupo.habilitacion_activa) {
          toast.info('Este grupo ha sido habilitado por un administrador para permitir modificaciones.');
          navigate(`/evaluaciones/evaluar?grupo=${grupoId}`);
          return;
        }        
        toast.warning('Este grupo ya ha sido evaluado y la evaluación ha sido finalizada. No es posible modificar evaluaciones finalizadas.');
        return;
      } catch (error) {
        console.error('Error al verificar habilitación:', error);
        toast.warning('Este grupo ya ha sido evaluado y la evaluación ha sido finalizada. No es posible modificar evaluaciones finalizadas.');
        return;
      }
    }
    
    navigate(`/evaluaciones/evaluar?grupo=${grupoId}`);
  };

  const handleVerEvaluaciones = (grupoId) => {
    navigate(`/evaluaciones/ver-grupo/${grupoId}`);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'sin_rubrica':
        return 'estado-sin-rubrica';
      case 'pendiente':
        return 'estado-pendiente';
      case 'pendiente_habilitado': // Nuevo estado
        return 'estado-pendiente'; // Puedes usar el mismo estilo que pendiente o crear uno nuevo
      case 'finalizado':
        return 'estado-finalizado';
      default:
        return '';
    }
  };
  const handleImprimir = async () => {
    try {
      await exportarTodasLasEvaluaciones(true);
      console.log('Exportación completada');
    } catch (error) {
      console.error('Error al imprimir evaluaciones:', error);
      setMessage({
        text: `Error al exportar evaluaciones: ${error.message || 'Error desconocido'}`,
        type: 'error'
      });
    }
  };
  if (loading) {
    return (
      <div className="docentes-container">
        <ToastContainer position="top-right" autoClose={3000} />
        <Sidebar />
        <main className="content content-with-sidebar evaluaciones-styles">
          <div className="grupos-header">
            <div className="ev-titulo-botones-container">
              <h1>Gestionar Evaluaciones</h1>
              <button 
                className="ev-btn-imprimir"
                onClick={handleImprimir}
              >
                IMPRIMIR
              </button>
            </div>
          </div>
          <div className="grupos-container">
            <div className="loading-indicator">Cargando datos...</div>
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="docentes-container">
        <Sidebar />
        <main className="content content-with-sidebar evaluaciones-styles">
          <div className="grupos-header">
            <div className="ev-titulo-botones-container">
              <h1>Gestionar Evaluaciones</h1>
              <button 
                className="ev-btn-imprimir"
                onClick={handleImprimir}
              >
                IMPRIMIR
              </button>
            </div>
          </div>
          <div className="grupos-container">
            <div className="error-message">{error}</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content content-with-sidebar evaluaciones-styles">
      <div className="grupos-header">
        <div className="ev-titulo-botones-container">
          <h1>Gestionar Evaluaciones</h1>
          <button 
            className="ev-btn-imprimir"
            onClick={handleImprimir}
          >
            IMPRIMIR
          </button>
        </div>
      </div>
        
      <div className="grupos-container">
        {message && (
          <div className={`message-container ${message.type}-message`}>
            {message}
          </div>
        )}
        <div className="search-filters-container">
            <div className="search-bar">
              <div className="search-input-container">
                {icons.search}
                <input
                  type="text"
                  placeholder="Buscar por nombre de proyecto, carrera o materia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="clear-search"
                    title="Limpiar búsqueda"
                  >
                    {icons.clear}
                  </button>
                )}
              </div>
              <button 
                className={`filter-toggle ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
                title="Mostrar/Ocultar filtros"
              >
                {icons.filter}
                <span>Filtros</span>
              </button>
            </div>
            
            {showFilters && (
              <div className="filters-row">
                <select 
                  value={semestroFilter} 
                  onChange={(e) => setSemestroFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los semestres</option>
                  {getSemestrosUnicos().map(semestre => (
                    <option key={semestre} value={semestre}>
                      Semestre {semestre}
                    </option>
                  ))}
                </select>
                
                <select 
                  value={carreraFilter} 
                  onChange={(e) => setCarreraFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todas las carreras</option>
                  {getCarrerasUnicas().map(carrera => (
                    <option key={carrera} value={carrera}>
                      {carrera}
                    </option>
                  ))}
                </select>
                
                <select 
                  value={materiaFilter} 
                  onChange={(e) => setMateriaFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todas las materias</option>
                  {getMateriasUnicas().map(materia => (
                    <option key={materia} value={materia}>
                      {materia}
                    </option>
                  ))}
                </select>
                
                <button 
                  onClick={clearFilters} 
                  className="clear-filters"
                  title="Limpiar todos los filtros"
                >
                  {icons.clear}
                  <span>Limpiar filtros</span>
                </button>
              </div>
            )}
          </div>
          {(searchTerm || semestroFilter || carreraFilter || materiaFilter) && (
            <div className="results-count">
              Mostrando {gruposFiltrados.length} de {grupos.length} grupos
            </div>
          )}
        {grupos.length === 0 ? (
          <div className="empty-state">
            <p>No tiene grupos asignados para evaluar.</p>
            <p>Primero debe crear grupos en la sección de "Gestión de Grupos".</p>
            <button 
              className="btn-crear-grupo-empty"
              onClick={() => navigate('/grupos/gestion')}
            >
              Ir a Gestión de Grupos
            </button>
          </div>
        ) : (
          <div className="grupos-table-container">
            {gruposFiltrados.map((grupo) => {
              const rubricaInfo = gruposConRubricas[grupo.id] || {
                estado: 'sin_rubrica',
                texto: 'Sin Rúbrica',
                informes: []
              };
              
              return (
                <div key={grupo.id} className={`grupo-card-table ${getEstadoColor(rubricaInfo.estado)}`}>
                  <div className="grupo-header-row">
                    <div className="grupo-title">
                      <h3>{grupo.nombre_proyecto}</h3>
                      <span className="grupo-details">
                        {grupo.carrera} | Semestre {grupo.semestre} | {grupo.materia || 'Sin materia'}
                      </span>
                    </div>
                    
                    <div className="grupo-estado-container">
                      <span className={`grupo-estado ${getEstadoColor(rubricaInfo.estado)}`}>
                        {rubricaInfo.texto}
                      </span>
                      
                      <div className="grupo-actions">
                      <button 
                        className="btn-evaluar" 
                        onClick={() => handleEvaluarGrupo(grupo.id, rubricaInfo.estado)}
                        title={rubricaInfo.estado === 'finalizado' ? 
                          "Este grupo ya ha sido evaluado y finalizado" : 
                          "Evaluar grupo"}
                        disabled={eliminando || (rubricaInfo.estado === 'finalizado' && !rubricaInfo.habilitacion_activa)}
                      >
                        📝 Evaluar
                      </button>
                        
                        {rubricaInfo.estado !== 'sin_rubrica' && (
                          <button 
                            className="btn-ver-evaluaciones" 
                            onClick={() => handleVerEvaluaciones(grupo.id)}
                            title="Ver evaluaciones"
                            disabled={eliminando}
                          >
                            👁️ Ver
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="estudiantes-table">
                    <div className="table-header-rubricas">
                      <div className="th-numero-rubrica">#</div>
                      <div className="th-codigo-rubrica">Código</div>
                      <div className="th-nombre-rubrica">Nombre Completo</div>
                      <div className="th-estado-rubrica">Estado</div>
                      <div className="th-nota-rubrica">Presentación</div>
                      <div className="th-nota-rubrica">Sustentación</div>
                      <div className="th-nota-rubrica">Documentación</div>
                      <div className="th-nota-rubrica">Innovación</div>
                      <div className="th-nota-rubrica">Nota Final</div>
                    </div>
                    
                    {gruposConEstudiantes[grupo.id] && gruposConEstudiantes[grupo.id].length > 0 ? (
                      <div className="table-body">
                        {gruposConEstudiantes[grupo.id].map((estudiante, index) => {
                          // Buscar si este estudiante tiene un informe
                          const informe = rubricaInfo.informes.find(
                            inf => inf.estudiante_id === estudiante.id
                          );
                          
                          const estadoEstudiante = informe ? 
                            'Evaluado' : 'Sin evaluar';
                            
                          const claseEstado = informe ? 
                            'estado-evaluado' : 'estado-sin-evaluar';
                          
                          // Obtener la rúbrica si existe
                          const rubricaEstudiante = informe && informe.rubrica_id ? rubricas[informe.rubrica_id] : null;
                          
                          // Obtener las notas por área
                          const notaPresentacion = rubricaEstudiante ? rubricaEstudiante.presentacion : null;
                          const notaSustentacion = rubricaEstudiante ? rubricaEstudiante.sustentacion : null;
                          const notaDocumentacion = rubricaEstudiante ? rubricaEstudiante.documentacion : null;
                          const notaInnovacion = rubricaEstudiante ? rubricaEstudiante.innovacion : null;
                          const notaFinal = rubricaEstudiante ? rubricaEstudiante.nota_final : null;
                          
                          // Función para formatear notas
                          const formatearNota = (nota) => {
                            if (nota === null || nota === undefined) return '-';
                            if (typeof nota === 'number') return nota.toFixed(1);
                            if (typeof nota === 'string' && !isNaN(parseFloat(nota))) return parseFloat(nota).toFixed(1);
                            return nota || '-';
                          };
                            
                          return (
                            <div key={estudiante.id} className="table-row-rubricas">
                              <div className="td-numero-rubrica">{index + 1}</div>
                              <div className="td-codigo-rubrica">{estudiante.codigo}</div>
                              <div className="td-nombre-rubrica">{`${estudiante.nombre} ${estudiante.apellido}`}</div>
                              <div className={`td-estado-rubrica ${claseEstado}`}>{estadoEstudiante}</div>
                              <div className="td-nota-rubrica">
                                {informe ? (
                                  <span className="nota-visible-rubrica">{formatearNota(notaPresentacion)}</span>
                                ) : '-'}
                              </div>
                              <div className="td-nota-rubrica">
                                {informe ? (
                                  <span className="nota-visible-rubrica">{formatearNota(notaSustentacion)}</span>
                                ) : '-'}
                              </div>
                              <div className="td-nota-rubrica">
                                {informe ? (
                                  <span className="nota-visible-rubrica">{formatearNota(notaDocumentacion)}</span>
                                ) : '-'}
                              </div>
                              <div className="td-nota-rubrica">
                                {informe ? (
                                  <span className="nota-visible-rubrica">{formatearNota(notaInnovacion)}</span>
                                ) : '-'}
                              </div>
                              <div className="td-nota-rubrica">
                                {informe ? (
                                  <span className="nota-visible-rubrica">{formatearNota(notaFinal)}</span>
                                ) : '-'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="no-estudiantes">
                        <p>No hay estudiantes asignados a este grupo</p>
                        <button 
                          className="btn-asignar-empty" 
                          onClick={() => navigate(`/grupos/asignar?id=${grupo.id}`)}
                        >
                          Asignar estudiantes
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </main>
    </div>
  );
}

export default GestionarEvaluaciones;