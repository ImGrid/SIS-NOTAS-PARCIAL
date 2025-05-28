// src/pages/EditarGrupos.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/editarGrupos.css';
import { 
  getGrupoPorId, 
  updateGrupo,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validarDatosGrupo
} from '../../../service/grupoService';
import { getDocenteById } from '../../../service/docenteService';
import { getEstudiantesByGrupoId, desasignarEstudianteDeGrupo, asignarEstudianteAGrupo } from '../../../service/estudianteService';
import informeService from '../../../service/informeService';
import borradorService from '../../../service/borradorService';
import MATERIAS_POR_SEMESTRE from '../../../util/materias/materias_sis';
import MATERIAS_POR_SEMESTRE_ETN from '../../../util/materias/materias_etn';
import MATERIAS_POR_SEMESTRE_AGRO from '../../../util/materias/materias_agro';
import MATERIAS_POR_SEMESTRE_BASICAS from '../../../util/materias/materias_basic';
import MATERIAS_POR_SEMESTRE_COM from '../../../util/materias/materias_com';
import MATERIAS_POR_SEMESTRE_CIVIL from '../../../util/materias/materias_cvil';
import MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA from '../../../util/materias/materias_tec_diseño';
import MATERIAS_POR_SEMESTRE_TEC_SUP_INF from '../../../util/materias/materias_tec_inf';
import MATERIAS_POR_SEMESTRE_TEC_SUP_SE from '../../../util/materias/materias_tec_etn';
import MATERIAS_POR_SEMESTRE_TEC_SUP_ER from '../../../util/materias/materias_energ';
import MATERIAS_POR_SEMESTRE_TEC_SUP_CC from '../../../util/materias/materias_tec_cons_civ';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function EditarGrupos() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Estado del formulario principal (incluye paralelo)
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    paralelo: '', // Campo para paralelos
    materia: ''
  });
  
  // Guardar los datos originales completos para poder restaurarlos si es necesario
  const [originalData, setOriginalData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    paralelo: '',
    materia: ''
  });
  
  // Guardar los estudiantes originales para poder restaurarlos si es necesario
  const [originalEstudiantes, setOriginalEstudiantes] = useState([]);
  
  // Estado para saber si el grupo tiene evaluaciones
  const [tieneEvaluaciones, setTieneEvaluaciones] = useState(false);
  
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCarreras, setLoadingCarreras] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_proyecto: false,
    carrera: false,
    semestre: false,
    paralelo: true, // Inicialmente true porque puede no ser requerido
    materia: false
  });
  
  // Estados para el modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changeType, setChangeType] = useState(''); // 'semestre', 'carrera', 'paralelo' o ''
  const [pendingChange, setPendingChange] = useState(null);
  const [estudiantesDesasignados, setEstudiantesDesasignados] = useState(false);
  const [evaluacionesEliminadas, setEvaluacionesEliminadas] = useState(false);
  
  // Estado para el modal de confirmación de eliminación de evaluaciones
  const [showEvaluacionesModal, setShowEvaluacionesModal] = useState(false);
  
  // Estado para el docente y sus carreras asignadas
  const [docente, setDocente] = useState(null);
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  
  // Estados para paralelos
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);
  
  const formRef = useRef(null);

  // Mapa de todas las carreras disponibles en el sistema
  const TODAS_CARRERAS = [
    { value: 'Ingeniería de Sistemas', label: 'Ingeniería de Sistemas' },
    { value: 'Ingeniería de Sistemas Electronicos', label: 'Ingeniería de Sistemas Electronicos' },
    { value: 'Ingeniería Agroindustrial', label: 'Ingeniería Agroindustrial' },
    { value: 'Ciencias Básicas', label: 'Ciencias Básicas' },
    { value: 'Ingeniería Comercial', label: 'Ingeniería Comercial' },
    { value: 'Ingeniería Civil', label: 'Ingeniería Civil' },
    { value: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual', label: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual' },
    { value: 'Tec. Sup. en Informática', label: 'Tec. Sup. en Informática' },
    { value: 'Tec. Sup. en Sistemas Electrónicos', label: 'Tec. Sup. en Sistemas Electrónicos' },
    { value: 'Técnico Superior en Energías Renovables', label: 'Técnico Superior en Energías Renovables' },
    { value: 'Tec. Sup. Contrucción Civil', label: 'Tec. Sup. Contrucción Civil' }
  ];

  // Cargar las carreras asignadas al docente cuando el componente se monta
  useEffect(() => {
    const cargarDatosDocente = async () => {
      try {
        setLoadingCarreras(true);
        setError(null);
        
        const usuarioStr = sessionStorage.getItem('usuario');
        if (!usuarioStr) {
          setError("No se pudo obtener la información del usuario. Por favor, vuelva a iniciar sesión.");
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        const usuario = JSON.parse(usuarioStr);
        if (!usuario || !usuario.id) {
          setError("Datos de usuario inválidos. Por favor, vuelva a iniciar sesión.");
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        
        // Obtener datos completos del docente desde el servidor
        const docenteData = await getDocenteById(usuario.id);
        
        if (!docenteData) {
          setError("No se pudieron obtener los datos del docente.");
          return;
        }
        
        setDocente(docenteData);
        
        // Obtener carreras asignadas
        const carreras = docenteData.carreras || [];
        
        if (carreras.length === 0) {
          setError("No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.");
          setCarrerasAsignadas([]);
          setCarrerasDisponibles([]);
          return;
        }
        
        setCarrerasAsignadas(carreras);
        
        // Verificar si el docente tiene Ciencias Básicas asignada
        const tieneCienciasBasicas = carreras.includes('Ciencias Básicas');
        setDocenteTieneCienciasBasicas(tieneCienciasBasicas);
        
        // Filtrar las carreras disponibles basadas en las asignadas al docente
        const carrerasFiltradas = TODAS_CARRERAS.filter(carrera => 
          carreras.includes(carrera.value)
        );
        setCarrerasDisponibles(carrerasFiltradas);

      } catch (error) {
        console.error("Error al obtener datos del docente:", error);
        setError("Error al cargar sus datos. Por favor, vuelva a iniciar sesión.");
        toast.error("Error al cargar datos del docente");
      } finally {
        setLoadingCarreras(false);
      }
    };
    
    cargarDatosDocente();
  }, [navigate]);

  // Función para obtener el objeto de materias según la carrera
  const getMateriasCarrera = (carrera) => {
    switch (carrera) {
      case 'Ingeniería de Sistemas':
        return MATERIAS_POR_SEMESTRE;
      case 'Ingeniería de Sistemas Electronicos':
        return MATERIAS_POR_SEMESTRE_ETN;
      case 'Ingeniería Agroindustrial':
        return MATERIAS_POR_SEMESTRE_AGRO;
      case 'Ciencias Básicas':
        return MATERIAS_POR_SEMESTRE_BASICAS;
      case 'Ingeniería Comercial':
        return MATERIAS_POR_SEMESTRE_COM;
      case 'Ingeniería Civil':
        return MATERIAS_POR_SEMESTRE_CIVIL;
      case 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_DGCA;
      case 'Tec. Sup. en Informática':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_INF;
      case 'Tec. Sup. en Sistemas Electrónicos':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_SE;
      case 'Técnico Superior en Energías Renovables':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_ER;
      case 'Tec. Sup. Contrucción Civil':
        return MATERIAS_POR_SEMESTRE_TEC_SUP_CC;
      default:
        return {};
    }
  };

  // Cargamos los datos del grupo cuando el componente se monta y las carreras están cargadas
  useEffect(() => {
    const fetchGrupo = async () => {
      try {
        setLoading(true);
        const data = await getGrupoPorId(id);
        
        // Verificar si el grupo pertenece a una carrera asignada al docente
        if (!carrerasAsignadas.includes(data.carrera)) {
          setError("No tiene permisos para editar este grupo. No pertenece a ninguna de sus carreras asignadas.");
          setLoading(false);
          return;
        }
        
        // Actualizamos el formData con los datos del grupo (incluye paralelo)
        setFormData({
          nombre_proyecto: data.nombre_proyecto,
          carrera: data.carrera,
          semestre: data.semestre,
          paralelo: data.paralelo || 'A', // Asegurar que siempre tenga un paralelo
          materia: data.materia || ''
        });
        
        // Guardar los valores originales completos para poder restaurarlos si es necesario
        setOriginalData({
          nombre_proyecto: data.nombre_proyecto,
          carrera: data.carrera,
          semestre: data.semestre,
          paralelo: data.paralelo || 'A',
          materia: data.materia || ''
        });
        
        // Cargar las materias correspondientes a la carrera y semestre
        if (data.semestre && data.carrera) {
          const materiasCarrera = getMateriasCarrera(data.carrera);
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

    if (id && carrerasAsignadas.length > 0 && !loadingCarreras) {
      fetchGrupo();
    }
  }, [id, carrerasAsignadas, loadingCarreras]);

  // Efecto para validar los campos requeridos (incluye lógica de paralelo)
  useEffect(() => {
    const { nombre_proyecto, carrera, semestre, paralelo, materia } = formData;
    
    // Determinar si el paralelo es requerido
    const paraleloRequerido = carreraNecesitaParalelo(carrera);
    
    setValidFields(prevState => ({
      ...prevState,
      nombre_proyecto: nombre_proyecto.trim() !== '',
      carrera: carrera !== '' && carrerasAsignadas.includes(carrera),
      semestre: semestre !== '',
      paralelo: paraleloRequerido ? (paralelo !== '') : true, // Solo requerido para Ciencias Básicas
      materia: materia !== ''
    }));
  }, [formData, carrerasAsignadas]);

  // Efecto para auto-asignar paralelo por defecto cuando cambia la carrera
  useEffect(() => {
    if (formData.carrera) {
      const paraleloDefecto = getParaleloPorDefecto(formData.carrera);
      
      // Solo auto-asignar si no es Ciencias Básicas (para Ciencias Básicas debe mantener el valor actual o permitir selección manual)
      if (!carreraNecesitaParalelo(formData.carrera)) {
        setFormData(prev => ({
          ...prev,
          paralelo: paraleloDefecto
        }));
      }
    }
  }, [formData.carrera]);

  // Actualizar la lista de materias cuando cambia el semestre o la carrera
  useEffect(() => {
    if (formData.semestre && formData.carrera) {
      // Verificar que la carrera seleccionada esté en las carreras asignadas
      if (!carrerasAsignadas.includes(formData.carrera)) {
        setMaterias([]);
        return;
      }
      
      // Obtener el objeto de materias según la carrera
      const materiasCarrera = getMateriasCarrera(formData.carrera);
      
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
  }, [formData.semestre, formData.carrera, carrerasAsignadas]);

  // Verificar si hay cambios importantes que requieran eliminar evaluaciones
  useEffect(() => {
    if (tieneEvaluaciones && 
        (formData.semestre !== originalData.semestre || 
         formData.carrera !== originalData.carrera ||
         formData.paralelo !== originalData.paralelo ||
         formData.materia !== originalData.materia)) {
      // Si hay cambios y no se han mostrado las advertencias
      if (!showEvaluacionesModal && !evaluacionesEliminadas) {
        setShowEvaluacionesModal(true);
      }
    }
  }, [formData, originalData, tieneEvaluaciones, evaluacionesEliminadas, showEvaluacionesModal]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Validar que solo se puedan seleccionar carreras asignadas al docente
    if (name === 'carrera' && value !== '') {
      if (!carrerasAsignadas.includes(value)) {
        toast.error("No tiene permisos para cambiar el grupo a esta carrera");
        return;
      }
    }
    
    // Si cambió semestre, carrera o paralelo, mostremos una advertencia
    if ((name === 'semestre' && value !== originalData.semestre) || 
        (name === 'carrera' && value !== originalData.carrera) ||
        (name === 'paralelo' && value !== originalData.paralelo)) {
      
      // Si el usuario cambia de carrera, semestre o paralelo mientras edita
      if (name === 'carrera') {
        setChangeType('carrera');
      } else if (name === 'semestre') {
        setChangeType('semestre');
      } else if (name === 'paralelo') {
        setChangeType('paralelo');
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
        const docenteId = docente?.id || (sessionStorage.getItem('usuario') ? 
          JSON.parse(sessionStorage.getItem('usuario')).id : null);
          
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

  // Función para confirmar el cambio de semestre, carrera o paralelo
  const handleConfirmChange = async () => {
    if (!pendingChange) return;
    
    // Validar que si es cambio de carrera, la nueva carrera esté asignada al docente
    if (pendingChange.name === 'carrera' && !carrerasAsignadas.includes(pendingChange.value)) {
      toast.error("No tiene permisos para cambiar el grupo a esta carrera");
      handleCancelChange();
      return;
    }
    
    // El usuario confirmó el cambio, procedemos con desasignar estudiantes
    const desasignacionExitosa = await desasignarEstudiantes();
    
    if (desasignacionExitosa) {
      // Aplicar el cambio pendiente
      setFormData(prev => ({
        ...prev,
        [pendingChange.name]: pendingChange.value,
        // Si cambiamos la carrera, resetear también el semestre, paralelo y la materia
        ...(pendingChange.name === 'carrera' ? { 
          semestre: '', 
          paralelo: getParaleloPorDefecto(pendingChange.value), 
          materia: '' 
        } : {})
      }));
      
      // Limpiar cambio pendiente
      setPendingChange(null);
      
      // Cerrar el modal
      setShowConfirmModal(false);
    }
  };

  // Función para cancelar el cambio de semestre, carrera o paralelo
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
      // Validar que la carrera esté asignada al docente
      if (!carrerasAsignadas.includes(formData.carrera)) {
        throw new Error("No tiene permisos para editar grupos en esta carrera");
      }
      
      // Validar paralelo para Ciencias Básicas
      if (carreraNecesitaParalelo(formData.carrera) && !formData.paralelo) {
        toast.error('El paralelo es obligatorio para Ciencias Básicas');
        setSubmitting(false);
        return;
      }
      
      // Verificar si hay cambios en semestre, carrera o paralelo que requieran desasignar estudiantes
      const requiereDesasignar = 
        formData.semestre !== originalData.semestre || 
        formData.carrera !== originalData.carrera ||
        formData.paralelo !== originalData.paralelo;
      
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
        formData.paralelo !== originalData.paralelo ||
        formData.materia !== originalData.materia;
      
      if (tieneEvaluaciones && cambiosImportantes && !evaluacionesEliminadas) {
        const eliminacionExitosa = await eliminarEvaluacionesGrupo();
        if (!eliminacionExitosa) {
          throw new Error('No se pudieron eliminar las evaluaciones del grupo. Por favor, intente nuevamente.');
        }
      }
      
      // Preparar datos del grupo usando validación del servicio
      const datosGrupo = {
        nombre_proyecto: formData.nombre_proyecto,
        carrera: formData.carrera,
        semestre: formData.semestre,
        paralelo: formData.paralelo || getParaleloPorDefecto(formData.carrera),
        materia: formData.materia,
        docente_id: docente?.id || (sessionStorage.getItem('usuario') ? 
          JSON.parse(sessionStorage.getItem('usuario')).id : null)
      };

      // Actualizar el grupo
      await updateGrupo(id, datosGrupo);
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

  // Función para obtener el mensaje de cambio según el tipo
  const getMensajeCambio = () => {
    switch (changeType) {
      case 'carrera':
        return 'Cambiar la carrera del grupo desasignará a todos los estudiantes actuales.';
      case 'semestre':
        return 'Cambiar el semestre del grupo desasignará a todos los estudiantes actuales.';
      case 'paralelo':
        return 'Cambiar el paralelo del grupo desasignará a todos los estudiantes actuales.';
      default:
        return 'Este cambio desasignará a todos los estudiantes actuales.';
    }
  };

  // Renderizar información del docente
  const renderInfoDocente = () => {
    if (!docente || loadingCarreras) return null;
  };

  if (loading || loadingCarreras) {
    return (
      <Layout>
        <div className="grupo-edit-styles">
          <div className="loading-indicator">Cargando datos del grupo...</div>
        </div>
      </Layout>
    );
  }

  if (error && (error.includes("No tiene permisos") || error.includes("vuelva a iniciar sesión"))) {
    return (
      <Layout>
        <div className="grupo-edit-styles">
          <div className="error-message">
            {error}
            <button 
              className="btn-grupo-volver" 
              onClick={() => navigate('/grupos/gestion')}
              style={{ marginTop: '20px', padding: '10px 20px' }}
            >
              Volver a Gestión de Grupos
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Obtener los semestres y paralelos disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);
  const paralelosDisponibles = getParalelosDisponibles(formData.carrera);

  // Determinar si mostrar el campo de paralelo
  const mostrarCampoParalelo = docenteTieneCienciasBasicas && carreraNecesitaParalelo(formData.carrera);

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Modal de confirmación para cambio de semestre, carrera o paralelo */}
      {showConfirmModal && (
        <div className="grupo-edit-styles">
          <div className="grupo-modal-overlay">
            <div className="grupo-modal-content">
              <h2>Advertencia</h2>
              <p className="grupo-modal-message">
                {getMensajeCambio()}
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
          
          {renderInfoDocente()}
          
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
              Este grupo ya tiene evaluaciones finalizadas. Cambiar semestre, carrera, paralelo o materia eliminará todas las evaluaciones.
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
                disabled={carrerasAsignadas.length === 0}
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
                disabled={carrerasAsignadas.length === 0}
              >
                <option value="">Seleccione una carrera</option>
                {carrerasDisponibles.map((carrera, index) => (
                  <option key={index} value={carrera.value}>
                    {carrera.label}
                  </option>
                ))}
              </select>
              {formData.carrera !== originalData.carrera && (
                <p className="warning-text">Atención: Cambiar la carrera desasignará a todos los estudiantes.</p>
              )}
              {tieneEvaluaciones && formData.carrera !== originalData.carrera && !evaluacionesEliminadas && (
                <p className="danger-text">Cambiar la carrera eliminará todas las evaluaciones del grupo.</p>
              )}
              {carrerasAsignadas.length > 0 && (
                <p className="help-text">Solo puede asignar carreras que tiene asignadas.</p>
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
                disabled={!formData.carrera || carrerasAsignadas.length === 0}
              >
                <option value="">Seleccione un semestre</option>
                {semestresDisponibles.map((semestre, index) => (
                  <option key={index} value={semestre.value}>
                    {semestre.label}
                  </option>
                ))}
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

            {/* Campo de paralelo - Solo visible cuando es relevante */}
            {mostrarCampoParalelo && (
              <div className={`form-group ${getFieldClass('paralelo')} paralelo-field`}>
                <label htmlFor="paralelo">
                  Paralelo:
                  <span className="required-indicator">*</span>
                </label>
                <select
                  id="paralelo"
                  name="paralelo"
                  value={formData.paralelo}
                  onChange={handleChange}
                  required
                >
                  <option value="">Seleccione un paralelo</option>
                  {paralelosDisponibles.map((paralelo, index) => (
                    <option key={index} value={paralelo.value}>
                      {paralelo.label}
                    </option>
                  ))}
                </select>
                {formData.paralelo !== originalData.paralelo && (
                  <p className="warning-text">Atención: Cambiar el paralelo desasignará a todos los estudiantes.</p>
                )}
                {tieneEvaluaciones && formData.paralelo !== originalData.paralelo && !evaluacionesEliminadas && (
                  <p className="danger-text">Cambiar el paralelo eliminará todas las evaluaciones del grupo.</p>
                )}
                <p className="help-text">
                  Solo podrá asignar estudiantes del mismo paralelo a este grupo.
                </p>
              </div>
            )}
            
            {/* Campo para materia */}
            <div className={`form-group ${getFieldClass('materia')}`}>
              <label htmlFor="materia">Materia:</label>
              <select
                id="materia"
                name="materia"
                value={formData.materia}
                onChange={handleChange}
                required
                disabled={!formData.semestre || materias.length === 0 || carrerasAsignadas.length === 0}
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
                disabled={submitting || Object.values(validFields).some(valid => !valid) || carrerasAsignadas.length === 0}
              >
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <style jsx>{`
        .docente-info {
          margin-bottom: 1.5rem;
          padding: 15px;
          background-color: #f8f9fa;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        
        .docente-carreras {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .docente-label {
          font-weight: 600;
          color: #495057;
          font-size: 14px;
        }
        
        .carreras-docente {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .carrera-docente {
          background-color: #28a745;
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
        }
        
        .help-text {
          font-size: 12px;
          color: #6c757d;
          margin-top: 5px;
          font-style: italic;
        }
        
        .warning-text {
          font-size: 12px;
          color: #856404;
          margin-top: 5px;
          font-weight: 500;
        }
        
        .danger-text {
          font-size: 12px;
          color: #721c24;
          margin-top: 5px;
          font-weight: 500;
        }
        .required-indicator {
          color: #dc3545;
          margin-left: 4px;
        }

        .info-paralelos {
          margin-top: 2rem;
          padding: 20px;
          background-color: #e8f4fd;
          border-radius: 8px;
          border-left: 4px solid #2196f3;
        }

        .info-paralelos h3 {
          margin-top: 0;
          color: #1976d2;
          font-size: 16px;
        }

        .info-paralelos ul {
          margin-bottom: 0;
          padding-left: 20px;
        }

        .info-paralelos li {
          margin-bottom: 8px;
          font-size: 14px;
          color: #495057;
        }
      `}</style>
    </Layout>
  );
}

export default EditarGrupos;