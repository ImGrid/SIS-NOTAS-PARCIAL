import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import '../../Docentes/style/docente.css';
import '../style/crearEstudiante.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  createEstudiante,
  getSemestresDisponibles,
  getParalelosDisponibles,
  carreraNecesitaParalelo,
  getParaleloPorDefecto,
  validarDatosEstudiante,
  verificarCodigoDisponible
} from '../../../service/estudianteService';

function CrearEstudiante() {
  const navigate = useNavigate();
  
  // Estado base del formulario con paralelo
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    carrera: '',
    semestre: '',
    paralelo: '', // Nuevo campo para paralelos
    unidad_educativa: 'Cochabamba'
  });
  
  // Estados para estudiantes con múltiples semestres
  const [multiSemestre, setMultiSemestre] = useState(false);
  const [cantidadSemestres, setCantidadSemestres] = useState(1);
  const [semestresAdicionales, setSemestresAdicionales] = useState({
    semestre2: '',
    semestre3: ''
  });
  
  // Estados de carga y validación
  const [loading, setLoading] = useState(false);
  const [creacionExitosa, setCreacionExitosa] = useState(0);
  const [creacionFallida, setCreacionFallida] = useState(false);
  
  // Estado para validación de campos (incluye paralelo)
  const [validFields, setValidFields] = useState({
    nombre: false,
    apellido: false,
    codigo: false,
    carrera: false,
    semestre: false,
    paralelo: true, // Inicialmente true porque puede no ser requerido
    semestre2: true,
    semestre3: true,
    unidad_educativa: true
  });

  // Estados para carreras y paralelos
  const [carrerasAsignadas, setCarrerasAsignadas] = useState([]);
  const [carrerasDisponibles, setCarrerasDisponibles] = useState([]);
  const [docenteTieneCienciasBasicas, setDocenteTieneCienciasBasicas] = useState(false);
  
  // Estados para validación de código
  const [validandoCodigo, setValidandoCodigo] = useState(false);
  const [codigoDisponible, setCodigoDisponible] = useState(true);

  // Obtener las carreras del docente desde sessionStorage
  const obtenerCarrerasDocente = () => {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        if (usuario && usuario.carreras && Array.isArray(usuario.carreras)) {
          return usuario.carreras;
        }
      }
      return [];
    } catch (error) {
      console.error("Error al obtener carreras del docente:", error);
      return [];
    }
  };

  // Efecto para cargar las carreras asignadas al docente
  useEffect(() => {
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
    
    // Si no hay carreras asignadas, mostrar mensaje y redirigir
    if (carreras.length === 0) {
      toast.error("No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.");
      setTimeout(() => {
        navigate('/docentes');
      }, 2000);
    }
  }, [navigate]);

  // Efecto para validar los campos requeridos (incluye lógica de paralelo)
  useEffect(() => {
    const { nombre, apellido, codigo, carrera, semestre, paralelo, unidad_educativa } = formData;
    
    // Determinar si el paralelo es requerido
    const paraleloRequerido = carreraNecesitaParalelo(carrera);
    
    // Actualizar validación de campos principales
    setValidFields(prevState => ({
      ...prevState,
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      paralelo: paraleloRequerido ? (paralelo !== '') : true, // Solo requerido para Ciencias Básicas
      unidad_educativa: unidad_educativa.trim() !== ''
    }));
  }, [formData]);

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
    if (formData.carrera) {
      const paraleloDefecto = getParaleloPorDefecto(formData.carrera);
      
      // Solo auto-asignar si no es Ciencias Básicas (para Ciencias Básicas debe seleccionar manualmente)
      if (!carreraNecesitaParalelo(formData.carrera)) {
        setFormData(prev => ({
          ...prev,
          paralelo: paraleloDefecto
        }));
      } else if (!formData.paralelo) {
        // Para Ciencias Básicas, limpiar el paralelo para forzar selección manual
        setFormData(prev => ({
          ...prev,
          paralelo: ''
        }));
      }
    }
  }, [formData.carrera]);

  // Efecto para validar código en tiempo real
  useEffect(() => {
    const validarCodigoDisponible = async () => {
      if (formData.codigo && formData.semestre && formData.paralelo) {
        setValidandoCodigo(true);
        try {
          const respuesta = await verificarCodigoDisponible(
            formData.codigo,
            formData.semestre,
            formData.paralelo
          );
          setCodigoDisponible(respuesta.disponible);
        } catch (error) {
          console.error('Error al verificar código:', error);
          setCodigoDisponible(true); // Asumir disponible en caso de error
        } finally {
          setValidandoCodigo(false);
        }
      }
    };

    // Debounce la validación para evitar demasiadas peticiones
    const timeoutId = setTimeout(validarCodigoDisponible, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.codigo, formData.semestre, formData.paralelo]);

  // Manejar cambio en checkbox de múltiples semestres
  const handleMultiSemestreChange = () => {
    setMultiSemestre(!multiSemestre);
    
    if (multiSemestre) {
      setCantidadSemestres(1);
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
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

  // Manejar cambios en campos del formulario principal
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'carrera') {
      // Si cambia la carrera, resetear semestre y paralelo
      setFormData({
        ...formData,
        [name]: value,
        semestre: '',
        paralelo: '' // Resetear paralelo para que se auto-asigne o requiera selección
      });
      
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
      // Validar datos antes de enviar
      const datosEstudiante = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        codigo: formData.codigo.toUpperCase(),
        carrera: formData.carrera,
        semestre: semestreValue,
        paralelo: formData.paralelo || getParaleloPorDefecto(formData.carrera),
        unidad_educativa: formData.unidad_educativa
      };

      // Usar la función de validación del servicio
      const datosValidados = validarDatosEstudiante(datosEstudiante);
      
      // Crear el estudiante
      await createEstudiante(datosValidados);
      return true;
    } catch (error) {
      console.error(`Error al crear estudiante en semestre ${semestreValue}:`, error);
      throw error;
    }
  };

  // Manejador de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCreacionExitosa(0);
    setCreacionFallida(false);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
      
      if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
        toast.error('Todos los campos básicos son obligatorios');
        setLoading(false);
        return;
      }

      // Validar paralelo para Ciencias Básicas
      if (carreraNecesitaParalelo(carrera) && !formData.paralelo) {
        toast.error('El paralelo es obligatorio para Ciencias Básicas');
        setLoading(false);
        return;
      }
      
      // Verificar que la carrera esté entre las asignadas al docente
      if (!carrerasAsignadas.includes(carrera)) {
        toast.error('No tiene permiso para crear estudiantes en esta carrera');
        setLoading(false);
        return;
      }

      // Verificar disponibilidad de código
      if (!codigoDisponible) {
        toast.error('El código ya está en uso para este semestre y paralelo');
        setLoading(false);
        return;
      }
      
      // Si no es multi-semestre, solo crear un estudiante
      if (!multiSemestre) {
        await crearEstudianteEnSemestre(semestre);
        setCreacionExitosa(1);
        
        toast.success('Estudiante registrado exitosamente');
        resetForm();
      } else {
        // Para multi-semestre, crear un estudiante por cada semestre seleccionado
        const semestresSeleccionados = [formData.semestre];
        
        if (cantidadSemestres >= 2 && semestresAdicionales.semestre2) {
          semestresSeleccionados.push(semestresAdicionales.semestre2);
        }
        
        if (cantidadSemestres === 3 && semestresAdicionales.semestre3) {
          semestresSeleccionados.push(semestresAdicionales.semestre3);
        }
        
        // Verificar que no haya semestres duplicados
        const semestresUnicos = [...new Set(semestresSeleccionados)];
        if (semestresUnicos.length !== semestresSeleccionados.length) {
          toast.error('No se puede registrar al estudiante en el mismo semestre más de una vez');
          setLoading(false);
          return;
        }
        
        // Intentar crear estudiante en cada semestre
        let exitosos = 0;
        
        for (const semestreValue of semestresSeleccionados) {
          try {
            await crearEstudianteEnSemestre(semestreValue);
            exitosos++;
          } catch (error) {
            setCreacionFallida(true);
            
            if (exitosos === 0) {
              handleError(error);
            }
          }
        }
        
        // Mostrar mensajes según resultados
        setCreacionExitosa(exitosos);
        
        if (exitosos === semestresSeleccionados.length) {
          toast.success(`Estudiante registrado exitosamente en ${exitosos} semestres`);
          resetForm();
        } else if (exitosos > 0) {
          toast.warning(`Se registró al estudiante en ${exitosos} de ${semestresSeleccionados.length} semestres`);
        } else {
          toast.error('No se pudo registrar al estudiante en ningún semestre');
        }
      }
    } catch (err) {
      console.error("Error al crear el estudiante:", err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Función auxiliar para manejar errores
  const handleError = (err) => {
    if (err.response && err.response.data && err.response.data.error) {
      toast.error(err.response.data.error);
    } else if (err.message && err.message !== 'An error occurred') {
      toast.error(err.message);
    } else {
      toast.error("Error al crear el estudiante");
    }
  };

  // Función para resetear el formulario
  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      codigo: '',
      carrera: '',
      semestre: '',
      paralelo: '',
      unidad_educativa: 'Cochabamba'
    });
    
    if (multiSemestre) {
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
    }
    
    setCodigoDisponible(true);
  };

  const handleCancel = () => {
    navigate('/docentes');
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

  // Verificar si todos los campos son válidos para habilitar el botón de envío
  const formIsValid = () => {
    return Object.values(validFields).every(valid => valid === true) && 
           codigoDisponible && 
           !validandoCodigo;
  };

  // Verificar si hay semestres seleccionados repetidos
  const tieneSemestresRepetidos = () => {
    if (!multiSemestre || cantidadSemestres === 1) return false;
    
    const semestres = [formData.semestre];
    if (cantidadSemestres >= 2) semestres.push(semestresAdicionales.semestre2);
    if (cantidadSemestres === 3) semestres.push(semestresAdicionales.semestre3);
    
    const semestresValidos = semestres.filter(s => s !== '');
    return new Set(semestresValidos).size !== semestresValidos.length;
  };

  // Determinar si mostrar el campo de paralelo
  const mostrarCampoParalelo = docenteTieneCienciasBasicas && carreraNecesitaParalelo(formData.carrera);
  
  // Obtener los semestres y paralelos disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);
  const paralelosDisponibles = getParalelosDisponibles(formData.carrera);

  // Si no hay carreras asignadas, mostrar mensaje
  if (carrerasAsignadas.length === 0) {
    return (
      <div className="docentes-container">
        <Sidebar />
        <main className="content">
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
          <div className="estudiante-form-styles">
            <div className="crear-estudiante-container">
              <h1>Registrar Nuevo Estudiante</h1>
              <div className="error-message">
                No tiene carreras asignadas. Contacte con el administrador para que le asigne carreras.
              </div>
              <button 
                className="btn-cancelar" 
                onClick={() => navigate('/docentes')}
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content">
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
        
        <div className="estudiante-form-styles">
          <div className="crear-estudiante-container">
            <h1>Registrar Nuevo Estudiante</h1>
            {/* Opciones de múltiples semestres */}
            <div className="multi-semestre-options">
              <div className="checkbox-container">
                <input
                  type="checkbox"
                  id="multi-semestre"
                  checked={multiSemestre}
                  onChange={handleMultiSemestreChange}
                />
                <label htmlFor="multi-semestre">
                  Estudiante en múltiples semestres
                </label>
              </div>
              
              {multiSemestre && (
                <div className="semestre-cantidad">
                  <span>Cantidad de semestres:</span>
                  <div className="radio-group">
                    <div className="radio-option">
                      <input
                        type="radio"
                        id="dos-semestres"
                        name="cantidad-semestres"
                        value="2"
                        checked={cantidadSemestres === 2}
                        onChange={handleCantidadSemestresChange}
                      />
                      <label htmlFor="dos-semestres">2 semestres</label>
                    </div>
                    <div className="radio-option">
                      <input
                        type="radio"
                        id="tres-semestres"
                        name="cantidad-semestres"
                        value="3"
                        checked={cantidadSemestres === 3}
                        onChange={handleCantidadSemestresChange}
                      />
                      <label htmlFor="tres-semestres">3 semestres</label>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <form className="crear-estudiante-form" onSubmit={handleSubmit}>
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
                  {carrerasDisponibles.map((carrera, index) => (
                    <option key={index} value={carrera.value}>
                      {carrera.label}
                    </option>
                  ))}
                </select>
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
                  <p className="help-text">
                    Los paralelos organizan a los estudiantes de Ciencias Básicas en grupos separados (A-G).
                  </p>
                </div>
              )}
              
              {/* Sección de semestres */}
              {!multiSemestre ? (
                // Vista normal - un solo semestre
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
                // Vista múltiples semestres
                <div className="semestres-container">                  
                  <div className="semestres-selectors">
                    {/* Semestre #1 */}
                    <div className="semestre-item">
                      <div className={`form-group ${getFieldClass('semestre')}`}>
                        <label htmlFor="semestre">Semestre #1:</label>
                        <select
                          id="semestre"
                          name="semestre"
                          value={formData.semestre}
                          onChange={handleChange}
                          required
                          disabled={!formData.carrera}
                          className={tieneSemestresRepetidos() && formData.semestre ? 'duplicado' : ''}
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
                    
                    {/* Semestre #2 */}
                    {cantidadSemestres >= 2 && (
                      <div className="semestre-item">
                        <div className={`form-group ${semestresAdicionales.semestre2 && !tieneSemestresRepetidos() ? 'valid' : ''}`}>
                          <label htmlFor="semestre2">Semestre #2:</label>
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
                    )}
                    
                    {/* Semestre #3 */}
                    {cantidadSemestres === 3 && (
                      <div className="semestre-item">
                        <div className={`form-group ${semestresAdicionales.semestre3 && !tieneSemestresRepetidos() ? 'valid' : ''}`}>
                          <label htmlFor="semestre3">Semestre #3:</label>
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
                  className="btn-cancelar" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn-guardar ${loading ? 'loading' : ''}`}
                  disabled={loading || !formIsValid() || tieneSemestresRepetidos()}
                >
                  {loading ? 'Guardando...' : (
                    multiSemestre 
                      ? `Registrar Estudiante en ${cantidadSemestres} semestres` 
                      : 'Registrar Estudiante'
                  )}
                </button>
              </div>
              
              {/* Mensajes de éxito o error para múltiples semestres */}
              {creacionExitosa > 0 && creacionFallida && (
                <div className="creacion-resultado parcial">
                  <p>Se registró al estudiante en {creacionExitosa} semestre(s), pero hubo errores en otros semestres.</p>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CrearEstudiante;