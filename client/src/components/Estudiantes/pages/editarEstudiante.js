import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../Docentes/Layout';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  getEstudianteById, 
  updateEstudiante, 
  verificarDependenciasEstudiante,
  obtenerResumenDependencias
} from '../../../service/estudianteService';
import '../style/editarEstudiante.css';

function EditarEstudiante() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  // Estado para formulario
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
    unidad_educativa: false
  });
  
  // Estado para dependencias y confirmación
  const [dependencias, setDependencias] = useState(null);
  const [tieneDependencias, setTieneDependencias] = useState(false);
  const [datosOriginales, setDatosOriginales] = useState(null);
  const [requiereConfirmacion, setRequiereConfirmacion] = useState(false);
  const [cambiosCriticos, setCambiosCriticos] = useState({
    carrera: false,
    semestre: false
  });
  
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
    
    setValidFields({
      nombre: nombre.trim() !== '',
      apellido: apellido.trim() !== '',
      codigo: codigo.trim() !== '',
      carrera: carrera !== '',
      semestre: semestre !== '',
      unidad_educativa: unidad_educativa.trim() !== ''
    });
    
    // Verificar si hay cambios críticos (carrera o semestre)
    if (datosOriginales) {
      setCambiosCriticos({
        carrera: carrera !== datosOriginales.carrera,
        semestre: semestre !== datosOriginales.semestre?.toString()
      });
    }
  }, [formData, datosOriginales]);

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
      const { nombre, apellido, codigo, carrera, semestre, unidad_educativa } = formData;
      
      if (!nombre || !apellido || !codigo || !carrera || !semestre || !unidad_educativa) {
        toast.error('Todos los campos son obligatorios');
        setSaving(false);
        return;
      }
      
      // Determinar si necesitamos confirmación para cambios críticos
      const hayCambiosCriticos = cambiosCriticos.carrera || cambiosCriticos.semestre;
      const confirmarLimpieza = requiereConfirmacion;
      
      try {
        // Intentar actualizar el estudiante
        const resultado = await updateEstudiante(id, formData, confirmarLimpieza);
        
        // Notificación de éxito
        toast.success('Estudiante actualizado exitosamente');
        
        // Si se eliminaron dependencias, mostrar mensaje adicional
        if (resultado.dependenciasEliminadas) {
          setTimeout(() => {
            toast.info(resultado.mensaje, { autoClose: 8000 });
          }, 1000);
        }
        
        // Volver a la lista después de un breve retraso
        setTimeout(() => {
          navigate('/estudiantes/listar');
        }, 3000);
        
      } catch (error) {
        // Si se requiere confirmación, mostrarla
        if (error.requiereConfirmacion) {
          setDependencias(error.dependencias);
          setRequiereConfirmacion(true);
          toast.warning(error.mensaje, { autoClose: 8000 });
        } else {
          // Otros errores
          if (error.response && error.response.data && error.response.data.error) {
            toast.error(error.response.data.error);
          } else {
            toast.error('Error al actualizar el estudiante');
          }
        }
      }
      
    } catch (err) {
      console.error("Error al actualizar el estudiante:", err);
      toast.error("Error al actualizar el estudiante");
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
              {/* Alerta de dependencias si aplica */}
              {tieneDependencias && hayCambiosCriticos && (
                <div className="alerta-dependencias">
                  <h3>⚠️ Cambios con Impacto</h3>
                  <p>Este estudiante tiene datos asociados que se verán afectados si cambia la carrera o semestre:</p>
                  <p className="dependencias-detalle">{obtenerResumenDependencias(dependencias)}</p>
                  <p className="advertencia-fuerte">
                    {requiereConfirmacion
                      ? "Al guardar estos cambios, se eliminarán todas las asignaciones, calificaciones e informes asociados."
                      : "Si modifica la carrera o semestre, se le pedirá confirmación adicional."}
                  </p>
                </div>
              )}
            
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
                  />
                </div>
                
                <div className={`form-group ${getFieldClass('carrera')} ${cambiosCriticos.carrera ? 'cambio-critico' : ''}`}>
                  <label htmlFor="carrera">
                    Carrera:
                    {cambiosCriticos.carrera && <span className="badge-cambio-critico">Cambio crítico</span>}
                  </label>
                  <select
                    id="carrera"
                    name="carrera"
                    value={formData.carrera}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Seleccione una carrera</option>
                    <option value="Ingeniería de Sistemas">Ingeniería de Sistemas</option>
                    <option value="Sistemas Electronicos">Sistemas Electronicos</option>
                  </select>
                </div>
                
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
                  >
                    <option value="">Seleccione un semestre</option>
                    <option value="3">Tercer Semestre</option>
                    <option value="4">Cuarto Semestre</option>
                    <option value="5">Quinto Semestre</option>
                    <option value="6">Sexto Semestre</option>
                    <option value="7">Séptimo Semestre</option>
                    <option value="8">Octavo Semestre</option>
                    <option value="9">Noveno Semestre</option>
                    <option value="10">Décimo Semestre</option>
                  </select>
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
                    className="btn-editar-cancelar" 
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className={`btn-editar-guardar ${saving ? 'loading' : ''} ${requiereConfirmacion ? 'confirmar' : ''}`}
                    disabled={saving || Object.values(validFields).some(valid => !valid)}
                  >
                    {saving ? 'Guardando...' : requiereConfirmacion ? 'Confirmar Cambios' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EditarEstudiante;