const {
  createTemplate,
  updateFile,
  getTemplate,
  getAllTemplates,
  updateTemplate,
  createFile,
  deleteTemplate,
} = require('../../controllers/docsFile/docsTemplateController');

const router = require('express').Router();

router.get('/getall/:orgid', getAllTemplates);

router.post('/create', createTemplate);

router.post('/file/create', createFile);

router.put('/update', updateTemplate);

router.put('/template/update', updateFile);

router.get('/gettemplate/:id', getTemplate);

router.delete('/delete/:id', deleteTemplate);

module.exports = router;
