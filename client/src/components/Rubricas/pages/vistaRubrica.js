import React, { useState } from 'react';
import Sidebar from '../../Docentes/sidebar';
import '../style/vistaRubrica.css';

const VistaRubrica = () => {
  const [activeTab, setActiveTab] = useState('presentacion');

  // Escala de calificación con sus colores
  const escalaCalificacion = [
    { valor: 'SOBRESALIENTE', numero: '10', color: '#30eb30' },
    { valor: 'EXCELENTE', numero: '9', color: '#92d050' },
    { valor: 'MUY BUENO', numero: '8', color: '#ffda9e' },
    { valor: 'BUENO', numero: '7', color: '#b5dcfd' },
    { valor: 'SATISFACTORIO', numero: '6', color: '#00bfff' },
    { valor: 'ACEPTABLE', numero: '5', color: '#ffcc00' },
    { valor: 'BÁSICAMENTE ACEPTABLE', numero: '4', color: '#ffee00' },
    { valor: 'INSUFICIENTE', numero: '3', color: '#cd853f' },
    { valor: 'DEFICIENTE', numero: '2', color: '#ff4444' },
    { valor: 'MUY DEFICIENTE', numero: '1', color: '#ff0000' },
  ];

  // Mapa para obtener el color correspondiente a cada calificación
  const colorCalificacion = {};
  escalaCalificacion.forEach(item => {
    colorCalificacion[item.valor] = item.color;
  });

  // Función para determinar si el texto debe ser oscuro basado en el color de fondo
  const esColorClaro = (color) => {
    return ['#ffee00', '#ffcc00', '#ffda9e', '#90ee90', '#92d050', '#b5dcfd', '#30eb30'].includes(color);
  };

  // Estructura de datos para la rúbrica completa
  const rubrica = {
    presentacion: {
      criterios: [
        {
          nombre: 'PRESENTACIÓN ORAL 20%',
          subcriterios: [
            {
              nombre: 'CLARIDAD DE LA EXPOSICIÓN 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Presentación muy confusa y poco clara',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Exposición desorganizada y difícil de seguir',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Algunas partes son confusas o desorganizadas',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Buena organización, con mínimas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Información extremadamente clara',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'USO DE DE HERRAMIENTAS VISUALES 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'No se usan recursos visuales o son irrelevantes.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Recursos visuales ineficaces o mal utilizados',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Recursos visuales básicos y poco impactantes',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Recursos adecuados pero mejorables en diseño o implementación',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Recursos visuales excelentes, claros y efectivos',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'DISTRIBUCIÓN DE TIEMPO 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Desajuste severo del tiempo, impacta la comprensión.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Tiempo descontrolado, afectando la comprensión.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Exceso o falta notable de tiempo.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Ligeros problemas en el ajuste del tiempo.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Tiempo perfectamente ajustado.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'TRABAJO EN EQUIPO 10%',
          subcriterios: [
            {
              nombre: 'EQUIDAD EN LA PARTICIPACIÓN 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Participación insuficiente de la mayoría.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Participación muy desigual, algunos no contribuyen.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Participación desequilibrada.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Todos participan, con ligera desigualdad.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Todos participan de manera equitativa y colaborativa.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'COORDINACIÓN 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Sin coordinación, trabajo fragmentado.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Poca coordinación, afectando la calidad del trabajo.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Falta de cohesión, algunas partes desorganizadas.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Buena coordinación, pero con pequeños fallos.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Coordinación excelente, trabajo conjunto evidente.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    sustentacion: {
      criterios: [
        {
          nombre: 'DOMINIO DEL CONTENIDO 20%',
          subcriterios: [
            {
              nombre: 'CONOCIMIENTO PROFUNDO DEL TEMA 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Conocimiento insuficiente, muy limitado.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Falta de comprensión en la mayoría de los aspectos.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Conocimiento básico con varias inseguridades.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Buen conocimiento con mínimas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Dominio total y detallado del tema.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'RESPUESTAS A PREGUNTAS DEL DOCENTE 10%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Incapacidad para responder preguntas.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Respuestas incorrectas o imprecisas.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Respuestas confusas o parciales.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Respuestas adecuadas con algunas dudas.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Respuestas claras, precisas y completas.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'ANÁLISIS CRÍTICO 10%',
          subcriterios: [
            {
              nombre: 'CAPACIDAD DE ANÁLISIS 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Análisis sin profundidad o superficial.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Análisis limitado o simple.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Análisis básico con pocas conexiones.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Análisis adecuado pero mejorable.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Análisis profundo y completo.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'DESARROLLO DE SOLUCIONES 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Soluciones inadecuadas o inexistentes.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Limitadas y poco creativas.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Funcionales, pero básicas.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Adecuadas, pero no sobresalientes.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Soluciones innovadoras y eficaces.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    documentacion: {
      criterios: [
        {
          nombre: 'CALIDAD DE INFORME 10%',
          subcriterios: [
            {
              nombre: 'ESTRUCTURA DEL DOCUMENTO 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Informe muy desorganizado.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Informe desorganizado y difícil de seguir.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Informe básico con partes poco claras.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Informe bien organizado pero mejorable.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Informe muy claro, bien estructurado.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'CLARIDAD Y PRECISIÓN 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Redacción muy deficiente y confusa.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Redacción muy confusa y poco precisa.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Redacción confusa con partes imprecisas.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Redacción clara con mínimas imprecisiones.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Redacción clara y precisa en todo momento.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        },
        {
          nombre: 'CONTENIDO TÉCNICO 20%',
          subcriterios: [
            {
              nombre: 'COMPLEJIDAD DE DISEÑO 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Diseño muy simplificado y básico.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Diseño simple y mal ejecutado.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Diseño básico con elementos simples.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Diseño adecuado pero mejorable.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Diseño técnico complejo y bien elaborado.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'JUSTIFICACIÓN TÉCNICA 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Justificación inadecuada o inexistente.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Justificación deficiente o poco relevante.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Justificación parcial o básica.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Justificación adecuada con puntos mejorables.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Justificación completa y bien fundamentada.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'RESULTADOS CLAROS Y CONCISOS 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Resultados confusos o incorrectos.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Resultados poco claros y desorganizados.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Resultados vagos o mal presentados.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Resultados claros pero mejorables.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Resultados presentados con claridad y precisión.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            },
            {
              nombre: 'INTERPRETACIÓN DE RESULTADOS 5%',
              color: 'bg-blue-light',
              niveles: [
                {
                  descripcion: 'Interpretación errónea o inexistente.',
                  calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
                },
                {
                  descripcion: 'Interpretación incorrecta o muy superficial.',
                  calificaciones: ['BÁSICAMENTE ACEPTABLE']
                },
                {
                  descripcion: 'Interpretación limitada con imprecisiones.',
                  calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
                },
                {
                  descripcion: 'Interpretación correcta pero mejorable.',
                  calificaciones: ['BUENO', 'MUY BUENO']
                },
                {
                  descripcion: 'Interpretación precisa y completa.',
                  calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
                }
              ]
            }
          ]
        }
      ]
    },
    innovacion: {
      criterios: [
        {
          nombre: 'NIVEL DE CREATIVIDAD EN LA SOLUCIÓN 5%',
          niveles: [
            {
              descripcion: 'Sin elementos creativos o innovadores.',
              calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
            },
            {
              descripcion: 'Solución básica sin elementos distintivos.',
              calificaciones: ['BÁSICAMENTE ACEPTABLE']
            },
            {
              descripcion: 'Solución convencional con pocos elementos creativos.',
              calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
            },
            {
              descripcion: 'Solución funcional con algunos elementos creativos.',
              calificaciones: ['BUENO', 'MUY BUENO']
            },
            {
              descripcion: 'Solución altamente creativa e innovadora.',
              calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
            }
          ]
        },
        {
          nombre: 'APLICABILIDAD PRÁCTICA 5%',
          niveles: [
            {
              descripcion: 'No tiene aplicabilidad práctica.',
              calificaciones: ['MUY DEFICIENTE', 'DEFICIENTE', 'INSUFICIENTE']
            },
            {
              descripcion: 'Aplicabilidad dudosa o mal planteada.',
              calificaciones: ['BÁSICAMENTE ACEPTABLE']
            },
            {
              descripcion: 'Aplicabilidad limitada o poco viable.',
              calificaciones: ['ACEPTABLE', 'SATISFACTORIO']
            },
            {
              descripcion: 'Solución aplicable con ajustes menores.',
              calificaciones: ['BUENO', 'MUY BUENO']
            },
            {
              descripcion: 'Solución aplicable a múltiples contextos.',
              calificaciones: ['EXCELENTE', 'SOBRESALIENTE']
            }
          ]
        }
      ]
    }
  };
  const renderNivel = (nivel, index) => (
    <div key={index} className="nivel-column">
      <div className="nivel-container">
        <div className="nivel-descripcion">{nivel.descripcion}</div>
        <div className="calificaciones-container">
          {nivel.calificaciones.map((calificacion, idx) => (
            <div key={idx} className="calificacion-item">
              <span 
                className="calificacion-badge"
                style={{ 
                  backgroundColor: colorCalificacion[calificacion],
                  color: esColorClaro(colorCalificacion[calificacion]) ? '#333' : '#fff',
                }}
              >
                {calificacion}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Función para renderizar un subcriterio con sus niveles
  const renderSubcriterio = (subcriterio) => (
    <div className="subcriterio-container" key={subcriterio.nombre}>
      <div className={`subcriterio-titulo ${subcriterio.color}`}>
        {subcriterio.nombre}
      </div>
      <div className="niveles-grid">
        {subcriterio.niveles && subcriterio.niveles.map((nivel, index) => 
          renderNivel(nivel, index)
        )}
      </div>
    </div>
  );

  // Función para renderizar un criterio con sus subcriterios
  const renderCriterio = (criterio) => (
    <div className="criterio-container" key={criterio.nombre}>
      <div className={`criterio-titulo ${criterio.color}`}>
        {criterio.nombre}
      </div>
      {criterio.subcriterios && criterio.subcriterios.map(subcriterio => 
        renderSubcriterio(subcriterio)
      )}
    </div>
  );

  // Renderizar la sección activa
  const renderSeccion = (seccion) => (
    <div className="seccion-container">
      {seccion.criterios && seccion.criterios.map(criterio => 
        renderCriterio(criterio)
      )}
    </div>
  );

  return (
    <div className="vista-rubrica">
      <div className="main-container">
        <Sidebar />
        <div className="content-container">
          <h1 className="main-title">Rúbrica de Evaluación</h1>
          
          {/* Escala de Calificación */}
          <div className="escala-calificacion-container">
            <div className="escala-titulo">Escala de Calificación</div>
            <div className="escala-rows">
              {/* Primera fila: calificaciones superiores (6-10) */}
              <div className="escala-row">
                {escalaCalificacion.slice(0, 5).map((item) => (
                  <div 
                    key={item.valor}
                    className="escala-item"
                    style={{ 
                      backgroundColor: item.color,
                      color: esColorClaro(item.color) ? '#333' : '#fff',
                    }}
                  >
                    <span className="escala-item-num">{item.numero}:</span> {item.valor}
                  </div>
                ))}
              </div>
              {/* Segunda fila: calificaciones inferiores (1-5) */}
              <div className="escala-row">
                {escalaCalificacion.slice(5).map((item) => (
                  <div 
                    key={item.valor}
                    className="escala-item"
                    style={{ 
                      backgroundColor: item.color,
                      color: esColorClaro(item.color) ? '#333' : '#fff',
                    }}
                  >
                    <span className="escala-item-num">{item.numero}:</span> {item.valor}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Tabs para navegar entre secciones */}
          <div className="tabs-container">
            <button 
              onClick={() => setActiveTab('presentacion')}
              className={`tab-button ${activeTab === 'presentacion' ? 'active' : ''}`}
            >
              Presentación 30%
            </button>
            <button 
              onClick={() => setActiveTab('sustentacion')}
              className={`tab-button ${activeTab === 'sustentacion' ? 'active' : ''}`}
            >
              Sustentación 30%
            </button>
            <button 
              onClick={() => setActiveTab('documentacion')}
              className={`tab-button ${activeTab === 'documentacion' ? 'active' : ''}`}
            >
              Documentación 30%
            </button>
            <button 
              onClick={() => setActiveTab('innovacion')}
              className={`tab-button ${activeTab === 'innovacion' ? 'active' : ''}`}
            >
              Innovación 10%
            </button>
          </div>
          
          {/* Contenido de la sección activa */}
          <div className="rubrica-content">
            {rubrica[activeTab] && renderSeccion(rubrica[activeTab])}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VistaRubrica;