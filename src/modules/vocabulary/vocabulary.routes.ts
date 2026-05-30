import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createVocabularySchema,
  deleteVocabularySchema,
  getVocabularyDeckDetailSchema,
  listVocabularySchema,
  listVocabularyDecksSchema,
  pronounceVocabularySchema,
  reviewVocabularySchema,
} from '../../schemas/vocabulary';
import {
  createVocabularyController,
  deleteVocabularyController,
  getVocabularyDeckDetailController,
  listVocabularyController,
  listVocabularyDecksController,
  pronounceVocabularyController,
  reviewVocabularyController,
} from './vocabulary.controller';

const router = Router();

/**
 * @route   GET /api/vocabulary
 * @desc    Lấy danh sách từ vựng đã lưu của user hiện tại
 */
router.get('/', auth, validate(listVocabularySchema), listVocabularyController);

/**
 * @route   GET /api/vocabulary/decks
 * @desc    Lấy danh sách deck từ vựng theo session context
 */
router.get('/decks', auth, validate(listVocabularyDecksSchema), listVocabularyDecksController);

/**
 * @route   GET /api/vocabulary/decks/:sessionId
 * @desc    Lấy danh sách từ nằm trong một deck session cụ thể
 */
router.get('/decks/:sessionId', auth, validate(getVocabularyDeckDetailSchema), getVocabularyDeckDetailController);

/**
 * @route   POST /api/vocabulary
 * @desc    Lưu từ vựng mới theo chế độ auto hoặc manual
 */
router.post('/', auth, validate(createVocabularySchema), createVocabularyController);

/**
 * @route   POST /api/vocabulary/pronounce
 * @desc    Sinh pronunciation audio cho một từ/cụm từ bằng active TTS model
 */
router.post('/pronounce', auth, validate(pronounceVocabularySchema), pronounceVocabularyController);

/**
 * @route   POST /api/vocabulary/:id/review
 * @desc    Submit kết quả review SRS cho một dictionary word
 */
router.post('/:id/review', auth, validate(reviewVocabularySchema), reviewVocabularyController);

/**
 * @route   DELETE /api/vocabulary/:id
 * @desc    Xóa một từ khỏi danh sách học
 */
router.delete('/:id', auth, validate(deleteVocabularySchema), deleteVocabularyController);

export default router;
