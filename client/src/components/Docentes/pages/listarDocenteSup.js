// src/components/Supervisor/pages/listarDocentesAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import '../style/listarDocente.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getDocentes, deleteDocente } from '../../../service/docenteService';

function ListarDocentesAdmin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [docentes, setDocentes] = useState([]);
  const [docentesFiltrados, setDocentesFiltrados] = useState([]);
  const [docenteSeleccionado, setDocenteSeleccionado] = useState(null);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  
  // Estado para filtro de búsqueda
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const docentesPorPagina = 10;

  // Cargar docentes al iniciar
  useEffect(() => {
    const cargarDocentes = async () => {
      try {
        setLoading(true);
        const data = await getDocentes();
        setDocentes(data);
        setDocentesFiltrados(data);
      } catch (error) {
        console.error('Error al cargar docentes:', error);
        toast.error('Error al cargar la lista de docentes');
      } finally {
        setLoading(false);
      }
    };
    
    cargarDocentes();
  }, []);

  // Aplicar filtro cuando cambia el término de búsqueda
  useEffect(() => {
    if (terminoBusqueda) {
      const termino = terminoBusqueda.toLowerCase();
      const resultado = docentes.filter(d =>
        (d.nombre_completo && d.nombre_completo.toLowerCase().includes(termino)) ||
        (d.correo_electronico && d.correo_electronico.toLowerCase().includes(termino)) ||
        (d.cargo && d.cargo.toLowerCase().includes(termino))
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

  // Función para mostrar el modal de confirmación de eliminación
  const confirmarEliminar = (docente) => {
    setDocenteSeleccionado(docente);
    setMostrarConfirmacion(true);
  };

  // Función para cancelar la eliminación
  const cancelarEliminar = () => {
    setDocenteSeleccionado(null);
    setMostrarConfirmacion(false);
  };

  // Función para eliminar un docente
  const eliminarDocente = async () => {
    if (!docenteSeleccionado) return;
    
    try {
      setLoading(true);
      await deleteDocente(docenteSeleccionado.id);
      
      // Actualizar la lista de docentes
      setDocentes(docentes.filter(d => d.id !== docenteSeleccionado.id));
      setDocentesFiltrados(docentesFiltrados.filter(d => d.id !== docenteSeleccionado.id));
      
      toast.success('Docente eliminado correctamente');
      
      // Cerrar el modal de confirmación
      setMostrarConfirmacion(false);
      setDocenteSeleccionado(null);
    } catch (error) {
      console.error('Error al eliminar docente:', error);
      toast.error('Error al eliminar el docente. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar controles de paginación
  const renderPaginacion = () => {
    // Solo mostrar paginación si hay más de una página
    if (totalPaginas <= 1) return null;
    
    return (
      <div className="paginacion-container">
        <button 
          className="btn-pagina" 
          onClick={irPaginaAnterior}
          disabled={paginaActual === 1}
        >
          &laquo;
        </button>
        
        {numeroPaginas.map((numero) => (
          <button
            key={`page-${numero}`}
            className={`btn-pagina ${paginaActual === numero ? 'active' : ''}`}
            onClick={() => cambiarPagina(numero)}
          >
            {numero}
          </button>
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

  return (
    <LayoutSup>
      <div className="docente-admin-list-styles">
        <div className="docentes-admin-container">
          <ToastContainer position="top-right" autoClose={3000} />
          
          <div className="docentes-admin-header">
            <h1>Administración de Docentes</h1>
            <button className="btn-crear-docente" onClick={irACrearDocente}>
              + Registrar Nuevo Docente
            </button>
          </div>
          
          <div className="content-container">
            <div className="filtros-container">
              <div className="busqueda-container">
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
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
                      </tr>
                    </thead>
                    <tbody>
                      {docentesActuales.map((docente, index) => (
                        <tr key={docente.id} className="docente-row">
                          <td className="col-num">{indexPrimerDocente + index + 1}</td>
                          <td className="col-nombre">{docente.nombre_completo}</td>
                          <td className="col-correo">{docente.correo_electronico}</td>
                          <td className="col-cargo">{docente.cargo}</td>
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
                <p>No se encontraron docentes con los criterios seleccionados.</p>
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
      
      {/* Modal de confirmación para eliminar docente */}
      {mostrarConfirmacion && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>Confirmar eliminación</h2>
            </div>
            <div className="modal-body">
              <p>¿Está seguro que desea eliminar al docente <strong>{docenteSeleccionado?.nombre_completo}</strong>?</p>
              <p className="warning-text">Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancelar" onClick={cancelarEliminar}>Cancelar</button>
              <button className="btn-confirmar" onClick={eliminarDocente}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </LayoutSup>
  );
}

export default ListarDocentesAdmin;