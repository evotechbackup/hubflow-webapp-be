const router = require('express').Router();

const {
  postBooking,
  getBookings,
  getBookingById,
  getBookingDetailsById,
  updateBooking,
  rejectBooking,
  updateBookingApproval,
  changeValidation,
  deleteBooking,
} = require('../../controllers/sales/bookingController');

router.post('/:orderId?', postBooking);

router.get('/bookingbyid/:id', getBookingById);

router.get('/bookingbybookingid/:id', getBookingDetailsById);

router.put('/statusreject/:id', rejectBooking);

router.put('/updateapproval/:id', updateBookingApproval);

router.put('/changevalidation/:id', changeValidation);

router.put('/update/:id', updateBooking);

router.get('/filter/:orgid', getBookings);

router.delete('/delete/:id', deleteBooking);

module.exports = router;
