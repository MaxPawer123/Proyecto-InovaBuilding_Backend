-- Tabla de nóminas (cabecera)
CREATE TABLE IF NOT EXISTS nominas (
  id_nomina SERIAL PRIMARY KEY,
  id_empleado BIGINT REFERENCES empleados(id_empleado) ON DELETE SET NULL,
  id_tecnico BIGINT REFERENCES tecnicos_externos(id_tecnico) ON DELETE SET NULL,
  tipo_empleado VARCHAR(20) NOT NULL DEFAULT 'interno', -- 'interno' o 'externo'
  periodo VARCHAR(7) NOT NULL, -- formato YYYY-MM
  fecha_pago DATE NOT NULL,
  salario_base DECIMAL(10,2) DEFAULT 0.00,
  bono DECIMAL(10,2) DEFAULT 0.00,
  descuento DECIMAL(10,2) DEFAULT 0.00,
  total DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'emitida', -- 'emitida', 'pagada'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_empleado CHECK (
    (tipo_empleado = 'interno' AND id_empleado IS NOT NULL AND id_tecnico IS NULL) OR
    (tipo_empleado = 'externo' AND id_tecnico IS NOT NULL AND id_empleado IS NULL)
  )
);

-- Tabla de detalles de nómina (conceptos)
CREATE TABLE IF NOT EXISTS nomina_detalles (
  id_detalle SERIAL PRIMARY KEY,
  id_nomina INTEGER NOT NULL REFERENCES nominas(id_nomina) ON DELETE CASCADE,
  nombre_concepto VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL, -- 'ingreso' o 'descuento'
  monto DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_nominas_empleado ON nominas(id_empleado);
CREATE INDEX IF NOT EXISTS idx_nominas_tecnico ON nominas(id_tecnico);
CREATE INDEX IF NOT EXISTS idx_nominas_periodo ON nominas(periodo);
CREATE INDEX IF NOT EXISTS idx_nominas_estado ON nominas(estado);
CREATE INDEX IF NOT EXISTS idx_nomina_detalles_nomina ON nomina_detalles(id_nomina);

-- Comentarios
COMMENT ON TABLE nominas IS 'Tabla de nóminas (boletas de pago) para empleados internos y técnicos externos';
COMMENT ON TABLE nomina_detalles IS 'Detalles de conceptos de cada nómina (salario, bonos, descuentos, etc.)';
