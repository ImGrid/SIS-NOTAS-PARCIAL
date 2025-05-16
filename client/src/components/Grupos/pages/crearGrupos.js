// src/pages/CrearGrupos.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import '../style/crearGrupos.css';
import { createGrupo } from '../../../service/grupoService';
import MATERIAS_POR_SEMESTRE from '../../../util/materias/materias_sis';
import MATERIAS_POR_SEMESTRE_ETN from '../../../util/materias/materias_etn';
import MATERIAS_POR_SEMESTRE_AGRO from '../../../util/materias/materias_agro';
import MATERIAS_POR_SEMESTRE_BASICAS from '../../../util/materias/materias_basic';
import MATERIAS_POR_SEMESTRE_COM from '../../../util/materias/materias_com';
import MATERIAS_POR_SEMESTRE_CIVIL from '../../../util/materias/materias_cvil';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CrearGrupos() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre_proyecto: '',
    carrera: '',
    semestre: '',
    materia: ''
  });
  
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_proyecto: false,
    carrera: false,
    semestre: false,
    materia: false
  });

  // Mapa de carreras disponibles
  const CARRERAS = [
    { value: 'Ingeniería de Sistemas', label: 'Ingeniería de Sistemas' },
    { value: 'Sistemas Electronicos', label: 'Sistemas Electronicos' },
    { value: 'Ingeniería Agroindustrial', label: 'Ingeniería Agroindustrial' },
    { value: 'Ciencias Básicas', label: 'Ciencias Básicas' },
    { value: 'Ingeniería Comercial', label: 'Ingeniería Comercial' },
    { value: 'Ingeniería Civil', label: 'Ingeniería Civil' }
  ];

  // Función para obtener semestres disponibles según la carrera
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

  // Función para obtener el objeto de materias según la carrera
  const getMateriasCarrera = (carrera) => {
    switch (carrera) {
      case 'Ingeniería de Sistemas':
        return MATERIAS_POR_SEMESTRE;
      case 'Sistemas Electronicos':
        return MATERIAS_POR_SEMESTRE_ETN;
      case 'Ingeniería Agroindustrial':
        return MATERIAS_POR_SEMESTRE_AGRO;
      case 'Ciencias Básicas':
        return MATERIAS_POR_SEMESTRE_BASICAS;
      case 'Ingeniería Comercial':
        return MATERIAS_POR_SEMESTRE_COM;
      case 'Ingeniería Civil':
        return MATERIAS_POR_SEMESTRE_CIVIL;
      default:
        return {};
    }
  };

  // Actualizar la lista de materias cuando cambia el semestre o la carrera
  useEffect(() => {
    if (formData.semestre && formData.carrera) {
      // Obtener el objeto de materias según la carrera
      const materiasCarrera = getMateriasCarrera(formData.carrera);
      
      // Verificar si existen materias para ese semestre
      const materiasDelSemestre = materiasCarrera[formData.semestre] || [];
      setMaterias(materiasDelSemestre);
      
      // Resetear la materia seleccionada al cambiar semestre o carrera
      setFormData(prevData => ({
        ...prevData,
        materia: ''
      }));
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Si cambia la carrera, resetear también el semestre
    if (name === 'carrera') {
      setFormData({
        ...formData,
        [name]: value,
        semestre: '',
        materia: ''
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
      // La función createGrupo ya se encargará de obtener el ID del docente actual
      const grupoCreado = await createGrupo(formData);
      
      // Notificación de éxito
      toast.success('Grupo creado exitosamente. Redirigiendo a asignación de estudiantes...', {
        className: 'toast-notification'
      });
      
      // Después de 2 segundos de mostrar el mensaje de éxito, redirigir a asignación de estudiantes
      setTimeout(() => {
        navigate(`/grupos/asignar?id=${grupoCreado.id}`, { 
          state: { grupoId: grupoCreado.id } 
        });
      }, 2000);
      
      // Resetear el formulario
      setFormData({
        nombre_proyecto: '',
        carrera: '',
        semestre: '',
        materia: ''
      });
      
    } catch (err) {
      console.error("Error al crear el grupo:", err);
      toast.error(err.message || "Error al crear el grupo. Por favor, intente de nuevo.", {
        className: 'toast-notification'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
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

  // Obtener los semestres disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);

  return (
    <Layout>
      <ToastContainer position="top-right" autoClose={3000} />
      
      <div className="grupo-form-styles">
        <div className="crear-grupo-container">
          <h1>Crear Nuevo Grupo</h1>
          
          <form className="crear-grupo-form" onSubmit={handleSubmit}>
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
                {loading ? 'Guardando...' : 'Guardar Grupo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

export default CrearGrupos;