

CREATE TABLE personas (
    id_persona BIGSERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nac DATE NULL,
    foto_url VARCHAR(255) NULL,
    correo VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP NULL,
    password VARCHAR(255) NOT NULL,
    remember_token VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    id_persona BIGINT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- 'activo' o 'inactivo' (soft delete)
    CONSTRAINT fk_users_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL
);

CREATE TABLE sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    payload TEXT NOT NULL,
    last_activity INTEGER NOT NULL,
    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_last_activity_idx ON sessions(last_activity);

CREATE TABLE email_verification_tokens (
    email VARCHAR(255) PRIMARY KEY,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL
);

CREATE TABLE cache (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    expiration INTEGER NOT NULL
);

CREATE TABLE cache_locks (
    key VARCHAR(255) PRIMARY KEY,
    owner VARCHAR(255) NOT NULL,
    expiration INTEGER NOT NULL
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    queue VARCHAR(255) NOT NULL,
    payload TEXT NOT NULL,
    attempts SMALLINT NOT NULL,
    reserved_at INTEGER NULL,
    available_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX jobs_queue_idx ON jobs(queue);

CREATE TABLE job_batches (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    total_jobs INTEGER NOT NULL,
    pending_jobs INTEGER NOT NULL,
    failed_jobs INTEGER NOT NULL,
    failed_job_ids TEXT NOT NULL,
    options TEXT NULL,
    cancelled_at INTEGER NULL,
    created_at INTEGER NOT NULL,
    finished_at INTEGER NULL
);

CREATE TABLE failed_jobs (
    id BIGSERIAL PRIMARY KEY,
    uuid VARCHAR(255) UNIQUE NOT NULL,
    connection TEXT NOT NULL,
    queue TEXT NOT NULL,
    payload TEXT NOT NULL,
    exception TEXT NOT NULL,
    failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE personal_access_tokens (
    id BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    token VARCHAR(64) UNIQUE NOT NULL,
    abilities TEXT NULL,
    last_used_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);
CREATE INDEX pat_tokenable_idx ON personal_access_tokens(tokenable_type, tokenable_id);
CREATE INDEX pat_expires_at_idx ON personal_access_tokens(expires_at);

-- =============================================
-- DOMINIO
-- =============================================

CREATE TABLE edificios (
    id_edificio BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    nro_pisos INTEGER NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE rols (
    id_rol BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_rols_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE sensor_iot (
    id_sensor BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(255) NOT NULL,
    marca VARCHAR(100) NULL,
    modelo VARCHAR(100) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE tipos_dispositivo (
    id_tipo BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

CREATE TABLE contratos (
    id_contrato BIGSERIAL PRIMARY KEY,
    fecha_ini DATE NOT NULL,
    fecha_fin DATE NULL,
    monto_mensual NUMERIC(10,2) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    archivo_url VARCHAR(255) NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_contratos_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE departamentos (
    id_departamento BIGSERIAL PRIMARY KEY,
    nro_depa VARCHAR(255) NOT NULL,
    habitaciones INTEGER NOT NULL,
    estado VARCHAR(50) NOT NULL,
    id_contrato BIGINT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
   CONSTRAINT fk_deptos_contrato
        FOREIGN KEY (id_contrato) REFERENCES contratos(id_contrato) ON DELETE SET NULL
);

CREATE TABLE areas_comunes (
    id_area_comun BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    ubicacion VARCHAR(150) NULL,
    descripcion TEXT NULL,
    costo_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
    id_edificio BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_areas_edificio
        FOREIGN KEY (id_edificio) REFERENCES edificios(id_edificio) ON DELETE CASCADE
);

CREATE TABLE residentes (
    id_residente BIGSERIAL PRIMARY KEY,
    relacion_titular VARCHAR(255) NOT NULL,
    fecha_inicio_residencia DATE NOT NULL,
    fecha_fin_residencia DATE NULL,
    es_encargado BOOLEAN NOT NULL DEFAULT FALSE,
    id_persona BIGINT NOT NULL,
    id_departamento BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_res_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_res_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE
);

CREATE TABLE solicitudes (
    id_solicitud BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    prioridad VARCHAR(255) NOT NULL,
    estado VARCHAR(255) NOT NULL,
    id_residente BIGINT NOT NULL,
    id_departamento BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_sol_res
        FOREIGN KEY (id_residente) REFERENCES residentes(id_residente) ON DELETE CASCADE,
    CONSTRAINT fk_sol_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE
);

CREATE TABLE empleados (
    id_empleado BIGSERIAL PRIMARY KEY,
    cargo VARCHAR(100) NOT NULL,
    sueldo NUMERIC(10,2) NOT NULL,
    turno VARCHAR(50) NOT NULL,
    id_user BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_emp_user
        FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE consentimiento_digital (
    id_consentimiento BIGSERIAL PRIMARY KEY,
    finalidad VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    revocado BOOLEAN NOT NULL DEFAULT FALSE,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_consent_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE dato_biometricos (
    id_biometrico BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    datos_cifrados TEXT NOT NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_bio_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE autenticacion_multifactors (
    id_auth BIGSERIAL PRIMARY KEY,
    metodo_1 VARCHAR(50) NOT NULL,
    metodo_2 VARCHAR(50) NOT NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_mfa_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE credenciales (
    id_credencial BIGSERIAL PRIMARY KEY,
    estado VARCHAR(50) NOT NULL,
    tipo_acceso VARCHAR(50) NOT NULL,
    nivel_acceso INTEGER NOT NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_cred_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

-- Reservas antes de pagos (porque pagos referencia reservas)
CREATE TABLE reserva_areas (
    id_reserva BIGSERIAL PRIMARY KEY,
    fecha_ini TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    estado VARCHAR(50) NOT NULL,
    costo_total NUMERIC(10,2) NOT NULL,
    id_area_comun BIGINT NOT NULL,
    id_residente BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_reserva_area
        FOREIGN KEY (id_area_comun) REFERENCES areas_comunes(id_area_comun) ON DELETE CASCADE,
    CONSTRAINT fk_reserva_residente
        FOREIGN KEY (id_residente) REFERENCES residentes(id_residente) ON DELETE CASCADE
);

CREATE TABLE servicios (
    id_servicio BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    costo_mensual NUMERIC(10,2) NOT NULL,
    costo_fijo_mensual NUMERIC(10,2) NOT NULL,
    id_departamento BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_serv_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE
);

-- ==========================================
-- CONSUMOS (Opción A: consumo y costo_total directos)
-- ==========================================
DROP TABLE IF EXISTS consumos_registrados CASCADE;

CREATE TABLE consumos_registrados (
    id_consumo       BIGSERIAL PRIMARY KEY,
    id_departamento  BIGINT NOT NULL REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    tipo_servicio    VARCHAR(10) NOT NULL CHECK (tipo_servicio IN ('agua','luz','gas')),
    periodo          VARCHAR(7)  NOT NULL,             -- 'YYYY-MM'
    consumo          NUMERIC(10,2) NOT NULL,           -- se ingresa directo
    costo_total      NUMERIC(10,2) NOT NULL DEFAULT 0, -- lo calcula/ingresa tu backend
    observaciones    TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NULL
);

-- Evita duplicados del mismo mes/servicio en el mismo depto
CREATE UNIQUE INDEX ux_consumo_mes_depto_serv 
    ON consumos_registrados (id_departamento, tipo_servicio, periodo);
sql
Copiar código
-- ==========================================
-- UMBRALES (sin cambios conceptuales)
-- ==========================================
DROP TABLE IF EXISTS umbrales_consumo CASCADE;

CREATE TABLE umbrales_consumo (
    id_umbral       BIGSERIAL PRIMARY KEY,
    id_departamento BIGINT NOT NULL REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    tipo_servicio   VARCHAR(10) NOT NULL CHECK (tipo_servicio IN ('agua','luz','gas')),
    limite_maximo   NUMERIC(10,2) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL
);

CREATE UNIQUE INDEX ux_umbral_depto_serv 
    ON umbrales_consumo (id_departamento, tipo_servicio);
sql
Copiar código
-- ==========================================
-- ALERTAS (buzón)
-- ==========================================
DROP TABLE IF EXISTS alertas_consumo CASCADE;

CREATE TABLE alertas_consumo (
    id_alerta       BIGSERIAL PRIMARY KEY,    -- denormalizados útiles para listar
    id_departamento BIGINT NOT NULL REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    tipo_servicio   VARCHAR(10) NOT NULL CHECK (tipo_servicio IN ('agua','luz','gas')),
    periodo         VARCHAR(7)  NOT NULL,            -- 'YYYY-MM'
    mensaje         TEXT NOT NULL,                   -- ej: "50 supera límite 40"
    estado          VARCHAR(12) NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','en_progreso','resuelta')),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NULL
    
);

CREATE INDEX ix_alertas_lookup 
  ON alertas_consumo (estado, periodo, tipo_servicio, id_departamento);


Tablas Necesarias para Tickets y Mantenimiento


-- ==========================================
-- CATEGORÍAS DE TICKETS
-- ==========================================
CREATE TABLE ticket_categorias (
    id_categoria BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);


-- ==========================================
-- TICKETS PRINCIPALES
-- ==========================================
CREATE TABLE tickets (
    id_ticket BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,           -- TCK-2025-0001
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_progreso','resuelto','cerrado','cancelado')),
    prioridad VARCHAR(10) NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja','media','alta','critica')),
    visibilidad VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (visibilidad IN ('normal','urgente','privado')),
    
    -- Relaciones principales
    id_categoria BIGINT NOT NULL REFERENCES ticket_categorias(id_categoria) ON DELETE RESTRICT,
    id_residente BIGINT NOT NULL REFERENCES residentes(id_residente) ON DELETE CASCADE,
    id_departamento BIGINT NOT NULL REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    
    -- Fechas importantes
    fecha_reporte TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_compromiso TIMESTAMP NULL,              -- fecha límite estimada
    fecha_cierre TIMESTAMP NULL,
    
    -- Metadatos
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- Índices para consultas eficientes
CREATE INDEX tickets_estado_prioridad_idx ON tickets(estado, prioridad);
CREATE INDEX tickets_residente_idx ON tickets(id_residente);
CREATE INDEX tickets_departamento_idx ON tickets(id_departamento);
CREATE INDEX tickets_categoria_idx ON tickets(id_categoria);
CREATE INDEX tickets_fecha_reporte_idx ON tickets(fecha_reporte);


-- ==========================================
-- TÉCNICOS EXTERNOS (AGENDA)
-- ==========================================
CREATE TABLE tecnicos_externos (
    id_tecnico BIGSERIAL PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    cargo VARCHAR(100) NOT NULL,                  -- Plomero, Electricista, etc.
    celular VARCHAR(20) NOT NULL,
    email VARCHAR(255) NULL,
    
    -- Estado del técnico
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- ==========================================
-- ASIGNACIONES DE TIKETS - Manejar ambos tipos
-- ==========================================
CREATE TABLE ticket_asignaciones (
    id_asignacion BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    
    -- Asignación a empleado interno O técnico externo
    id_empleado BIGINT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE,
    id_tecnico_externo BIGINT NULL REFERENCES tecnicos_externos(id_tecnico) ON DELETE CASCADE,
    
    -- Validación: uno y solo uno debe estar lleno
    CONSTRAINT check_asignacion_tipo CHECK (
        (id_empleado IS NOT NULL AND id_tecnico_externo IS NULL) OR 
        (id_empleado IS NULL AND id_tecnico_externo IS NOT NULL)
    ),
    
    es_actual BOOLEAN NOT NULL DEFAULT TRUE,
    asignado_por_persona BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE RESTRICT,
    
    fecha_asignacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP NULL,
    nota TEXT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- ==========================================
-- COMENTARIOS/SEGUIMIENTO
-- ==========================================
CREATE TABLE ticket_comentarios (
    id_comentario BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    id_persona BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    
    comentario TEXT NOT NULL,
    privado BOOLEAN NOT NULL DEFAULT FALSE,       -- visible solo para admin/empleados
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

CREATE INDEX ticket_com_ticket_idx ON ticket_comentarios(id_ticket, created_at);
CREATE INDEX ticket_com_persona_idx ON ticket_comentarios(id_persona);

-- ==========================================
-- ADJUNTOS (FOTOS/ARCHIVOS)
-- ==========================================
CREATE TABLE ticket_adjuntos (
    id_adjunto BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    
    -- Información del archivo
    nombre_original VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,                    -- ruta completa del archivo
    tipo_mime VARCHAR(100) NOT NULL,              -- image/jpeg, application/pdf, etc.
    peso_bytes BIGINT NOT NULL,
    
    -- Quién subió el archivo
    subido_por_persona BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE RESTRICT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ticket_adj_ticket_idx ON ticket_adjuntos(id_ticket);

-- ==========================================
-- HISTORIAL DE SEGUIMIENTO (para notificaciones)
-- ==========================================
CREATE TABLE ticket_seguimientos (
    id_seguimiento BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    
    -- Cambios de estado
    estado_anterior VARCHAR(20) NOT NULL,
    estado_nuevo VARCHAR(20) NOT NULL,
    
    -- Información adicional
    comentario TEXT NOT NULL,
    realizado_por_persona BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE RESTRICT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ticket_seg_ticket_idx ON ticket_seguimientos(id_ticket, created_at);


-- ==========================================
-- PARTES DE TRABAJO (OPCIONAL - para empleados)
-- ==========================================
CREATE TABLE ticket_partes_trabajo (
    id_parte BIGSERIAL PRIMARY KEY,
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    id_empleado BIGINT NOT NULL REFERENCES empleados(id_empleado) ON DELETE CASCADE, 
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX ticket_pt_ticket_idx ON ticket_partes_trabajo(id_ticket);
CREATE INDEX ticket_pt_empleado_idx ON ticket_partes_trabajo(id_empleado);

-- ==========================================
-- TABLA PRINCIPAL DE NOTIFICACIONES
-- ==========================================
CREATE TABLE notificaciones (
    id_notificacion BIGSERIAL PRIMARY KEY,
    
    -- Información del ticket relacionado
    id_ticket BIGINT NOT NULL REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    
    -- Destinatario de la notificación
    id_persona_destino BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    
    -- Tipo de notificación
    tipo_notificacion VARCHAR(50) NOT NULL CHECK (tipo_notificacion IN (
        'nuevo_ticket', 
        'asignacion_ticket', 
        'cambio_estado', 
        'nuevo_comentario',
        'recordatorio'
    )),
    
    -- Contenido de la notificación
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    
    -- Estado de la notificación
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_envio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP NULL,
    
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL
);

-- Índices para consultas rápidas
CREATE INDEX notificaciones_destino_idx ON notificaciones(id_persona_destino, leida);
CREATE INDEX notificaciones_ticket_idx ON notificaciones(id_ticket);
CREATE INDEX notificaciones_fecha_envio_idx ON notificaciones(fecha_envio);
CREATE INDEX notificaciones_tipo_idx ON notificaciones(tipo_notificacion);

-- ==========================================
-- TABLA DE CONFIGURACIÓN (OPCIONAL)
-- ==========================================
CREATE TABLE configuracion_notificaciones (
    id_config BIGSERIAL PRIMARY KEY,
    id_persona BIGINT NOT NULL REFERENCES personas(id_persona) ON DELETE CASCADE,
    
    -- Preferencias de notificación en el sistema
    notificar_nuevos_tickets BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_asignaciones BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_cambios_estado BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_comentarios BOOLEAN NOT NULL DEFAULT TRUE,
    notificar_recordatorios BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    
    CONSTRAINT uq_config_persona UNIQUE (id_persona)
);


CREATE OR REPLACE FUNCTION notificar_nuevo_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar a todos los administradores
    INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
    SELECT 
        NEW.id_ticket, 
        p.id_persona,
        'nuevo_ticket',
        'Nuevo Ticket Creado',
        'El residente ' || per.nombres || ' ' || per.apellidos || ' ha creado el ticket: ' || NEW.titulo
    FROM personas p
    JOIN rols r ON p.id_persona = r.id_persona
    JOIN residentes res ON NEW.id_residente = res.id_residente
    JOIN personas per ON res.id_persona = per.id_persona
    WHERE r.nombre = 'admin';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notificar_asignacion_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar al empleado asignado (solo si es asignación a empleado interno)
    IF NEW.id_empleado IS NOT NULL THEN
        INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
        SELECT 
            NEW.id_ticket,
            p.id_persona,
            'asignacion_ticket',
            'Ticket Asignado',
            'Se te ha asignado el ticket: ' || t.titulo
        FROM tickets t
        JOIN empleados e ON NEW.id_empleado = e.id_empleado
        JOIN users u ON e.id_user = u.id
        JOIN personas p ON u.id_persona = p.id_persona
        WHERE t.id_ticket = NEW.id_ticket;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



-- Trigger para nuevos tickets
CREATE TRIGGER trigger_nuevo_ticket
    AFTER INSERT ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nuevo_ticket();

-- Trigger para asignaciones
CREATE TRIGGER trigger_asignacion_ticket
    AFTER INSERT ON ticket_asignaciones
    FOR EACH ROW
    EXECUTE FUNCTION notificar_asignacion_ticket();



CREATE OR REPLACE FUNCTION notificar_cambio_estado_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado != NEW.estado THEN
        -- Notificar al residente
        INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
        SELECT 
            NEW.id_ticket,
            p.id_persona,
            'cambio_estado',
            'Estado del Ticket Actualizado',
            'El ticket "' || NEW.titulo || '" cambió de ' || OLD.estado || ' a ' || NEW.estado
        FROM residentes r
        JOIN personas p ON r.id_persona = p.id_persona
        WHERE r.id_residente = NEW.id_residente;
        
        -- Notificar al empleado asignado (si existe)
        INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
        SELECT 
            NEW.id_ticket,
            p.id_persona,
            'cambio_estado', 
            'Estado del Ticket Actualizado',
            'El ticket "' || NEW.titulo || '" cambió de ' || OLD.estado || ' a ' || NEW.estado
        FROM ticket_asignaciones ta
        JOIN empleados e ON ta.id_empleado = e.id_empleado
        JOIN users u ON e.id_user = u.id
        JOIN personas p ON u.id_persona = p.id_persona
        WHERE ta.id_ticket = NEW.id_ticket AND ta.es_actual = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para cambios de estado
CREATE TRIGGER trigger_cambio_estado_ticket
    AFTER UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION notificar_cambio_estado_ticket();

CREATE OR REPLACE FUNCTION notificar_nuevo_comentario()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar al residente (si el comentario no es del residente)
    INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
    SELECT 
        NEW.id_ticket,
        p.id_persona,
        'nuevo_comentario',
        'Nuevo Comentario en Ticket',
        'Hay un nuevo comentario en el ticket: ' || t.titulo
    FROM tickets t
    JOIN residentes r ON t.id_residente = r.id_residente
    JOIN personas p ON r.id_persona = p.id_persona
    WHERE t.id_ticket = NEW.id_ticket
    AND NEW.id_persona != p.id_persona;
    
    -- Notificar al empleado asignado (si existe y no es quien comentó)
    INSERT INTO notificaciones (id_ticket, id_persona_destino, tipo_notificacion, titulo, mensaje)
    SELECT 
        NEW.id_ticket,
        p.id_persona,
        'nuevo_comentario',
        'Nuevo Comentario en Ticket',
        'Hay un nuevo comentario en el ticket: ' || t.titulo
    FROM tickets t
    JOIN ticket_asignaciones ta ON t.id_ticket = ta.id_ticket
    JOIN empleados e ON ta.id_empleado = e.id_empleado
    JOIN users u ON e.id_user = u.id
    JOIN personas p ON u.id_persona = p.id_persona
    WHERE t.id_ticket = NEW.id_ticket 
    AND ta.es_actual = true
    AND NEW.id_persona != p.id_persona;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para nuevos comentarios
CREATE TRIGGER trigger_nuevo_comentario
    AFTER INSERT ON ticket_comentarios
    FOR EACH ROW
    EXECUTE FUNCTION notificar_nuevo_comentario();
ALTER TABLE reserva_areas ADD COLUMN IF NOT EXISTS codigo VARCHAR(20) UNIQUE;
ALTER TABLE reserva_areas ADD COLUMN IF NOT EXISTS observaciones TEXT;

CREATE TABLE IF NOT EXISTS qr_pagos (
    id_qr BIGSERIAL PRIMARY KEY,
    qr_data TEXT NOT NULL,
    qr_url VARCHAR(500) NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    expires_at TIMESTAMP NULL,
    id_reserva BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_qr_reserva
        FOREIGN KEY (id_reserva) REFERENCES reserva_areas(id_reserva) ON DELETE CASCADE
);

ALTER TABLE pagos ADD COLUMN IF NOT EXISTS estado VARCHAR(50) NOT NULL DEFAULT 'pendiente';
ALTER TABLE pagos ALTER COLUMN id_servicio DROP NOT NULL;
ALTER TABLE pagos ALTER COLUMN id_departamento DROP NOT NULL;

CREATE INDEX IF NOT EXISTS reserva_areas_fecha_idx ON reserva_areas(fecha_ini, fecha_fin);
CREATE INDEX IF NOT EXISTS reserva_areas_area_fecha_idx ON reserva_areas(id_area_comun, fecha_ini);
CREATE INDEX IF NOT EXISTS reserva_areas_estado_idx ON reserva_areas(estado);
CREATE INDEX IF NOT EXISTS qr_pagos_reserva_idx ON qr_pagos(id_reserva);
CREATE INDEX IF NOT EXISTS areas_comunes_edificio_idx ON areas_comunes(id_edificio);


select * from reserva_areas;




CREATE TABLE pagos (
    id_pago BIGSERIAL PRIMARY KEY,
    concepto VARCHAR(150) NOT NULL,
    periodo_ini DATE NOT NULL,
    periodo_fin DATE NOT NULL,
    metodo VARCHAR(50) NOT NULL,
    costo_total NUMERIC(10,2) NOT NULL,
    id_servicio BIGINT NOT NULL,
    id_departamento BIGINT NOT NULL,
    id_reserva BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_pago_serv
        FOREIGN KEY (id_servicio) REFERENCES servicios(id_servicio) ON DELETE CASCADE,
    CONSTRAINT fk_pago_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE,
    CONSTRAINT fk_pago_reserva
        FOREIGN KEY (id_reserva) REFERENCES reserva_areas(id_reserva) ON DELETE CASCADE
);

CREATE TABLE facturas (
    id_factura BIGSERIAL PRIMARY KEY,
    fecha_emision DATE NOT NULL,
    monto_total NUMERIC(10,2) NOT NULL,
    id_residente BIGINT NOT NULL,
    id_consumo BIGINT NOT NULL,
    id_pago BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_fact_res
        FOREIGN KEY (id_residente) REFERENCES residentes(id_residente) ON DELETE CASCADE,
    CONSTRAINT fk_fact_cons
        FOREIGN KEY (id_consumo) REFERENCES consumos(id_consumo) ON DELETE CASCADE,
    CONSTRAINT fk_fact_pago
        FOREIGN KEY (id_pago) REFERENCES pagos(id_pago) ON DELETE CASCADE
);

CREATE TABLE dispositivos (
    id_dispositivo BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    marca VARCHAR(100) NULL,
    modelo VARCHAR(100) NULL,
    ubicacion VARCHAR(150) NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'activo',
    fecha DATE NULL,
    hora TIME NULL,
    id_persona BIGINT NOT NULL,
    id_tipo BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_disp_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE,
    CONSTRAINT fk_disp_tipo
        FOREIGN KEY (id_tipo) REFERENCES tipos_dispositivo(id_tipo) ON DELETE CASCADE
);

CREATE TABLE eventos_seguridad (
    id_eve_seg BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    resultado VARCHAR(100) NULL,
    nivel_riesgo VARCHAR(50) NOT NULL,
    evidencia_url VARCHAR(255) NULL,
    metodo_autenticacion VARCHAR(100) NULL,
    id_dispositivo BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_evento_dispositivo
        FOREIGN KEY (id_dispositivo) REFERENCES dispositivos(id_dispositivo) ON DELETE CASCADE
);



CREATE TABLE lectura_sensor (
    id_lectura BIGSERIAL PRIMARY KEY,
    valor NUMERIC(10,2) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL,
    id_sensor BIGINT NOT NULL,
    id_departamento BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_lect_sensor
        FOREIGN KEY (id_sensor) REFERENCES sensor_iot(id_sensor) ON DELETE CASCADE,
    CONSTRAINT fk_lect_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE
);

CREATE TABLE bitacoras (
    id_bitacora BIGSERIAL PRIMARY KEY,
    descripcion TEXT NOT NULL,
    accion VARCHAR(255) NOT NULL,
    fecha TIMESTAMP NOT NULL,
    id_persona BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_bit_persona
        FOREIGN KEY (id_persona) REFERENCES personas(id_persona) ON DELETE CASCADE
);

CREATE TABLE historial_consumos (
    id_historial_consumo BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    valor NUMERIC(10,2) NOT NULL,
    alerta_generada BOOLEAN NOT NULL DEFAULT FALSE,
    id_consumo BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_hist_cons
        FOREIGN KEY (id_consumo) REFERENCES consumos(id_consumo) ON DELETE CASCADE
);

CREATE TABLE historial_pagos (
    id_historial_pago BIGSERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    monto NUMERIC(10,2) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    retraso_dias INTEGER NOT NULL DEFAULT 0,
    id_pago BIGINT NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_hist_pago
        FOREIGN KEY (id_pago) REFERENCES pagos(id_pago) ON DELETE CASCADE
);

CREATE TABLE estados_cuenta (
    id_estado BIGSERIAL PRIMARY KEY,
    id_residente BIGINT NOT NULL,
    id_departamento BIGINT NOT NULL,
    periodo VARCHAR(7) NOT NULL, -- YYYY-MM
    saldo_anterior NUMERIC(10,2) NOT NULL DEFAULT 0,
    cargos_mes NUMERIC(10,2) NOT NULL DEFAULT 0,
    pagos_mes NUMERIC(10,2) NOT NULL DEFAULT 0,
    saldo_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
    fecha_generacion TIMESTAMP NULL,
    observaciones TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    CONSTRAINT fk_ec_residente
        FOREIGN KEY (id_residente) REFERENCES residentes(id_residente) ON DELETE CASCADE,
    CONSTRAINT fk_ec_depto
        FOREIGN KEY (id_departamento) REFERENCES departamentos(id_departamento) ON DELETE CASCADE
);
CREATE INDEX estados_cuenta_residente_idx ON estados_cuenta(id_residente);
CREATE INDEX estados_cuenta_departamento_idx ON estados_cuenta(id_departamento);
CREATE INDEX estados_cuenta_periodo_idx ON estados_cuenta(periodo);