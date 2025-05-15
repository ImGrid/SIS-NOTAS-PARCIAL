// src/pages/EditarGrupos.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/editarGrupos.css';
import { getGrupoPorId, updateGrupo } from '../../../service/grupoService';
import { getEstudiantesByGrupoId, desasignarEstudianteDeGrupo, asignarEstudianteAGrupo } from '../../../service/estudianteService';
import informeService from '../../../service/informeService';
import borradorService from '../../../service/borradorService';
import MATERIAS_POR_SEMESTRE from '../../../util/materias';
import MATERIAS_POR_SEMESTRE_ETN from '../../../util/materias_etn';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EditarGrupos() {
  const { id } = useParams(); // Obtenemos el ID del grupo de la URL
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    materia: ''
  });
  
  // Guardar los datos originales completos para poder restaurarlos si es necesario
  const [originalData, setOriginalData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    materia: ''
  });
  
  // Guardar los estudiantes originales para poder restaurarlos si es necesario
  const [originalEstudiantes, setOriginalEstudiantes] = useState([]);
  
  // Estado para saber si el grupo tiene evaluaciones
  const [tieneEvaluaciones, setTieneEvaluaciones] = useState(false);
  
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_proyecto: false,
    carrera: false,
    semestre: false,
    materia: false
  });
  
  // Estado para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changeType, setChangeType] = useState(''); // 'semestre', 'carrera' o ''
  const [pendingChange, setPendingChange] = useState(null);
  const [estudiantesDesasignados, setEstudiantesDesasignados] = useState(false);
  const [evaluacionesEliminadas, setEvaluacionesEliminadas] = useState(false);
  
  // Estado para el modal de confirmación de eliminación de evaluaciones
  const [showEvaluacionesModal, setShowEvaluacionesModal] = useState(false);
  
  const formRef = useRef(null);

  // Cargamos los datos del grupo cuando el componente se monta
  useEffect(() => {
    const fetchGrupo = async () => {
      try {
        setLoading(true);
        const data = await getGrupoPorId(id);
        
        // Actualizamos el formData con los datos del grupo
        setFormData({
          nombre_proyecto: data.nombre_proyecto,
          carrera: data.carrera,
          semestre: data.semestre,
          materia: data.materia || '' // Por si algún grupo antiguo no tiene materia
        });
        
        // Guardar los valores originales completos para poder restaurarlos si es necesario
        setOriginalData({
          nombre_proyecto: data.nombre_proyecto,
          carrera: data.carrera,
          semestre: data.semestre,
          materia: data.materia || ''
        });
        
        // Cargar las materias correspondientes a la carrera y semestre
        if (data.semestre && data.carrera) {
          const materiasCarrera = data.carrera === 'Ingeniería de Sistemas' 
            ? MATERIAS_POR_SEMESTRE 
            : MATERIAS_POR_SEMESTRE_ETN;
          
          setMaterias(materiasCarrera[data.semestre] || []);
        }
        
        // Cargar los estudiantes originales para poder restaurarlos si es necesario
        const estudiantes = await getEstudiantesByGrupoId(id);
        setOriginalEstudiantes(estudiantes);
        
        // Verificar si el grupo tiene evaluaciones
        const informes = await informeService.getInformesPorGrupoId(id);
        if (informes && informes.length > 0) {
          setTieneEvaluaciones(true);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error al cargar datos del grupo:", err);
        toast.error("No se pudieron cargar los datos del grupo. Por favor, intente nuevamente.");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGrupo();
    }
  }, [id]);

  // Actualizar la lista de materias cuando cambia el semestre o la carrera
  useEffect(() => {
    if (formData.semestre && formData.carrera) {
      // Seleccionar el objeto de materias según la carrera
      const materiasCarrera = formData.carrera === 'Ingeniería de Sistemas' 
        ? MATERIAS_POR_SEMESTRE 
        : MATERIAS_POR_SEMESTRE_ETN;
      
      const nuevasMaterias = materiasCarrera[formData.semestre] || [];
      setMaterias(nuevasMaterias);
      
      // Si la materia actual no está en la nueva lista, resetearla
      if (formData.materia && !nuevasMaterias.includes(formData.materia)) {
        setFormData(prev => ({
          ...prev,
          materia: ''
        }));
      }
    } else {
      setMaterias([]);
    }
  }, [formData.semestre, formData.carrera]);
  
  // Verificar validez de los campos
  useEffect(() => {
    setValidFields({
      nombre_proyecto: formData.nombre_proyecto.trim() !== '',
      carrera: formData.carrera !== '',
      semestre: formData.semestre !== '',
      materia: formData.materia !== ''
    });
  }, [formData]);

  // Verificar si hay cambios importantes que requieran eliminar evaluaciones
  useEffect(() => {
    if (tieneEvaluaciones && 
        (formData.semestre !== originalData.semestre || 
         formData.carrera !== originalData.carrera ||
         formData.materia !== originalData.materia)) {
      // Si hay cambios y no se han mostrado las advertencias
      if (!showEvaluacionesModal && !evaluacionesEliminadas) {
        setShowEvaluacionesModal(true);
      }
    }
  }, [formData, originalData, tieneEvaluaciones, evaluacionesEliminadas, showEvaluacionesModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambió semestre o carrera, mostremos una advertencia
    if ((name === 'semestre' && value !== originalData.semestre) || 
        (name === 'carrera' && value !== originalData.carrera)) {
      
      // Si el usuario cambia de carrera o semestre mientras edita
      if (name === 'carrera') {
        setChangeType('carrera');
      } else if (name === 'semestre') {
        setChangeType('semestre');
      }
      
      // Guardar los cambios pendientes
      setPendingChange({ name, value });
      
      // Abrir el modal de confirmación
      setShowConfirmModal(true);
    } else {
      // Para otros campos, actualizar normalmente
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Función para desasignar estudiantes del grupo
  const desasignarEstudiantes = async () => {
    try {
      setSubmitting(true);
      
      // Obtener todos los estudiantes asignados al grupo
      const estudiantes = await getEstudiantesByGrupoId(id);
      
      if (estudiantes.length > 0) {
        // Mostrar notificación de proceso
        toast.info(`Desasignando ${estudiantes.length} estudiantes del grupo...`);
        
        // Desasignar cada estudiante
        for (const estudiante of estudiantes) {
          await desasignarEstudianteDeGrupo(estudiante.id, id);
        }
        
        toast.success(`${estudiantes.length} estudiantes desasignados correctamente.`);
        setEstudiantesDesasignados(true);
      }
      
      setSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error al desasignar estudiantes:', error);
      toast.error('Error al desasignar estudiantes: ' + error.message);
      setSubmitting(false);
      return false;
    }
  };
  
  // Función para eliminar todas las evaluaciones asociadas al grupo
  const eliminarEvaluacionesGrupo = async () => {
    try {
      setSubmitting(true);
      toast.info("Eliminando evaluaciones, rúbricas y calificaciones del grupo...");
      
      // 1. Eliminar todas las rúbricas, calificaciones e informes
      await informeService.eliminarRubricasGrupo(id);
      
      // 2. Eliminar los borradores asociados
      try {
        // Obtener el ID del docente desde la sesión
        const docenteId = sessionStorage.getItem('usuario') ? 
          JSON.parse(sessionStorage.getItem('usuario')).id : null;
          
        if (docenteId) {
          // Eliminar el borrador si existe
          await borradorService.eliminarBorradorPorDocenteYGrupo(docenteId, id);
        }
      } catch (innerError) {
        console.error('Error al eliminar borradores:', innerError);
        // Continuamos aunque falle esta parte
      }
      
      toast.success("Todas las evaluaciones del grupo han sido eliminadas correctamente.");
      setEvaluacionesEliminadas(true);
      
      setSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error al eliminar evaluaciones:', error);
      toast.error('Error al eliminar evaluaciones: ' + error.message);
      setSubmitting(false);
      return false;
    }
  };
  
  // Función para reasignar los estudiantes originales al grupo
  const reasignarEstudiantesOriginales = async () => {
    try {
      if (originalEstudiantes.length === 0) return true;
      
      setSubmitting(true);
      toast.info(`Restaurando ${originalEstudiantes.length} estudiantes al grupo...`);
      
      // Reasignar cada estudiante original
      for (const estudiante of originalEstudiantes) {
        await asignarEstudianteAGrupo(estudiante.id, id);
      }
      
      toast.success(`${originalEstudiantes.length} estudiantes restaurados correctamente.`);
      setEstudiantesDesasignados(false);
      
      setSubmitting(false);
      return true;
    } catch (error) {
      console.error('Error al restaurar estudiantes:', error);
      toast.error('Error al restaurar estudiantes: ' + error.message);
      setSubmitting(false);
      return false;
    }
  };

  // Función para confirmar el cambio de semestre o carrera
  const handleConfirmChange = async () => {
    if (!pendingChange) return;
    
    // El usuario confirmó el cambio, procedemos con desasignar estudiantes
    const desasignacionExitosa = await desasignarEstudiantes();
    
    if (desasignacionExitosa) {
      // Aplicar el cambio pendiente
      setFormData(prev => ({
        ...prev,
        [pendingChange.name]: pendingChange.value
      }));
      
      // Limpiar cambio pendiente
      setPendingChange(null);
      
      // Cerrar el modal
      setShowConfirmModal(false);
    }
  };

  // Función para cancelar el cambio de semestre o carrera
  const handleCancelChange = () => {
    // El usuario canceló, descartamos el cambio pendiente
    setPendingChange(null);
    
    // Cerrar el modal
    setShowConfirmModal(false);
  };
  
  // Función para confirmar la eliminación de evaluaciones
  const handleConfirmEliminarEvaluaciones = async () => {
    const eliminacionExitosa = await eliminarEvaluacionesGrupo();
    
    if (eliminacionExitosa) {
      setShowEvaluacionesModal(false);
    }
  };
  
  // Función para cancelar la eliminación de evaluaciones
  const handleCancelEliminarEvaluaciones = () => {
    // Restaurar los datos originales
    setFormData(originalData);
    setShowEvaluacionesModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Verificar si hay cambios en semestre o carrera que requieran desasignar estudiantes
      const requiereDesasignar = 
        formData.semestre !== originalData.semestre || 
        formData.carrera !== originalData.carrera;
      
      // Si requiere desasignar y no se han desasignado ya mediante el modal
      if (requiereDesasignar && !estudiantesDesasignados) {
        const desasignacionExitosa = await desasignarEstudiantes();
        if (!desasignacionExitosa) {
          throw new Error('No se pudieron desasignar los estudiantes. Por favor, intente nuevamente.');
        }
      }
      
      // Verificar si hay cambios importantes y el grupo tiene evaluaciones
      const cambiosImportantes = 
        formData.semestre !== originalData.semestre || 
        formData.carrera !== originalData.carrera ||
        formData.materia !== originalData.materia;
      
      if (tieneEvaluaciones && cambiosImportantes && !evaluacionesEliminadas) {
        const eliminacionExitosa = await eliminarEvaluacionesGrupo();
        if (!eliminacionExitosa) {
          throw new Error('No se pudieron eliminar las evaluaciones del grupo. Por favor, intente nuevamente.');
        }
      }
      
      // Actualizar el grupo
      await updateGrupo(id, formData);
      setSuccess(true);
      
      toast.success('Grupo actualizado exitosamente. Redirigiendo a gestión de grupos...');
      
      setTimeout(() => {
        navigate('/grupos/gestion');
      }, 2000);
    } catch (err) {
      console.error("Error al actualizar el grupo:", err);
      setError(err.message || "Error al actualizar el grupo. Por favor, intente de nuevo.");
      toast.error(err.message || "Error al actualizar el grupo. Por favor, intente de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    // Si se desasignaron estudiantes, pero el usuario canceló, restaurar los estudiantes originales
    if (estudiantesDesasignados) {
      toast.info("Se restaurarán los estudiantes originales.");
      await reasignarEstudiantesOriginales();
    }
    
    navigate('/grupos/gestion');
  };
  
  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
    if (formData[fieldName] && (typeof formData[fieldName] === 'string' ? formData[fieldName].trim() !== '' : true)) {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };

  if (loading) {
    return (
      <Layout>
        <div className="grupo-edit-styles">
          <div className="loading-indicator">Cargando datos del grupo...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Modal de confirmación para cambio de semestre o carrera */}
      {showConfirmModal && (
        <div className="grupo-edit-styles">
          <div className="grupo-modal-overlay">
            <div className="grupo-modal-content">
              <h2>Advertencia</h2>
              <p className="grupo-modal-message">
                {changeType === 'carrera' 
                  ? 'Cambiar la carrera del grupo desasignará a todos los estudiantes actuales.' 
                  : 'Cambiar el semestre del grupo desasignará a todos los estudiantes actuales.'}
              </p>
              <p>Los estudiantes deberán ser reasignados manualmente después de guardar los cambios.</p>
              
              <div className="grupo-modal-actions">
                <button 
                  className="btn-grupo-cancelar" 
                  onClick={handleCancelChange}
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button 
                  className="btn-grupo-confirmar" 
                  onClick={handleConfirmChange}
                  disabled={submitting}
                >
                  {submitting ? 'Procesando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmación para eliminar evaluaciones */}
      {showEvaluacionesModal && (
        <div className="grupo-edit-styles">
          <div className="grupo-modal-overlay">
            <div className="grupo-modal-content danger">
              <h2>¡Atención! Evaluaciones existentes</h2>
              <p className="grupo-modal-message">
                Este grupo ya tiene evaluaciones finalizadas. Los cambios que está realizando eliminarán permanentemente:
              </p>
              <ul className="grupo-modal-list">
                <li>Todas las rúbricas de evaluación</li>
                <li>Todas las calificaciones de los estudiantes</li>
                <li>Todos los informes y borradores asociados</li>
              </ul>
              <p>Esta acción no se puede deshacer.</p>
              
              <div className="grupo-modal-actions">
                <button 
                  className="btn-grupo-cancelar" 
                  onClick={handleCancelEliminarEvaluaciones}
                  disabled={submitting}
                >
                  Cancelar cambios
                </button>
                <button 
                  className="btn-grupo-eliminar" 
                  onClick={handleConfirmEliminarEvaluaciones}
                  disabled={submitting}
                >
                  {submitting ? 'Eliminando...' : 'Eliminar evaluaciones y continuar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grupo-edit-styles">
        <div className="editar-grupo-container">
          <h1>Editar Grupo</h1>
          
          {success && (
            <div className="success-message">
              Grupo actualizado exitosamente. Redirigiendo a gestión de grupos...
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {estudiantesDesasignados && (
            <div className="warning-message">
              Los estudiantes han sido desasignados del grupo. Si cancela la edición, se intentarán restaurar.
            </div>
          )}
          
          {tieneEvaluaciones && !evaluacionesEliminadas && (
            <div className="danger-message">
              Este grupo ya tiene evaluaciones finalizadas. Cambiar semestre, carrera o materia eliminará todas las evaluaciones.
            </div>
          )}
          
          {evaluacionesEliminadas && (
            <div className="danger-message">
              Las evaluaciones de este grupo han sido eliminadas. Estos cambios serán permanentes al guardar.
            </div>
          )}
          
          <form ref={formRef} className="editar-grupo-form" onSubmit={handleSubmit}>
            <div className={`form-group ${getFieldClass('nombre_proyecto')}`}>
              <label htmlFor="nombre_proyecto">Nombre del Proyecto:</label>
              <input
                type="text"
                id="nombre_proyecto"
                name="nombre_proyecto"
                value={formData.nombre_proyecto}
                onChange={handleChange}
                required
                placeholder="Ingrese el nombre del proyecto"
              />
            </div>
            
            <div className={`form-group ${getFieldClass('carrera')}`}>
              <label htmlFor="carrera">Carrera:</label>
              <select
                id="carrera"
                name="carrera"
                value={formData.carrera}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione una carrera</option>
                <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                <option value="Ingeniería de Sistemas Electronicos">Ingeniería de Sistemas Electronicos</option>
              </select>
              {formData.carrera !== originalData.carrera && (
                <p className="warning-text">Atención: Cambiar la carrera desasignará a todos los estudiantes.</p>
              )}
              {tieneEvaluaciones && formData.carrera !== originalData.carrera && !evaluacionesEliminadas && (
                <p className="danger-text">Cambiar la carrera eliminará todas las evaluaciones del grupo.</p>
              )}
            </div>
            
            <div className={`form-group ${getFieldClass('semestre')}`}>
              <label htmlFor="semestre">Semestre:</label>
              <select
                id="semestre"
                name="semestre"
                value={formData.semestre}
                onChange={handleChange}
                required
                disabled={!formData.carrera}
              >
                <option value="">Seleccione un semestre</option>
                <option value="3">Tercer Semestre</option>
                <option value="4">Cuarto Semestre</option>
                <option value="5">Quinto Semestre</option>
                <option value="6">Sexto Semestre</option>
                <option value="7">Séptimo Semestre</option>
                <option value="8">Octavo Semestre</option>
                <option value="9">Noveno Semestre</option>
                <option value="10">Décimo Semestre</option>
              </select>
              {!formData.carrera && (
                <p className="help-text">Seleccione primero una carrera.</p>
              )}
              {formData.semestre !== originalData.semestre && (
                <p className="warning-text">Atención: Cambiar el semestre desasignará a todos los estudiantes.</p>
              )}
              {tieneEvaluaciones && formData.semestre !== originalData.semestre && !evaluacionesEliminadas && (
                <p className="danger-text">Cambiar el semestre eliminará todas las evaluaciones del grupo.</p>
              )}
            </div>
            
            {/* Campo para materia */}
            <div className={`form-group ${getFieldClass('materia')}`}>
              <label htmlFor="materia">Materia:</label>
              <select
                id="materia"
                name="materia"
                value={formData.materia}
                onChange={handleChange}
                required
                disabled={!formData.semestre || materias.length === 0}
              >
                <option value="">Seleccione una materia</option>
                {materias.map((materia, index) => (
                  <option key={index} value={materia}>
                    {materia}
                  </option>
                ))}
              </select>
              {formData.semestre && materias.length === 0 && (
                <p className="help-text">No hay materias disponibles para este semestre en la carrera seleccionada.</p>
              )}
              {!formData.semestre && (
                <p className="help-text">Seleccione un semestre para ver las materias disponibles.</p>
              )}
              {tieneEvaluaciones && formData.materia !== originalData.materia && !evaluacionesEliminadas && (
                <p className="danger-text">Cambiar la materia eliminará todas las evaluaciones del grupo.</p>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                className="btn-grupo-cancelar" 
                onClick={handleCancel}
                disabled={submitting}
              >
                {submitting ? 'Procesando...' : 'Cancelar'}
              </button>
              <button 
                type="submit" 
                className={`btn-grupo-guardar ${submitting ? 'loading' : ''}`}
                disabled={submitting || Object.values(validFields).some(valid => !valid)}
              >
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default EditarGrupos;