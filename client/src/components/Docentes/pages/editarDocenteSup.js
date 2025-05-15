import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LayoutSup from '../../Supervisor/pages/LayoutSup';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  getDocenteById, 
  updateDocente
} from '../../../service/docenteService';
import '../style/editarDocenteSup.css';

function EditarDocente() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Estado para formulario
  const [formData, setFormData] = useState({
    nombre_completo: '',
    correo_electronico: '',
    cargo: ''
  });
  
  // Estado para controlar la carga y validación
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validFields, setValidFields] = useState({
    nombre_completo: false,
    correo_electronico: false,
    cargo: false
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
    setSaving(true);

    try {
      // Validar que todos los campos requeridos estén presentes
      const { nombre_completo, correo_electronico, cargo } = formData;
      
      if (!nombre_completo || !correo_electronico || !cargo) {
        toast.error('Todos los campos son obligatorios');
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
      
      try {
        // Intentar actualizar el docente
        const resultado = await updateDocente(id, formData);
        
        // Notificación de éxito
        toast.success('Docente actualizado exitosamente');
        
        // Volver a la lista después de un breve retraso
        setTimeout(() => {
          navigate('/adm/personal/listar');
        }, 2000);
        
      } catch (error) {
        // Manejar errores específicos
        if (error.response && error.response.data && error.response.data.error) {
          if (error.response.data.error.includes('correo electrónico ya está en uso')) {
            toast.error('El correo electrónico ya está registrado para otro docente');
          } else {
            toast.error(error.response.data.error);
          }
        } else {
          // Otros errores
          toast.error('Error al actualizar el docente');
        }
      }
      
    } catch (err) {
      console.error("Error al actualizar el docente:", err);
      toast.error("Error al actualizar el docente");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/adm/personal/listar');
  };

  // Función para determinar la clase CSS de cada campo del formulario
  const getFieldClass = (fieldName) => {
    // Si el campo tiene contenido, verificamos si es válido
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
                <input
                  type="text"
                  id="cargo"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  required
                  placeholder="Ej: Profesor Titular, Docente Adjunto, etc."
                />
                {formData.cargo && !validFields.cargo && (
                  <div className="campo-error">El cargo es obligatorio</div>
                )}
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