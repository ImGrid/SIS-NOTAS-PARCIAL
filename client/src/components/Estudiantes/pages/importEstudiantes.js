import React, { useState, useEffect, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getSemestresDisponibles } from '../../../service/estudianteService';
import { 
  importarEstudiantesDesdeExcel,
  generarReporteImportacion,
  descargarReporteCSV
} from '../../../util/import/importacionUtils';
import { 
  validarPermisosDocente 
} from '../../../util/import/validacionImport';
import { 
  validarArchivo,
  descargarTemplate,
  FORMATO_EXCEL
} from '../../../util/import/excelProcessor';
import '../style/importEstudiantes.css';

// Iconos SVG personalizados
const Icons = {
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  ),
  Upload: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7,10 12,5 17,10"></polyline>
      <line x1="12" y1="5" x2="12" y2="15"></line>
    </svg>
  ),
  Download: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7,10 12,15 17,10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  ),
  FileText: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14,2 14,8 20,8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10,9 9,9 8,9"></polyline>
    </svg>
  ),
  AlertTriangle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  CheckCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22,4 12,14.01 9,11.01"></polyline>
    </svg>
  ),
  AlertCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
    </svg>
  ),
  BarChart: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="16"></line>
    </svg>
  ),
  RefreshCw: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
      <path d="M21 3v5h-5"></path>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
      <path d="M3 21v-5h5"></path>
    </svg>
  ),
  Check: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,6 9,17 4,12"></polyline>
    </svg>
  ),
  Clipboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
  ),
  Filter: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46 22,3"></polygon>
    </svg>
  ),
  Folder: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  File: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14,2 14,8 20,8"></polyline>
    </svg>
  )
};

// Estados del proceso de importación
const ESTADOS_IMPORTACION = {
  INICIAL: 'inicial',
  PROCESANDO: 'procesando',
  COMPLETADO: 'completado',
  ERROR: 'error'
};

// Fases del proceso con iconos SVG
const FASES_PROCESO = {
  preparacion: { nombre: 'Preparación', Icono: Icons.Clipboard },
  validacion: { nombre: 'Validación', Icono: Icons.Search },
  procesamiento: { nombre: 'Procesando Excel', Icono: Icons.BarChart },
  filtrado: { nombre: 'Aplicando Filtros', Icono: Icons.Filter },
  duplicados: { nombre: 'Verificando Duplicados', Icono: Icons.RefreshCw },
  importacion: { nombre: 'Importando', Icono: Icons.Upload },
  completado: { nombre: 'Completado', Icono: Icons.CheckCircle },
  error: { nombre: 'Error', Icono: Icons.AlertCircle }
};

function ImportarEstudiantes({ isOpen, onClose, onImportacionExitosa }) {
  // Estados para filtros
  const [carreraSeleccionada, setCarreraSeleccionada] = useState('');
  const [semestreSeleccionado, setSemestreSeleccionado] = useState('');
  const [paraleloSeleccionado, setParaleloSeleccionado] = useState('');
  
  // Estado para archivo y validación
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [validacionArchivo, setValidacionArchivo] = useState(null);
  
  // Estados para carreras y paralelos
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);
  const [errorPermisos, setErrorPermisos] = useState('');

  // Estados de importación
  const [estadoImportacion, setEstadoImportacion] = useState(ESTADOS_IMPORTACION.INICIAL);
  const [progresoImportacion, setProgresoImportacion] = useState({
    fase: 'preparacion',
    porcentaje: 0,
    mensaje: '',
    detalles: null
  });
  const [resultadosImportacion, setResultadosImportacion] = useState(null);
  const [reporteDetallado, setReporteDetallado] = useState(null);

  // Estados para confirmación
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [resumenPreImportacion, setResumenPreImportacion] = useState(null);

  // Efecto para cargar las carreras del docente y validar permisos
  useEffect(() => {
    if (isOpen) {
      // Validar permisos primero
      const validacionPermisos = validarPermisosDocente();
      
      if (!validacionPermisos.valido) {
        setErrorPermisos(validacionPermisos.errores.join(', '));
        return;
      }

      const carreras = validacionPermisos.carreras;
      
      // Verificar si el docente tiene Ciencias Básicas asignada
      const tieneCienciasBasicas = carreras.includes('Ciencias Básicas');
      setDocenteTieneCienciasBasicas(tieneCienciasBasicas);
      
      // Filtrar las opciones de carreras para el selector
      const opcionesCarreras = carreras.map(carrera => ({
        value: carrera,
        label: carrera
      }));
      
      setCarrerasDisponibles(opcionesCarreras);
      setErrorPermisos('');
    }
  }, [isOpen]);
  // Calcular elementos dinámicos para paralelos
  const elementosCalculados = useMemo(() => {
    // Determinar si mostrar filtro de paralelo
    const estudiantesAMostrar = carreraSeleccionada === 'Ciencias Básicas';
    const mostrarFiltroParalelo = docenteTieneCienciasBasicas && estudiantesAMostrar;
    
    // Paralelos disponibles para Ciencias Básicas
    const paralelosDisponibles = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(paralelo => ({
      value: paralelo,
      label: `Paralelo ${paralelo}`
    }));
    
    return {
      mostrarFiltroParalelo,
      paralelosDisponibles
    };
  }, [carreraSeleccionada, docenteTieneCienciasBasicas]);

  // Manejar cambio en filtro de carrera
  const handleCarreraChange = (e) => {
    const nuevaCarrera = e.target.value;
    setCarreraSeleccionada(nuevaCarrera);
    
    // Resetear otros filtros relacionados
    setSemestreSeleccionado('');
    setParaleloSeleccionado('');
  };

  // Manejar cambio en filtro de semestre
  const handleSemestreChange = (e) => {
    const nuevoSemestre = e.target.value;
    setSemestreSeleccionado(nuevoSemestre);
  };

  // Manejar cambio en filtro de paralelo
  const handleParaleloChange = (e) => {
    const nuevoParalelo = e.target.value;
    setParaleloSeleccionado(nuevoParalelo);
  };

  // Manejar selección de archivo
  const handleArchivoChange = (e) => {
    const archivo = e.target.files[0];
    setArchivoSeleccionado(archivo);
    
    if (archivo) {
      // Validar archivo inmediatamente
      const validacion = validarArchivo(archivo);
      setValidacionArchivo(validacion);
      
      if (!validacion.valido) {
        toast.error(`Archivo inválido: ${validacion.errores.join(', ')}`);
      } else {
        toast.success('Archivo válido seleccionado');
      }
    } else {
      setValidacionArchivo(null);
    }
  };

  // Manejar drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const archivo = files[0];
      setArchivoSeleccionado(archivo);
      
      // Actualizar el input file
      const fileInput = document.getElementById('imp-est-archivo-input');
      if (fileInput) {
        fileInput.files = files;
      }
      
      // Validar archivo
      const validacion = validarArchivo(archivo);
      setValidacionArchivo(validacion);
      
      if (!validacion.valido) {
        toast.error(`Archivo inválido: ${validacion.errores.join(', ')}`);
      } else {
        toast.success('Archivo válido seleccionado');
      }
    }
  };

  // Callbacks para el proceso de importación
  const callbacksImportacion = useMemo(() => ({
    onProgress: (progreso) => {
      setProgresoImportacion(progreso);
    },
    
    onPhaseChange: (nuevaFase) => {
      console.log(`Cambio de fase: ${nuevaFase}`);
    },
    
    onError: (error, contexto) => {
      console.error(`Error en ${contexto}:`, error);
      setEstadoImportacion(ESTADOS_IMPORTACION.ERROR);
      toast.error(`Error en ${contexto}: ${error.message}`);
    }
  }), []);

  const analizarArchivo = async () => {
    if (!validarFormulario(false)) return;

    try {
      setEstadoImportacion(ESTADOS_IMPORTACION.PROCESANDO);
      setMostrarConfirmacion(false);
      setProgresoImportacion({
        fase: 'procesamiento',
        porcentaje: 0,
        mensaje: 'Analizando archivo...',
        detalles: null
      });

      // Preparar filtros
      const filtros = {};
      if (carreraSeleccionada) filtros.carrera = carreraSeleccionada;
      if (semestreSeleccionado) filtros.semestre = semestreSeleccionado;
      if (paraleloSeleccionado) filtros.paralelo = paraleloSeleccionado;

      const resultado = await importarEstudiantesDesdeExcel(
        archivoSeleccionado,
        filtros,
        callbacksImportacion,
        true // ← NUEVO: soloAnalisis = true
      );

      if (resultado.soloAnalisis) {
        if (resultado.exito && resultado.resumen.listos > 0) {
          setResumenPreImportacion(resultado.resumen);
          setMostrarConfirmacion(true);
          setEstadoImportacion(ESTADOS_IMPORTACION.INICIAL);
          
          toast.success(`Análisis completado: ${resultado.resumen.listos} estudiantes listos para importar`);
        } else {
          setEstadoImportacion(ESTADOS_IMPORTACION.INICIAL); // ← Cambiar a INICIAL, no COMPLETADO
          
          if (resultado.resumen.duplicados > 0 || resultado.resumen.errores > 0) {
            toast.warning(`Análisis completado: ${resultado.resumen.duplicados} duplicados, ${resultado.resumen.errores} errores`);
          } else {
            toast.info('No hay estudiantes válidos para importar con los filtros aplicados');
          }
        }
      }

    } catch (error) {
      console.error('Error al analizar archivo:', error);
      setEstadoImportacion(ESTADOS_IMPORTACION.ERROR);
      toast.error(`Error al analizar archivo: ${error.message}`);
    }
  };

  // Función principal de importación (ejecuta importación real)
  const ejecutarImportacion = async (confirmarImportacion = false) => {
    if (!confirmarImportacion && !validarFormulario()) return;

    try {
      setEstadoImportacion(ESTADOS_IMPORTACION.PROCESANDO);
      setMostrarConfirmacion(false);
      setResultadosImportacion(null);
      setReporteDetallado(null);

      // Preparar filtros
      const filtros = {};
      if (carreraSeleccionada) filtros.carrera = carreraSeleccionada;
      if (semestreSeleccionado) filtros.semestre = semestreSeleccionado;
      if (paraleloSeleccionado) filtros.paralelo = paraleloSeleccionado;

      const resultado = await importarEstudiantesDesdeExcel(
        archivoSeleccionado,
        filtros,
        callbacksImportacion
        // No pasamos cuarto parámetro = soloAnalisis será false
      );

      setEstadoImportacion(ESTADOS_IMPORTACION.COMPLETADO);
      setResultadosImportacion(resultado);

      // Generar reporte detallado
      if (resultado.detalles) {
        const reporte = generarReporteImportacion(
          {
            exitosos: resultado.detalles.importacion?.exitosos || [],
            fallidos: resultado.detalles.importacion?.fallidos || [],
            duplicados: resultado.detalles.duplicados || [],
            estadisticas: resultado.detalles.estadisticas
          },
          {
            archivoNombre: archivoSeleccionado.name,
            filtros
          }
        );
        setReporteDetallado(reporte);
      }

      // Mostrar resultado
      if (resultado.exito) {
        const importados = resultado.detalles?.importacion?.exitosos?.length || 0;
        toast.success(`¡Importación exitosa! ${importados} estudiantes importados correctamente`);
        
        // Notificar al componente padre si hay callback
        if (onImportacionExitosa) {
          onImportacionExitosa(importados);
        }
      } else {
        toast.warning(`Importación completada con observaciones: ${resultado.mensaje}`);
      }

    } catch (error) {
      console.error('Error en importación:', error);
      setEstadoImportacion(ESTADOS_IMPORTACION.ERROR);
      toast.error(`Error en importación: ${error.message}`);
    }
  };

  // Validar formulario antes de procesar
  const validarFormulario = (validarTodo = true) => {
    if (!archivoSeleccionado) {
      toast.error('Por favor, seleccione un archivo');
      return false;
    }
    
    if (!validacionArchivo || !validacionArchivo.valido) {
      toast.error('El archivo seleccionado no es válido');
      return false;
    }
    
    if (validarTodo) {
      if (elementosCalculados.mostrarFiltroParalelo && !paraleloSeleccionado) {
        toast.error('Por favor, seleccione un paralelo para Ciencias Básicas');
        return false;
      }
    }
    
    return true;
  };

  // Función para limpiar todos los filtros y estado
  const limpiarTodo = () => {
    setCarreraSeleccionada('');
    setSemestreSeleccionado('');
    setParaleloSeleccionado('');
    setArchivoSeleccionado(null);
    setValidacionArchivo(null);
    setEstadoImportacion(ESTADOS_IMPORTACION.INICIAL);
    setProgresoImportacion({
      fase: 'preparacion',
      porcentaje: 0,
      mensaje: '',
      detalles: null
    });
    setResultadosImportacion(null);
    setReporteDetallado(null);
    setMostrarConfirmacion(false);
    setResumenPreImportacion(null);
    
    // Limpiar input file
    const fileInput = document.getElementById('imp-est-archivo-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Manejar cierre del modal
  const handleClose = () => {
    limpiarTodo();
    onClose();
  };

  // Descargar template de Excel
  const handleDescargarTemplate = () => {
    try {
      descargarTemplate('template_importacion_estudiantes.xlsx');
      toast.success('Template descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar template');
    }
  };

  // Descargar reporte de resultados
  const handleDescargarReporte = (tipo = 'completo') => {
    if (!reporteDetallado) {
      toast.error('No hay reporte disponible');
      return;
    }
    
    try {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const nombreArchivo = `reporte_importacion_${timestamp}.csv`;
      
      descargarReporteCSV(reporteDetallado, nombreArchivo, tipo);
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      toast.error('Error al descargar reporte');
    }
  };

  // Obtener semestres disponibles para filtro según carrera seleccionada
  const semestresDisponibles = carreraSeleccionada 
    ? getSemestresDisponibles(carreraSeleccionada)
    : [...getSemestresDisponibles('Ingeniería de Sistemas'), ...getSemestresDisponibles('Ciencias Básicas')].filter((v, i, a) => 
        a.findIndex(t => t.value === v.value) === i
      );

  // Componente de barra de progreso
  const BarraProgreso = () => {
    if (estadoImportacion !== ESTADOS_IMPORTACION.PROCESANDO) return null;
    
    const faseActual = FASES_PROCESO[progresoImportacion.fase] || FASES_PROCESO.preparacion;
    const IconoFase = faseActual.Icono;
    
    return (
      <div className="imp-est-progress-container">
        <div className="imp-est-progress-header">
          <span className="imp-est-progress-phase">
            <IconoFase className="imp-est-progress-icon" />
            {faseActual.nombre}
          </span>
          <span className="imp-est-progress-percentage">
            {progresoImportacion.porcentaje}%
          </span>
        </div>
        
        <div className="imp-est-progress-bar">
          <div 
            className="imp-est-progress-fill"
            style={{ width: `${progresoImportacion.porcentaje}%` }}
          />
        </div>
        
        <div className="imp-est-progress-message">
          {progresoImportacion.mensaje}
        </div>
      </div>
    );
  };

  // Componente de confirmación
  const ModalConfirmacion = () => {
    if (!mostrarConfirmacion || !resumenPreImportacion) return null;
    
    return (
      <div className="imp-est-confirmation-overlay">
        <div className="imp-est-confirmation-modal">
          <h3>Confirmar Importación</h3>
          
          <div className="imp-est-confirmation-content">
            <div className="imp-est-summary-stats">
              <div className="imp-est-stat-item success">
                <Icons.CheckCircle className="imp-est-stat-icon" />
                <span className="imp-est-stat-number">{resumenPreImportacion.listos}</span>
                <span className="imp-est-stat-label">Listos para importar</span>
              </div>
              
              {resumenPreImportacion.duplicados > 0 && (
                <div className="imp-est-stat-item warning">
                  <Icons.AlertTriangle className="imp-est-stat-icon" />
                  <span className="imp-est-stat-number">{resumenPreImportacion.duplicados}</span>
                  <span className="imp-est-stat-label">Duplicados (se ignorarán)</span>
                </div>
              )}
              
              {resumenPreImportacion.errores > 0 && (
                <div className="imp-est-stat-item error">
                  <Icons.AlertCircle className="imp-est-stat-icon" />
                  <span className="imp-est-stat-number">{resumenPreImportacion.errores}</span>
                  <span className="imp-est-stat-label">Con errores</span>
                </div>
              )}
            </div>
            
            <p className="imp-est-confirmation-question">
              ¿Desea proceder con la importación de {resumenPreImportacion.listos} estudiantes?
            </p>
          </div>
          
          <div className="imp-est-confirmation-buttons">
            <button 
              className="imp-est-btn-cancel"
              onClick={() => setMostrarConfirmacion(false)}
            >
              Cancelar
            </button>
            <button 
              className="imp-est-btn-confirm"
              onClick={() => ejecutarImportacion(true)}
            >
              <Icons.Upload className="imp-est-btn-icon" />
              Confirmar Importación
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Componente de resultados
  const PanelResultados = () => {
    if (!resultadosImportacion || estadoImportacion !== ESTADOS_IMPORTACION.COMPLETADO) return null;
    
    const { resumen, detalles } = resultadosImportacion;
    const importados = detalles?.importacion?.exitosos?.length || 0;
    const fallidos = detalles?.importacion?.fallidos?.length || 0;
    
    return (
      <div className="imp-est-results-panel">
        <h3>Resultados de la Importación</h3>
        
        <div className="imp-est-results-summary">
          <div className="imp-est-result-stat success">
            <Icons.CheckCircle className="imp-est-result-icon" />
            <span className="imp-est-result-number">{importados}</span>
            <span className="imp-est-result-label">Importados exitosamente</span>
          </div>
          
          {resumen.duplicados > 0 && (
            <div className="imp-est-result-stat warning">
              <Icons.AlertTriangle className="imp-est-result-icon" />
              <span className="imp-est-result-number">{resumen.duplicados}</span>
              <span className="imp-est-result-label">Duplicados ignorados</span>
            </div>
          )}
          
          {(resumen.errores + fallidos) > 0 && (
            <div className="imp-est-result-stat error">
              <Icons.AlertCircle className="imp-est-result-icon" />
              <span className="imp-est-result-number">{resumen.errores + fallidos}</span>
              <span className="imp-est-result-label">Con errores</span>
            </div>
          )}
        </div>
        
        {reporteDetallado && (
          <div className="imp-est-download-section">
            <p>Descargar reportes detallados:</p>
            <div className="imp-est-download-buttons">
              <button 
                className="imp-est-btn-download"
                onClick={() => handleDescargarReporte('completo')}
              >
                <Icons.FileText className="imp-est-btn-icon" />
                Reporte Completo
              </button>
              {importados > 0 && (
                <button 
                  className="imp-est-btn-download"
                  onClick={() => handleDescargarReporte('exitosos')}
                >
                  <Icons.CheckCircle className="imp-est-btn-icon" />
                  Solo Exitosos
                </button>
              )}
              {resumen.duplicados > 0 && (
                <button 
                  className="imp-est-btn-download"
                  onClick={() => handleDescargarReporte('duplicados')}
                >
                  <Icons.AlertTriangle className="imp-est-btn-icon" />
                  Solo Duplicados
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  // Si hay error de permisos, mostrar solo el error
  if (errorPermisos) {
    return (
      <>
        <div className="imp-est-overlay" onClick={handleClose}>
          <div className="imp-est-modal" onClick={(e) => e.stopPropagation()}>
            <div className="imp-est-header">
              <h2 className="imp-est-title">Importar Estudiantes</h2>
              <button className="imp-est-btn-close" onClick={handleClose}>
                <Icons.X />
              </button>
            </div>

            <div className="imp-est-content">
              <div className="imp-est-error-message">
                <Icons.AlertCircle className="imp-est-error-icon" />
                <p>{errorPermisos}</p>
                <button className="imp-est-btn-cancel" onClick={handleClose}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
        <ToastContainer position="top-right" autoClose={3000} />
      </>
    );
  }

  return (
    <>
      <div className="imp-est-overlay" onClick={handleClose}>
        <div className="imp-est-modal" onClick={(e) => e.stopPropagation()}>
          <div className="imp-est-header">
            <h2 className="imp-est-title">Importar Estudiantes</h2>
            <button className="imp-est-btn-close" onClick={handleClose}>
              <Icons.X />
            </button>
          </div>

          <div className="imp-est-content">
            {/* Barra de progreso */}
            <BarraProgreso />

            {/* Panel de resultados */}
            <PanelResultados />

            {/* Formulario principal (solo visible si no hay resultados) */}
            {estadoImportacion !== ESTADOS_IMPORTACION.COMPLETADO && (
              <>
                {/* Información sobre el formato */}
                <div className="imp-est-info-section">
                  <div className="imp-est-info-box">
                    <h4>
                      <Icons.Clipboard className="imp-est-info-icon" />
                      Formato Requerido del Excel
                    </h4>
                    <div className="imp-est-format-info">
                      <div className="imp-est-format-required">
                        <strong>Columnas obligatorias:</strong>
                        <ul>
                          <li><code>Codigo</code> - Código único del estudiante</li>
                          <li><code>Nombre</code> - Nombre(s) del estudiante</li>
                          <li><code>Apellido</code> - Apellido(s) del estudiante</li>
                          <li><code>Carrera</code> - Nombre de la carrera</li>
                          <li><code>Semestre</code> - Número de semestre (1-10)</li>
                        </ul>
                      </div>
                      <div className="imp-est-format-optional">
                        <strong>Columna condicional:</strong>
                        <ul>
                          <li><code>Paralelo</code> - Solo obligatorio para Ciencias Básicas (A-G)</li>
                        </ul>
                      </div>
                    </div>
                    <button 
                      className="imp-est-btn-template"
                      onClick={handleDescargarTemplate}
                      disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                    >
                      <Icons.Download className="imp-est-btn-icon" />
                      Descargar Template de Ejemplo
                    </button>
                  </div>
                </div>

                {/* Filtros */}
                <div className="imp-est-filters-section">
                  <h3 className="imp-est-section-title">
                    <Icons.Filter className="imp-est-section-icon" />
                    Filtros de Importación
                  </h3>
                  
                  <div className="imp-est-filters-grid">
                    <div className="imp-est-filter-item">
                      <label htmlFor="imp-est-carrera-select" className="imp-est-label">
                        Carrera:
                      </label>
                      <select
                        id="imp-est-carrera-select"
                        className="imp-est-select"
                        value={carreraSeleccionada}
                        onChange={handleCarreraChange}
                        disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                      >
                        <option value="">Todas mis carreras</option>
                        {carrerasDisponibles.map((carrera, index) => (
                          <option key={index} value={carrera.value}>
                            {carrera.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="imp-est-filter-item">
                      <label htmlFor="imp-est-semestre-select" className="imp-est-label">
                        Semestre:
                      </label>
                      <select
                        id="imp-est-semestre-select"
                        className="imp-est-select"
                        value={semestreSeleccionado}
                        onChange={handleSemestreChange}
                        disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                      >
                        <option value="">Todos los semestres</option>
                        {semestresDisponibles.map((semestre) => (
                          <option key={semestre.value} value={semestre.value}>
                            {semestre.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Filtro de paralelo - Solo visible cuando es relevante */}
                    {elementosCalculados.mostrarFiltroParalelo && (
                      <div className="imp-est-filter-item imp-est-paralelo-filter">
                        <label htmlFor="imp-est-paralelo-select" className="imp-est-label">
                          Paralelo:
                          <span className="imp-est-required">*</span>
                        </label>
                        <select
                          id="imp-est-paralelo-select"
                          className="imp-est-select"
                          value={paraleloSeleccionado}
                          onChange={handleParaleloChange}
                          disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                        >
                          <option value="">Seleccione un paralelo</option>
                          {elementosCalculados.paralelosDisponibles.map((paralelo) => (
                            <option key={paralelo.value} value={paralelo.value}>
                              {paralelo.label}
                            </option>
                          ))}
                        </select>
                        <p className="imp-est-help-text">
                          Solo se importarán estudiantes del paralelo seleccionado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selector de archivo */}
                <div className="imp-est-file-section">
                  <h3 className="imp-est-section-title">
                    <Icons.File className="imp-est-section-icon" />
                    Seleccionar Archivo Excel
                  </h3>
                  
                  <div 
                    className={`imp-est-upload-zone ${validacionArchivo?.valido ? 'valid' : ''} ${validacionArchivo && !validacionArchivo.valido ? 'invalid' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="imp-est-upload-content">
                      <div className="imp-est-upload-icon">
                        {validacionArchivo?.valido ? (
                          <Icons.CheckCircle className="imp-est-icon-valid" />
                        ) : (
                          <Icons.Upload className="imp-est-icon-default" />
                        )}
                      </div>
                      
                      <div className="imp-est-upload-text">
                        {archivoSeleccionado ? (
                          <div className="imp-est-file-selected">
                            <span className="imp-est-file-name">{archivoSeleccionado.name}</span>
                            <span className="imp-est-file-size">
                              ({(archivoSeleccionado.size / 1024).toFixed(2)} KB)
                            </span>
                            {validacionArchivo && (
                              <div className="imp-est-validation-status">
                                {validacionArchivo.valido ? (
                                  <span className="imp-est-valid">
                                    <Icons.Check /> Archivo válido
                                  </span>
                                ) : (
                                  <span className="imp-est-invalid">
                                    <Icons.AlertCircle /> {validacionArchivo.errores.join(', ')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="imp-est-file-placeholder">
                            <span className="imp-est-main-text">Haga clic para seleccionar un archivo</span>
                            <span className="imp-est-sub-text">o arrastre el archivo aquí</span>
                          </div>
                        )}
                      </div>
                      
                      <input
                        type="file"
                        id="imp-est-archivo-input"
                        accept={FORMATO_EXCEL.EXTENSIONES_VALIDAS.join(',')}
                        onChange={handleArchivoChange}
                        className="imp-est-file-input"
                        disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                      />
                      
                      <button 
                        type="button" 
                        className="imp-est-btn-select-file"
                        onClick={() => document.getElementById('imp-est-archivo-input').click()}
                        disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
                      >
                        <Icons.Folder className="imp-est-btn-icon" />
                        Seleccionar Archivo
                      </button>
                    </div>
                  </div>
                  
                  <div className="imp-est-file-help">
                    <p className="imp-est-help-item">
                      <Icons.Folder /> Formatos soportados: {FORMATO_EXCEL.EXTENSIONES_VALIDAS.join(', ')}
                    </p>
                    <p className="imp-est-help-item">
                      <Icons.BarChart /> Tamaño máximo: {FORMATO_EXCEL.TAMANO_MAXIMO / (1024 * 1024)}MB
                    </p>
                    <p className="imp-est-help-item">
                      <Icons.FileText /> Máximo {FORMATO_EXCEL.MAX_FILAS} estudiantes por archivo
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="imp-est-footer">
            <button 
              className="imp-est-btn-clear" 
              onClick={limpiarTodo}
              disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
            >
              Limpiar
            </button>
            <button 
              className="imp-est-btn-cancel" 
              onClick={handleClose}
              disabled={estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO}
            >
              {estadoImportacion === ESTADOS_IMPORTACION.COMPLETADO ? 'Cerrar' : 'Cancelar'}
            </button>
            
            {estadoImportacion !== ESTADOS_IMPORTACION.COMPLETADO && (
              <>
                <button 
                  className="imp-est-btn-analyze"
                  onClick={analizarArchivo}
                  disabled={
                    estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO ||
                    !archivoSeleccionado || 
                    !validacionArchivo?.valido
                  }
                >
                  <Icons.Search className="imp-est-btn-icon" />
                  Analizar Archivo
                </button>
                <button 
                  className="imp-est-btn-import"
                  onClick={() => ejecutarImportacion(false)}
                  disabled={
                    estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO ||
                    !archivoSeleccionado || 
                    !validacionArchivo?.valido ||
                    (elementosCalculados.mostrarFiltroParalelo && !paraleloSeleccionado)
                  }
                >
                  {estadoImportacion === ESTADOS_IMPORTACION.PROCESANDO ? (
                    <>
                      <Icons.RefreshCw className="imp-est-btn-icon imp-est-loading" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Icons.Upload className="imp-est-btn-icon" />
                      Importar Directamente
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal de confirmación */}
      <ModalConfirmacion />
      
      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default ImportarEstudiantes;