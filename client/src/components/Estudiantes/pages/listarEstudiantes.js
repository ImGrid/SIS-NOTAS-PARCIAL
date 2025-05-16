import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/listarEstudiantes.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getEstudiantesConEstadoGrupo } from '../../../service/estudianteService';
import EliminarEstudianteModal from './eliminarEstudiante';

function ListarEstudiantes() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesFiltrados, setEstudiantesFiltrados] = useState([]);
  
  // Estados para filtros
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const estudiantesPorPagina = 25;
  
  // Estado para modal de eliminación
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  
  // Opciones para los filtros
  const carreras = [
    'Ingeniería de Sistemas',
    'Ingeniería de Sistemas Electronicos',
    'Ingeniería Agroindustrial',
    'Ciencias Básicas',
    'Ingeniería Comercial',
    'Ingeniería Civil'
  ];
  
  // Obtener semestres disponibles según la carrera
  const getSemestresDisponibles = (carrera) => {
    // Caso especial para Ciencias Básicas (solo 1er y 2do semestre)
    if (carrera === 'Ciencias Básicas') {
      return [
        { value: '1', label: '1º Semestre' },
        { value: '2', label: '2º Semestre' }
      ];
    }
    
    // Para el resto de carreras (3ro a 10mo)
    return [
      { value: '3', label: '3º Semestre' },
      { value: '4', label: '4º Semestre' },
      { value: '5', label: '5º Semestre' },
      { value: '6', label: '6º Semestre' },
      { value: '7', label: '7º Semestre' },
      { value: '8', label: '8º Semestre' },
      { value: '9', label: '9º Semestre' },
      { value: '10', label: '10º Semestre' }
    ];
  };

  // Cargar estudiantes al iniciar
  useEffect(() => {
    cargarEstudiantes();
  }, []);
  
  const cargarEstudiantes = async () => {
    try {
      setLoading(true);
      // Usar el nuevo método en lugar del original
      const data = await getEstudiantesConEstadoGrupo();
      setEstudiantes(data);
      setEstudiantesFiltrados(data);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
      toast.error('Error al cargar la lista de estudiantes');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros cuando cambian
  useEffect(() => {
    let resultado = [...estudiantes];
    
    // Filtrar por carrera
    if (carreraSeleccionada) {
      resultado = resultado.filter(e => e.carrera === carreraSeleccionada);
    }
    
    // Filtrar por semestre (asegurarse de comparar números con números)
    if (semestreSeleccionado) {
      // Convertir el semestre seleccionado a número para comparar correctamente
      const semestreNum = parseInt(semestreSeleccionado, 10);
      resultado = resultado.filter(e => {
        // Si el semestre en la base de datos ya es un número, comparar directamente
        // Si es un string, intentar extraer el número
        const estudianteSemestre = typeof e.semestre === 'number' 
          ? e.semestre 
          : parseInt(e.semestre, 10);
        return estudianteSemestre === semestreNum;
      });
    }
    
    // Filtrar por término de búsqueda (nombre, apellido o código)
    if (terminoBusqueda) {
      const termino = terminoBusqueda.toLowerCase();
      resultado = resultado.filter(e =>
        (e.nombre && e.nombre.toLowerCase().includes(termino)) ||
        (e.apellido && e.apellido.toLowerCase().includes(termino)) ||
        (e.codigo && e.codigo.toLowerCase().includes(termino))
      );
    }
    
    setEstudiantesFiltrados(resultado);
    // Resetear a la primera página cuando se aplican filtros
    setPaginaActual(1);
  }, [carreraSeleccionada, semestreSeleccionado, terminoBusqueda, estudiantes]);

  // Calcular estudiantes a mostrar en la página actual
  const indexUltimoEstudiante = paginaActual * estudiantesPorPagina;
  const indexPrimerEstudiante = indexUltimoEstudiante - estudiantesPorPagina;
  const estudiantesActuales = estudiantesFiltrados.slice(
    indexPrimerEstudiante,
    indexUltimoEstudiante
  );

  // Calcular número total de páginas
  const totalPaginas = Math.ceil(estudiantesFiltrados.length / estudiantesPorPagina);

  // Generar números de página para la paginación
  const numeroPaginas = [];
  for (let i = 1; i <= totalPaginas; i++) {
    numeroPaginas.push(i);
  }

  // Función para cambiar de página
  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  // Manejar cambio en filtro de carrera
  const handleCarreraChange = (e) => {
    setCarreraSeleccionada(e.target.value);
    // Resetear el semestre seleccionado cuando se cambia la carrera
    setSemestreSeleccionado('');
  };

  // Manejar cambio en filtro de semestre
  const handleSemestreChange = (e) => {
    setSemestreSeleccionado(e.target.value);
  };

  // Manejar cambio en término de búsqueda
  const handleSearchChange = (e) => {
    setTerminoBusqueda(e.target.value);
  };

  // Función para limpiar todos los filtros
  const limpiarFiltros = () => {
    setCarreraSeleccionada('');
    setSemestreSeleccionado('');
    setTerminoBusqueda('');
  };

  // Redirigir a página de crear estudiante
  const irACrearEstudiante = () => {
    navigate('/estudiantes/crear');
  };
  
  // Redirigir a página de editar estudiante
  const irAEditarEstudiante = (id) => {
    navigate(`/estudiantes/editar/${id}`);
  };
  
  // Abrir modal de confirmación para eliminar estudiante
  const mostrarConfirmacionEliminar = (estudiante) => {
    setEstudianteSeleccionado(estudiante);
    setMostrarModalEliminar(true);
  };
  
  // Cerrar modal de confirmación
  const cerrarModalEliminar = () => {
    setMostrarModalEliminar(false);
    setEstudianteSeleccionado(null);
  };
  
  // Manejar eliminación exitosa
  const manejarEliminacionExitosa = () => {
    // Recargar lista de estudiantes
    cargarEstudiantes();
    // Mostrar mensaje de éxito
    toast.success('Estudiante eliminado con éxito');
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
    if (numeroPaginas.includes(1)) mostrarNumeros.push(1);
    
    // Mostrar elipsis antes si la página actual es mayor a 3
    if (paginaActual > 3) mostrarNumeros.push('...');
    
    // Mostrar la página anterior si existe y no es la primera
    if (paginaActual > 2) mostrarNumeros.push(paginaActual - 1);
    
    // Mostrar la página actual si no es la primera ni la última
    if (paginaActual !== 1 && paginaActual !== totalPaginas) mostrarNumeros.push(paginaActual);
    
    // Mostrar la página siguiente si existe y no es la última
    if (paginaActual < totalPaginas - 1) mostrarNumeros.push(paginaActual + 1);
    
    // Mostrar elipsis después si la página actual es menor a la última página - 2
    if (paginaActual < totalPaginas - 2) mostrarNumeros.push('...');
    
    // Siempre mostrar la última página si hay más de una página
    if (numeroPaginas.includes(totalPaginas) && totalPaginas !== 1) mostrarNumeros.push(totalPaginas);
    
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

  // Renderizar la fila de acciones para cada estudiante con SVG
  const renderAccionesEstudiante = (estudiante) => {
    return (
      <div className="acciones-estudiante">
        <button 
          className="btn-accion btn-editar" 
          onClick={() => irAEditarEstudiante(estudiante.id)}
          title="Editar estudiante"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button 
          className="btn-accion btn-eliminar" 
          onClick={() => mostrarConfirmacionEliminar(estudiante)}
          title="Eliminar estudiante"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
        </button>
      </div>
    );
  };

  // Obtener semestres disponibles para filtro según carrera seleccionada
  const semestresDisponibles = carreraSeleccionada 
    ? getSemestresDisponibles(carreraSeleccionada)
    : [...getSemestresDisponibles('Ingeniería de Sistemas'), ...getSemestresDisponibles('Ciencias Básicas')].filter((v, i, a) => 
        a.findIndex(t => t.value === v.value) === i
      );

  return (
    <Layout>
      <div className="estudiante-list-styles" style={{width: '100%'}}>
        <div className="estudiantes-container">
          <ToastContainer position="top-right" autoClose={3000} />
          
          <div className="estudiantes-header">
            <h1>Lista de Estudiantes</h1>
            <button className="btn-crear-estudiante" onClick={irACrearEstudiante}>
              + Registrar Nuevo Estudiante
            </button>
          </div>
          
          <div className="content-container">
            <div className="filtros-container">
              <div className="filtros-grupo">
                <div className="filtro">
                  <label htmlFor="carrera-filter">Carrera:</label>
                  <select
                    id="carrera-filter"
                    value={carreraSeleccionada}
                    onChange={handleCarreraChange}
                  >
                    <option value="">Todas las carreras</option>
                    {carreras.map((carrera, index) => (
                      <option key={index} value={carrera}>
                        {carrera}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="filtro">
                  <label htmlFor="semestre-filter">Semestre:</label>
                  <select
                    id="semestre-filter"
                    value={semestreSeleccionado}
                    onChange={handleSemestreChange}
                  >
                    <option value="">Todos los semestres</option>
                    {semestresDisponibles.map((semestre) => (
                      <option key={semestre.value} value={semestre.value}>
                        {semestre.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                  Limpiar Filtros
                </button>
              </div>
              
              <div className="busqueda-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre o código..."
                  value={terminoBusqueda}
                  onChange={handleSearchChange}
                  className="busqueda-input"
                />
              </div>
            </div>
            
            {loading ? (
              <div className="loading-indicator">Cargando estudiantes...</div>
            ) : estudiantesFiltrados.length > 0 ? (
              <>
                <div className="tabla-header">
                  {renderPaginacion()}
                  <div className="resultados-info">
                    Mostrando {estudiantesActuales.length} de {estudiantesFiltrados.length} estudiantes
                  </div>
                </div>
                
                <div className="estudiantes-table-container">
                  <table className="estudiantes-table">
                    <thead>
                      <tr>
                        <th className="col-num">#</th>
                        <th className="col-codigo">Código</th>
                        <th className="col-nombre">Nombre Completo</th>
                        <th className="col-carrera">Carrera</th>
                        <th className="col-semestre">Semestre</th>
                        <th className="col-grupo">Grupo</th>
                        <th className="col-acciones">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesActuales.map((estudiante, index) => (
                        <tr key={estudiante.id} className="estudiante-row">
                          <td className="col-num">{indexPrimerEstudiante + index + 1}</td>
                          <td className="col-codigo">{estudiante.codigo}</td>
                          <td className="col-nombre">{`${estudiante.nombre} ${estudiante.apellido}`}</td>
                          <td className="col-carrera">{estudiante.carrera}</td>
                          <td className="col-semestre">{estudiante.semestre}º Semestre</td>
                          <td className="col-grupo">
                            {estudiante.en_grupo_del_docente ? (
                              <span className="badge badge-success">Asignado</span>
                            ) : (
                              <span className="badge badge-warning">Sin grupo</span>
                            )}
                          </td>
                          <td className="col-acciones">
                            {renderAccionesEstudiante(estudiante)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="paginacion-container paginacion-bottom">
                  {renderPaginacion()}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>No se encontraron estudiantes con los criterios seleccionados.</p>
                {(carreraSeleccionada || semestreSeleccionado || terminoBusqueda) && (
                  <button className="btn-limpiar-filtros" onClick={limpiarFiltros}>
                    Limpiar Filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de eliminación */}
      {mostrarModalEliminar && (
        <EliminarEstudianteModal 
          estudiante={estudianteSeleccionado}
          onClose={cerrarModalEliminar}
          onEliminar={manejarEliminacionExitosa}
        />
      )}
    </Layout>
  );
}

export default ListarEstudiantes;