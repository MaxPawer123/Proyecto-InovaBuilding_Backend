-- Crear tabla alertas_consumo si no existe
CREATE TABLE IF NOT EXISTS alertas_consumo (
    id_alerta       BIGSERIAL PRIMARY KEY,
    id_departamento BIGINT NOT NULL REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    tipo_servicio   VARCHAR(10) NOT NULL CHECK (tipo_servicio IN ('agua','luz','gas')),
    periodo         VARCHAR(7)  NOT NULL,            -- 'YYYY-MM'
    mensaje         TEXT NOT NULL,                   -- ej: "50 supera límite 40"
    estado          VARCHAR(12) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','en_progreso','resuelta')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_alertas_departamento ON alertas_consumo(id_departamento);
CREATE INDEX IF NOT EXISTS idx_alertas_periodo ON alertas_consumo(periodo);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas_consumo(estado);

-- Comentarios en la tabla
COMMENT ON TABLE alertas_consumo IS 'Registro de alertas de consumo cuando se superan umbrales';
COMMENT ON COLUMN alertas_consumo.id_alerta IS 'Identificador único de la alerta';
COMMENT ON COLUMN alertas_consumo.id_departamento IS 'Referencia al departamento que generó la alerta';
COMMENT ON COLUMN alertas_consumo.tipo_servicio IS 'Tipo de servicio: agua, luz o gas';
COMMENT ON COLUMN alertas_consumo.periodo IS 'Período del consumo en formato YYYY-MM';
COMMENT ON COLUMN alertas_consumo.mensaje IS 'Descripción de la alerta';
COMMENT ON COLUMN alertas_consumo.estado IS 'Estado de la alerta: abierta, en_progreso, resuelta';
