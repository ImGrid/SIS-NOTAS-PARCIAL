import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  getEstudianteById, 
  updateEstudiante, 
  verificarDependenciasEstudiante,
  obtenerResumenDependencias,
  createEstudiante // CORRECTO - este es el nombre exportado
} from '../../../service/estudianteService';
import '../style/editarEstudiante.css';

function EditarEstudiante() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Estado para formulario de edición principal
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    carrera: '',
    semestre: '',
    unidad_educativa: ''
  });
  
  // Estado para controlar la carga y validación
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre: false,
    apellido: false,
    codigo: false,
    carrera: false,
    semestre: false,
    unidad_educativa: false,
    semestre2: true,
    semestre3: true
  });
  
  // Estados para estudiantes con múltiples semestres
  const [multiSemestre, setMultiSemestre] = useState(false);
  const [cantidadSemestres, setCantidadSemestres] = useState(1);
  const [semestresAdicionales, setSemestresAdicionales] = useState({
    semestre2: '',
    semestre3: ''
  });
  
  // Estado para resultados de creación
  const [creacionExitosa, setCreacionExitosa] = useState(0);
  const [creacionFallida, setCreacionFallida] = useState(false);
  
  // Estado para dependencias y confirmación
  const [dependencias, setDependencias] = useState(null);
  const [tieneDependencias, setTieneDependencias] = useState(false);
  const [datosOriginales, setDatosOriginales] = useState(null);
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
  const [cambiosCriticos, setCambiosCriticos] = useState({
    carrera: false,
    semestre: false
  });

  // Lista de carreras disponibles
  const CARRERAS = [
    { value: 'Ingeniería de Sistemas', label: 'Ingeniería de Sistemas' },
    { value: 'Ingeniería de Sistemas Electronicos', label: 'Ingeniería de Sistemas Electronicos' },
    { value: 'Ingeniería Agroindustrial', label: 'Ingeniería Agroindustrial' },
    { value: 'Ciencias Básicas', label: 'Ciencias Básicas' },
    { value: 'Ingeniería Comercial', label: 'Ingeniería Comercial' },
    { value: 'Ingeniería Civil', label: 'Ingeniería Civil' }
  ];

  // Obtener semestres disponibles según la carrera
  const getSemestresDisponibles = (carrera) => {
    // Caso especial para Ciencias Básicas (solo 1er y 2do semestre)
    if (carrera === 'Ciencias Básicas') {
      return [
        { value: '1', label: 'Primer Semestre' },
        { value: '2', label: 'Segundo Semestre' }
      ];
    }
    
    // Para el resto de carreras (3ro a 10mo)
    return [
      { value: '3', label: 'Tercer Semestre' },
      { value: '4', label: 'Cuarto Semestre' },
      { value: '5', label: 'Quinto Semestre' },
      { value: '6', label: 'Sexto Semestre' },
      { value: '7', label: 'Séptimo Semestre' },
      { value: '8', label: 'Octavo Semestre' },
      { value: '9', label: 'Noveno Semestre' },
      { value: '10', label: 'Décimo Semestre' }
    ];
  };
  
  // Cargar datos del estudiante
  useEffect(() => {
    const cargarEstudiante = async () => {
      try {
        setLoading(true);
        
        // Obtener datos del estudiante
        const estudiante = await getEstudianteById(id);
        
        // Guardar los datos originales para comparación
        setDatosOriginales(estudiante);
        
        // Actualizar el formulario
        setFormData({
          nombre: estudiante.nombre || '',
          apellido: estudiante.apellido || '',
          codigo: estudiante.codigo || '',
          carrera: estudiante.carrera || '',
          semestre: estudiante.semestre?.toString() || '',
          unidad_educativa: estudiante.unidad_educativa || ''
        });
        
        // Verificar dependencias
        const respDependencias = await verificarDependenciasEstudiante(id);
        setDependencias(respDependencias.dependencias);
        setTieneDependencias(respDependencias.dependencias.tieneDependencias);
        
      } catch (error) {
        console.error('Error al cargar estudiante:', error);
        toast.error('Error al cargar datos del estudiante');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      cargarEstudiante();
    }
  }, [id]);

  // Efecto para verificar si todos los campos requeridos están llenos
  useEffect(() => {
    const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
    
    setValidFields(prevState => ({
      ...prevState,
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      unidad_educativa: unidad_educativa.trim() !== ''
    }));
    
    // Verificar si hay cambios críticos (carrera o semestre)
    if (datosOriginales) {
      setCambiosCriticos({
        carrera: carrera !== datosOriginales.carrera,
        semestre: semestre !== datosOriginales.semestre?.toString()
      });
    }
  }, [formData, datosOriginales]);

  // Efecto para validar los semestres adicionales cuando son requeridos
  useEffect(() => {
    if (multiSemestre) {
      setValidFields(prevState => ({
        ...prevState,
        semestre2: cantidadSemestres >= 2 ? semestresAdicionales.semestre2 !== '' : true,
        semestre3: cantidadSemestres === 3 ? semestresAdicionales.semestre3 !== '' : true
      }));
    } else {
      // Si no es multi-semestre, estos campos siempre son válidos
      setValidFields(prevState => ({
        ...prevState,
        semestre2: true,
        semestre3: true
      }));
    }
  }, [multiSemestre, cantidadSemestres, semestresAdicionales]);

  // Manejar cambio en checkbox de múltiples semestres
  const handleMultiSemestreChange = () => {
    setMultiSemestre(!multiSemestre);
    
    // Si se desactiva, resetear cantidad y semestres adicionales
    if (multiSemestre) {
      setCantidadSemestres(1);
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
      setCreacionExitosa(0);
      setCreacionFallida(false);
    } else {
      setCantidadSemestres(2); // Por defecto, seleccionar 2 semestres
    }
  };

  // Manejar cambio en la cantidad de semestres
  const handleCantidadSemestresChange = (e) => {
    const cantidad = parseInt(e.target.value);
    setCantidadSemestres(cantidad);
    
    // Si se reduce de 3 a 2, limpiar el semestre3
    if (cantidad === 2) {
      setSemestresAdicionales(prev => ({
        ...prev,
        semestre3: ''
      }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'carrera') {
      // Si cambia la carrera, resetear el semestre y semestres adicionales
      setFormData({
        ...formData,
        [name]: value,
        semestre: multiSemestre ? formData.semestre : '' // Si es multisemestre, mantener el semestre original
      });
      
      // Resetear semestres adicionales si cambia la carrera
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
    } else if (name === 'codigo') {
      // Convertir el código a mayúsculas automáticamente
      setFormData({
        ...formData,
        [name]: value.toUpperCase()
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Manejar cambios en los semestres adicionales
  const handleSemestreAdicionalChange = (e) => {
    const { name, value } = e.target;
    setSemestresAdicionales(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Función para crear un estudiante en un semestre específico
  const crearEstudianteEnSemestre = async (semestreValue) => {
    // Construir datos del estudiante para el nuevo semestre
    const estudianteData = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      codigo: formData.codigo.toUpperCase(),
      carrera: formData.carrera,
      semestre: semestreValue,
      unidad_educativa: formData.unidad_educativa,
      grupo_id: null // El estudiante se crea sin grupo
    };
    
    try {
      // Usar el servicio para crear un nuevo estudiante
      await createEstudiante(estudianteData);
      return true;
    } catch (error) {
      console.error(`Error al crear estudiante en semestre ${semestreValue}:`, error);
      throw error;
    }
  };

  // Función para manejar la actualización de datos del estudiante original
  const actualizarEstudianteOriginal = async (confirmar) => {
    try {
      // Preparar datos a enviar
      const datosActualizados = {
        ...formData,
        codigo: formData.codigo.toUpperCase()
      };
      
      // Si requiere confirmación, enviar flag confirmarLimpieza
      const resultado = await updateEstudiante(id, datosActualizados, confirmar);
      
      // Notificación de éxito
      toast.success('Estudiante actualizado exitosamente');
      
      // Si se eliminaron dependencias, mostrar mensaje adicional
      if (resultado.dependenciasEliminadas) {
        setTimeout(() => {
          toast.info(resultado.mensaje, { autoClose: 8000 });
        }, 1000);
      }
      
      return true;
    } catch (error) {
      // Verificar si es error de confirmación (409)
      if (error.response && error.response.status === 409) {
        setRequiereConfirmacion(true);
        const errorData = error.response.data;
        setDependencias(errorData.dependencias || {});
        
        toast.warning(errorData.mensaje || 
          'Esta acción eliminará datos relacionados. ¿Desea continuar?', 
          { autoClose: 8000 });
        
        return false;
      } 
      // Si el error ya fue procesado por estudianteService
      else if (error.requiereConfirmacion) {
        setRequiereConfirmacion(true);
        setDependencias(error.dependencias || {});
        
        toast.warning(error.mensaje || 
          'Esta acción eliminará datos relacionados. ¿Desea continuar?', 
          { autoClose: 8000 });
        
        return false;
      }
      
      // Otros errores
      toast.error(error.message || 'Error al actualizar el estudiante');
      throw error;
    }
  };

  // Manejador para errores
  const handleError = (err) => {
    if (err.response && err.response.data && err.response.data.error) {
      // Mostrar el mensaje de error exacto que viene del servidor
      toast.error(err.response.data.error, {
        className: 'toast-notification'
      });
    } else if (err.message && err.message !== 'An error occurred') {
      // Si hay un mensaje de error pero no es el genérico
      toast.error(err.message, {
        className: 'toast-notification'
      });
    } else {
      // Fallback genérico
      toast.error("Error al crear el estudiante en semestres adicionales", {
        className: 'toast-notification'
      });
    }
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
      
      if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
        toast.error('Todos los campos son obligatorios');
        setSaving(false);
        return;
      }
      
      let actualizacionExitosa = false;
      let semestresRegistrados = 0;
      
      // Primero actualizamos el estudiante original
      actualizacionExitosa = await actualizarEstudianteOriginal(requiereConfirmacion);
      
      // Si es modo multisemestre, crear estudiantes en semestres adicionales
      if (multiSemestre && actualizacionExitosa) {
        setCreacionFallida(false);
        
        // Recopilar semestres a crear
        const semestresACrear = [];
        
        if (cantidadSemestres >= 2 && semestresAdicionales.semestre2) {
          semestresACrear.push(semestresAdicionales.semestre2);
        }
        
        if (cantidadSemestres === 3 && semestresAdicionales.semestre3) {
          semestresACrear.push(semestresAdicionales.semestre3);
        }
        
        // Verificar que no haya semestres duplicados o iguales al original
        const todosLosSemestres = [formData.semestre, ...semestresACrear];
        const semestresUnicos = [...new Set(todosLosSemestres)];
        
        if (semestresUnicos.length !== todosLosSemestres.length) {
          toast.error('No se puede registrar al estudiante en el mismo semestre más de una vez', {
            className: 'toast-notification'
          });
          setSaving(false);
          return;
        }
        
        // Crear estudiantes en semestres adicionales
        for (const semestreValue of semestresACrear) {
          try {
            await crearEstudianteEnSemestre(semestreValue);
            semestresRegistrados++;
          } catch (error) {
            setCreacionFallida(true);
            handleError(error);
          }
        }
        
        // Mostrar mensaje de éxito para semestres adicionales
        if (semestresRegistrados > 0) {
          setCreacionExitosa(semestresRegistrados);
          
          if (semestresRegistrados === semestresACrear.length) {
            toast.success(`Estudiante registrado exitosamente en ${semestresRegistrados} semestre(s) adicional(es)`, {
              autoClose: 5000
            });
          } else {
            toast.warning(`Se registró al estudiante en ${semestresRegistrados} de ${semestresACrear.length} semestre(s) adicional(es)`, {
              autoClose: 5000
            });
          }
        }
      }
      
      // Si la actualización fue exitosa (sin necesidad de confirmación), redirigir
      if (actualizacionExitosa && !requiereConfirmacion) {
        setTimeout(() => {
          navigate('/estudiantes/listar');
        }, 3000);
      }
      
    } catch (error) {
      console.error("Error completo:", error);
      toast.error("Ha ocurrido un error inesperado.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/estudiantes/listar');
  };

  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
    if (formData[fieldName] && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };
  
  // Determina si hay cambios críticos de carrera o semestre
  const hayCambiosCriticos = cambiosCriticos.carrera || cambiosCriticos.semestre;
  
  // Verificar si todos los campos son válidos para habilitar el botón de envío
  const formIsValid = () => {
    if (multiSemestre) {
      // En modo múltiples semestres, verificar semestres adicionales según cantidad
      if (cantidadSemestres >= 2 && !semestresAdicionales.semestre2) return false;
      if (cantidadSemestres === 3 && !semestresAdicionales.semestre3) return false;
    }
    
    // Verificar campos principales
    return validFields.nombre && 
           validFields.apellido && 
           validFields.codigo && 
           validFields.carrera && 
           validFields.semestre && 
           validFields.unidad_educativa;
  };
  
  // Verificar si hay semestres seleccionados repetidos
  const tieneSemestresRepetidos = () => {
    if (!multiSemestre) return false;
    
    const semestres = [formData.semestre];
    if (cantidadSemestres >= 2 && semestresAdicionales.semestre2) {
      semestres.push(semestresAdicionales.semestre2);
    }
    if (cantidadSemestres === 3 && semestresAdicionales.semestre3) {
      semestres.push(semestresAdicionales.semestre3);
    }
    
    // Filtrar valores vacíos
    const semestresValidos = semestres.filter(s => s !== '');
    
    // Verificar duplicados
    return new Set(semestresValidos).size !== semestresValidos.length;
  };
  
  // Obtener los semestres disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);

  return (
    <Layout>
      <div className="estudiante-editar-styles">
        <ToastContainer 
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        
        <div className="editar-estudiante-container">
          <h1>Editar Estudiante</h1>
          
          {loading ? (
            <div className="loading-indicator">Cargando datos del estudiante...</div>
          ) : (
            <>
              {/* Opciones para múltiples semestres */}
              <div className="multi-semestre-options">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="multi-semestre"
                    checked={multiSemestre}
                    onChange={handleMultiSemestreChange}
                  />
                  <label htmlFor="multi-semestre">
                    Registrar en semestres adicionales
                  </label>
                </div>
                
                {multiSemestre && (
                  <div className="semestre-cantidad">
                    <span>Cantidad de semestres adicionales:</span>
                    <div className="radio-group">
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="un-semestre"
                          name="cantidad-semestres"
                          value="2"
                          checked={cantidadSemestres === 2}
                          onChange={handleCantidadSemestresChange}
                        />
                        <label htmlFor="un-semestre">1 semestre</label>
                      </div>
                      <div className="radio-option">
                        <input
                          type="radio"
                          id="dos-semestres"
                          name="cantidad-semestres"
                          value="3"
                          checked={cantidadSemestres === 3}
                          onChange={handleCantidadSemestresChange}
                        />
                        <label htmlFor="dos-semestres">2 semestres</label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
                          
              {/* Alerta de dependencias mejorada - solo visible si no está en modo multisemestre */}
              {!multiSemestre && ((tieneDependencias && hayCambiosCriticos) || requiereConfirmacion) ? (
                <div className={`alerta-dependencias ${requiereConfirmacion ? 'confirmacion-activa' : ''}`}>
                  <h3>⚠️ {requiereConfirmacion ? 'Confirmación Requerida' : 'Cambios con Impacto'}</h3>
                  
                  {requiereConfirmacion ? (
                    <>
                      <p className="advertencia-fuerte">
                        ATENCIÓN: Si continúa, se eliminarán todos estos elementos asociados al estudiante:
                      </p>
                      <p className="dependencias-detalle">{obtenerResumenDependencias(dependencias)}</p>
                      <p className="advertencia-final">
                        Esta acción no se puede deshacer. Pulse "Confirmar Cambios" si está seguro.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>Este estudiante tiene datos asociados que se verán afectados si cambia la carrera o semestre:</p>
                      <p className="dependencias-detalle">{obtenerResumenDependencias(dependencias)}</p>
                      <p className="advertencia-media">
                        Si modifica la carrera o semestre, se le pedirá confirmación adicional.
                      </p>
                    </>
                  )}
                </div>
              ): null}
            
              <form className="editar-estudiante-form" onSubmit={handleSubmit}>
                <div className={`form-group ${getFieldClass('nombre')}`}>
                  <label htmlFor="nombre">Nombre:</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el nombre del estudiante"
                  />
                </div>
                
                <div className={`form-group ${getFieldClass('apellido')}`}>
                  <label htmlFor="apellido">Apellido:</label>
                  <input
                    type="text"
                    id="apellido"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el apellido del estudiante"
                  />
                </div>
                
                <div className={`form-group ${getFieldClass('codigo')}`}>
                  <label htmlFor="codigo">Código:</label>
                  <input
                    type="text"
                    id="codigo"
                    name="codigo"
                    value={formData.codigo}
                    onChange={handleChange}
                    required
                    placeholder="Ingrese el código único del estudiante"
                    style={{textTransform: 'uppercase'}}
                  />
                  <p className="help-text">El código se convertirá automáticamente a mayúsculas.</p>
                </div>
                
                <div className={`form-group ${getFieldClass('carrera')} ${!multiSemestre && cambiosCriticos.carrera ? 'cambio-critico' : ''}`}>
                  <label htmlFor="carrera">
                    Carrera:
                    {!multiSemestre && cambiosCriticos.carrera && 
                      <span className="badge-cambio-critico">Cambio crítico</span>
                    }
                  </label>
                  <select
                    id="carrera"
                    name="carrera"
                    value={formData.carrera}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione una carrera</option>
                    {CARRERAS.map((carrera, index) => (
                      <option key={index} value={carrera.value}>
                        {carrera.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Sección de semestres - varía según modo */}
                {!multiSemestre ? (
                  // Modo normal - solo un semestre
                  <div className={`form-group ${getFieldClass('semestre')} ${cambiosCriticos.semestre ? 'cambio-critico' : ''}`}>
                    <label htmlFor="semestre">
                      Semestre:
                      {cambiosCriticos.semestre && <span className="badge-cambio-critico">Cambio crítico</span>}
                    </label>
                    <select
                      id="semestre"
                      name="semestre"
                      value={formData.semestre}
                      onChange={handleChange}
                      required
                      disabled={!formData.carrera}
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
                  </div>
                ) : (
                  // Modo múltiples semestres
                  <div className="semestres-container">                    
                    {/* Semestre actual (no editable) */}
                    <div className="semestre-section">
                      <div className="semestre-item">
                        <div className={`form-group ${getFieldClass('semestre')} semestre-actual`}>
                          <label htmlFor="semestre">Semestre actual:</label>
                          <select
                            id="semestre"
                            name="semestre"
                            value={formData.semestre}
                            onChange={handleChange}
                            required
                            disabled={true} // No se puede editar en modo multisemestre
                          >
                            <option value="">Seleccione un semestre</option>
                            {semestresDisponibles.map((semestre, index) => (
                              <option key={index} value={semestre.value}>
                                {semestre.label}
                              </option>
                            ))}
                          </select>
                          <p className="help-text">Este es el semestre actual del estudiante y no puede modificarse.</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Semestres adicionales */}
                    <div className="semestre-section">
                      
                      {/* Semestre adicional #1 */}
                      <div className="semestre-item">
                        <div className={`form-group ${semestresAdicionales.semestre2 && !tieneSemestresRepetidos() ? 'valid' : ''}`}>
                          <label htmlFor="semestre2">Semestre adicional #1:</label>
                          <select
                            id="semestre2"
                            name="semestre2"
                            value={semestresAdicionales.semestre2}
                            onChange={handleSemestreAdicionalChange}
                            required
                            disabled={!formData.carrera}
                            className={tieneSemestresRepetidos() && semestresAdicionales.semestre2 ? 'duplicado' : ''}
                          >
                            <option value="">Seleccione un semestre</option>
                            {semestresDisponibles.map((semestre, index) => (
                              <option key={index} value={semestre.value}>
                                {semestre.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {/* Semestre adicional #2 (visible si cantidadSemestres === 3) */}
                      {cantidadSemestres === 3 && (
                        <div className="semestre-item">
                          <div className={`form-group ${semestresAdicionales.semestre3 && !tieneSemestresRepetidos() ? 'valid' : ''}`}>
                            <label htmlFor="semestre3">Semestre adicional #2:</label>
                            <select
                              id="semestre3"
                              name="semestre3"
                              value={semestresAdicionales.semestre3}
                              onChange={handleSemestreAdicionalChange}
                              required
                              disabled={!formData.carrera}
                              className={tieneSemestresRepetidos() && semestresAdicionales.semestre3 ? 'duplicado' : ''}
                            >
                              <option value="">Seleccione un semestre</option>
                              {semestresDisponibles.map((semestre, index) => (
                                <option key={index} value={semestre.value}>
                                  {semestre.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Mensaje de advertencia si hay semestres duplicados */}
                    {tieneSemestresRepetidos() && (
                      <div className="semestres-error">
                        <p>⚠️ No puede seleccionar el mismo semestre más de una vez</p>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={`form-group ${getFieldClass('unidad_educativa')}`}>
                  <label htmlFor="unidad_educativa">Unidad Academica:</label>
                  <input
                    type="text"
                    id="unidad_educativa"
                    name="unidad_educativa"
                    value={formData.unidad_educativa}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="btn-editar-cancelar" 
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  
                  <button 
                    type="submit" 
                    className={`btn-editar-guardar ${saving ? 'loading' : ''} ${requiereConfirmacion ? 'confirmar' : ''}`}
                    disabled={saving || !formIsValid() || tieneSemestresRepetidos()}
                  >
                    {saving ? 'Guardando...' : multiSemestre 
                      ? 'Guardar' 
                      : requiereConfirmacion 
                        ? '⚠️ Confirmar Eliminación de Datos ⚠️' 
                        : 'Guardar Cambios'
                    }
                  </button>
                </div>
                
                {requiereConfirmacion && !multiSemestre && (
                  <div className="confirmacion-explicacion">
                    <p>Al hacer clic en el botón de confirmación, acepta que se eliminarán todos los informes, 
                    rúbricas, calificaciones y asignaciones actuales del estudiante. Esta acción es necesaria 
                    porque los datos académicos están vinculados a la carrera y semestre actual.</p>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EditarEstudiante;