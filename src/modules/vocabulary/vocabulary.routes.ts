import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createVocabularySchema,
  deleteVocabularySchema,
  listVocabularySchema,
} from '../../schemas/vocabulary';
import {
  createVocabularyController,
  deleteVocabularyController,
  listVocabularyController,
} from './vocabulary.controller';

const router = Router();

/**
 * @route   GET /api/vocabulary
 * @desc    Lấy danh sách từ vựng đã lưu của user hiện tại
 */
router.get('/', auth, validate(listVocabularySchema), listVocabularyController);

/**
 * @route   POST /api/vocabulary
 * @desc    Lưu từ vựng mới theo chế độ auto hoặc manual
 */
router.post('/', auth, validate(createVocabularySchema), createVocabularyController);

/**
 * @route   DELETE /api/vocabulary/:id
 * @desc    Xóa một từ khỏi danh sách học
 */
router.delete('/:id', auth, validate(deleteVocabularySchema), deleteVocabularyController);

export default router;
