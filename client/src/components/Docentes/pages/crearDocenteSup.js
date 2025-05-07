// src/components/Supervisor/pages/crearDocenteAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import '../style/crearDocenteSup.css';
import api from '../../../service/api';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function CrearDocenteAdmin() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo_electronico: '',
    cargo: 'Ingeniero' // Valor predeterminado
  });
  
  const [loading, setLoading] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_completo: false,
    correo_electronico: false,
    cargo: true // Inicialmente verdadero ya que tiene valor predeterminado
  });

  // Efecto para verificar si todos los campos requeridos están llenos
  useEffect(() => {
    const { nombre_completo, correo_electronico, cargo } = formData;
    
    // Validación de email con expresión regular
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(correo_electronico);
    
    setValidFields({
      nombre_completo: nombre_completo.trim() !== '',
      correo_electronico: correo_electronico.trim() !== '' && isEmailValid,
      cargo: cargo.trim() !== ''
    });
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre_completo, correo_electronico, cargo } = formData;
      
      if (!nombre_completo || !correo_electronico || !cargo) {
        toast.error('Todos los campos son obligatorios', {
          className: 'toast-notification'
        });
        setLoading(false);
        return;
      }
      
      // Validación de email con expresión regular
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo_electronico)) {
        toast.error('Por favor, introduce un correo electrónico válido', {
          className: 'toast-notification'
        });
        setLoading(false);
        return;
      }
      
      // Usamos api directamente para tener más control
      const response = await api.post('/api/docentes/create', {
        ...formData
      });
      
      // Notificación de éxito
      toast.success('Docente registrado exitosamente', {
        className: 'toast-notification'
      });
      
      // Resetear el formulario
      setFormData({
        nombre_completo: '',
        correo_electronico: '',
        cargo: 'Ingeniero'
      });
      
    } catch (err) {
      console.error("Error al crear el docente:", err);
      
      // Manejar específicamente el error de correo duplicado
      if (err.response && err.response.data && err.response.data.error === 'El correo electrónico ya está en uso') {
        toast.error("El correo electrónico ya está registrado. Por favor, utilice otro correo.", {
          className: 'toast-notification'
        });
      } else if (err.message) {
        toast.error(err.message, {
          className: 'toast-notification'
        });
      } else {
        toast.error("Error al crear el docente. Por favor, intente de nuevo.", {
          className: 'toast-notification'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/supervisor/dashboard'); // Redirigir al dashboard
  };

  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
    if (formData[fieldName] && formData[fieldName].trim !== undefined && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };

  return (
    <LayoutSup>
      <div className="docente-admin-form-styles">
        <div className="crear-docente-admin-container">
          <h1>Registrar Nuevo Docente</h1>
          
          <form className="crear-docente-admin-form" onSubmit={handleSubmit}>
            <div className={`form-group ${getFieldClass('nombre_completo')}`}>
              <label htmlFor="nombre_completo">Nombre Completo:</label>
              <input
                type="text"
                id="nombre_completo"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                required
                placeholder="Ingrese el nombre completo del docente"
              />
            </div>
            
            <div className={`form-group ${getFieldClass('correo_electronico')}`}>
              <label htmlFor="correo_electronico">Correo Electrónico:</label>
              <input
                type="email"
                id="correo_electronico"
                name="correo_electronico"
                value={formData.correo_electronico}
                onChange={handleChange}
                required
                placeholder="ejemplo@emi.edu.bo"
              />
              <small className="input-help">
                Este correo se utilizará para iniciar sesión en el sistema
              </small>
            </div>
            
            <div className={`form-group ${getFieldClass('cargo')}`}>
              <label htmlFor="cargo">Cargo:</label>
              <select
                id="cargo"
                name="cargo"
                value={formData.cargo}
                onChange={handleChange}
                required
              >
                <option value="Ingeniero">Ingeniero</option>
                <option value="Licenciado">Licenciado</option>
                <option value="Doctor">Doctor</option>
              </select>
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
                {loading ? 'Guardando...' : 'Registrar Docente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </LayoutSup>
  );
}

export default CrearDocenteAdmin;