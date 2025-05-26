import React, { useState, useEffect, useMemo } from 'react';
import '../style/importEstudiantes.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getSemestresDisponibles } from '../../../service/estudianteService';

// Importar iconos de react-feather
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Search,
  BarChart2,
  RefreshCw,
  Check,
  Clipboard,
  Filter,
  Folder,
  File
} from 'react-feather';

// Importar utilidades de importación
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

// Estados del proceso de importación
const ESTADOS_IMPORTACION = {
  INICIAL: 'inicial',
  PROCESANDO: 'procesando',
  COMPLETADO: 'completado',
  ERROR: 'error'
};

// Fases del proceso con iconos de react-feather
const FASES_PROCESO = {
  preparacion: { nombre: 'Preparación', Icono: Clipboard },
  validacion: { nombre: 'Validación', Icono: Search },
  procesamiento: { nombre: 'Procesando Excel', Icono: BarChart2 },
  filtrado: { nombre: 'Aplicando Filtros', Icono: Filter },
  duplicados: { nombre: 'Verificando Duplicados', Icono: RefreshCw },
  importacion: { nombre: 'Importando', Icono: Upload },
  completado: { nombre: 'Completado', Icono: CheckCircle },
  error: { nombre: 'Error', Icono: AlertCircle }
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

  // ✅ FUNCIÓN CORREGIDA: Solo analiza sin importar
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

      // ✅ CORREGIDO: Agregar parámetro soloAnalisis = true
      const resultado = await importarEstudiantesDesdeExcel(
        archivoSeleccionado,
        filtros,
        callbacksImportacion,
        true // ← NUEVO: soloAnalisis = true
      );

      // ✅ CORREGIDO: Manejar resultado de solo análisis
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

      // ✅ CORRECTO: Ejecutar importación completa (soloAnalisis = false por defecto)
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
            <IconoFase size={16} className="imp-est-progress-icon" />
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
                <CheckCircle size={20} className="imp-est-stat-icon" />
                <span className="imp-est-stat-number">{resumenPreImportacion.listos}</span>
                <span className="imp-est-stat-label">Listos para importar</span>
              </div>
              
              {resumenPreImportacion.duplicados > 0 && (
                <div className="imp-est-stat-item warning">
                  <AlertTriangle size={20} className="imp-est-stat-icon" />
                  <span className="imp-est-stat-number">{resumenPreImportacion.duplicados}</span>
                  <span className="imp-est-stat-label">Duplicados (se ignorarán)</span>
                </div>
              )}
              
              {resumenPreImportacion.errores > 0 && (
                <div className="imp-est-stat-item error">
                  <AlertCircle size={20} className="imp-est-stat-icon" />
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
              <Upload size={16} className="imp-est-btn-icon" />
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
            <CheckCircle size={24} className="imp-est-result-icon" />
            <span className="imp-est-result-number">{importados}</span>
            <span className="imp-est-result-label">Importados exitosamente</span>
          </div>
          
          {resumen.duplicados > 0 && (
            <div className="imp-est-result-stat warning">
              <AlertTriangle size={24} className="imp-est-result-icon" />
              <span className="imp-est-result-number">{resumen.duplicados}</span>
              <span className="imp-est-result-label">Duplicados ignorados</span>
            </div>
          )}
          
          {(resumen.errores + fallidos) > 0 && (
            <div className="imp-est-result-stat error">
              <AlertCircle size={24} className="imp-est-result-icon" />
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
                <FileText size={16} className="imp-est-btn-icon" />
                Reporte Completo
              </button>
              {importados > 0 && (
                <button 
                  className="imp-est-btn-download"
                  onClick={() => handleDescargarReporte('exitosos')}
                >
                  <CheckCircle size={16} className="imp-est-btn-icon" />
                  Solo Exitosos
                </button>
              )}
              {resumen.duplicados > 0 && (
                <button 
                  className="imp-est-btn-download"
                  onClick={() => handleDescargarReporte('duplicados')}
                >
                  <AlertTriangle size={16} className="imp-est-btn-icon" />
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
                <X size={20} />
              </button>
            </div>

            <div className="imp-est-content">
              <div className="imp-est-error-message">
                <AlertCircle size={48} className="imp-est-error-icon" />
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
              <X size={20} />
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
                      <Clipboard size={20} className="imp-est-info-icon" />
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
                      <Download size={16} className="imp-est-btn-icon" />
                      Descargar Template de Ejemplo
                    </button>
                  </div>
                </div>

                {/* Filtros */}
                <div className="imp-est-filters-section">
                  <h3 className="imp-est-section-title">
                    <Filter size={20} className="imp-est-section-icon" />
                    Filtros de Importación (Opcional)
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
                    <File size={20} className="imp-est-section-icon" />
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
                          <CheckCircle size={48} className="imp-est-icon-valid" />
                        ) : (
                          <Upload size={48} className="imp-est-icon-default" />
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
                                    <Check size={16} /> Archivo válido
                                  </span>
                                ) : (
                                  <span className="imp-est-invalid">
                                    <AlertCircle size={16} /> {validacionArchivo.errores.join(', ')}
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
                        <Folder size={16} className="imp-est-btn-icon" />
                        Seleccionar Archivo
                      </button>
                    </div>
                  </div>
                  
                  <div className="imp-est-file-help">
                    <p className="imp-est-help-item">
                      <Folder size={16} /> Formatos soportados: {FORMATO_EXCEL.EXTENSIONES_VALIDAS.join(', ')}
                    </p>
                    <p className="imp-est-help-item">
                      <BarChart2 size={16} /> Tamaño máximo: {FORMATO_EXCEL.TAMANO_MAXIMO / (1024 * 1024)}MB
                    </p>
                    <p className="imp-est-help-item">
                      <FileText size={16} /> Máximo {FORMATO_EXCEL.MAX_FILAS} estudiantes por archivo
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
                  <Search size={16} className="imp-est-btn-icon" />
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
                      <RefreshCw size={16} className="imp-est-btn-icon imp-est-loading" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="imp-est-btn-icon" />
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