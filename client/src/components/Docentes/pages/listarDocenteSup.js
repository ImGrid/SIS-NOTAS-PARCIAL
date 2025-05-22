// src/components/Supervisor/pages/listarDocentesAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import '../style/listarDocente.css'; // Importamos el archivo CSS que ya hemos creado
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getDocentes } from '../../../service/docenteService';
import { getSupervisorById } from '../../../service/supervisorService';
import EliminarDocenteModal from './eliminarDocenteSup';

function ListarDocentesAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState([]);
  const [docentesFiltrados, setDocentesFiltrados] = useState([]);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  
  // Estados para el supervisor y sus carreras
  const [supervisor, setSupervisor] = useState(null);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  
  // Estado para filtro de búsqueda
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const docentesPorPagina = 10;

  // Cargar datos del supervisor y docentes al iniciar
  useEffect(() => {
    cargarDatosSupervisor();
  }, []);

  // Cargar datos del supervisor desde sessionStorage o servidor
  const cargarDatosSupervisor = async () => {
    try {
      setLoading(true);
      
      // Obtener datos del supervisor desde sessionStorage
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        setSupervisor(usuario);
        
        // Obtener carreras asignadas desde el objeto de usuario
        let carrerasDelSupervisor = [];
        if (usuario.carreras && Array.isArray(usuario.carreras)) {
          carrerasDelSupervisor = usuario.carreras;
        } else if (usuario.id) {
          // Si no hay carreras en el objeto de usuario, intentar obtenerlas desde el servidor
          try {
            const supervisorData = await getSupervisorById(usuario.id);
            if (supervisorData && supervisorData.carreras) {
              carrerasDelSupervisor = supervisorData.carreras;
            } else {
              toast.error('No se pudieron obtener las carreras asignadas al supervisor');
              setLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error al obtener datos del supervisor:', error);
            toast.error('Error al cargar datos del supervisor');
            setLoading(false);
            return;
          }
        }
        
        setCarrerasAsignadas(carrerasDelSupervisor);
        
        // Cargar docentes después de obtener las carreras
        await cargarDocentes(carrerasDelSupervisor);
      } else {
        toast.error('No se encontraron datos del supervisor. Por favor, inicie sesión nuevamente.');
        navigate('/login');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos del supervisor:', error);
      toast.error('Error al cargar los datos. Por favor, intente de nuevo más tarde.');
      setLoading(false);
    }
  };
  
  const cargarDocentes = async (carrerasDelSupervisor = carrerasAsignadas) => {
    try {
      setLoading(true);
      
      // Obtener todos los docentes (el backend ya filtra por carreras del supervisor autenticado)
      const data = await getDocentes();
      
      // Filtro adicional en el frontend por seguridad
      // Solo mostrar docentes que tengan al menos una carrera en común con el supervisor
      let docentesFiltradosBackend = data;
      
      if (carrerasDelSupervisor && carrerasDelSupervisor.length > 0) {
        docentesFiltradosBackend = data.filter(docente => {
          // Si el docente no tiene carreras asignadas, no mostrarlo
          if (!docente.carreras || !Array.isArray(docente.carreras) || docente.carreras.length === 0) {
            return false;
          }
          
          // Verificar si hay al menos una carrera en común
          const tieneCarreraEnComun = docente.carreras.some(carreraDocente => 
            carrerasDelSupervisor.includes(carreraDocente)
          );
          
          return tieneCarreraEnComun;
        });
      }
      
      setDocentes(docentesFiltradosBackend);
      setDocentesFiltrados(docentesFiltradosBackend);
      
    } catch (error) {
      console.error('Error al cargar docentes:', error);
      toast.error('Error al cargar la lista de docentes');
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtro cuando cambia el término de búsqueda
  useEffect(() => {
    if (terminoBusqueda) {
      const termino = terminoBusqueda.toLowerCase();
      const resultado = docentes.filter(d =>
        (d.nombre_completo && d.nombre_completo.toLowerCase().includes(termino)) ||
        (d.correo_electronico && d.correo_electronico.toLowerCase().includes(termino)) ||
        (d.cargo && d.cargo.toLowerCase().includes(termino)) ||
        (d.carreras && d.carreras.some(carrera => carrera.toLowerCase().includes(termino)))
      );
      setDocentesFiltrados(resultado);
    } else {
      setDocentesFiltrados([...docentes]);
    }
    // Resetear a la primera página cuando se aplican filtros
    setPaginaActual(1);
  }, [terminoBusqueda, docentes]);

  // Calcular docentes a mostrar en la página actual
  const indexUltimoDocente = paginaActual * docentesPorPagina;
  const indexPrimerDocente = indexUltimoDocente - docentesPorPagina;
  const docentesActuales = docentesFiltrados.slice(
    indexPrimerDocente,
    indexUltimoDocente
  );

  // Calcular número total de páginas
  const totalPaginas = Math.ceil(docentesFiltrados.length / docentesPorPagina);

  // Generar números de página para la paginación
  const numeroPaginas = [];
  for (let i = 1; i <= totalPaginas; i++) {
    numeroPaginas.push(i);
  }

  // Función para cambiar de página
  const cambiarPagina = (numeroPagina) => {
    setPaginaActual(numeroPagina);
  };

  // Manejar cambio en término de búsqueda
  const handleSearchChange = (e) => {
    setTerminoBusqueda(e.target.value);
  };

  // Función para limpiar el filtro
  const limpiarFiltro = () => {
    setTerminoBusqueda('');
  };

  // Redirigir a página de crear docente
  const irACrearDocente = () => {
    navigate('/adm/personal/crear');
  };

  // Redirigir a página de editar docente
  const irAEditarDocente = (id) => {
    navigate(`/adm/personal/editar/${id}`);
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

  // Abrir modal de confirmación para eliminar docente
  const mostrarConfirmacionEliminar = (docente) => {
    // Verificar si el docente pertenece a alguna carrera del supervisor
    const tieneAcceso = docente.carreras && docente.carreras.some(carrera => 
      carrerasAsignadas.includes(carrera)
    );
    
    if (!tieneAcceso) {
      toast.error('No tiene permisos para eliminar este docente');
      return;
    }
    
    setDocenteSeleccionado(docente);
    setMostrarModalEliminar(true);
  };
  
  // Cerrar modal de confirmación
  const cerrarModalEliminar = () => {
    setMostrarModalEliminar(false);
    setDocenteSeleccionado(null);
  };
  
  // Manejar eliminación exitosa
  const manejarEliminacionExitosa = () => {
    // Recargar lista de docentes
    cargarDocentes();
    // Mostrar mensaje de éxito
    toast.success('Docente eliminado con éxito');
  };

  // Verificar si el supervisor tiene acceso a editar un docente
  const puedeEditarDocente = (docente) => {
    if (!carrerasAsignadas || carrerasAsignadas.length === 0) {
      return true; // Si no hay restricciones, permitir edición
    }
    
    // Verificar si hay al menos una carrera en común
    return docente.carreras && docente.carreras.some(carrera => 
      carrerasAsignadas.includes(carrera)
    );
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

  // Renderizar la fila de acciones para cada docente con SVG
  const renderAccionesDocente = (docente) => {
    const puedeEditar = puedeEditarDocente(docente);
    
    return (
      <div className="acciones-docente">
        <button 
          className={`btn-accion btn-editar ${!puedeEditar ? 'disabled' : ''}`}
          onClick={() => puedeEditar ? irAEditarDocente(docente.id) : null}
          title={puedeEditar ? "Editar docente" : "No tiene permisos para editar este docente"}
          disabled={!puedeEditar}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button 
          className={`btn-accion btn-eliminar ${!puedeEditar ? 'disabled' : ''}`}
          onClick={() => puedeEditar ? mostrarConfirmacionEliminar(docente) : null}
          title={puedeEditar ? "Eliminar docente" : "No tiene permisos para eliminar este docente"}
          disabled={!puedeEditar}
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
  
  // Renderizar las carreras de un docente con indicador de acceso
  const renderCarrerasDocente = (docente) => {
    if (!docente.carreras || !Array.isArray(docente.carreras) || docente.carreras.length === 0) {
      return <span className="sin-carreras">Sin carreras asignadas</span>;
    }
    
    return (
      <div className="carreras-lista">
        {docente.carreras.map((carrera, index) => {
          const tieneAcceso = carrerasAsignadas.includes(carrera);
          return (
            <span 
              key={index} 
              className={`carrera-item ${tieneAcceso ? 'carrera-acceso' : 'carrera-sin-acceso'}`}
              title={tieneAcceso ? 'Carrera bajo su supervisión' : 'Carrera fuera de su supervisión'}
            >
              {carrera}
              {tieneAcceso && <span className="indicador-acceso">✓</span>}
            </span>
          );
        })}
      </div>
    );
  };

  // Renderizar información del supervisor
  const renderInfoSupervisor = () => {
    if (!supervisor || !carrerasAsignadas || carrerasAsignadas.length === 0) {
      return null;
    }
  };

  return (
    <LayoutSup>
      {/* Añadir la clase de namespace para aislar estilos */}
      <div className="docente-admin-list-styles">
        <div className="docentes-admin-container">
          <ToastContainer position="top-right" autoClose={3000} />
          
          <div className="docentes-admin-header">
            <h1>Administración de Docentes</h1>
            {renderInfoSupervisor()}
            <button className="btn-crear-docente" onClick={irACrearDocente}>
              + Registrar Nuevo Docente
            </button>
          </div>
          
          <div className="content-container">
            <div className="filtros-container">
              <div className="busqueda-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, cargo o carrera..."
                  value={terminoBusqueda}
                  onChange={handleSearchChange}
                  className="busqueda-input"
                />
              </div>
              
              {terminoBusqueda && (
                <button className="btn-limpiar-filtro" onClick={limpiarFiltro}>
                  Limpiar
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="loading-indicator">Cargando docentes...</div>
            ) : docentesFiltrados.length > 0 ? (
              <>
                <div className="tabla-header">
                  {renderPaginacion()}
                  <div className="resultados-info">
                    Mostrando {docentesActuales.length} de {docentesFiltrados.length} docentes 
                    {carrerasAsignadas.length > 0 && (
                      <span className="filtro-carreras">
                        (filtrados por sus carreras asignadas)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="docentes-table-container">
                  <table className="docentes-table">
                    <thead>
                      <tr>
                        <th className="col-num">#</th>
                        <th className="col-nombre">Nombre Completo</th>
                        <th className="col-correo">Correo Electrónico</th>
                        <th className="col-cargo">Cargo</th>
                        <th className="col-carreras">Carreras</th>
                        <th className="col-acciones">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docentesActuales.map((docente, index) => (
                        <tr key={docente.id} className="docente-row">
                          <td className="col-num">{indexPrimerDocente + index + 1}</td>
                          <td className="col-nombre">{docente.nombre_completo}</td>
                          <td className="col-correo">{docente.correo_electronico}</td>
                          <td className="col-cargo">{docente.cargo}</td>
                          <td className="col-carreras">{renderCarrerasDocente(docente)}</td>
                          <td className="col-acciones">
                            {renderAccionesDocente(docente)}
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
                <p>
                  {carrerasAsignadas.length > 0 
                    ? `No se encontraron docentes de sus carreras asignadas (${carrerasAsignadas.join(', ')}) con los criterios seleccionados.`
                    : 'No se encontraron docentes con los criterios seleccionados.'
                  }
                </p>
                {terminoBusqueda && (
                  <button className="btn-limpiar-filtro" onClick={limpiarFiltro}>
                    Limpiar Filtro
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de eliminación para docente */}
      {mostrarModalEliminar && (
        <EliminarDocenteModal 
          docente={docenteSeleccionado}
          onClose={cerrarModalEliminar}
          onEliminar={manejarEliminacionExitosa}
        />
      )}
      
      <style jsx>{`
        .supervisor-info {
          margin-bottom: 1rem;
          padding: 12px;
          background-color: #f8f9fa;
          border-radius: 6px;
          border-left: 4px solid #007bff;
        }
        
        .supervisor-carreras {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .supervisor-label {
          font-weight: 600;
          color: #495057;
          font-size: 14px;
        }
        
        .carreras-supervisor {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .carrera-supervisor {
          background-color: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }
        
        .carrera-item {
          position: relative;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          margin-right: 4px;
          margin-bottom: 2px;
          display: inline-block;
        }
        
        .carrera-acceso {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .carrera-sin-acceso {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .indicador-acceso {
          margin-left: 4px;
          font-weight: bold;
        }
        
        .btn-accion.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        
        .filtro-carreras {
          font-style: italic;
          color: #6c757d;
          font-size: 12px;
        }
        
        .sin-carreras {
          color: #6c757d;
          font-style: italic;
          font-size: 12px;
        }
      `}</style>
    </LayoutSup>
  );
}

export default ListarDocentesAdmin;