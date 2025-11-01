const {
  createdProductByCategory,
  productFilterByType,
  getAllProducts,
  getproductbyid,
  updateProductaddTags,
  getTags,
  deleteProductDocument,
  updateDocuments,
  getproductGroupByCategory,
  updateopeningstock,
  getproductstocked,
  goodsnrentals,
  getProductsByfiltered,
  getProductsByPurchaseOrder,
  storerackrowdetailsQrcodes,
  getEquipments,
  reordernRestock,
  getOrderUpdate,
  getCategoriesByType,
  getProducrsByCategory,
  deleteProduct,
  updatedProductlocation,
  updateProduct,
  getDocumentById,
  getVehicals,
} = require('../../controllers/inventory/productControlle');

const router = require('express').Router();

router.get('/:orgid', getAllProducts);
router.get('/product-group-by-category/:orgid', getproductGroupByCategory);
router.get('/stocked/:orgid', getproductstocked);
router.get('/goodsnrentals/:orgid', goodsnrentals);
router.get('/filtered/:orgid/:type', getProductsByfiltered);
router.get('/purchaseOrder/:orgid', getProductsByPurchaseOrder);
router.get('/gettags/:id', getTags);
router.get('/getproductbyid/:id', getproductbyid);
router.get('/documents/:id', getDocumentById);
router.get('/vehicle/:orgid', getVehicals);
router.get('/equipment/:orgid', getEquipments);
router.get('/reordernRestock/:orgid', reordernRestock);
router.get('/get-order-updates/:orgid', getOrderUpdate);
router.get('/:orgid/:type', getCategoriesByType);
router.get('/filter/:orgid/:type', productFilterByType);
router.get('/get-products-by-category/:orgid/:category', getProducrsByCategory);

router.post('/:categoryType', createdProductByCategory);
router.post(
  '/store-rack-row-details/qr-codes/:orgid',
  storerackrowdetailsQrcodes
);
router.post(
  '/store-rack-row-details/qr-codes/:orgid',
  storerackrowdetailsQrcodes
);

router.put('/update-opening-stock', updateopeningstock);
router.put('/update-products-inventory-location', updatedProductlocation);
router.put('/:id', updateProduct);
router.put('/addtags/:id', updateProductaddTags);
router.put('/documents/:id/:documentId', updateDocuments);

router.delete('/:id', deleteProduct);
router.delete('/documents/:id/:documentId', deleteProductDocument);

module.exports = router;
