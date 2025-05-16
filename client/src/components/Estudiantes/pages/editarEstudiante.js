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

  // CORRECCIÓN: Función mejorada para manejar el envío del formulario
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
      
      // Preparar datos a enviar
      const datosActualizados = {
        ...formData,
        codigo: formData.codigo.toUpperCase()
      };
      
      // IMPORTANTE: Enviar el parámetro de confirmación si ya se ha solicitado confirmación
      const resultado = await updateEstudiante(id, datosActualizados, requiereConfirmacion);
      
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
      console.error("Error completo:", error);
      
      // Verificamos si el error es un 409 directamente
      if (error.response && error.response.status === 409) {
        // Si es un 409, siempre activamos el modo de confirmación
        setRequiereConfirmacion(true);
        setDependencias(error.response.data.dependencias || {});
        
        // Mostrar mensaje de advertencia
        toast.warning(error.response.data.mensaje || 
          'Esta acción eliminará datos relacionados. ¿Confirmar?', 
          { autoClose: 8000 });
      } 
      // Verificamos si el error tiene la propiedad requiereConfirmacion
      else if (error.requiereConfirmacion) {
        setRequiereConfirmacion(true);
        setDependencias(error.dependencias || {});
        toast.warning(error.mensaje || 
          'Esta acción eliminará datos relacionados. ¿Confirmar?', 
          { autoClose: 8000 });
      }
      else {
        // Cualquier otro error
        toast.error(error.message || 'Error al actualizar el estudiante');
      }
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
  
  // Obtener los semestres disponibles según la carrera seleccionada
  const semestresDisponibles = getSemestresDisponibles(formData.carrera);

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
              {/* CORRECCIÓN: Alerta de dependencias mejorada */}
              {(tieneDependencias && hayCambiosCriticos) || requiereConfirmacion ? (
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
                      <p>Este estudiante tiene datos asociados que se verán afectados si cambia la carrera o semestre:</p>
                      <p className="dependencias-detalle">{obtenerResumenDependencias(dependencias)}</p>
                      <p className="advertencia-media">
                        Si modifica la carrera o semestre, se le pedirá confirmación adicional.
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
                  <p className="help-text">El código se convertirá automáticamente a mayúsculas.</p>
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
                    {CARRERAS.map((carrera, index) => (
                      <option key={index} value={carrera.value}>
                        {carrera.label}
                      </option>
                    ))}
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
                    className="btn-editar-cancelar" 
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                  
                  {/* CORRECCIÓN: Botón claramente diferenciado cuando se requiere confirmación */}
                  <button 
                    type="submit" 
                    className={`btn-editar-guardar ${saving ? 'loading' : ''} ${requiereConfirmacion ? 'confirmar' : ''}`}
                    disabled={saving || Object.values(validFields).some(valid => !valid)}
                  >
                    {saving ? 'Guardando...' : requiereConfirmacion 
                      ? '⚠️ Confirmar Eliminación de Datos ⚠️' 
                      : 'Guardar Cambios'
                    }
                  </button>
                </div>
                
                {/* CORRECCIÓN: Explicación adicional cuando se requiere confirmación */}
                {requiereConfirmacion && (
                  <div className="confirmacion-explicacion">
                    <p>Al hacer clic en el botón de confirmación, acepta que se eliminarán todos los informes, 
                    rúbricas, calificaciones y asignaciones actuales del estudiante. Esta acción es necesaria 
                    porque los datos académicos están vinculados a la carrera y semestre actual.</p>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default EditarEstudiante;