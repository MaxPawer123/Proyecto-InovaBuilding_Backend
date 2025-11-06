const Factura = require('../models/Factura');

// Crear nueva factura
const createFactura = async (req, res) => {
  try {
    console.log('📝 Creando factura con datos:', req.body);

    const { 
      id_residente, 
      id_departamento,
      residente_nombre,
      departamento,
      periodo,
      fecha_emision,
      fecha_vencimiento,
      items,
      subtotal,
      descuentos,
      impuestos,
      total,
      estado
    } = req.body;

    // Validaciones básicas
    if (!id_residente || !id_departamento || !residente_nombre || !departamento) {
      return res.status(400).json({
        success: false,
        error: 'Datos del residente y departamento son requeridos'
      });
    }

    if (!periodo || !fecha_emision || !fecha_vencimiento) {
      return res.status(400).json({
        success: false,
        error: 'Periodo y fechas son requeridos'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Debe incluir al menos un item en la factura'
      });
    }

    if (!subtotal || !total) {
      return res.status(400).json({
        success: false,
        error: 'Montos de la factura son requeridos'
      });
    }

    // Crear factura
    const factura = await Factura.create({
      id_residente,
      id_departamento,
      residente_nombre,
      departamento,
      periodo,
      fecha_emision,
      fecha_vencimiento,
      items,
      subtotal,
      descuentos: descuentos || 0,
      impuestos: impuestos || 0,
      total,
      estado: estado || 'pendiente'
    });

    console.log('✅ Factura creada exitosamente:', factura.nro);

    res.status(201).json({
      success: true,
      data: factura,
      message: `Factura ${factura.nro} creada exitosamente`
    });

  } catch (error) {
    console.error('❌ Error al crear factura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear factura: ' + error.message
    });
  }
};

// Obtener todas las facturas con filtros opcionales
const getAllFacturas = async (req, res) => {
  try {
    const { id_residente, periodo, estado } = req.query;

    console.log('📋 Obteniendo facturas con filtros:', { id_residente, periodo, estado });

    const facturas = await Factura.list({
      id_residente,
      periodo,
      estado
    });

    console.log(`✅ Se encontraron ${facturas.length} facturas`);

    res.json({
      success: true,
      data: facturas
    });

  } catch (error) {
    console.error('❌ Error al obtener facturas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener facturas: ' + error.message
    });
  }
};

// Obtener factura específica por ID
const getFacturaById = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔍 Buscando factura ID:', id);

    const factura = await Factura.getById(id);

    if (!factura) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    console.log('✅ Factura encontrada:', factura.nro);

    res.json({
      success: true,
      data: factura
    });

  } catch (error) {
    console.error('❌ Error al obtener factura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener factura: ' + error.message
    });
  }
};

// Actualizar estado de factura
const updateFacturaEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    console.log(`📝 Actualizando estado de factura ${id} a: ${estado}`);

    if (!estado) {
      return res.status(400).json({
        success: false,
        error: 'Estado es requerido'
      });
    }

    const factura = await Factura.updateEstado(id, estado);

    if (!factura) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    console.log('✅ Estado actualizado exitosamente');

    res.json({
      success: true,
      data: factura,
      message: 'Estado actualizado correctamente'
    });

  } catch (error) {
    console.error('❌ Error al actualizar estado:', error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado: ' + error.message
    });
  }
};

// Eliminar factura
const deleteFactura = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando factura ID:', id);

    const factura = await Factura.delete(id);

    if (!factura) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    console.log('✅ Factura eliminada exitosamente');

    res.json({
      success: true,
      message: 'Factura eliminada correctamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar factura:', error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar factura: ' + error.message
    });
  }
};

module.exports = {
  createFactura,
  getAllFacturas,
  getFacturaById,
  updateFacturaEstado,
  deleteFactura
};
