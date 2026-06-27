/**
 * CPQ (Configure, Price, Quote) Engine for Glass Fabrication
 * Automatically calculates pricing based on glass specifications
 */
const db = require('../config/database');

class CPQService {
  /**
   * Calculate the full price for a glass line item
   * @param {Object} config - Glass configuration
   * @returns {Object} - Calculated pricing breakdown
   */
  async calculateLinePrice(config) {
    const {
      glass_type,
      thickness,
      width_inches,
      height_inches,
      quantity = 1,
      edge_type,
      has_holes = false,
      holes_count = 0,
      hole_type = 'Standard Round Hole',
      cutouts = [],
      notches = [],
      coating,
      is_tempered = false,
      shape = 'rectangular',
      customer_id = null
    } = config;

    // 1. Calculate square footage
    const sqft = (width_inches * height_inches) / 144;
    const perimeter_inches = 2 * (width_inches + height_inches);
    const perimeter_linear_ft = perimeter_inches / 12;

    // 2. Get base glass price from pricing matrix
    const basePrice = await this.getBasePrice(glass_type, thickness, sqft);

    // 3. Calculate fabrication charges
    const fabricationCharges = await this.calculateFabricationCharges({
      edge_type,
      perimeter_linear_ft,
      has_holes,
      holes_count,
      hole_type,
      cutouts,
      notches,
      coating,
      is_tempered,
      shape,
      sqft
    });

    // 4. Calculate subtotal per piece
    const pricePerPiece = basePrice.glass_cost + fabricationCharges.total;

    // 5. Apply quantity breaks
    const quantityDiscount = await this.getQuantityDiscount(quantity);
    const discountAmount = pricePerPiece * quantity * (quantityDiscount / 100);

    // 6. Check customer-specific pricing
    let customerDiscount = 0;
    if (customer_id) {
      customerDiscount = await this.getCustomerDiscount(customer_id, glass_type);
    }

    // 7. Calculate final totals
    const subtotalBeforeDiscount = pricePerPiece * quantity;
    const totalDiscount = discountAmount + (subtotalBeforeDiscount * customerDiscount / 100);
    const lineTotal = subtotalBeforeDiscount - totalDiscount;

    // 8. Calculate cost and margin
    const costPerUnit = basePrice.cost_per_sqft ? basePrice.cost_per_sqft * sqft : pricePerPiece * 0.55;
    const marginPercent = pricePerPiece > 0 ? ((pricePerPiece - costPerUnit) / pricePerPiece * 100) : 0;

    return {
      // Dimensions
      sqft: Math.round(sqft * 10000) / 10000,
      perimeter_linear_ft: Math.round(perimeter_linear_ft * 100) / 100,

      // Glass pricing
      glass_price_per_sqft: basePrice.price_per_sqft,
      glass_cost: Math.round(basePrice.glass_cost * 100) / 100,
      min_charge_applied: basePrice.min_charge_applied,

      // Fabrication breakdown
      fabrication_charges: fabricationCharges.breakdown,
      fabrication_total: Math.round(fabricationCharges.total * 100) / 100,

      // Per piece
      price_per_piece: Math.round(pricePerPiece * 100) / 100,
      cost_per_unit: Math.round(costPerUnit * 100) / 100,
      margin_percent: Math.round(marginPercent * 100) / 100,

      // Quantity & discounts
      quantity,
      quantity_discount_percent: quantityDiscount,
      customer_discount_percent: customerDiscount,
      total_discount: Math.round(totalDiscount * 100) / 100,

      // Totals
      subtotal: Math.round(subtotalBeforeDiscount * 100) / 100,
      line_total: Math.round(lineTotal * 100) / 100,
      unit_price: Math.round((lineTotal / quantity) * 10000) / 10000
    };
  }

  /**
   * Get base glass price from pricing matrix
   */
  async getBasePrice(glass_type, thickness, sqft) {
    const [rows] = await db.query(
      `SELECT price_per_sqft, min_sqft, min_charge, markup_percent 
       FROM pricing_matrix 
       WHERE glass_type = ? AND thickness = ? AND is_active = 1`,
      [glass_type, thickness]
    );

    if (rows.length === 0) {
      // Fallback: try to find by glass_type only (any thickness)
      const [fallback] = await db.query(
        `SELECT AVG(price_per_sqft) as price_per_sqft, AVG(min_sqft) as min_sqft, AVG(min_charge) as min_charge
         FROM pricing_matrix WHERE glass_type = ? AND is_active = 1`,
        [glass_type]
      );
      if (fallback.length > 0 && fallback[0].price_per_sqft) {
        const price = fallback[0];
        const effectiveSqft = Math.max(sqft, parseFloat(price.min_sqft) || 3);
        const glassCost = effectiveSqft * parseFloat(price.price_per_sqft);
        const minCharge = parseFloat(price.min_charge) || 0;
        return {
          price_per_sqft: parseFloat(price.price_per_sqft),
          glass_cost: Math.max(glassCost, minCharge),
          min_charge_applied: glassCost < minCharge,
          cost_per_sqft: parseFloat(price.price_per_sqft) * 0.55
        };
      }
      // Ultimate fallback
      return { price_per_sqft: 10.00, glass_cost: Math.max(sqft * 10, 30), min_charge_applied: sqft * 10 < 30, cost_per_sqft: 5.50 };
    }

    const price = rows[0];
    const minSqft = parseFloat(price.min_sqft) || 3;
    const effectiveSqft = Math.max(sqft, minSqft);
    const pricePerSqft = parseFloat(price.price_per_sqft);
    const markup = parseFloat(price.markup_percent) || 0;
    const adjustedPrice = pricePerSqft * (1 + markup / 100);
    const glassCost = effectiveSqft * adjustedPrice;
    const minCharge = parseFloat(price.min_charge) || 0;

    return {
      price_per_sqft: adjustedPrice,
      glass_cost: Math.max(glassCost, minCharge),
      min_charge_applied: glassCost < minCharge,
      cost_per_sqft: adjustedPrice * 0.55
    };
  }

  /**
   * Calculate all fabrication charges for a piece
   */
  async calculateFabricationCharges(config) {
    const {
      edge_type,
      perimeter_linear_ft,
      has_holes,
      holes_count,
      hole_type,
      cutouts = [],
      notches = [],
      coating,
      is_tempered,
      shape,
      sqft
    } = config;

    const breakdown = [];
    let total = 0;

    // Edge work
    if (edge_type && edge_type !== 'raw' && edge_type !== 'none') {
      const edgeRate = await this.getFabricationRate('Edgework', edge_type);
      if (edgeRate) {
        let edgeCost = 0;
        if (edgeRate.pricing_method === 'per_linear_foot') {
          edgeCost = edgeRate.default_rate * perimeter_linear_ft;
        } else if (edgeRate.pricing_method === 'per_sq_ft') {
          edgeCost = edgeRate.default_rate * sqft;
        } else {
          edgeCost = edgeRate.default_rate;
        }
        breakdown.push({ name: `Edge: ${edge_type}`, cost: Math.round(edgeCost * 100) / 100, method: edgeRate.pricing_method });
        total += edgeCost;
      }
    }

    // Holes
    if (has_holes && holes_count > 0) {
      const holeRate = await this.getFabricationRate('Holes', hole_type);
      if (holeRate) {
        const holeCost = holeRate.default_rate * holes_count;
        breakdown.push({ name: `Holes: ${holes_count}x ${hole_type}`, cost: Math.round(holeCost * 100) / 100, method: 'per_hole' });
        total += holeCost;
      }
    }

    // Cutouts
    if (cutouts && cutouts.length > 0) {
      for (const cutout of cutouts) {
        const cutoutName = cutout.type || 'Standard Cutout';
        const cutoutRate = await this.getFabricationRate('Cutouts', cutoutName);
        if (cutoutRate) {
          const qty = cutout.quantity || 1;
          const cutoutCost = cutoutRate.default_rate * qty;
          breakdown.push({ name: `Cutout: ${cutoutName} x${qty}`, cost: Math.round(cutoutCost * 100) / 100, method: 'per_cutout' });
          total += cutoutCost;
        }
      }
    }

    // Notches
    if (notches && notches.length > 0) {
      for (const notch of notches) {
        const notchName = notch.type || 'Standard Hinge Notch';
        const notchRate = await this.getFabricationRate('Notches', notchName);
        if (notchRate) {
          const qty = notch.quantity || 1;
          const notchCost = notchRate.default_rate * qty;
          breakdown.push({ name: `Notch: ${notchName} x${qty}`, cost: Math.round(notchCost * 100) / 100, method: 'per_notch' });
          total += notchCost;
        }
      }
    }

    // Coating
    if (coating && coating !== 'none') {
      const coatingRate = await this.getFabricationRate('Coating', coating);
      if (coatingRate) {
        let coatingCost = 0;
        if (coatingRate.pricing_method === 'per_sq_ft') {
          coatingCost = coatingRate.default_rate * sqft;
        } else {
          coatingCost = coatingRate.default_rate;
        }
        breakdown.push({ name: `Coating: ${coating}`, cost: Math.round(coatingCost * 100) / 100, method: coatingRate.pricing_method });
        total += coatingCost;
      }
    }

    // Tempering
    if (is_tempered) {
      const temperRate = await this.getFabricationRate('Tempering', 'Standard Temper');
      if (temperRate) {
        let temperCost = 0;
        if (temperRate.pricing_method === 'per_sq_ft') {
          temperCost = temperRate.default_rate * sqft;
        } else {
          temperCost = temperRate.default_rate;
        }
        breakdown.push({ name: 'Tempering', cost: Math.round(temperCost * 100) / 100, method: temperRate.pricing_method });
        total += temperCost;
      }
    }

    // Shape (non-rectangular)
    if (shape && shape !== 'rectangular') {
      const shapeRate = await this.getFabricationRate('Shape', 'Custom Shape Cut');
      if (shapeRate) {
        breakdown.push({ name: `Shape: ${shape}`, cost: Math.round(shapeRate.default_rate * 100) / 100, method: 'per_piece' });
        total += shapeRate.default_rate;
      }
    }

    return { breakdown, total };
  }

  /**
   * Get fabrication rate from database
   */
  async getFabricationRate(category, name) {
    const [rows] = await db.query(
      `SELECT default_rate, pricing_method FROM fabrication_charges 
       WHERE category = ? AND name LIKE ? AND is_active = 1 
       ORDER BY id LIMIT 1`,
      [category, `%${name}%`]
    );
    if (rows.length > 0) {
      return { default_rate: parseFloat(rows[0].default_rate), pricing_method: rows[0].pricing_method };
    }
    return null;
  }

  /**
   * Get quantity discount percentage
   */
  async getQuantityDiscount(quantity) {
    const [rows] = await db.query(
      `SELECT discount_percent FROM quantity_breaks 
       WHERE min_qty <= ? AND max_qty >= ? AND is_active = 1 
       ORDER BY min_qty DESC LIMIT 1`,
      [quantity, quantity]
    );
    return rows.length > 0 ? parseFloat(rows[0].discount_percent) : 0;
  }

  /**
   * Get customer-specific discount
   */
  async getCustomerDiscount(customer_id, glass_type) {
    const [rows] = await db.query(
      `SELECT discount_percent FROM item_customers 
       WHERE customer_id = ? LIMIT 1`,
      [customer_id]
    );
    return rows.length > 0 ? parseFloat(rows[0].discount_percent || 0) : 0;
  }

  /**
   * Get all available glass types and thicknesses for the configurator dropdown
   */
  async getGlassOptions() {
    const [glassTypes] = await db.query(
      `SELECT DISTINCT glass_type FROM pricing_matrix WHERE is_active = 1 ORDER BY glass_type`
    );
    const [thicknesses] = await db.query(
      `SELECT DISTINCT thickness FROM pricing_matrix WHERE is_active = 1 ORDER BY 
       CASE thickness 
         WHEN '1/8"' THEN 1 WHEN '3/16"' THEN 2 WHEN '1/4"' THEN 3 
         WHEN '3/8"' THEN 4 WHEN '1/2"' THEN 5 WHEN '3/4"' THEN 6 WHEN '1"' THEN 7
       END`
    );
    const [edgeTypes] = await db.query(
      `SELECT name FROM fabrication_charges WHERE category = 'Edgework' AND is_active = 1 GROUP BY name ORDER BY MIN(id)`
    );
    const [coatings] = await db.query(
      `SELECT name FROM fabrication_charges WHERE category = 'Coating' AND is_active = 1 GROUP BY name ORDER BY MIN(id)`
    );
    const [holeTypes] = await db.query(
      `SELECT name FROM fabrication_charges WHERE category = 'Holes' AND is_active = 1 GROUP BY name ORDER BY MIN(id)`
    );

    return {
      glass_types: glassTypes.map(r => r.glass_type),
      thicknesses: thicknesses.map(r => r.thickness),
      edge_types: ['None', ...edgeTypes.map(r => r.name)],
      coatings: ['None', ...coatings.map(r => r.name)],
      hole_types: holeTypes.map(r => r.name),
      shapes: ['rectangular', 'arch', 'circle', 'oval', 'triangle', 'trapezoid', 'custom']
    };
  }

  /**
   * Get the full pricing matrix for admin display
   */
  async getPricingMatrix() {
    const [rows] = await db.query(
      `SELECT * FROM pricing_matrix ORDER BY glass_type, 
       CASE thickness 
         WHEN '1/8"' THEN 1 WHEN '3/16"' THEN 2 WHEN '1/4"' THEN 3 
         WHEN '3/8"' THEN 4 WHEN '1/2"' THEN 5 WHEN '3/4"' THEN 6 WHEN '1"' THEN 7
       END`
    );
    return rows;
  }

  /**
   * Update pricing matrix entry
   */
  async updatePricingMatrix(id, data) {
    const { price_per_sqft, min_sqft, min_charge, markup_percent, is_active } = data;
    await db.query(
      `UPDATE pricing_matrix SET price_per_sqft = ?, min_sqft = ?, min_charge = ?, markup_percent = ?, is_active = ? WHERE id = ?`,
      [price_per_sqft, min_sqft, min_charge, markup_percent, is_active, id]
    );
  }
}

module.exports = new CPQService();
