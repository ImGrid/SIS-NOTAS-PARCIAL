// src/components/Estudiantes/pages/crearEstudiante.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../Docentes/sidebar';
import '../../Docentes/style/docente.css';
import '../style/crearEstudiante.css';
import api from '../../../service/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CrearEstudiante() {
  const navigate = useNavigate();
  
  // Estado base del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    carrera: '',
    semestre: '',
    unidad_educativa: 'Cochabamba' // Valor predeterminado
  });
  
  // Estados para estudiantes con múltiples semestres
  const [multiSemestre, setMultiSemestre] = useState(false);
  const [cantidadSemestres, setCantidadSemestres] = useState(1); // Por defecto 1
  const [semestresAdicionales, setSemestresAdicionales] = useState({
    semestre2: '',
    semestre3: ''
  });
  
  // Estados de carga y validación
  const [loading, setLoading] = useState(false);
  const [creacionExitosa, setCreacionExitosa] = useState(0); // Contador de creaciones exitosas
  const [creacionFallida, setCreacionFallida] = useState(false);
  
  // Estado para validación de campos
  const [validFields, setValidFields] = useState({
    nombre: false,
    apellido: false,
    codigo: false,
    carrera: false,
    semestre: false,
    semestre2: true, // Inicialmente true porque no se usa
    semestre3: true, // Inicialmente true porque no se usa
    unidad_educativa: true // Inicialmente verdadero ya que tiene valor predeterminado
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

  // Efecto para validar los campos requeridos
  useEffect(() => {
    const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
    
    // Actualizar validación de campos principales
    setValidFields(prevState => ({
      ...prevState,
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
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

  // Manejar cambios en campos del formulario principal
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'carrera') {
      // Si cambia la carrera, resetear todos los semestres
      setFormData({
        ...formData,
        [name]: value,
        semestre: '' // Resetear semestre cuando cambia la carrera
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
    const estudianteData = {
      ...formData,
      semestre: semestreValue,
      codigo: formData.codigo.toUpperCase(),
      grupo_id: null // El estudiante se crea sin grupo
    };
    
    try {
      await api.post('/api/estudiantes/create', estudianteData);
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
        toast.error('Todos los campos son obligatorios', {
          className: 'toast-notification'
        });
        setLoading(false);
        return;
      }
      
      // Si no es multi-semestre, solo crear un estudiante
      if (!multiSemestre) {
        await crearEstudianteEnSemestre(semestre);
        setCreacionExitosa(1);
        
        toast.success('Estudiante registrado exitosamente', {
          className: 'toast-notification'
        });
        
        // Resetear el formulario
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
          toast.error('No se puede registrar al estudiante en el mismo semestre más de una vez', {
            className: 'toast-notification'
          });
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
            // Si falla uno, continuar con los siguientes
            setCreacionFallida(true);
            
            // Mostrar error específico solo para el primer semestre
            if (exitosos === 0) {
              handleError(error);
            }
          }
        }
        
        // Mostrar mensajes según resultados
        setCreacionExitosa(exitosos);
        
        if (exitosos === semestresSeleccionados.length) {
          toast.success(`Estudiante registrado exitosamente en ${exitosos} semestres`, {
            className: 'toast-notification'
          });
          
          // Resetear formulario solo si todos fueron exitosos
          resetForm();
        } else if (exitosos > 0) {
          toast.warning(`Se registró al estudiante en ${exitosos} de ${semestresSeleccionados.length} semestres`, {
            className: 'toast-notification'
          });
        } else {
          toast.error('No se pudo registrar al estudiante en ningún semestre', {
            className: 'toast-notification'
          });
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
      toast.error("Error al crear el estudiante, el código de este ya está en uso", {
        className: 'toast-notification'
      });
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
      unidad_educativa: 'Cochabamba'
    });
    
    if (multiSemestre) {
      setSemestresAdicionales({
        semestre2: '',
        semestre3: ''
      });
    }
  };

  const handleCancel = () => {
    navigate('/docentes'); // Redirigir al dashboard
  };

  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
    if (formData[fieldName] && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };

  // Obtener los semestres disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);

  // Verificar si todos los campos son válidos para habilitar el botón de envío
  const formIsValid = () => {
    return Object.values(validFields).every(valid => valid === true);
  };

  // Verificar si hay semestres seleccionados repetidos
  const tieneSemestresRepetidos = () => {
    if (!multiSemestre || cantidadSemestres === 1) return false;
    
    const semestres = [formData.semestre];
    if (cantidadSemestres >= 2) semestres.push(semestresAdicionales.semestre2);
    if (cantidadSemestres === 3) semestres.push(semestresAdicionales.semestre3);
    
    // Filtrar valores vacíos
    const semestresValidos = semestres.filter(s => s !== '');
    
    // Verificar duplicados
    return new Set(semestresValidos).size !== semestresValidos.length;
  };

  return (
    <div className="docentes-container">
      <Sidebar />
      <main className="content">
        {/* Contenedor de notificaciones */}
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
        
        {/* Contenedor principal con la clase de namespace */}
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
                  {CARRERAS.map((carrera, index) => (
                    <option key={index} value={carrera.value}>
                      {carrera.label}
                    </option>
                  ))}
                </select>
              </div>
              
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
                  {/* Selector de semestres */}
                  <div className="semestres-selectors">
                    {/* Semestre #1 (siempre visible) */}
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
                    
                    {/* Semestre #2 (visible si cantidadSemestres >= 2) */}
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
                    
                    {/* Semestre #3 (visible si cantidadSemestres === 3) */}
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