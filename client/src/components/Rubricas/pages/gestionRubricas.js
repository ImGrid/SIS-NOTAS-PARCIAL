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

// SVG Icons
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
  ),
  download: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  evaluar: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  ),
  ver: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
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
  
  // Estado para carreras asignadas al docente
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [semestroFilter, setSemestroFilter] = useState('');
  const [carreraFilter, setCarreraFilter] = useState('');
  const [materiaFilter, setMateriaFilter] = useState('');

  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const gruposPorPagina = 5; // Puedes ajustar este valor según tus necesidades

  const navigate = useNavigate();

  // Función para obtener las carreras del docente desde sessionStorage
  const obtenerCarrerasDocente = () => {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        if (usuario && usuario.carreras && Array.isArray(usuario.carreras)) {
          return usuario.carreras;
        }
      }
      return [];
    } catch (error) {
      console.error("Error al obtener carreras del docente:", error);
      return [];
    }
  };

  // Cargar grupos y sus estados al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);
        
        // Obtener carreras asignadas al docente
        const carreras = obtenerCarrerasDocente();
        setCarrerasAsignadas(carreras);
        
        // Si no hay carreras asignadas, mostrar mensaje
        if (carreras.length === 0) {
          setError("No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.");
          setLoading(false);
          return;
        }

        const gruposData = await getMisGrupos();
        
        // Filtrar grupos para mostrar solo los de las carreras asignadas
        const gruposFiltrados = gruposData.filter(grupo => 
          carreras.includes(grupo.carrera)
        );
        
        setGrupos(gruposFiltrados);

        const estudiantesPorGrupo = {};
        const rubricasPorGrupo = {};
        const rubricasData = {};

        for (const grupo of gruposFiltrados) {
          const estudiantes = await getEstudiantesByGrupoId(grupo.id);
          estudiantesPorGrupo[grupo.id] = estudiantes;

          const informes = await getInformesPorGrupoId(grupo.id);

          // Crear un mapa para almacenar solo el informe más reciente por estudiante
          const informesPorEstudiante = {};
          for (const informe of informes) {
            // Almacenar solo el informe con el ID más alto (presumiblemente el más reciente)
            if (!informesPorEstudiante[informe.estudiante_id] || 
                informesPorEstudiante[informe.estudiante_id].id < informe.id) {
              informesPorEstudiante[informe.estudiante_id] = informe;
            }
          }

          // Convertir el mapa de vuelta a un array
          const informesFiltrados = Object.values(informesPorEstudiante);

          for (const informe of informesFiltrados) {
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

          // Usar los informes filtrados en lugar de los originales
          if (informesFiltrados.length === 0) {
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
          } else if (informesFiltrados.length < estudiantes.length) {
            rubricasPorGrupo[grupo.id] = {
              estado: 'pendiente', 
              texto: 'Pendiente',
              informes: informesFiltrados
            };
          } else {
            rubricasPorGrupo[grupo.id] = {
              estado: 'finalizado', 
              texto: 'Finalizado',
              informes: informesFiltrados
            };
          }

          try {
            const detallesGrupo = await supRubricaService.obtenerRubricasGrupo(grupo.id);

            // Si hay habilitación activa, cambiar el estado visual
            if (detallesGrupo.grupo.habilitacion_activa) {
              rubricasPorGrupo[grupo.id] = {
                ...rubricasPorGrupo[grupo.id],
                estado: 'pendiente_habilitado',
                texto: 'Habilitado para edición',
                habilitacion_activa: true
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
    // Solo mostrar las carreras asignadas al docente
    return [...new Set(carrerasAsignadas)].sort();
  };

  const getMateriasUnicas = () => {
    const materiasArray = grupos
      .filter(g => !carreraFilter || g.carrera === carreraFilter) // Mostrar materias solo de la carrera filtrada actual, si hay filtro
      .map(g => g.materia)
      .filter(Boolean);
    
    return [...new Set(materiasArray)].sort();
  };

  // Filtrar grupos
  const gruposFiltrados = grupos.filter(grupo => {
    // Solo incluir grupos de carreras asignadas al docente
    if (!carrerasAsignadas.includes(grupo.carrera)) {
      return false;
    }
    
    const matchesSearch = grupo.nombre_proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          grupo.carrera.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (grupo.materia && grupo.materia.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesSemestre = !semestroFilter || grupo.semestre.toString() === semestroFilter;
    const matchesCarrera = !carreraFilter || grupo.carrera === carreraFilter;
    const matchesMateria = !materiaFilter || grupo.materia === materiaFilter;

    return matchesSearch && matchesSemestre && matchesCarrera && matchesMateria;
  });

  // Calcular grupos a mostrar en la página actual
  const indexUltimoGrupo = paginaActual * gruposPorPagina;
  const indexPrimerGrupo = indexUltimoGrupo - gruposPorPagina;
  const gruposActuales = gruposFiltrados.slice(indexPrimerGrupo, indexUltimoGrupo);

  // Calcular número total de páginas
  const totalPaginas = Math.ceil(gruposFiltrados.length / gruposPorPagina);

  // Función para cambiar de página
  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  // Función para ir a la página anterior
  const irPaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1);
    }
  };

  // Función para ir a la página siguiente
  const irPaginaSiguiente = () => {
    if (paginaActual < totalPaginas) {
      setPaginaActual(paginaActual + 1);
    }
  };

  // Renderizar controles de paginación
  const renderPaginacion = () => {
    // Solo mostrar paginación si hay más de una página
    if (totalPaginas <= 1) return null;

    // Determinar cuántos números de página mostrar
    const mostrarNumeros = [];

    // Siempre mostrar la primera página
    if (paginaActual > 1) mostrarNumeros.push(1);

    // Mostrar elipsis antes si la página actual es mayor a 3
    if (paginaActual > 3) mostrarNumeros.push('...');

    // Mostrar la página anterior si existe y no es la primera
    if (paginaActual > 2) mostrarNumeros.push(paginaActual - 1);

    // Mostrar la página actual
    mostrarNumeros.push(paginaActual);

    // Mostrar la página siguiente si existe y no es la última
    if (paginaActual < totalPaginas - 1) mostrarNumeros.push(paginaActual + 1);

    // Mostrar elipsis después si la página actual es menor a la última página - 2
    if (paginaActual < totalPaginas - 2) mostrarNumeros.push('...');

    // Siempre mostrar la última página si hay más de una página
    if (paginaActual < totalPaginas) mostrarNumeros.push(totalPaginas);

    return (
      <div className="paginacion-container">
        <button 
          className="btn-pagina" 
          onClick={irPaginaAnterior}
          disabled={paginaActual === 1}
        >
          &laquo;
        </button>

        {mostrarNumeros.map((numero, index) => (
          numero === '...' ? (
            <span key={`ellipsis-${index}`} className="pagina-ellipsis">...</span>
          ) : (
            <button
              key={`page-${numero}`}
              className={`btn-pagina ${paginaActual === numero ? 'active' : ''}`}
              onClick={() => cambiarPagina(numero)}
            >
              {numero}
            </button>
          )
        ))}

        <button 
          className="btn-pagina" 
          onClick={irPaginaSiguiente}
          disabled={paginaActual === totalPaginas}
        >
          &raquo;
        </button>
      </div>
    );
  };

  // Función para limpiar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSemestroFilter('');
    setCarreraFilter('');
    setMateriaFilter('');
    // También reseteamos la paginación al cambiar los filtros
    setPaginaActual(1);
  };


  const handleEvaluarGrupo = async (grupoId, estado) => {
    // Verificar si el grupo pertenece a una carrera asignada al docente
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo || !carrerasAsignadas.includes(grupo.carrera)) {
      toast.error("No tiene permisos para evaluar este grupo");
      return;
    }
    
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
        // En caso de error, asumir que no está habilitado por seguridad
        toast.warning('Este grupo ya ha sido evaluado y la evaluación ha sido finalizada. No es posible modificar evaluaciones finalizadas.');
        return;
      }
    }

    // Si no está finalizado, permitir acceso
    navigate(`/evaluaciones/evaluar?grupo=${grupoId}`);
  };

  const handleVerEvaluaciones = (grupoId) => {
    // Verificar si el grupo pertenece a una carrera asignada al docente
    const grupo = grupos.find(g => g.id === grupoId);
    if (!grupo || !carrerasAsignadas.includes(grupo.carrera)) {
      toast.error("No tiene permisos para ver las evaluaciones de este grupo");
      return;
    }
    
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

  // Función para exportar (antes llamada imprimir)
  const handleExportar = async () => {
    try {
      toast.info('Preparando la exportación de evaluaciones...');
      await exportarTodasLasEvaluaciones(true);
      toast.success('Exportación completada. El archivo se ha descargado.');
    } catch (error) {
      console.error('Error al exportar evaluaciones:', error);
      toast.error(`Error al exportar evaluaciones: ${error.message || 'Error desconocido'}`);
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
                className="ev-btn-descargar"
                onClick={handleExportar}
              >
                {icons.download}
                <span>Descargar</span>
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
                className="ev-btn-descargar"
                onClick={handleExportar}
              >
                {icons.download}
                <span>Descargar</span>
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

  // Si no hay carreras asignadas, mostrar mensaje apropiado
  if (carrerasAsignadas.length === 0) {
    return (
      <div className="docentes-container">
        <Sidebar />
        <main className="content content-with-sidebar evaluaciones-styles">
          <div className="grupos-header">
            <div className="ev-titulo-botones-container">
              <h1>Gestionar Evaluaciones</h1>
            </div>
          </div>
          <div className="grupos-container">
            <div className="error-message">
              No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content content-with-sidebar evaluaciones-styles">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="grupos-header">
          <div className="ev-titulo-botones-container">
            <h1>Gestionar Evaluaciones</h1>
            <button 
              className="ev-btn-descargar"
              onClick={handleExportar}
              title="Descargar todas las evaluaciones"
            >
              {icons.download}
              <span>Descargar</span>
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
            <div className="search-filters-row">
              {/* Barra de búsqueda */}
              <div className="search-input-container">
                <label className="search-label">BÚSQUEDA</label>
                <div className="search-input-field">
                  {icons.search}
                  <input
                    type="text"
                    placeholder="Buscar por nombre de proyecto, carrera o materia..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPaginaActual(1);
                    }}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setPaginaActual(1);
                      }} 
                      className="clear-search"
                      title="Limpiar búsqueda"
                    >
                      {icons.clear}
                    </button>
                  )}
                </div>
              </div>

              {/* Filtro de semestres */}
              <div className="filter-container">
                <label className="filter-label">SEMESTRE</label>
                <select 
                  value={semestroFilter} 
                  onChange={(e) => {
                    setSemestroFilter(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todos los semestres</option>
                  {getSemestrosUnicos().map(semestre => (
                    <option key={semestre} value={semestre}>
                      Semestre {semestre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de carreras - Mostrar solo las asignadas al docente */}
              <div className="filter-container">
                <label className="filter-label">CARRERA</label>
                <select 
                  value={carreraFilter} 
                  onChange={(e) => {
                    setCarreraFilter(e.target.value);
                    setPaginaActual(1);
                    // Si cambia la carrera, resetear el filtro de materia
                    setMateriaFilter('');
                  }}
                  className="filter-select"
                >
                  <option value="">Todas mis carreras</option>
                  {getCarrerasUnicas().map(carrera => (
                    <option key={carrera} value={carrera}>
                      {carrera}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de materias */}
              <div className="filter-container">
                <label className="filter-label">MATERIA</label>
                <select 
                  value={materiaFilter} 
                  onChange={(e) => {
                    setMateriaFilter(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todas las materias</option>
                  {getMateriasUnicas().map(materia => (
                    <option key={materia} value={materia}>
                      {materia}
                    </option>
                  ))}
                </select>
              </div>

              {/* Botón X para limpiar todos los filtros */}
              <button 
                onClick={clearFilters} 
                className="clear-filters"
                title="Limpiar todos los filtros"
              >
                X
              </button>
            </div>
          </div>

          {/* Paginación superior y contador de resultados */}
          <div className="tabla-header">
            {renderPaginacion()}
            {(searchTerm || semestroFilter || carreraFilter || materiaFilter) && (
              <div className="resultados-info">
                Mostrando {gruposActuales.length} de {gruposFiltrados.length} grupos
              </div>
            )}
          </div>

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
              {gruposActuales.map((grupo) => {
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
                          {icons.evaluar}
                          <span>Evaluar</span>
                        </button>

                        {rubricaInfo.estado !== 'sin_rubrica' && (
                          <button 
                            className="btn-ver-evaluaciones" 
                            onClick={() => handleVerEvaluaciones(grupo.id)}
                            title="Ver evaluaciones"
                            disabled={eliminando}
                          >
                            {icons.ver}
                            <span>Ver</span>
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

          {/* Paginación inferior */}
          <div className="paginacion-container paginacion-bottom">
            {renderPaginacion()}
          </div>
        </div>
      </main>
    </div>
  );
}
export default GestionarEvaluaciones;