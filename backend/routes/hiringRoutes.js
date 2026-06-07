const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
    listHiringDecisions,
    getHiringRanking,
    generateOfferLetter,
    rejectCandidate,
    completeOnboarding,
    respondToOffer,
    getCandidateOffers,
    getMyApplications,
    getAllOnboardings,
} = require('../controllers/hiringController');

router.use(protect);

router.get('/decisions', authorize('admin', 'hr'), listHiringDecisions);
router.get('/rankings/:jobId', authorize('admin', 'hr'), getHiringRanking);
router.get('/onboardings', authorize('admin', 'hr'), getAllOnboardings);
router.post('/decisions/:decisionId/offer', authorize('admin', 'hr'), generateOfferLetter);
router.post('/decisions/:decisionId/reject', authorize('admin', 'hr'), rejectCandidate);
router.post('/onboarding/:onboardingId/complete', authorize('admin', 'hr'), completeOnboarding);

// Candidate-facing
router.get('/my-offers', getCandidateOffers);
router.get('/my-applications', getMyApplications);
router.post('/offers/:offerId/respond', respondToOffer);

module.exports = router;