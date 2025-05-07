// src/components/Grupos/pages/asignarEstudiantes.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import '../../Docentes/style/docente.css';
import '../style/asignarEstudiantes.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { 
  getEstudiantesBySemestre, 
  asignarEstudianteAGrupo,      
  desasignarEstudianteDeGrupo,  
  getEstudiantesByGrupoId,
  estudianteYaAsignadoAMateria,  
} from '../../../service/estudianteService';
import { getGrupoPorId } from '../../../service/grupoService';

function AsignarEstudiantes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Estados para almacenar datos
  const [grupo, setGrupo] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [estudiantesDisponibles, setEstudiantesDisponibles] = useState([]);
  const [estudiantesSeleccionados, setEstudiantesSeleccionados] = useState([]);
  const [estudiantesOriginales, setEstudiantesOriginales] = useState([]); // Guarda los estudiantes originalmente asignados
  const [estudiantesConGrupo, setEstudiantesConGrupo] = useState([]);
  
  // Estados para filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // Obtener el ID del grupo de los parámetros de la URL o del state
  const grupoId = new URLSearchParams(location.search).get('id') || 
    (location.state && location.state.grupoId);
  
  // Cargar los datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      if (!grupoId) {
        setError('No se ha especificado un grupo para asignar estudiantes');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Paso 1: Obtener información del grupo
        const grupoData = await getGrupoPorId(grupoId);
        setGrupo(grupoData);
        
        // Paso 2: Obtener estudiantes que YA están asignados a este grupo
        const estudiantesAsignados = await getEstudiantesByGrupoId(grupoId);
        setEstudiantesSeleccionados(estudiantesAsignados);
        setEstudiantesOriginales(estudiantesAsignados);
        
        // Paso 3: Obtener todos los estudiantes del mismo semestre
        const estudiantesSemestre = await getEstudiantesBySemestre(grupoData.semestre);
        
        // Paso 4: Filtrar estudiantes según disponibilidad por materia y si ya están asignados a este grupo
        const estudiantesYaAsignados = new Set(estudiantesAsignados.map(e => e.id));
        const estudiantesConGrupoMismaMateria = [];
        const estudiantesDisponiblesParaGrupo = [];
        
        for (const estudiante of estudiantesSemestre) {
          // Si ya está en este grupo, no lo incluimos en ninguna de las listas
          if (estudiantesYaAsignados.has(estudiante.id)) {
            continue;
          }
          
          // Verificar si ya está en un grupo de la misma materia
          const yaAsignado = await estudianteYaAsignadoAMateria(estudiante.id, grupoData.materia);
          
          if (yaAsignado) {
            estudiantesConGrupoMismaMateria.push(estudiante);
          } else {
            estudiantesDisponiblesParaGrupo.push(estudiante);
          }
        }
        
        setEstudiantesConGrupo(estudiantesConGrupoMismaMateria);
        setEstudiantesDisponibles(estudiantesDisponiblesParaGrupo);
        
        setLoading(false);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        toast.error('Error al cargar los datos: ' + err.message);
        setLoading(false);
      }
    };
    
    cargarDatos();
  }, [grupoId]);
  
  // Función para asignar un estudiante al grupo actual
  const asignarEstudianteAlGrupo = async (estudiante) => {
    try {
      await asignarEstudianteAGrupo(estudiante.id, grupoId);
      return true;
    } catch (err) {
      console.error('Error al asignar estudiante al grupo:', err);
      toast.error('Error al asignar estudiante: ' + err.message);
      return false;
    }
  };
  
  // Función para remover un estudiante del grupo
  const removerEstudianteDelGrupo = async (estudiante) => {
    try {
      await desasignarEstudianteDeGrupo(estudiante.id, grupoId);
      return true;
    } catch (err) {
      console.error('Error al eliminar estudiante del grupo:', err);
      toast.error('Error al eliminar estudiante del grupo: ' + err.message);
      return false;
    }
  };
  
  
  // Función para manejar clic en estudiante disponible
  const handleClickEstudianteDisponible = async (estudiante) => {
    // Verificar si ya hay 5 estudiantes seleccionados
    if (estudiantesSeleccionados.length >= 5) {
      toast.warning('No se pueden asignar más de 5 estudiantes a un grupo');
      return;
    }
    
    // Actualizar el estudiante en la base de datos
    const exito = await asignarEstudianteAlGrupo(estudiante);
    
    if (exito) {
      // Actualizar estados locales
      const nuevosDisponibles = estudiantesDisponibles.filter(e => e.id !== estudiante.id);
      setEstudiantesDisponibles(nuevosDisponibles);
      
      const nuevosSeleccionados = [...estudiantesSeleccionados, estudiante];
      setEstudiantesSeleccionados(nuevosSeleccionados);
      
      toast.success('Estudiante asignado al grupo correctamente');
    }
  };
  
  // Función para eliminar un estudiante del grupo
  const handleRemoveEstudiante = async (estudiante) => {
    const exito = await removerEstudianteDelGrupo(estudiante);
    
    if (exito) {
      // Actualizar estados locales
      const nuevosSeleccionados = estudiantesSeleccionados.filter(e => e.id !== estudiante.id);
      setEstudiantesSeleccionados(nuevosSeleccionados);
      
      // Solo agregar a disponibles si no es uno que está ya en otro grupo
      const yaEstaOcupado = estudiantesConGrupo.some(e => e.id === estudiante.id);
      
      if (!yaEstaOcupado) {
        const nuevosDisponibles = [...estudiantesDisponibles, estudiante];
        setEstudiantesDisponibles(nuevosDisponibles);
      } else {
        // Si ya estaba ocupado con otro grupo, actualizar la lista de ocupados
        setEstudiantesConGrupo([...estudiantesConGrupo, estudiante]);
      }
      
      toast.success('Estudiante eliminado del grupo correctamente');
    }
  };
  
  // Función para finalizar y volver a la gestión de grupos
  const handleFinish = () => {
    toast.success('Estudiantes asignados correctamente. Redirigiendo...');
    setTimeout(() => {
      navigate('/grupos/gestion');
    }, 2000);
  };

  // Función para cancelar los cambios y restaurar los estudiantes originales
  const handleCancel = async () => {
    try {
      // 1. Obtener la lista actual de estudiantes en el grupo
      const estudiantesActuales = await getEstudiantesByGrupoId(grupoId);
      
      // 2. Desasignar estudiantes que no estaban originalmente en el grupo
      for (const estudiante of estudiantesActuales) {
        const estabaOriginalmente = estudiantesOriginales.some(e => e.id === estudiante.id);
        
        if (!estabaOriginalmente) {
          await desasignarEstudianteDeGrupo(estudiante.id, grupoId);
        }
      }
      
      // 3. Asignar estudiantes que estaban originalmente pero fueron removidos
      for (const estudianteOriginal of estudiantesOriginales) {
        const sigueAsignado = estudiantesActuales.some(e => e.id === estudianteOriginal.id);
        
        if (!sigueAsignado) {
          await asignarEstudianteAGrupo(estudianteOriginal.id, grupoId);
        }
      }
      
      toast.info('Cambios cancelados. Volviendo a gestión de grupos...');
      setTimeout(() => {
        navigate('/grupos/gestion');
      }, 1500);
    } catch (error) {
      console.error('Error al cancelar cambios:', error);
      toast.error('Error al cancelar los cambios: ' + error.message);
    }
  };

  // Función para manejar el ordenamiento
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Función para filtrar estudiantes según búsqueda
  const filteredEstudiantes = () => {
    const disponiblesFiltrados = estudiantesDisponibles.filter(estudiante => 
      estudiante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estudiante.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estudiante.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const ocupadosFiltrados = estudiantesConGrupo.filter(estudiante => 
      estudiante.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estudiante.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estudiante.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return { disponibles: disponiblesFiltrados, ocupados: ocupadosFiltrados };
  };

  // Función para ordenar estudiantes
  const sortedEstudiantes = (estudiantes) => {
    if (!sortConfig.key) return estudiantes;
    
    return [...estudiantes].sort((a, b) => {
      let aValue, bValue;
      
      if (sortConfig.key === 'nombre') {
        aValue = `${a.nombre} ${a.apellido}`.toLowerCase();
        bValue = `${b.nombre} ${b.apellido}`.toLowerCase();
      } else if (sortConfig.key === 'codigo') {
        aValue = a.codigo.toLowerCase();
        bValue = b.codigo.toLowerCase();
      } else {
        aValue = a[sortConfig.key];
        bValue = b[sortConfig.key];
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Obtener estudiantes filtrados y ordenados
  const { disponibles: filteredDisponibles, ocupados: filteredOcupados } = filteredEstudiantes();
  const sortedDisponibles = sortedEstudiantes(filteredDisponibles);
  const sortedOcupados = sortedEstudiantes(filteredOcupados);
  
  if (loading) {
    return (
      <div className="docentes-container">
        <Sidebar />
        <main className="content">
          <div className="loading-indicator">Cargando datos...</div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="docentes-container">
        <Sidebar />
        <main className="content">
          <ToastContainer position="top-right" autoClose={3000} />
          <div className="error-message">{error}</div>
          <button 
            onClick={() => navigate('/grupos/gestion')}
            className="btn-regresar"
          >
            Volver a Gestión de Grupos
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content">
        <ToastContainer position="top-right" autoClose={3000} />
        
        {/* Añadimos el namespace para aislar los estilos */}
        <div className="asignar-estudiantes-styles">
          <div className="asignar-estudiantes-container">
            {/* Header con fondo azul sin bordes redondeados y ancho completo */}
            <div className="asignar-header">
              <h1>Asignar Estudiantes al Grupo</h1>
            </div>
            
            {grupo && (
              <div className="grupo-info">
                <h2>{grupo.nombre_proyecto}</h2>
                <p><strong>Carrera:</strong> {grupo.carrera}</p>
                <p><strong>Semestre:</strong> {grupo.semestre}</p>
                <p><strong>Materia:</strong> {grupo.materia}</p>
              </div>
            )}
            
            <div className="estudiantes-container">
              <div className="estudiantes-disponibles-container">
                <h3>Estudiantes Disponibles ({filteredDisponibles.length})</h3>
                
                <div className="filtro-container">
                  <div className="search-box">
                    <input
                      type="text"
                      placeholder="Buscar estudiante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                  <div className="sort-buttons">
                    <button 
                      className={`sort-button ${sortConfig.key === 'nombre' ? 'active-' + sortConfig.direction : ''}`}
                      onClick={() => requestSort('nombre')}
                    >
                      Ordenar por Nombre
                      {sortConfig.key === 'nombre' && (
                        <span className="sort-icon">
                          {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </button>
                    <button 
                      className={`sort-button ${sortConfig.key === 'codigo' ? 'active-' + sortConfig.direction : ''}`}
                      onClick={() => requestSort('codigo')}
                    >
                      Ordenar por Código
                      {sortConfig.key === 'codigo' && (
                        <span className="sort-icon">
                          {sortConfig.direction === 'ascending' ? ' ↑' : ' ↓'}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                
                <div className="estudiantes-list">
                  <table className="estudiantes-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>Código</th>
                        <th>Nombre Completo</th>
                        <th>Semestre</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDisponibles.map((estudiante, index) => (
                        <tr
                          key={`disponible-${estudiante.id}`}
                          className="estudiante-item disponible"
                          onClick={() => handleClickEstudianteDisponible(estudiante)}
                        >
                          <td className="numero-fila">{index + 1}</td>
                          <td>{estudiante.codigo}</td>
                          <td>{`${estudiante.nombre} ${estudiante.apellido}`}</td>
                          <td>{estudiante.semestre}</td>
                          <td>
                            <span className="estado-disponible">Disponible</span>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Mostrar estudiantes con grupo pero separados y no clickeables */}
                      {sortedOcupados.map((estudiante, index) => (
                        <tr
                          key={`ocupado-${estudiante.id}`}
                          className="estudiante-item ocupado"
                        >
                          <td className="numero-fila">{sortedDisponibles.length + index + 1}</td>
                          <td>{estudiante.codigo}</td>
                          <td>{`${estudiante.nombre} ${estudiante.apellido}`}</td>
                          <td>{estudiante.semestre}</td>
                          <td>
                            <span className="estado-ocupado">Asignado a otro grupo</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="estudiantes-seleccionados-container">
                <h3>Estudiantes en este Grupo ({estudiantesSeleccionados.length}/5)</h3>
                <div className="estudiantes-selected-list">
                  {estudiantesSeleccionados.length === 0 ? (
                    <div className="empty-seleccionados">
                      <p>Haz clic en los estudiantes disponibles para asignarlos al grupo</p>
                    </div>
                  ) : (
                    estudiantesSeleccionados.map((estudiante, index) => (
                      <div
                        key={`seleccionado-${estudiante.id}`}
                        className="estudiante-selected-item"
                      >
                        <div className="estudiante-info">
                          <span className="estudiante-numero">{index + 1}</span>
                          <span className="estudiante-codigo">{estudiante.codigo}</span>
                          <span className="estudiante-nombre">
                            {`${estudiante.nombre} ${estudiante.apellido}`}
                          </span>
                        </div>
                        <button
                          className="btn-eliminar-estudiante"
                          onClick={() => handleRemoveEstudiante(estudiante)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-actions">
              <button
                className="btn-cancelar"
                onClick={handleCancel}
              >
                Cancelar
              </button>
              <button
                className="btn-guardar"
                onClick={handleFinish}
              >
                Finalizar Asignación
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AsignarEstudiantes;