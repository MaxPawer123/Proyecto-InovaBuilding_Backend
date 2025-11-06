-- Agregar columnas faltantes a la tabla nominas
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS empleado_nombre VARCHAR(200);
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS periodo VARCHAR(7);
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'emitida';
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS id_tecnico BIGINT;
ALTER TABLE nominas ADD COLUMN IF NOT EXISTS tipo_empleado VARCHAR(20) DEFAULT 'interno';

-- Agregar foreign key para técnicos externos
ALTER TABLE nominas 
  ADD CONSTRAINT fk_nominas_tecnico 
  FOREIGN KEY (id_tecnico) 
  REFERENCES tecnicos_externos(id_tecnico) 
  ON DELETE SET NULL;

-- Modificar constraint de id_empleado para permitir NULL (cuando sea técnico externo)
ALTER TABLE nominas DROP CONSTRAINT IF EXISTS fk_nom_empleado;
ALTER TABLE nominas 
  ADD CONSTRAINT fk_nom_empleado 
  FOREIGN KEY (id_empleado) 
  REFERENCES empleados(id_empleado) 
  ON DELETE SET NULL;

-- Modificar id_empleado para permitir NULL
ALTER TABLE nominas ALTER COLUMN id_empleado DROP NOT NULL;

-- Agregar constraint para validar que sea interno O externo
ALTER TABLE nominas 
  ADD CONSTRAINT chk_tipo_empleado CHECK (
    (tipo_empleado = 'interno' AND id_empleado IS NOT NULL AND id_tecnico IS NULL) OR
    (tipo_empleado = 'externo' AND id_tecnico IS NOT NULL AND id_empleado IS NULL)
  );

-- Verificar que las tablas existan
SELECT 'Tabla nominas actualizada' as status;
SELECT 'Tabla conceptos_nomina existe' as status FROM conceptos_nomina LIMIT 0;
SELECT 'Tabla nomina_detalles existe' as status FROM nomina_detalles LIMIT 0;
