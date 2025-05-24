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
  createEstudiante,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validarDatosEstudiante,
  verificarCodigoDisponible
} from '../../../service/estudianteService';
import '../style/editarEstudiante.css';

function EditarEstudiante() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Estado para formulario de edición principal (incluye paralelo)
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    carrera: '',
    semestre: '',
    paralelo: '', // Nuevo campo para paralelos
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
    paralelo: true, // Inicialmente true porque puede no ser requerido
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
    semestre: false,
    paralelo: false // Nuevo campo para detectar cambios de paralelo
  });

  // Estados para carreras y paralelos
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState('');
  const [estudiantePropio, setEstudiantePropio] = useState(false);
  
  // Estados para validación de código
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [codigoDisponible, setCodigoDisponible] = useState(true);
  
  // Obtener las carreras del docente desde sessionStorage
  const obtenerCarrerasDocente = () => {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (!usuarioStr) {
        console.error("No se encontró información del usuario en sessionStorage");
        return [];
      }
      
      const usuario = JSON.parse(usuarioStr);
      
      if (!usuario || !usuario.carreras) {
        console.error("El usuario no tiene carreras asignadas");
        return [];
      }
      
      if (!Array.isArray(usuario.carreras)) {
        if (typeof usuario.carreras === 'string') {
          return [usuario.carreras];
        }
        return [];
      }
      
      const carrerasFiltradas = usuario.carreras.filter(carrera => carrera && carrera.trim() !== '');
      return carrerasFiltradas;
    } catch (error) {
      console.error("Error al obtener carreras del docente:", error);
      return [];
    }
  };
  
  // Cargar datos del estudiante y carreras del docente
  useEffect(() => {
    const cargarCarrerasYEstudiante = async () => {
      try {
        setLoading(true);
        
        // Primero cargamos las carreras del docente
        const carreras = obtenerCarrerasDocente();
        setCarrerasAsignadas(carreras);
        
        // Verificar si el docente tiene Ciencias Básicas asignada
        const tieneCienciasBasicas = carreras.includes('Ciencias Básicas');
        setDocenteTieneCienciasBasicas(tieneCienciasBasicas);
        
        // Filtrar las opciones de carreras para el selector
        const opcionesCarreras = carreras.map(carrera => ({
          value: carrera,
          label: carrera
        }));
        
        setCarrerasDisponibles(opcionesCarreras);
        
        // Si no hay carreras asignadas, mostrar mensaje
        if (carreras.length === 0) {
          setErrorAcceso("No tiene carreras asignadas. Contacte con el administrador.");
          toast.error("No tiene carreras asignadas. Contacte con el administrador.");
          setLoading(false);
          return;
        }
        
        // Obtener datos del estudiante
        const estudiante = await getEstudianteById(id);
        
        // Verificar si el estudiante pertenece a una carrera asignada al docente
        const carreraEstudiante = estudiante.carrera?.toLowerCase().trim() || '';
        const carrerasNormalizadas = carreras.map(c => c.toLowerCase().trim());
        
        const tienePermiso = carrerasNormalizadas.includes(carreraEstudiante);
        
        if (!tienePermiso) {
          setErrorAcceso(`No tiene permisos para editar estudiantes de la carrera ${estudiante.carrera}. Sus carreras asignadas son: ${carreras.join(', ')}`);
          toast.error(`No tiene permisos para editar estudiantes de la carrera ${estudiante.carrera}`);
          setLoading(false);
          return;
        }
        
        // Si todo está bien, establecer que el estudiante es propio
        setEstudiantePropio(true);
        
        // Guardar los datos originales para comparación
        setDatosOriginales(estudiante);
        
        // Normalizar paralelo - si no existe, asignar por defecto
        const paraleloNormalizado = estudiante.paralelo || getParaleloPorDefecto(estudiante.carrera);
        
        // Actualizar el formulario
        setFormData({
          nombre: estudiante.nombre || '',
          apellido: estudiante.apellido || '',
          codigo: estudiante.codigo || '',
          carrera: estudiante.carrera || '',
          semestre: estudiante.semestre?.toString() || '',
          paralelo: paraleloNormalizado,
          unidad_educativa: estudiante.unidad_educativa || ''
        });
        
        // Verificar dependencias
        const respDependencias = await verificarDependenciasEstudiante(id);
        setDependencias(respDependencias.dependencias);
        setTieneDependencias(respDependencias.dependencias.tieneDependencias);
        
      } catch (error) {
        console.error('Error al cargar estudiante:', error);
        toast.error('Error al cargar datos del estudiante');
        setErrorAcceso('Error al cargar datos del estudiante. Por favor, inténtelo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      cargarCarrerasYEstudiante();
    }
  }, [id]);

  // Efecto para verificar si todos los campos requeridos están llenos
  useEffect(() => {
    const { nombre, apellido, codigo, carrera, semestre, paralelo, unidad_educativa } = formData;
    
    // Determinar si el paralelo es requerido
    const paraleloRequerido = carreraNecesitaParalelo(carrera);
    
    setValidFields(prevState => ({
      ...prevState,
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      paralelo: paraleloRequerido ? (paralelo !== '') : true,
      unidad_educativa: unidad_educativa.trim() !== ''
    }));
    
    // Verificar si hay cambios críticos (carrera, semestre o paralelo)
    if (datosOriginales) {
      const paraleloOriginal = datosOriginales.paralelo || getParaleloPorDefecto(datosOriginales.carrera);
      
      setCambiosCriticos({
        carrera: carrera !== datosOriginales.carrera,
        semestre: semestre !== datosOriginales.semestre?.toString(),
        paralelo: paralelo !== paraleloOriginal
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
      setValidFields(prevState => ({
        ...prevState,
        semestre2: true,
        semestre3: true
      }));
    }
  }, [multiSemestre, cantidadSemestres, semestresAdicionales]);

  // Efecto para auto-asignar paralelo por defecto cuando cambia la carrera
  useEffect(() => {
    if (formData.carrera && datosOriginales) {
      // Si cambió de una carrera que no necesita paralelo a una que sí (o viceversa)
      const carreraAnteriorNecesitaParalelo = carreraNecesitaParalelo(datosOriginales.carrera);
      const carreraNuevaNecesitaParalelo = carreraNecesitaParalelo(formData.carrera);
      
      if (carreraAnteriorNecesitaParalelo !== carreraNuevaNecesitaParalelo) {
        if (!carreraNuevaNecesitaParalelo) {
          // Si la nueva carrera no necesita paralelo, asignar 'A'
          setFormData(prev => ({
            ...prev,
            paralelo: getParaleloPorDefecto(formData.carrera)
          }));
        } else {
          // Si la nueva carrera necesita paralelo, limpiar para forzar selección
          setFormData(prev => ({
            ...prev,
            paralelo: ''
          }));
        }
      }
    }
  }, [formData.carrera, datosOriginales]);

  // Efecto para validar código en tiempo real (excluyendo el estudiante actual)
  useEffect(() => {
    const validarCodigoDisponible = async () => {
      if (formData.codigo && formData.semestre && formData.paralelo && datosOriginales) {
        // Solo validar si los datos han cambiado
        const codigoCambio = formData.codigo !== datosOriginales.codigo;
        const semestreCambio = formData.semestre !== datosOriginales.semestre?.toString();
        const paraleloCambio = formData.paralelo !== (datosOriginales.paralelo || getParaleloPorDefecto(datosOriginales.carrera));
        
        if (codigoCambio || semestreCambio || paraleloCambio) {
          setValidandoCodigo(true);
          try {
            const respuesta = await verificarCodigoDisponible(
              formData.codigo,
              formData.semestre,
              formData.paralelo,
              id // Excluir el estudiante actual
            );
            setCodigoDisponible(respuesta.disponible);
          } catch (error) {
            console.error('Error al verificar código:', error);
            setCodigoDisponible(true);
          } finally {
            setValidandoCodigo(false);
          }
        }
      }
    };

    const timeoutId = setTimeout(validarCodigoDisponible, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.codigo, formData.semestre, formData.paralelo, datosOriginales, id]);

  // Manejar cambio en checkbox de múltiples semestres
  const handleMultiSemestreChange = () => {
    setMultiSemestre(!multiSemestre);
    
    if (multiSemestre) {
      setCantidadSemestres(1);
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
      setCreacionExitosa(0);
      setCreacionFallida(false);
    } else {
      setCantidadSemestres(2);
    }
  };

  // Manejar cambio en la cantidad de semestres
  const handleCantidadSemestresChange = (e) => {
    const cantidad = parseInt(e.target.value);
    setCantidadSemestres(cantidad);
    
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
      // Verificar que la carrera seleccionada esté entre las asignadas al docente
      const carreraSeleccionada = value.toLowerCase().trim();
      const carrerasNormalizadas = carrerasAsignadas.map(c => c.toLowerCase().trim());
      
      if (value !== '' && !carrerasNormalizadas.includes(carreraSeleccionada)) {
        toast.error('No tiene permiso para asignar estudiantes a esta carrera');
        return;
      }
      
      // Si cambia la carrera, resetear el semestre y paralelo si es necesario
      setFormData({
        ...formData,
        [name]: value,
        semestre: multiSemestre ? formData.semestre : '',
        paralelo: '' // Limpiar paralelo para que se asigne automáticamente
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
    try {
      const datosEstudiante = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        codigo: formData.codigo.toUpperCase(),
        carrera: formData.carrera,
        semestre: semestreValue,
        paralelo: formData.paralelo || getParaleloPorDefecto(formData.carrera),
        unidad_educativa: formData.unidad_educativa
      };
      
      // Verificar que la carrera seleccionada esté entre las asignadas al docente
      const carreraEstudiante = datosEstudiante.carrera.toLowerCase().trim();
      const carrerasNormalizadas = carrerasAsignadas.map(c => c.toLowerCase().trim());
      
      if (!carrerasNormalizadas.includes(carreraEstudiante)) {
        throw new Error('No tiene permiso para crear estudiantes en esta carrera');
      }
      
      // Validar datos usando el servicio
      const datosValidados = validarDatosEstudiante(datosEstudiante);
      
      // Crear el estudiante
      await createEstudiante(datosValidados);
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
        nombre: formData.nombre,
        apellido: formData.apellido,
        codigo: formData.codigo.toUpperCase(),
        carrera: formData.carrera,
        semestre: formData.semestre,
        paralelo: formData.paralelo || getParaleloPorDefecto(formData.carrera),
        unidad_educativa: formData.unidad_educativa
      };
      
      // Verificar que la carrera seleccionada esté entre las asignadas al docente
      const carreraEstudiante = datosActualizados.carrera.toLowerCase().trim();
      const carrerasNormalizadas = carrerasAsignadas.map(c => c.toLowerCase().trim());
      
      if (!carrerasNormalizadas.includes(carreraEstudiante)) {
        toast.error('No tiene permiso para asignar estudiantes a esta carrera');
        return false;
      }
      
      // Validar datos usando el servicio
      const datosValidados = validarDatosEstudiante(datosActualizados);
      
      // Actualizar el estudiante
      const resultado = await updateEstudiante(id, datosValidados, confirmar);
      
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
      toast.error(err.response.data.error);
    } else if (err.message && err.message !== 'An error occurred') {
      toast.error(err.message);
    } else {
      toast.error("Error al crear el estudiante en semestres adicionales");
    }
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre, apellido, codigo, carrera, semestre, paralelo, unidad_educativa } = formData;
      
      if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
        toast.error('Todos los campos básicos son obligatorios');
        setSaving(false);
        return;
      }

      // Validar paralelo para Ciencias Básicas
      if (carreraNecesitaParalelo(carrera) && !paralelo) {
        toast.error('El paralelo es obligatorio para Ciencias Básicas');
        setSaving(false);
        return;
      }
      
      // Verificar que la carrera seleccionada esté entre las asignadas al docente
      const carreraEstudiante = carrera.toLowerCase().trim();
      const carrerasNormalizadas = carrerasAsignadas.map(c => c.toLowerCase().trim());
      
      if (!carrerasNormalizadas.includes(carreraEstudiante)) {
        toast.error('No tiene permiso para asignar estudiantes a esta carrera');
        setSaving(false);
        return;
      }

      // Verificar disponibilidad de código
      if (!codigoDisponible) {
        toast.error('El código ya está en uso para este semestre y paralelo');
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
          toast.error('No se puede registrar al estudiante en el mismo semestre más de una vez');
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
    // Validación especial para código
    if (fieldName === 'codigo') {
      if (formData[fieldName] && formData[fieldName].trim() !== '') {
        if (validandoCodigo) return 'validating';
        return codigoDisponible ? 'valid' : 'invalid';
      }
      return '';
    }

    // Para otros campos
    if (formData[fieldName] && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };
  
  // Determina si hay cambios críticos de carrera, semestre o paralelo
  const hayCambiosCriticos = cambiosCriticos.carrera || cambiosCriticos.semestre || cambiosCriticos.paralelo;
  
  // Verificar si todos los campos son válidos para habilitar el botón de envío
  const formIsValid = () => {
    if (multiSemestre) {
      // En modo múltiples semestres, verificar semestres adicionales según cantidad
      if (cantidadSemestres >= 2 && !semestresAdicionales.semestre2) return false;
      if (cantidadSemestres === 3 && !semestresAdicionales.semestre3) return false;
    }
    
    // Verificar campos principales
    return Object.values(validFields).every(valid => valid === true) && 
           codigoDisponible && 
           !validandoCodigo;
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
    
    const semestresValidos = semestres.filter(s => s !== '');
    return new Set(semestresValidos).size !== semestresValidos.length;
  };
  
  // Determinar si mostrar el campo de paralelo
  const mostrarCampoParalelo = docenteTieneCienciasBasicas && carreraNecesitaParalelo(formData.carrera);
  
  // Obtener los semestres y paralelos disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);
  const paralelosDisponibles = getParalelosDisponibles(formData.carrera);

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
          ) : errorAcceso ? (
            <div className="error-message">
              <p>{errorAcceso}</p>
              <button 
                className="btn-editar-cancelar" 
                onClick={() => navigate('/estudiantes/listar')}
              >
                Volver a la lista de estudiantes
              </button>
            </div>
          ) : estudiantePropio ? (
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
                          
              {/* Alerta de dependencias mejorada - incluye paralelo */}
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
                      <p>Este estudiante tiene datos asociados que se verán afectados si cambia la carrera, semestre o paralelo:</p>
                      <p className="dependencias-detalle">{obtenerResumenDependencias(dependencias)}</p>
                      <p className="advertencia-media">
                        Si modifica estos campos críticos, se le pedirá confirmación adicional.
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
                  <label htmlFor="codigo">
                    Código:
                    {validandoCodigo && <span className="validating-indicator">Verificando...</span>}
                    {!validandoCodigo && !codigoDisponible && <span className="error-indicator">Código en uso</span>}
                  </label>
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
                  {!codigoDisponible && (
                    <p className="help-text error">Este código ya está en uso para el semestre y paralelo seleccionados.</p>
                  )}
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
                    {carrerasDisponibles.map((carrera, index) => (
                      <option key={index} value={carrera.value}>
                        {carrera.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Campo de paralelo - Solo visible cuando es relevante */}
                {mostrarCampoParalelo && (
                  <div className={`form-group ${getFieldClass('paralelo')} paralelo-field ${!multiSemestre && cambiosCriticos.paralelo ? 'cambio-critico' : ''}`}>
                    <label htmlFor="paralelo">
                      Paralelo:
                      <span className="required-indicator">*</span>
                      {!multiSemestre && cambiosCriticos.paralelo && 
                        <span className="badge-cambio-critico">Cambio crítico</span>
                      }
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
                    <p className="help-text">
                      Los paralelos organizan a los estudiantes de Ciencias Básicas en grupos separados (A-G).
                      {cambiosCriticos.paralelo && " Cambiar el paralelo puede afectar datos relacionados."}
                    </p>
                  </div>
                )}
                
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
                  <label htmlFor="unidad_educativa">Unidad Académica:</label>
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
                    porque los datos académicos están vinculados a la carrera, semestre y paralelo actual.</p>
                  </div>
                )}
              </form>
            </>
          ) : (
            <div className="error-message">
              <p>No se pudo cargar el estudiante solicitado.</p>
              <button 
                className="btn-editar-cancelar" 
                onClick={() => navigate('/estudiantes/listar')}
              >
                Volver a la lista de estudiantes
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EditarEstudiante;