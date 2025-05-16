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
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    codigo: '',
    carrera: '',
    semestre: '',
    unidad_educativa: 'Cochabamba' // Valor predeterminado
  });
  
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre: false,
    apellido: false,
    codigo: false,
    carrera: false,
    semestre: false,
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

  // Efecto para verificar si todos los campos requeridos están llenos
  useEffect(() => {
    const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
    
    setValidFields({
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      unidad_educativa: unidad_educativa.trim() !== ''
    });
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'carrera') {
      // Si cambia la carrera, resetear el semestre
      setFormData({
        ...formData,
        [name]: value,
        semestre: '' // Resetear semestre cuando cambia la carrera
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

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
      
      // Usamos api directamente para tener más control
      // Aseguramos que el código siempre se envíe en mayúsculas
      const response = await api.post('/api/estudiantes/create', {
        ...formData,
        codigo: formData.codigo.toUpperCase(), // Garantizar que siempre sea mayúsculas
        grupo_id: null // El estudiante se crea sin grupo
      });
      
      // Notificación de éxito
      toast.success('Estudiante registrado exitosamente', {
        className: 'toast-notification'
      });
      
      // Resetear el formulario
      setFormData({
        nombre: '',
        apellido: '',
        codigo: '',
        carrera: '',
        semestre: '',
        unidad_educativa: 'Cochabamba'
      });
      
    } catch (err) {
      console.error("Error al crear el estudiante:", err);
      
      // Manejar específicamente el error de código duplicado
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
        toast.error("Error al crear el estudiante, el codigo de este ya esta en uso", {
          className: 'toast-notification'
        });
      }
    } finally {
      setLoading(false);
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
        
        {/* Agregamos un contenedor principal con la clase de namespace */}
        <div className="estudiante-form-styles">
          <div className="crear-estudiante-container">
            <h1>Registrar Nuevo Estudiante</h1>
            
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
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn-guardar ${loading ? 'loading' : ''}`}
                  disabled={loading || Object.values(validFields).some(valid => !valid)}
                >
                  {loading ? 'Guardando...' : 'Registrar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

export default CrearEstudiante;