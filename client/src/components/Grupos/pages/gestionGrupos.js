// src/pages/GestionGrupos.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/gestionGrupos.css';
import { getMisGrupos, deleteGrupo } from '../../../service/grupoService';
import { 
  getEstudiantesByGrupoId, 
  desasignarEstudianteDeGrupo
} from '../../../service/estudianteService';
import informeService from '../../../service/informeService';
import borradorService from '../../../service/borradorService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ConfirmationModal from '../pages/Confirmar';

// SVG Icons
const icons = {
  add: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="16"></line>
      <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
  ),
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  edit: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
  ),
  trash: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  ),
  search: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
  ),
  clear: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

function GestionGrupos() {
  const [grupos, setGrupos] = useState([]);
  const [gruposConEstudiantes, setGruposConEstudiantes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [semestroFilter, setSemestroFilter] = useState('');
  const [carreraFilter, setCarreraFilter] = useState('');
  const [materiaFilter, setMateriaFilter] = useState('');
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const gruposPorPagina = 5; // Puedes ajustar este valor según tus necesidades

  // Estados para el modal de confirmación
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoToDelete, setGrupoToDelete] = useState(null);

  // Función para cargar los grupos
  const cargarGrupos = async () => {
    try {
      setLoading(true);
      const data = await getMisGrupos();
      setGrupos(data);
      
      // Obtener estudiantes para cada grupo
      const estudiantesPorGrupo = {};
      for (const grupo of data) {
        const estudiantes = await getEstudiantesByGrupoId(grupo.id);
        estudiantesPorGrupo[grupo.id] = estudiantes;
      }
      setGruposConEstudiantes(estudiantesPorGrupo);
      
      setError(null);
    } catch (err) {
      console.error("Error al cargar mis grupos:", err);
      setError("No se pudieron cargar sus grupos. Por favor, intente nuevamente más tarde.");
      toast.error("No se pudieron cargar sus grupos. Por favor, intente nuevamente más tarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarGrupos();
  }, []);

  // Obtener valores únicos para filtros
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

  // Función para redirigir a la página de creación de grupos
  const handleCrearGrupo = () => {
    navigate('/grupos/crear');
  };

  // Función para redirigir a la página de edición de grupo
  const handleEditarGrupo = (grupoId) => {
    navigate(`/grupos/editar/${grupoId}`);
  };

  // Función para redirigir a la página de asignación de estudiantes
  const handleAsignarEstudiantes = (grupoId) => {
    navigate(`/grupos/asignar?id=${grupoId}`);
  };

  // Función para desasignar estudiantes de un grupo
  const desasignarEstudiantesDeGrupo = async (grupoId) => {
    try {
      const estudiantes = await getEstudiantesByGrupoId(grupoId);
      
      if (estudiantes.length === 0) {
        return true;
      }
      
      // Para cada estudiante, usar la nueva función de desasignación
      for (const estudiante of estudiantes) {
        await desasignarEstudianteDeGrupo(estudiante.id, grupoId);
      }
      
      return true;
    } catch (err) {
      console.error("Error al desasignar estudiantes del grupo:", err);
      return false;
    }
  };

  // Función para abrir el modal de confirmación
  const handleEliminarGrupo = (grupoId) => {
    setGrupoToDelete(grupoId);
    setModalOpen(true);
  };

  // Función para procesar la confirmación de eliminación
  const confirmDelete = async () => {
    if (!grupoToDelete) return;
    
    try {
      setLoading(true);
  
      // Eliminar rúbricas si es necesario
      await informeService.eliminarRubricasGrupo(grupoToDelete);
      
      // Eliminar borradores si existen
      try {
        const docenteId = sessionStorage.getItem('usuario') ? 
          JSON.parse(sessionStorage.getItem('usuario')).id : null;
          
        if (docenteId) {
          await borradorService.eliminarBorradorPorDocenteYGrupo(docenteId, grupoToDelete);
        }
      } catch (error) {
        // Solo registrar errores graves que no sean "no encontrado"
        if (!error.message?.includes('no encontrado') && !error.message?.includes('404')) {
          console.error('Error al eliminar borradores:', error);
        }
      }
      
      // Eliminar el grupo
      await deleteGrupo(grupoToDelete);
      
      toast.success('Grupo Eliminado');
      
      // Actualizar la lista de grupos después de eliminar
      cargarGrupos();
    } catch (err) {
      console.error("Error al eliminar el grupo:", err);
      toast.error("No se pudo eliminar el grupo: " + (err.message || "Error desconocido"));
    } finally {
      setLoading(false);
      // Cerrar el modal y limpiar el estado
      setModalOpen(false);
      setGrupoToDelete(null);
    }
  };

  // Función para cancelar la eliminación
  const cancelDelete = () => {
    setModalOpen(false);
    setGrupoToDelete(null);
  };

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="grupo-gestion-styles">
        <div className="grupos-header">
          <h1>Gestión de Grupos</h1>
          <button className="btn-crear-grupo" onClick={handleCrearGrupo}>
            {icons.add}
            <span>Crear Nuevo Grupo</span>
          </button>
        </div>
        
        <div className="grupos-container">
          {/* Barra de búsqueda y filtros en una sola línea */}
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
              
              {/* Filtro de carreras */}
              <div className="filter-container">
                <label className="filter-label">CARRERA</label>
                <select 
                  value={carreraFilter} 
                  onChange={(e) => {
                    setCarreraFilter(e.target.value);
                    setPaginaActual(1);
                  }}
                  className="filter-select"
                >
                  <option value="">Todas las carreras</option>
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
          
          {loading ? (
            <div className="loading-indicator">Cargando sus grupos...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="empty-state">
              {grupos.length === 0 ? (
                <>
                  <p>No tiene grupos asignados actualmente.</p>
                  <button className="btn-crear-grupo-empty" onClick={handleCrearGrupo}>
                    Crear su primer grupo
                  </button>
                </>
              ) : (
                <p>No se encontraron grupos con los filtros aplicados.</p>
              )}
            </div>
          ) : (
            <div className="grupos-table-container">
              {gruposActuales.map((grupo) => (
                <div key={grupo.id} className="grupo-card-table">
                  <div className="grupo-header-row">
                    <div className="grupo-title">
                      <h3>{grupo.nombre_proyecto}</h3>
                      <span className="grupo-details">
                        {grupo.carrera} | Semestre {grupo.semestre} | {grupo.materia || 'Sin materia'}
                      </span>
                    </div>
                    <div className="grupo-actions">
                      <button 
                        className="btn-asignar" 
                        onClick={() => handleAsignarEstudiantes(grupo.id)}
                        title="Asignar estudiantes"
                      >
                        {icons.users}
                        <span>Asignar</span>
                      </button>
                      <button 
                        className="btn-editar" 
                        onClick={() => handleEditarGrupo(grupo.id)}
                        title="Editar grupo"
                      >
                        {icons.edit}
                        <span>Editar</span>
                      </button>
                      <button 
                        className="btn-eliminar" 
                        onClick={() => handleEliminarGrupo(grupo.id)}
                        title="Eliminar grupo"
                      >
                        {icons.trash}
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="estudiantes-table">
                    <div className="table-header">
                      <div className="th-numero">#</div>
                      <div className="th-codigo">Código</div>
                      <div className="th-nombre">Nombre Completo</div>
                      <div className="th-semestre">Semestre</div>
                    </div>
                    
                    {gruposConEstudiantes[grupo.id] && gruposConEstudiantes[grupo.id].length > 0 ? (
                      <div className="table-body">
                        {gruposConEstudiantes[grupo.id].map((estudiante, index) => (
                          <div key={estudiante.id} className="table-row">
                            <div className="td-numero">{index + 1}</div>
                            <div className="td-codigo">{estudiante.codigo}</div>
                            <div className="td-nombre">{`${estudiante.nombre} ${estudiante.apellido}`}</div>
                            <div className="td-semestre">{estudiante.semestre}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-estudiantes">
                        <p>No hay estudiantes asignados a este grupo</p>
                        <button 
                          className="btn-asignar-empty" 
                          onClick={() => handleAsignarEstudiantes(grupo.id)}
                        >
                          {icons.users}
                          <span>Asignar estudiantes</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Paginación inferior */}
          <div className="paginacion-container paginacion-bottom">
            {renderPaginacion()}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <ConfirmationModal
        isOpen={modalOpen}
        title="Eliminar Grupo"
        message="¿Está seguro que desea eliminar este grupo? Se eliminarán TODAS las evaluaciones, informes, rúbricas y calificaciones asociadas, y los estudiantes quedarán sin grupo."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        type="danger"
      />
    </Layout>
  );
}

export default GestionGrupos;