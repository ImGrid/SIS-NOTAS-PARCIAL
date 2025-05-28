// src/components/Supervisor/pages/editarDocenteSup.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  getDocenteById, 
  updateDocente,
  gestionarCarrerasDocente
} from '../../../service/docenteService';
import '../style/editarDocenteSup.css';

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

function EditarDocente() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Estado para formulario
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo_electronico: '',
    cargo: ''
  });
  
  // Estado para manejo de carreras
  const [carrerasSeleccionadas, setCarrerasSeleccionadas] = useState([]);
  const [carreraActual, setCarreraActual] = useState('');
  
  // Estado para controlar la carga y validación
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [validFields, setValidFields] = useState({
    nombre_completo: false,
    correo_electronico: false,
    cargo: false,
    carreras: false // Requerimos al menos una carrera
  });
  
  // Estado para correo original (para validación)
  const [correoOriginal, setCorreoOriginal] = useState('');
  
  // Cargar datos del docente
  useEffect(() => {
    const cargarDocente = async () => {
      try {
        setLoading(true);
        
        // Obtener datos del docente
        const docente = await getDocenteById(id);
        
        // Guardar correo original para validación
        setCorreoOriginal(docente.correo_electronico || '');
        
        // Actualizar el formulario
        setFormData({
          nombre_completo: docente.nombre_completo || '',
          correo_electronico: docente.correo_electronico || '',
          cargo: docente.cargo || ''
        });
        
        // Cargar las carreras asignadas al docente si existen
        if (docente.carreras && Array.isArray(docente.carreras)) {
          setCarrerasSeleccionadas(docente.carreras);
        }
        
      } catch (error) {
        console.error('Error al cargar docente:', error);
        toast.error('Error al cargar datos del docente');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      cargarDocente();
    }
  }, [id]);

  // Efecto para verificar si todos los campos requeridos están llenos
  useEffect(() => {
    const { nombre_completo, correo_electronico, cargo } = formData;
    
    // Expresión regular para validar correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    setValidFields({
      nombre_completo: nombre_completo.trim() !== '',
      correo_electronico: emailRegex.test(correo_electronico),
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
    
    // Verificar límite de 5 carreras por docente
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
    setSaving(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre_completo, correo_electronico, cargo } = formData;
      
      if (!nombre_completo || !correo_electronico || !cargo) {
        toast.error('Todos los campos son obligatorios');
        setSaving(false);
        return;
      }
      
      // Validar que se haya seleccionado al menos una carrera
      if (carrerasSeleccionadas.length === 0) {
        toast.error('Debe asignar al menos una carrera al docente');
        setSaving(false);
        return;
      }
      
      // Validar formato de correo electrónico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correo_electronico)) {
        toast.error('El formato del correo electrónico no es válido');
        setSaving(false);
        return;
      }
      
      // Paso 1: Actualizar el docente
      const docente = await updateDocente(id, formData);
      
      // Paso 2: Actualizar carreras del docente
      await gestionarCarrerasDocente(id, carrerasSeleccionadas);
      
      // Notificación de éxito
      toast.success('Docente actualizado exitosamente con ' + carrerasSeleccionadas.length + ' carrera(s) asignada(s)');
      
      // Volver a la lista después de un breve retraso
      setTimeout(() => {
        navigate('/adm/personal/listar');
      }, 2000);
        
    } catch (error) {
      console.error("Error al actualizar el docente:", error);
      
      // Manejar errores específicos
      if (error.response && error.response.data && error.response.data.error) {
        if (error.response.data.error.includes('correo electrónico ya está en uso')) {
          toast.error('El correo electrónico ya está registrado para otro docente');
        } else {
          toast.error(error.response.data.error);
        }
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Error al actualizar el docente');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/adm/personal/listar');
  };

  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Para el campo de carreras
    if (fieldName === 'carreras') {
      return validFields.carreras ? 'valid' : '';
    }
    
    // Para los demás campos
    if (formData[fieldName] && formData[fieldName].trim() !== '') {
      return validFields[fieldName] ? 'valid' : 'invalid';
    }
    return '';
  };

  return (
    <LayoutSup>
      <div className="docente-editar-styles">
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
        
        <div className="editar-docente-container">
          <h1>Editar Docente</h1>
          
          {loading ? (
            <div className="loading-indicator">Cargando datos del docente...</div>
          ) : (
            <form className="editar-docente-form" onSubmit={handleSubmit}>
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
                {formData.nombre_completo && !validFields.nombre_completo && (
                  <div className="campo-error">El nombre es obligatorio</div>
                )}
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
                  placeholder="ejemplo@dominio.com"
                />
                {formData.correo_electronico && !validFields.correo_electronico && (
                  <div className="campo-error">Correo electrónico inválido</div>
                )}
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
                  <option value="">Seleccione un cargo</option>
                  <option value="Ingeniero">Ingeniero</option>
                  <option value="Licenciado">Licenciado</option>
                  <option value="Doctor">Doctor</option>
                </select>
                {formData.cargo && !validFields.cargo && (
                  <div className="campo-error">El cargo es obligatorio</div>
                )}
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
                  className="btn-editar-cancelar" 
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={`btn-editar-guardar ${saving ? 'loading' : ''}`}
                  disabled={saving || Object.values(validFields).some(valid => !valid)}
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </LayoutSup>
  );
}

export default EditarDocente;