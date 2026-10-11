const ClientCatalogue = require('../models/ClientCatalogue');

/**
 * Gating logic for product prices:
 * Gated rule: "No user can see prices, they have to register, then request a quote so their prices are loaded to their catalogue"
 */
const applyPriceGatingToProducts = async (products, user) => {
  if (!products) return [];
  const isArray = Array.isArray(products);
  const list = isArray ? products : [products];

  // Map client custom prices if logged in as client
  let customPriceMap = new Map();
  if (user && user.role === 'client') {
    const catalogue = await ClientCatalogue.findOne({ client: user._id });
    if (catalogue && catalogue.items) {
      catalogue.items.forEach(item => {
        customPriceMap.set(item.product.toString(), item.customPrice);
      });
    }
  }

  const processed = list.map(prod => {
    const pObj = prod.toObject ? prod.toObject() : { ...prod };
    const prodId = pObj._id ? pObj._id.toString() : '';

    if (user && user.role === 'admin') {
      pObj.hasCustomPrice = true;
      pObj.priceDisplay = `$${pObj.listPrice.toFixed(2)} (Base List Price)`;
      pObj.userPrice = pObj.listPrice;
      pObj.canAddToCart = false; // Admins do not shop
    } else if (user && user.role === 'client' && customPriceMap.has(prodId)) {
      const customPrice = customPriceMap.get(prodId);
      pObj.hasCustomPrice = true;
      pObj.userPrice = customPrice;
      pObj.priceDisplay = `$${customPrice.toFixed(2)}`;
      pObj.canAddToCart = true;
    } else {
      // Unauthenticated user OR registered user without custom quote price loaded
      pObj.hasCustomPrice = false;
      pObj.userPrice = null;
      delete pObj.listPrice; // Hide raw list price from client API payloads
      pObj.priceDisplay = 'Request Quote to View Price';
      pObj.canAddToCart = false;
    }

    return pObj;
  });

  return isArray ? processed : processed[0];
};

module.exports = {
  applyPriceGatingToProducts
};
