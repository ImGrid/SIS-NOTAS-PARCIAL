// src/components/Supervisor/pages/crearDocenteAdmin.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import '../style/crearDocenteSup.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDocente, gestionarCarrerasDocente } from '../../../service/docenteService';

// Lista estática de todas las carreras disponibles en la universidad
const CARRERAS = [
  { value: 'Ingeniería de Sistemas', label: 'Ingeniería de Sistemas' },
  { value: 'Ingeniería de Sistemas Electronicos', label: 'Ingeniería de Sistemas Electronicos' },
  { value: 'Ingeniería Agroindustrial', label: 'Ingeniería Agroindustrial' },
  { value: 'Ciencias Básicas', label: 'Ciencias Básicas' },
  { value: 'Ingeniería Comercial', label: 'Ingeniería Comercial' },
  { value: 'Ingeniería Civil', label: 'Ingeniería Civil' },
  { value: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual', label: 'Tec. Sup. en Diseño Gráfico y Comunicación Audiovisual' },
  { value: 'Tec. Sup. en Informática', label: 'Tec. Sup. en Informática' },
  { value: 'Tec. Sup. en Sistemas Electrónicos', label: 'Tec. Sup. en Sistemas Electrónicos' },
  { value: 'Técnico Superior en Energías Renovables', label: 'Técnico Superior en Energías Renovables' },
  { value: 'Tec. Sup. Contrucción Civil', label: 'Tec. Sup. Contrucción Civil' }
];

function CrearDocenteAdmin() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo_electronico: '',
    cargo: 'Ingeniero' // Valor predeterminado
  });
  
  // Estados para manejo de carreras
  const [carrerasSeleccionadas, setCarrerasSeleccionadas] = useState([]);
  const [carreraActual, setCarreraActual] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  const [validFields, setValidFields] = useState({
    nombre_completo: false,
    correo_electronico: false,
    cargo: true, // Inicialmente verdadero ya que tiene valor predeterminado
    carreras: false // Requerimos al menos una carrera
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
      cargo: cargo.trim() !== '',
      carreras: carrerasSeleccionadas.length > 0 // Verificar que se haya seleccionado al menos una carrera
    });
  }, [formData, carrerasSeleccionadas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Manejar selección de carrera
  const handleCarreraChange = (e) => {
    setCarreraActual(e.target.value);
  };

  // Añadir carrera a la lista de seleccionadas
  const agregarCarrera = () => {
    if (!carreraActual) return;
    
    // Verificar si la carrera ya está seleccionada
    if (carrerasSeleccionadas.includes(carreraActual)) {
      toast.info('Esta carrera ya ha sido seleccionada');
      return;
    }
    
    // Verificar límite de 5 carreras por docente (actualizado de 3 a 5)
    if (carrerasSeleccionadas.length >= 6) {
      toast.warning('Un docente no puede tener más de 6 carreras asignadas');
      return;
    }
    
    setCarrerasSeleccionadas([...carrerasSeleccionadas, carreraActual]);
    setCarreraActual(''); // Resetear selección actual
  };

  // Eliminar carrera de la lista de seleccionadas
  const eliminarCarrera = (carrera) => {
    setCarrerasSeleccionadas(carrerasSeleccionadas.filter(c => c !== carrera));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre_completo, correo_electronico, cargo } = formData;
      
      if (!nombre_completo || !correo_electronico || !cargo) {
        toast.error('Todos los campos son obligatorios');
        setLoading(false);
        return;
      }
      
      // Validar que se haya seleccionado al menos una carrera
      if (carrerasSeleccionadas.length === 0) {
        toast.error('Debe asignar al menos una carrera al docente');
        setLoading(false);
        return;
      }
      
      // Validación de email con expresión regular
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo_electronico)) {
        toast.error('Por favor, introduce un correo electrónico válido');
        setLoading(false);
        return;
      }
      
      // Paso 1: Crear el docente
      const nuevoDocente = await createDocente({
        nombre_completo,
        correo_electronico,
        cargo
      });
      
      if (nuevoDocente && nuevoDocente.id) {
        // Paso 2: Asignar carreras al docente
        try {
          await gestionarCarrerasDocente(nuevoDocente.id, carrerasSeleccionadas);
          
          // Notificación de éxito
          toast.success(`Docente "${nombre_completo}" registrado exitosamente con ${carrerasSeleccionadas.length} carrera(s) asignada(s)`);
          
          // Resetear el formulario
          setFormData({
            nombre_completo: '',
            correo_electronico: '',
            cargo: 'Ingeniero'
          });
          setCarrerasSeleccionadas([]);
          setCarreraActual('');
          
        } catch (errorCarreras) {
          console.error("Error al asignar carreras:", errorCarreras);
          toast.warning("Docente creado, pero hubo un problema al asignar las carreras");
        }
      }
      
    } catch (err) {
      console.error("Error al crear el docente:", err);
      
      // Manejar específicamente el error de correo duplicado
      if (err.response && err.response.data && err.response.data.error === 'El correo electrónico ya está en uso') {
        toast.error("El correo electrónico ya está registrado. Por favor, utilice otro correo.");
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error("Error al crear el docente. Por favor, intente de nuevo.");
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
    if (fieldName === 'carreras') {
      return validFields.carreras ? 'valid' : '';
    }
    
    if (formData[fieldName] && formData[fieldName].trim !== undefined && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : '';
    }
    return '';
  };

  return (
    <LayoutSup>
      <div className="docente-admin-form-styles">
        <ToastContainer position="top-right" autoClose={3000} />
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
            
            {/* Campo para selección de carreras */}
            <div className={`form-group carreras-group ${getFieldClass('carreras')}`}>
              <label htmlFor="carreras">Asignar Carreras:</label>
              
              <div className="carreras-seleccion">
                <div className="carreras-input-container">
                  <select
                    id="carrera"
                    name="carrera"
                    value={carreraActual}
                    onChange={handleCarreraChange}
                  >
                    <option value="">Seleccione una carrera</option>
                    {CARRERAS.map(carrera => (
                      <option key={carrera.value} value={carrera.value}>
                        {carrera.label}
                      </option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    className="btn-agregar-carrera"
                    onClick={agregarCarrera}
                    disabled={!carreraActual || carrerasSeleccionadas.length >= 5}
                  >
                    Agregar
                  </button>
                </div>
                
                {carrerasSeleccionadas.length > 0 && (
                  <div className="carreras-seleccionadas">
                    <label>Carreras asignadas:</label>
                    <div className="carreras-tags">
                      {carrerasSeleccionadas.map(carrera => (
                        <div key={carrera} className="carrera-tag">
                          <span>{carrera}</span>
                          <button 
                            type="button" 
                            className="btn-eliminar-carrera"
                            onClick={() => eliminarCarrera(carrera)}
                            title="Eliminar carrera"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="carreras-limite-info">
                      <small>Un docente puede tener asignadas máximo 6 carreras</small>
                    </div>
                  </div>
                )}
              </div>
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