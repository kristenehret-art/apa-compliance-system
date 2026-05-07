// ✅ ZIP → Tax lookup (MVP)
export function getTaxRateByZip(zip) {
  const taxTable = {
    "85001": 8.6, // Phoenix
    "85002": 8.6,
    "85251": 8.8, // Scottsdale
    "85301": 9.2, // Glendale example
  };

  return taxTable[zip] || 0;
}


// ✅ Main pricing function
export function calculateTattooPrice({
  size,
  detailLevel,
  placement,
  hourlyRate,
  minimumCharge,
  estimatedHours,
  materialCost = 0,
  taxRate = 0,
  applyTax = false,
}) {
  const sizeMultiplier = {
    small: 1,
    medium: 1.5,
    large: 2.5,
  };

  const detailMultiplier = {
    low: 1,
    medium: 1.3,
    high: 1.75,
  };

  const placementMultiplier = {
    easy: 1,
    moderate: 1.25,
    difficult: 1.5,
  };

  let basePrice =
    estimatedHours *
    hourlyRate *
    sizeMultiplier[size] *
    detailMultiplier[detailLevel] *
    placementMultiplier[placement];

  // Enforce minimum
  if (basePrice < minimumCharge) {
    basePrice = minimumCharge;
  }

  // Add material cost
  let subtotal = basePrice + Number(materialCost);

  // Apply tax if enabled
  let taxAmount = applyTax ? subtotal * (taxRate / 100) : 0;

  let total = subtotal + taxAmount;

  return {
    basePrice: Math.round(basePrice),
    materialCost: Math.round(materialCost),
    taxAmount: Math.round(taxAmount),
    total: Math.round(total),
  };
}