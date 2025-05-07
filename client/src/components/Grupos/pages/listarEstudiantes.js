// src/components/Estudiantes/pages/listarEstudiantes.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/listarEstudiantes.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getEstudiantes, getEstudiantesConEstadoGrupo } from '../../../service/estudianteService';

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
  
  // Opciones para los filtros
  const carreras = [
    'Ingeniería de Sistemas',
    'Sistemas Electronicos'
  ];
  
  const semestres = [
    '3', '4', '5', '6', '7', '8', '9', '10'
  ];

  // Cargar estudiantes al iniciar
  useEffect(() => {
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
    
    cargarEstudiantes();
  }, []);

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

  // Lo envolvemos en un div con width: 100% para asegurar que ocupe todo el ancho disponible
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
                    {semestres.map((semestre, index) => (
                      <option key={index} value={semestre}>
                        {semestre}º Semestre
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
    </Layout>
  );
}

export default ListarEstudiantes;