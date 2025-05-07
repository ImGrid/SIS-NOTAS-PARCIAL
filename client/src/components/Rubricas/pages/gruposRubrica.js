import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import '../style/gruposRubrica.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import OrientationDetector from '../../OrientationDetector';
import supRubricaService from '../../../service/supRubricaService';

import { getGrupoPorId } from '../../../service/grupoService';
import { getEstudiantesByGrupoId } from '../../../service/estudianteService';
import { 
  evaluarGrupo, 
  cargarDatosEvaluacionExistente, 
} from '../../../service/informeService';

import { 
  guardarBorrador,
  getBorradorPorDocenteYGrupo,
  eliminarBorradorPorDocenteYGrupo
} from '../../../service/borradorService';
import { 
  ESTRUCTURA_RUBRICA, 
  obtenerColorCalificacion,
  calcularCalificacionesEstructuradas,
  calcularNotaFinal,
  determinarResultadoFinal,
  obtenerCriteriosFaltantes
} from '../../../util/calculo';

// Funciones existentes para cargar/guardar borradores
const cargarBorradorRemoto = async (grupoId) => {
  // Si no tenemos un grupoId válido, no intentar cargar
  if (!grupoId) return null;
  
  try {
    const usuarioString = sessionStorage.getItem('usuario');
    if (!usuarioString) {
      return null;
    }
    
    const usuario = JSON.parse(usuarioString);
    const docenteId = usuario.id;
    
    // Verificación preliminar: si no hay docente, no hacer la petición
    if (!docenteId) {
      return null;
    }
    
    // Intenta obtener el borrador silenciosamente (sin llenar los logs de errores)
    let borrador = null;
    try {
      borrador = await getBorradorPorDocenteYGrupo(docenteId, grupoId);
    } catch (error) {
      // Error silencioso
      console.log('Error controlado al intentar cargar borrador:', error.message);
      return null;
    }
    
    if (!borrador) {
      console.log('No se encontró borrador para el docente ID:', docenteId, 'y grupo ID:', grupoId);
      return null;
    }
    
    // Filtrar solo los criterios de evaluación reales
    const contenido = borrador.contenido || {};
    const calificacionesLimpias = {};

    Object.keys(contenido).forEach(estudianteId => {
      calificacionesLimpias[estudianteId] = {};
      
      Object.keys(contenido[estudianteId] || {}).forEach(campo => {
        // Excluir los campos de metadatos Y TAMBIÉN docente_id
        if (!campo.startsWith('_') && 
            !['docente_id', 'comentarios', 'observaciones'].includes(campo)) {
          calificacionesLimpias[estudianteId][campo] = contenido[estudianteId][campo];
        }
      });
    });
    
    // Convertir al formato esperado por el componente
    return {
      docenteId: borrador.docente_id,
      grupoId: borrador.grupo_id,
      calificaciones: calificacionesLimpias,
      observaciones: borrador.observaciones || '',
      timestamp: borrador.ultima_modificacion,
      progresoEvaluacion: borrador.progreso
    };
  } catch (error) {
    // Error silencioso para no llenar la consola
    console.log('Error general al cargar borrador:', error.message);
    return null;
  }
};

const guardarBorradorRemoto = async (grupoId, calificaciones, observaciones, progresoEvaluacion) => {
  try {
    const usuarioString = sessionStorage.getItem('usuario');
    if (!usuarioString) {
      console.error('No hay usuario en sesión');
      return false;
    }

    const usuario = JSON.parse(usuarioString);
    const docenteId = usuario.id;
    
    // Filtrar los datos para asegurar que solo se guardan los criterios de evaluación
    const calificacionesLimpias = {};

    Object.keys(calificaciones).forEach(estudianteId => {
      calificacionesLimpias[estudianteId] = {};
      
      // Incluir solo campos de criterios (excluir metadatos)
      Object.keys(calificaciones[estudianteId] || {}).forEach(campo => {
        if (!campo.startsWith('_') && 
            !['docente_id', 'comentarios', 'observaciones'].includes(campo)) {
          calificacionesLimpias[estudianteId][campo] = calificaciones[estudianteId][campo];
        }
      });
      
      // Ya no añadimos docente_id dentro del objeto de calificaciones
      // Esto evita que se mezcle con los criterios
    });
    
    const datosBorrador = {
      docente_id: docenteId,
      grupo_id: grupoId,
      contenido: calificacionesLimpias,
      observaciones,
      progreso: progresoEvaluacion
    };
    
    await guardarBorrador(datosBorrador);
    return true;
  } catch (error) {
    console.error('Error al guardar borrador remoto:', error);
    return false;
  }
};

const eliminarBorradorRemoto = async (grupoId) => {
  try {
    const usuarioString = sessionStorage.getItem('usuario');
    if (!usuarioString) return;
    
    const usuario = JSON.parse(usuarioString);
    const docenteId = usuario.id;
    
    await eliminarBorradorPorDocenteYGrupo(docenteId, grupoId);
  } catch (error) {
    console.error('Error al eliminar borrador remoto:', error);
  }
};

function GruposRubrica() {
  // Estados para almacenar datos y controlar UI
  const [grupo, setGrupo] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [criterios, setCriterios] = useState({});
  const [calificaciones, setCalificaciones] = useState({});
  const [seccionActiva, setSeccionActiva] = useState('presentacion');
  const [resultados, setResultados] = useState({});
  const [observaciones, setObservaciones] = useState('');
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState([]);
  const [progresoEvaluacion, setProgresoEvaluacion] = useState(0);
  const [totalCriteriosCompletados, setTotalCriteriosCompletados] = useState(0);
  const [totalCriterios, setTotalCriterios] = useState(0);
  const [habilitadoPorSupervisor, setHabilitadoPorSupervisor] = useState(false);

  // Estado para modo edición o creación
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEvaluacion, setDatosEvaluacion] = useState(null);
  
  // Nuevo estado para controlar si estamos viendo una tabla
  const [isTableView, setIsTableView] = useState(false);
  // Estado para detectar orientación
  const [isPortrait, setIsPortrait] = useState(false);
  // Estado para mostrar indicador de orientación
  const [showOrientationIndicator, setShowOrientationIndicator] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const grupoId = query.get('grupo');

  // Detectar orientación del dispositivo
  useEffect(() => {
    const checkOrientation = () => {
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      setIsPortrait(portrait);
      
      // Solo mostrar el indicador si estamos en vista de tabla y en portrait
      if (portrait && isTableView && window.innerWidth <= 768) {
        setShowOrientationIndicator(true);
      } else {
        setShowOrientationIndicator(false);
      }
    };

    // Comprobar orientación inicial
    checkOrientation();
    
    // Agregar listener para cambios de orientación
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    
    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, [isTableView]);

  // Detectar si estamos en una vista de tabla
  useEffect(() => {
    // Si estamos en cualquier sección excepto 'resumen', consideramos que estamos en vista de tabla
    setIsTableView(seccionActiva !== 'resumen');
    
    // Verificar orientación cuando cambia la sección
    const portrait = window.matchMedia("(orientation: portrait)").matches;
    if (portrait && seccionActiva !== 'resumen' && window.innerWidth <= 768) {
      setShowOrientationIndicator(true);
    } else {
      setShowOrientationIndicator(false);
    }
  }, [seccionActiva]);

  // Obtener datos iniciales 
  useEffect(() => {
    const cargarDatos = async () => {
      if (!grupoId) {
        toast.error('ID de grupo no proporcionado');
        navigate('/evaluaciones/gestionar');
        return;
      }

      try {
        setLoading(true);
        
        const grupoData = await getGrupoPorId(grupoId);
        setGrupo(grupoData);
        
        const estudiantesData = await getEstudiantesByGrupoId(grupoId);
        setEstudiantes(estudiantesData);
        
        // Inicializar calificaciones con valores vacíos
        const calificacionesIniciales = {};
        let contadorTotalCriterios = 0;
        
        estudiantesData.forEach(estudiante => {
          calificacionesIniciales[estudiante.id] = {};
          
          Object.values(ESTRUCTURA_RUBRICA).forEach(seccion => {
            seccion.criterios.forEach(criterio => {
              calificacionesIniciales[estudiante.id][criterio.id] = '';
              contadorTotalCriterios++;
            });
          });
        });        
        
        const criteriosData = {};
        Object.entries(ESTRUCTURA_RUBRICA).forEach(([seccionKey, seccion]) => {
          criteriosData[seccionKey] = seccion.criterios;
        });
        
        setCriterios(criteriosData);
        
        // Primero, verificar si hay evaluación previa
        const datosEvaluacionExistente = await cargarDatosEvaluacionExistente(grupoId, estudiantesData);
        setDatosEvaluacion(datosEvaluacionExistente);
        
        // Verificar si existe una evaluación previa
        const tieneEvaluacionPrevia = datosEvaluacionExistente && 
               datosEvaluacionExistente.tieneEvaluacionPrevia;
        let estaHabilitado = false;
        try {
          const detallesGrupo = await supRubricaService.obtenerRubricasGrupo(grupoId);
          estaHabilitado = detallesGrupo.grupo.habilitacion_activa;
          setHabilitadoPorSupervisor(estaHabilitado);
        } catch (error) {
          console.log('Error al verificar habilitación:', error);
          setHabilitadoPorSupervisor(false);
        }
        
        // Lógica simplificada para mejor claridad
        if (datosEvaluacionExistente.fuenteDatos === 'borrador') {
          setModoEdicion(false);
        } else if (datosEvaluacionExistente.tieneEvaluacionPrevia) {
          // Verificar si está habilitada
          if (estaHabilitado) {
            setModoEdicion(false);
            // Alertar al usuario si los datos son aproximados en un grupo habilitado
            if (datosEvaluacionExistente.fuenteDatos === 'aproximado') {
              toast.warning(
                'Atención: Los criterios que está viendo son aproximados. ' +
                'Pueden no ser exactamente los mismos que ingresó originalmente.',
                { autoClose: 8000 }
              );
            }
          } else {
            // Si no está habilitada, mantener en modo solo lectura
            setModoEdicion(true);
            toast.warning('Esta evaluación ya ha sido finalizada. Solo podrá verla en modo consulta, no se permiten modificaciones.', {
              autoClose: 5000
            });
          }
        } else {
          // Nueva evaluación o borrador, siempre editable
          setModoEdicion(false);
        }
        
        // Inicializar con valores vacíos por defecto
        let calificacionesFinales = calificacionesIniciales;
        
        // Si hay evaluación previa, cargar esos datos en lugar de buscar borrador
        if (tieneEvaluacionPrevia) {
          calificacionesFinales = datosEvaluacionExistente.calificacionesPorEstudiante;
          // Buscar comentarios generales en el primer informe
          if (datosEvaluacionExistente.informes.length > 0) {
            setObservaciones(datosEvaluacionExistente.informes[0].comentarios_generales || '');
          }
          toast.info('Datos de evaluación previa cargados correctamente');
        } else {
          // Solo si NO hay evaluación previa, verificar si hay borrador
          try {
            const borrador = await cargarBorradorRemoto(grupoId);
            
            if (borrador) {
              // Cargar borrador automáticamente sin preguntar
              calificacionesFinales = borrador.calificaciones;
              setObservaciones(borrador.observaciones || '');
            }
          } catch (error) {
            console.log('No se encontró borrador, usando valores iniciales:', error);
          }
        }
        
        // Establecer las calificaciones finales
        setCalificaciones(calificacionesFinales);
        setTotalCriterios(contadorTotalCriterios);
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        toast.error('Error al cargar datos del grupo');
        setLoading(false);
      }
    };
  
    cargarDatos();
  }, [grupoId, navigate]);

  useEffect(() => {
    if (Object.keys(calificaciones).length === 0) return;
    
    let totalCriterios = 0;
    let criteriosCompletados = 0;
    
    // Lista de campos que debemos excluir del conteo
    const camposExcluidos = [
      'docente_id', 
      'observaciones', 
      'comentarios'
    ];
    
    Object.keys(calificaciones).forEach(estudianteId => {
      const criteriosEstudiante = calificaciones[estudianteId];
      
      Object.keys(criteriosEstudiante).forEach(criterioId => {
        if (!criterioId.startsWith('_') && !camposExcluidos.includes(criterioId)) {
          totalCriterios++;
          if (criteriosEstudiante[criterioId] !== '') {
            criteriosCompletados++;
          }
        }
      });
    });    
    const porcentaje = totalCriterios > 0 
      ? Math.round((criteriosCompletados / totalCriterios) * 100) 
      : 0;
      
    setProgresoEvaluacion(porcentaje);
    setTotalCriteriosCompletados(criteriosCompletados);
    setTotalCriterios(totalCriterios);
    
    calcularResultados();
  }, [calificaciones]);

  useEffect(() => {
    if (Object.keys(calificaciones).length > 0 && !loading) {
      const interval = setInterval(async () => {
        console.log('Guardado automático ejecutándose');
        const resultado = await guardarBorradorRemoto(grupoId, calificaciones, observaciones, progresoEvaluacion);
        
        if (resultado) {
          toast.info('Borrador guardado automáticamente', {
            autoClose: 1000, // Cierra más rápido
            position: 'bottom-right', // Posición menos intrusiva
            hideProgressBar: true,
            pauseOnHover: false
          });
        }
      }, 200000); // Guardar cada minuto
      
      return () => clearInterval(interval);
    }
  }, [calificaciones, observaciones, loading, grupoId, progresoEvaluacion]);

  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (Object.keys(calificaciones).length > 0) {
        // Es necesario usar la versión síncrona para beforeunload
        // El guardado asíncrono podría no completarse antes de cerrar
        try {
          localStorage.setItem('temp_borrador', JSON.stringify({
            grupoId,
            calificaciones,
            observaciones,
            progresoEvaluacion
          }));
        } catch (e) {
          console.error('Error guardando temporal:', e);
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [calificaciones, observaciones, grupoId, progresoEvaluacion]);

  useEffect(() => {
    return () => {
      // Cuando el componente se desmonta, verificar si hay un guardado temporal
      const tempData = localStorage.getItem('temp_borrador');
      if (tempData) {
        try {
          const data = JSON.parse(tempData);
          if (data.grupoId === grupoId) {
            // Enviar de forma asíncrona y luego limpiar
            guardarBorradorRemoto(
              data.grupoId, 
              data.calificaciones, 
              data.observaciones, 
              data.progresoEvaluacion
            ).finally(() => {
              localStorage.removeItem('temp_borrador');
            });
          }
        } catch (e) {
          console.error('Error procesando guardado temporal:', e);
          localStorage.removeItem('temp_borrador');
        }
      }
    };
  }, [grupoId]);

  const calcularResultados = () => {
    const resultadosCalculados = {};
    
    Object.keys(calificaciones).forEach(estudianteId => {
      const calificacionesEstudiante = { ...calificaciones[estudianteId] };
      
      // Filtrar todos los campos que no son criterios válidos
      const soloCalificaciones = {};
      for (const key in calificacionesEstudiante) {
        if (!key.startsWith('_') && 
            !['docente_id', 'comentarios', 'observaciones'].includes(key)) {
          soloCalificaciones[key] = calificacionesEstudiante[key];
        }
      }
      
      const calificacionesEstructuradas = calcularCalificacionesEstructuradas(soloCalificaciones);
      
      const notaFinal = calcularNotaFinal(calificacionesEstructuradas);
      
      const resultado = determinarResultadoFinal(notaFinal);
      
      resultadosCalculados[estudianteId] = {
        calificacionesEstructuradas,
        notaFinal,
        resultado
      };
    });
    
    setResultados(resultadosCalculados);
  };

  const handleCalificacionChange = (estudianteId, criterioId, valor) => {
    setCalificaciones(prev => ({
      ...prev,
      [estudianteId]: {
        ...prev[estudianteId],
        [criterioId]: valor
      }
    }));
  };

  const cambiarSeccion = (seccion) => {
    setSeccionActiva(seccion);
  };

  const validarCalificaciones = () => {
    const errores = [];
    
    Object.keys(calificaciones).forEach(estudianteId => {
      const estudianteActual = estudiantes.find(e => e.id.toString() === estudianteId.toString());
      
      // Crear una copia de las calificaciones sin propiedades que comienzan con "_"
      const calificacionesFiltradas = {};
      for (const key in calificaciones[estudianteId]) {
        if (!key.startsWith('_')) {
          calificacionesFiltradas[key] = calificaciones[estudianteId][key];
        }
      }
      
      const criteriosFaltantes = obtenerCriteriosFaltantes(calificacionesFiltradas);
      
      if (criteriosFaltantes.length > 0) {
        errores.push({
          estudianteId,
          nombre: `${estudianteActual?.nombre || ''} ${estudianteActual?.apellido || ''}`,
          criterios: criteriosFaltantes
        });
      }
    });
    
    setErrores(errores);
    return errores.length === 0;
  };

  const guardarEvaluacion = async (finalizar = false) => {
    if (finalizar) {
      if (!validarCalificaciones()) {
        toast.error('Faltan criterios por evaluar. No se puede finalizar la evaluación.');
        return;
      }
      
      // Mostrar advertencia clara sobre la finalización
      const confirmarFinalizacion = window.confirm(
        'ADVERTENCIA: Una vez finalizada la evaluación, NO PODRÁ MODIFICARLA posteriormente. ' +
        '¿Está seguro que desea finalizar y guardar permanentemente esta evaluación?'
      );
      
      if (!confirmarFinalizacion) {
        toast.info('Operación cancelada. Puede seguir editando la evaluación.');
        return;
      }
    }
    
    try {
      setGuardando(true);      
      let docenteId;
      const usuarioString = sessionStorage.getItem('usuario');
      if (usuarioString) {
        try {
          const usuario = JSON.parse(usuarioString);
          docenteId = usuario.id;
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
        }
      }
      
      if (!docenteId) {
        toast.error('No se pudo obtener la información del docente');
        setGuardando(false);
        return;
      }
      
      const calificacionesConObservaciones = {};
  
      Object.keys(calificaciones).forEach(estudianteId => {
        // Obtener el resultado (aprobado/reprobado) para este estudiante
        const resultado = resultados[estudianteId]?.resultado || 'PENDIENTE';
        
        // Tomar solo los criterios legítimos y agregar campos necesarios
        const criteriosEstudiante = {};
        Object.keys(calificaciones[estudianteId] || {}).forEach(campo => {
          if (!campo.startsWith('_') && 
              !['docente_id', 'comentarios', 'observaciones'].includes(campo)) {
            criteriosEstudiante[campo] = calificaciones[estudianteId][campo];
          }
        });
        
        calificacionesConObservaciones[estudianteId] = {
          ...criteriosEstudiante,
          observaciones: resultado, 
          comentarios: observaciones, 
        };
      });
      
      const asignatura = grupo?.materia || 'Proyecto';
      
      if (!finalizar) {
        // Usar la función remota en lugar de local
        const guardadoExitoso = await guardarBorradorRemoto(grupoId, calificaciones, observaciones, progresoEvaluacion);
        
        if (guardadoExitoso) {
          toast.success('Borrador guardado correctamente');
        } else {
          toast.error('Error al guardar el borrador');
        }
        
        setGuardando(false);
        return;
      }
      const resultado = await evaluarGrupo(
        grupoId,
        docenteId,
        estudiantes,
        calificacionesConObservaciones,
        asignatura,
        observaciones
      );    
      if (!resultado || resultado.length === 0) {
        throw new Error('No se recibió respuesta del servidor al evaluar el grupo');
      }
      await guardarBorradorRemoto(grupoId, calificaciones, observaciones, 100);
      if (finalizar && habilitadoPorSupervisor) {
        try {
          // Obtener los detalles del grupo para encontrar el ID de la habilitación
          const detallesGrupo = await supRubricaService.obtenerRubricasGrupo(grupoId);
          
          if (detallesGrupo.grupo && 
              detallesGrupo.grupo.habilitacion_activa && 
              detallesGrupo.grupo.detalle_habilitacion && 
              detallesGrupo.grupo.detalle_habilitacion.id) {
            
            // Desactivar la habilitación usando su ID
            await supRubricaService.desactivarHabilitacion(
              detallesGrupo.grupo.detalle_habilitacion.id
            );
            
            toast.success('Habilitación para edición desactivada. La rúbrica ya no podrá ser modificada.');
          }
        } catch (error) {
          console.error('Error al desactivar habilitación:', error);
          toast.warning('No se pudo desactivar la habilitación. Contacte al administrador.');
        }
      } // 100% completado
      setGuardando(false);
      
      if (modoEdicion) {
        toast.success('Evaluación actualizada correctamente. Recuerde que no podrá modificarla nuevamente.');
      } else {
        toast.success('Evaluación finalizada y guardada permanentemente. Ya no podrá realizar modificaciones.');
      }
      
      navigate('/evaluaciones/gestionar');
      
      return resultado;
    } catch (error) {
      console.error('Error al guardar evaluación:', error);
      let mensajeError = 'Error al guardar la evaluación';
      
      if (error.message) {
        mensajeError = error.message;
      } else if (error.response && error.response.data && error.response.data.error) {
        mensajeError = error.response.data.error;
      }
      
      toast.error(mensajeError);
      setGuardando(false);
    }
  };

  // Componente para mostrar el indicador de giro de dispositivo
  const OrientationIndicator = () => {
    if (!showOrientationIndicator) return null;
    
    return (
      <div className="orientation-indicator show">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="3" width="12" height="18" rx="2" ry="2"></rect>
          <path d="M2 12h4"></path>
          <path d="M18 12h4"></path>
        </svg>
        <span>Rote el dispositivo</span>
      </div>
    );
  };

  const renderizarCriteriosSeccion = () => {
    const seccion = ESTRUCTURA_RUBRICA[seccionActiva];
    if (!seccion) return null;
    
    return (
      <div className="seccion-content">
        <ToastContainer position="top-right" autoClose={3000} />
        <div className="tabla-container">
          <table className="tabla-evaluacion">
            <thead>
              <tr>
                <th className="columna-fija" width="25%">Estudiante</th>
                {criterios[seccionActiva]?.map(criterio => (
                  <th key={criterio.id}>
                    {criterio.nombre}
                    <span className="peso-criterio">({criterio.peso * 100}%)</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estudiantes.map(estudiante => (
                <tr key={estudiante.id} className="estudiante-row">
                  <td className="estudiante-info columna-fija">
                    <div className="estudiante-nombre">{`${estudiante.nombre} ${estudiante.apellido}`}</div>
                    <div className="estudiante-codigo">{estudiante.codigo}</div>
                  </td>
                  
                  {criterios[seccionActiva]?.map(criterio => {
                    const calificacionActual = calificaciones[estudiante.id]?.[criterio.id] || '';
                    const colorCalificacion = obtenerColorCalificacion(calificacionActual);
                    
                    return (
                      <td key={`${estudiante.id}-${criterio.id}`}>
                        {modoEdicion ? (
                          // En modo edición, mostrar solo texto (no select)
                          <div 
                            className="calificacion-readonly"
                            style={{ borderColor: colorCalificacion, color: colorCalificacion }}
                          >
                            {calificacionActual || '-'}
                          </div>
                        ) : (
                          // En modo normal, mostrar select
                          <select 
                            className="dropdown-calificacion"
                            style={{ borderColor: colorCalificacion }}
                            value={calificacionActual}
                            onChange={(e) => handleCalificacionChange(estudiante.id, criterio.id, e.target.value)}
                          >
                            <option value="">Seleccionar</option>
                            <option value="SOBRESALIENTE">SOBRESALIENTE (10)</option>
                            <option value="EXCELENTE">EXCELENTE (9)</option>
                            <option value="MUY BUENO">MUY BUENO (8)</option>
                            <option value="BUENO">BUENO (7)</option>
                            <option value="SATISFACTORIO">SATISFACTORIO (6)</option>
                            <option value="ACEPTABLE">ACEPTABLE (5)</option>
                            <option value="BÁSICAMENTE ACEPTABLE">BÁSICAMENTE ACEPTABLE (4)</option>
                            <option value="INSUFICIENTE">INSUFICIENTE (3)</option>
                            <option value="DEFICIENTE">DEFICIENTE (2)</option>
                            <option value="MUY DEFICIENTE">MUY DEFICIENTE (1)</option>
                          </select>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isPortrait && window.innerWidth <= 768 && <OrientationIndicator />}
      </div>
    );
  };

  const renderizarResumen = () => {
    return (
      <div>
        <div className="tabla-container">
          <table className="tabla-resumen">
            <thead>
              <tr>
                <th className="columna-fija">Estudiante</th>
                <th>Presentación (30%)</th>
                <th>Sustentación (30%)</th>
                <th>Documentación (30%)</th>
                <th>Innovación (10%)</th>
                <th>Nota Final</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {estudiantes.map(estudiante => {
                const resultado = resultados[estudiante.id] || {};
                const calificacionesEstructuradas = resultado.calificacionesEstructuradas || {};
                
                return (
                  <tr key={estudiante.id}>
                    <td className="columna-fija">
                      <div className="estudiante-info">
                        <div className="estudiante-nombre">{`${estudiante.nombre} ${estudiante.apellido}`}</div>
                        <div className="estudiante-codigo">{estudiante.codigo}</div>
                      </div>
                    </td>
                    <td>{calificacionesEstructuradas.presentacion?.calificacion?.toFixed(2) || '-'}</td>
                    <td>{calificacionesEstructuradas.sustentacion?.calificacion?.toFixed(2) || '-'}</td>
                    <td>{calificacionesEstructuradas.documentacion?.calificacion?.toFixed(2) || '-'}</td>
                    <td>{calificacionesEstructuradas.innovacion?.calificacion?.toFixed(2) || '-'}</td>
                    <td className={`nota-final ${resultado.resultado === 'APROBADO' ? 'aprobado' : 'reprobado'}`}>
                      {resultado.notaFinal ? resultado.notaFinal.toFixed(2) : '-'}
                    </td>
                    <td className={`resultado ${resultado.resultado === 'APROBADO' ? 'aprobado' : 'reprobado'}`}>
                      {resultado.resultado || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {errores.length > 0 && (
          <div className="errores-container">
            <h3>Criterios pendientes por evaluar:</h3>
            <ul>
              {errores.map((error, index) => (
                <li key={index}>
                  <strong>{error.nombre}:</strong>
                  <ul>
                    {error.criterios.map(criterio => (
                      <li key={criterio.id}>
                        {criterio.nombre} en sección {criterio.seccion}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="docentes-container rubrica-evaluacion">
        <Sidebar />
        <main className="content content-with-sidebar">
          <div className="loading-indicator">Cargando datos...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="docentes-container rubrica-evaluacion">
      <Sidebar />
      <main className="content content-with-sidebar">
        {/* Componente de detección de orientación para móviles */}
        <OrientationDetector isTableView={isTableView} />
        
        <div className="rubrica-container">
        <header className="rubrica-header">
          <h1>Rúbrica de Evaluación</h1>
          <div className="badge-container">
            {modoEdicion ? (
              <span className="badge badge-warning">Editando evaluación existente</span>
            ) : habilitadoPorSupervisor ? (
              <span className="badge badge-info">Habilitada por Administrador</span>
            ) : (
              <span className="badge badge-info">En progreso</span>
            )}
          </div>
        </header>
          
        <div className="proyecto-info">
          <div className="proyecto-titulo">{grupo?.nombre_proyecto}</div>
          <div className="proyecto-detalles">
            <div className="info-row">
              <div className="info-col">
                <span><strong>Carrera:</strong> {grupo?.carrera}</span>
                <span><strong>Semestre:</strong> {grupo?.semestre}</span>
              </div>
              <div className="info-col">
                <span><strong>Asignatura:</strong> {grupo?.materia || 'Sin materia'}</span>
                <span><strong>Fecha:</strong> {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
          
          <div className="progreso-container">
            <div className="progreso-header">
              <div className="progreso-label">Progreso de evaluación</div>
              <div className="progreso-contador">Criterios ({totalCriteriosCompletados}/{totalCriterios})</div>
            </div>
            <div className="barra-progreso">
              <div 
                className="progreso-valor" 
                style={{width: `${progresoEvaluacion}%`}}
              ></div>
            </div>
            <div className="progreso-texto">{progresoEvaluacion}% completado</div>
          </div>
          
          <div className="tabs-container">
            <div className="tabs">
              <div 
                className={`tab ${seccionActiva === 'presentacion' ? 'active' : ''}`}
                onClick={() => cambiarSeccion('presentacion')}
              >
                Presentación (30%)
              </div>
              <div 
                className={`tab ${seccionActiva === 'sustentacion' ? 'active' : ''}`}
                onClick={() => cambiarSeccion('sustentacion')}
              >
                Sustentación (30%)
              </div>
              <div 
                className={`tab ${seccionActiva === 'documentacion' ? 'active' : ''}`}
                onClick={() => cambiarSeccion('documentacion')}
              >
                Documentación (30%)
              </div>
              <div 
                className={`tab ${seccionActiva === 'innovacion' ? 'active' : ''}`}
                onClick={() => cambiarSeccion('innovacion')}
              >
                Innovación (10%)
              </div>
              <div 
                className={`tab ${seccionActiva === 'resumen' ? 'active' : ''}`}
                onClick={() => cambiarSeccion('resumen')}
              >
                Resumen
              </div>
            </div>
            
            <div className="tab-content">
              {seccionActiva === 'resumen' ? renderizarResumen() : renderizarCriteriosSeccion()}
            </div>
          </div>
          
          <div className="observaciones-container">
            <h3>Observaciones Generales</h3>
            <textarea 
              className="observaciones-input"
              placeholder="Ingrese observaciones sobre el grupo y su desempeño..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              readOnly={modoEdicion} // Hacer readonly en modo edición
              disabled={modoEdicion} // Desactivar en modo edición
            ></textarea>
            {modoEdicion && (
              <div className="readonly-message">
                <i>Las observaciones no pueden ser modificadas porque la evaluación ya ha sido finalizada.</i>
              </div>
            )}
          </div>
          
          <div className="acciones-container">
            <button 
              className="btn btn-cancelar"
              onClick={() => navigate('/evaluaciones/gestionar')}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-guardar"
              onClick={() => guardarEvaluacion(false)}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar borrador'}
            </button>
            <button 
              className="btn btn-finalizar"
              onClick={() => guardarEvaluacion(true)}
              disabled={guardando || (modoEdicion && !habilitadoPorSupervisor)}  // Solo desactivar si es modo edición sin habilitación
            >
              {guardando ? 'Finalizando...' : 'Finalizar evaluación'}
            </button>
          </div>
          <div className="info-guardar">
            <p className="info-texto">
              <strong>Nota:</strong> Al guardar como borrador, podrá continuar editando más tarde.
              {!modoEdicion && (
                <span className="warning-text"> Si finaliza la evaluación, no podrá modificarla posteriormente.</span>
              )}
              {modoEdicion && (
                <span className="warning-text"> Esta evaluación ya fue finalizada y solo está siendo consultada.</span>
              )}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default GruposRubrica;